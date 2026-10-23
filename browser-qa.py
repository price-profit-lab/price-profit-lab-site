"""Run real-browser calculator/print checks against a local checkout only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from threading import Thread
import re
import unicodedata
import mimetypes
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, expect
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "browser-qa-output"
CASES = [
    dict(name="margin", path="/profit-margin-calculator.html", result="#marginResult",
         field="#margin-cost", value="1400", metric="#margin-targetPrice", expected="2,058円",
         invalid="#margin-price", error="#marginError", reset="#marginReset",
         sample="1,772円", pdf_value="1400", pdf_result="2058"),
    dict(name="profit", path="/", result="#results", field="#newPrice", value="3900",
         metric="#after", expected="190,000円", invalid="#oldPrice", error="#error",
         reset="#resetSample", sample="136,000円", pdf_value="3900", pdf_result="190000"),
    dict(name="reverse", path="/reverse-price-calculator.html", result="#reverseResult",
         field="#quantity", value="80", metric="#reversePrice", expected="4,016円",
         invalid="#quantity", error="#reverseError", reset="#reverseReset",
         sample="3,411円", pdf_value="80", pdf_result="4016"),
    dict(name="rate", path="/price-increase-calculator.html", result="#increaseResult",
         field="#newPrice", value="3600", metric="#increaseAmount", expected="+600円",
         invalid="#oldPrice", error="#increaseError", reset="#increaseReset",
         sample="+300円", pdf_value="3600", pdf_result="600"),
    dict(name="cancellation", path="/cancellation-calculator.html", result="#cancellationResult",
         field="#cancel-cancellation", value="7.5", metric="#cancel-result-profit",
         expected="188,280円", invalid="#cancel-price", error="#cancellationError",
         reset="#cancellationReset", sample="181,840円", pdf_value="7.5", pdf_result="188280"),
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def verify_case(browser, base, case):
    page = browser.new_page(viewport={"width": 375, "height": 812}, locale="ja-JP")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    # Only the local checkout may be requested. In particular, do not load GA.
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    if case["name"] == "margin":
        page.goto(base + "/profit-margin-guide.html", wait_until="networkidle")
        page.locator('a[href="profit-margin-calculator.html"]').click()
        expect(page).to_have_url(base + case["path"])
    else:
        page.goto(base + case["path"], wait_until="networkidle")
    expect(page.locator(".print-only")).to_be_hidden()
    page.locator(case["field"]).fill(case["value"])
    expect(page.locator(case["metric"])).to_have_text(case["expected"])
    expect(page.locator(case["result"])).to_be_visible()
    if case["name"] == "margin":
        expect(page.locator("#margin-margin")).to_have_text("12.5％")
        page.locator("#margin-target").fill("95")
        expect(page.locator("#margin-targetPrice")).to_have_text("算出不可")
        expect(page.locator("#margin-net")).to_have_text("80円")
        page.locator("#margin-target").fill("25")
        expect(page.locator("#margin-targetPrice")).to_have_text("2,058円")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Margin tool must fit on mobile"
    if case["name"] == "cancellation":
        expect(page.locator("#cancellationScenarios tr")).to_have_count(5)
        expect(page.locator("#cancellationScenarios")).to_contain_text("7.5％（入力中）")
    jump = page.locator('button[data-calculator-result]')
    expect(jump).to_be_visible()
    jump.focus()
    jump.press("Enter")
    expect(page.locator('[data-result-focus]:focus')).to_have_count(1)
    expect(page.locator(case["result"]).locator(".metric strong").first).to_be_in_viewport()
    page.screenshot(path=str(OUTPUT / (case["name"] + "-mobile.png")), full_page=True)
    # Check the real button handler without opening an OS dialog in CI.
    page.evaluate("() => { window.printCalls=0; window.print=()=>{window.printCalls++}; }")
    page.locator("button[onclick='window.print()']").click()
    assert page.evaluate("window.printCalls") == 1, "Print button must invoke the handler exactly once"
    page.set_viewport_size({"width": 794, "height": 1123})
    page.emulate_media(media="print")
    assert page.evaluate("getComputedStyle(document.documentElement).backgroundColor") == "rgb(255, 255, 255)"
    expect(page.locator("header")).to_be_hidden()
    expect(page.locator("footer")).to_be_hidden()
    expect(page.locator(".print-only")).to_be_visible()
    for action in page.locator(".print-actions").all():
        expect(action).to_be_hidden()
    expect(page.locator(case["result"])).to_be_visible()
    expect(page.locator(case["field"])).to_be_visible()
    assert page.evaluate("""() => Array.from(document.querySelector('main').children)
      .filter(el=>!el.classList.contains('print-include'))
      .every(el=>getComputedStyle(el).display==='none')""")
    assert page.locator(".tablewrap").evaluate_all("els=>els.filter(el=>el.getBoundingClientRect().height>0).every(el=>getComputedStyle(el).overflowX==='visible')")
    page.screenshot(path=str(OUTPUT / (case["name"] + "-print.png")), full_page=True)
    pdf = page.pdf(format="A4", margin={"top": "12mm", "bottom": "12mm", "left": "12mm", "right": "12mm"}, print_background=True)
    (OUTPUT / (case["name"] + ".pdf")).write_bytes(pdf)
    reader = PdfReader(BytesIO(pdf))
    assert 1 <= len(reader.pages) <= 6, (case["name"], "unexpected page count", len(reader.pages))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    # PDF fonts may encode ordinary letter pairs as Unicode ligatures (e.g. fi).
    normalized = re.sub(r"[\s,]", "", unicodedata.normalize("NFKC", text))
    assert case["pdf_value"] in normalized, (case["name"], "edited input missing from PDF", text)
    assert case["pdf_result"] in normalized, (case["name"], "edited result missing from PDF", text)
    assert "価格と利益の計算室" in normalized, (case["name"], "Japanese text missing", text)
    assert "price-profit-lab.pages.dev" in normalized, (case["name"], "source URL missing", text)
    assert "BOOTH" not in text, "Promotional content leaked into print output"
    assert "入力条件と結果を印刷" not in normalized
    if case["name"] == "cancellation":
        for pdf_page in reader.pages[:-1]:
            assert not re.sub(r"\s", "", pdf_page.extract_text() or "").endswith("この計算の前提"), "An assumptions heading must stay with its content"
    # The print rules must never expose a stale result after invalid input.
    page.locator(case["invalid"]).fill("")
    expect(page.locator(case["result"])).to_be_hidden()
    expect(page.locator(case["error"])).not_to_be_empty()
    assert page.locator(case["result"]).evaluate("el=>getComputedStyle(el).display") == "none"
    page.emulate_media(media="screen")
    jump.click()
    expect(page.locator(case["invalid"])).to_be_focused()
    expect(page.locator(case["invalid"])).to_be_in_viewport()
    expect(page.locator(case["result"])).to_be_hidden()
    page.locator(case["reset"]).click()
    expect(page.locator(case["metric"])).to_have_text(case["sample"])
    expect(page.locator(case["result"])).to_be_visible()
    if case["name"] == "cancellation":
        expect(page.locator("#cancellationScenarios tr")).to_have_count(4)
        expect(page.locator("#cancel-cancellation")).to_have_value("10")
    if case["name"] == "profit":
        page.set_viewport_size({"width": 375, "height": 812})
        for field, value in dict(oldPrice="1.00000000001", newPrice="1", unitCost="0", oldCount="1", newCount="1", fixedCost="1.00000000001", rate="0", flatFee="0", target="1.00000000001", hours="0").items():
            page.locator("#" + field).fill(value)
        for field, value in dict(needed="2件", breakeven="2件", goal="3件").items():
            expect(page.locator("#" + field)).to_have_text(value)
        expect(page.locator("#results")).to_be_visible()
        page.locator("#resetSample").click()
        expect(page.locator("#needed")).to_have_text("88件")
        expect(page.locator("#after")).to_have_text("136,000円")
    assert not errors, errors
    print(f"PASS {case['name']}: edited input/result, print handler, print CSS, PDF text ({len(reader.pages)} pages), invalid hiding, result/error focus navigation and reset", flush=True)
    page.close()


def verify_article_examples(browser, base):
    page = browser.new_page(viewport={"width": 375, "height": 812}, locale="ja-JP")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    for article, example, price, quantity, profit in [
        ("discount-profit-guide", "example-discount", "2700", "128", "101,200円"),
        ("online-shop-profit-guide", "example-shop", "3300", "85", "102,575円"),
    ]:
        page.goto(base + "/" + article + ".html", wait_until="networkidle")
        page.locator('a[href="index.html#' + example + '"]').click()
        expect(page).to_have_url(base + "/index.html#" + example)
        expect(page.locator("#newPrice")).to_have_value(price)
        expect(page.locator("#newCount")).to_have_value(quantity)
        expect(page.locator("#after")).to_have_text(profit)
        expect(page.locator("#exampleStatus")).to_contain_text("架空例を入力しました")
        expect(page.locator("#" + example)).to_be_in_viewport()
        expect(page.locator("#oldPrice")).to_be_in_viewport()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Preset buttons must fit on mobile"
        page.screenshot(path=str(OUTPUT / (example + "-mobile.png")))
        page.locator("#example-discount").click()
        expect(page.locator("#after")).to_have_text("101,200円")
        page.locator("#resetSample").click()
        expect(page.locator("#after")).to_have_text("136,000円")
        expect(page.locator("#unitCost")).to_have_value("900")
        print(f"PASS {article}: article link loads fixed sample, mobile layout, sample switching and reset", flush=True)
    page.goto(base + "/profit-margin-guide.html", wait_until="networkidle")
    page.locator('a[href="discount-profit-guide.html#margin-discount-table"]').click()
    expect(page.locator("#margin-discount-table")).to_be_in_viewport()
    table = page.locator("#discount-count-table")
    expect(table.locator("tbody tr")).to_have_count(5)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Discount table must not overflow the mobile page"
    table.locator("..").screenshot(path=str(OUTPUT / "discount-count-table-mobile.png"))
    table.locator("..").focus()
    expect(table.locator("..")).to_be_focused()
    table.locator("..").press("ArrowRight")
    page.wait_for_function("document.querySelector('#discount-count-table').parentElement.scrollLeft > 0")
    page.set_viewport_size({"width": 1280, "height": 900})
    page.locator("#margin-discount-table").scroll_into_view_if_needed()
    table.locator("..").screenshot(path=str(OUTPUT / "discount-count-table-desktop.png"))
    print("PASS discount reference table: related-article entry, mobile width, keyboard scroll region and desktop layout", flush=True)
    assert not errors, errors
    page.close()


def verify_product_pages(browser, base):
    products = [
        ("product", "product-help", {"9001298"}),
        ("service-excel", "service-excel-help", {"9011039", "9011528"}),
    ]
    for width in (375, 1280):
        page = browser.new_page(viewport={"width": width, "height": 900}, locale="ja-JP")
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
        for product, guide, item_ids in products:
            page.goto(base + "/" + product + ".html", wait_until="networkidle")
            expect(page.locator("h1")).to_be_visible()
            if product == "service-excel":
                expect(page.locator("h1")).to_contain_text("料金設定Excel")
                expect(page.get_by_text("Standard 1,480円／Pro 2,980円（税込・買い切り）", exact=True)).to_be_in_viewport()
                page.locator('.hero a[href="#environment"]').click()
                expect(page.locator("#environment")).to_be_in_viewport()
                expect(page.get_by_text("ProのWindows確認（2026年10月23日）", exact=True)).to_be_visible()
                expect(page.get_by_text("ProのWindows確認（2026年10月23日）", exact=True).locator("..")).to_contain_text("Windows 11 Pro 26H2（OSビルド26300.9711）")
                expect(page.get_by_text("ProのWindows確認（2026年10月23日）", exact=True).locator("..")).to_contain_text("16.0.20430.20032")
                scope = page.locator("p.note").filter(has_text="上記のWindows確認はProを対象とします。")
                expect(scope).to_be_visible()
                expect(scope).to_contain_text("StandardはMacでの確認結果をご参照ください。")
                expect(scope).to_contain_text("ブラウザー版Excel、Googleスプレッドシート、Numbers、スマートフォンでのExcel編集・再計算は動作未確認です。")
                expect(page.get_by_text("改善レポートの印刷で項目と数値が別ページになる場合は、印刷設定の「すべての列を1ページに印刷」を選択してください。", exact=True)).to_be_visible()
                page.goto(base + "/" + product + ".html", wait_until="networkidle")
                page.locator('.hero a[href="#plans"]').click()
                expect(page.locator("#plans h2")).to_be_in_viewport()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (product, width, "page overflows viewport")
            purchase = page.locator('a[href^="https://price-profit-lab.booth.pm/items/"]')
            links = purchase.evaluate_all("els=>els.map(el=>el.getAttribute('href'))")
            assert set(links) == {"https://price-profit-lab.booth.pm/items/" + item for item in item_ids}, (product, links)
            for index in range(purchase.count()):
                link = purchase.nth(index)
                expect(link).to_be_visible()
                assert link.inner_text().strip(), "Purchase links need readable text"
                box = link.bounding_box()
                assert box and box["x"] >= -1 and box["x"] + box["width"] <= width + 1, (product, width, "purchase link clipped", box)
            tables = page.locator(".tablewrap")
            assert tables.count() > 0, "Product comparison tables must exist"
            for index in range(tables.count()):
                wrapper = tables.nth(index)
                assert wrapper.evaluate("el=>el.getBoundingClientRect().right<=innerWidth+1"), (product, width, "table container overflows")
                assert wrapper.evaluate("el=>el.scrollWidth<=el.clientWidth+1||['auto','scroll'].includes(getComputedStyle(el).overflowX)"), (product, width, "wide table cannot scroll")
            comparisons = page.locator(".comparison-scroll")
            assert comparisons.count() == (3 if product == "product" else 2)
            for wrapper in comparisons.all():
                expect(wrapper).to_have_attribute("role", "region")
                assert wrapper.get_attribute("aria-label"), "Comparison scroll region needs a descriptive name"
                expect(wrapper.locator("caption")).to_be_visible()
                wrapper.focus()
                expect(wrapper).to_be_focused()
                if width == 375:
                    assert wrapper.evaluate("el=>el.scrollWidth>el.clientWidth"), "Comparison must keep readable columns on mobile"
                    assert wrapper.locator("thead th").first.evaluate("el=>el.getBoundingClientRect().width<190"), "Row-label column must leave room for values on mobile"
                    wrapper.evaluate("el=>el.scrollTo({left:0,behavior:'instant'})")
                    wrapper.press("ArrowRight")
                    page.wait_for_function("document.activeElement.scrollLeft>0")
                    wrapper.evaluate("el=>el.scrollTo({left:el.scrollWidth,behavior:'instant'})")
                    assert wrapper.locator("tr").first.locator("th").last.evaluate("el=>{const r=el.getBoundingClientRect(),p=el.closest('.comparison-scroll').getBoundingClientRect();return r.right<=p.right+1&&r.left>=p.left-1}"), "Last column must be reachable"
                    wrapper.evaluate("el=>el.scrollTo({left:0,behavior:'instant'})")
            if product == "service-excel":
                expect(page.locator(".workbook-screenshots img")).to_have_count(2)
                for img in page.locator(".workbook-screenshots img").all():
                    # These images load lazily when the user scrolls to them.
                    img.scroll_into_view_if_needed()
                    page.wait_for_function("img=>img.complete&&img.naturalWidth>0", arg=img.element_handle())
                image_scroller = page.locator(".workbook-image-scroll").last
                image_scroller.focus()
                assert image_scroller.evaluate("el=>el===document.activeElement"), "Screenshot scroll area must be keyboard focusable"
                if width == 375:
                    assert image_scroller.evaluate("el=>el.scrollWidth>el.clientWidth"), "Wide screenshot should scroll on mobile"
                    image_scroller.evaluate("el=>{el.scrollLeft=0}")
                    image_scroller.press("ArrowRight")
                    # Wait for the browser's keyboard scrolling, without network access.
                    page.wait_for_function("document.activeElement.scrollLeft>0")
            if width == 375:
                page.evaluate("scrollTo(0,0)")
                comparisons.first.evaluate("el=>el.scrollTo({left:0,behavior:'instant'})")
                page.screenshot(path=str(OUTPUT / (product + "-mobile.png")))
                tables.first.screenshot(path=str(OUTPUT / (product + "-comparison-mobile.png")))
                comparisons.first.evaluate("el=>el.scrollTo({left:el.scrollWidth,behavior:'instant'})")
                comparisons.first.screenshot(path=str(OUTPUT / (product + "-comparison-end-mobile.png")))
            else:
                comparisons.first.screenshot(path=str(OUTPUT / (product + "-comparison-desktop.png")))
            guide_link = page.locator('a[href="' + guide + '.html"]').first
            guide_link.click()
            expect(page).to_have_url(base + "/" + guide + ".html")
            expect(page.locator("h1")).to_be_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (guide, width, "guide overflows viewport")
            assert not errors, errors
            print(f"PASS {product} {width}px: viewport, purchase targets, table scrolling, images and guide navigation", flush=True)
        page.close()



def verify_customer_demo(browser, base):
    for width in (375, 1280):
        page = browser.new_page(viewport={"width": width, "height": 900}, locale="ja-JP")
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
        page.goto(base + "/service-excel.html", wait_until="networkidle")
        page.locator('.hero a[href="assets/service-excel-demo.html"]').click()
        expect(page).to_have_url(base + "/assets/service-excel-demo.html")
        expect(page.locator("h1")).to_contain_text("3ステップ")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (width, "Demo page overflows")
        expect(page.locator("img")).to_have_count(2)
        for img in page.locator("img").all():
            page.wait_for_function("img=>img.complete&&img.naturalWidth>0", arg=img.element_handle())
        scroller = page.locator(".wide")
        scroller.focus()
        expect(scroller).to_be_focused()
        if width == 375:
            assert scroller.evaluate("el=>el.scrollWidth>el.clientWidth")
            scroller.press("ArrowRight")
            page.wait_for_function("document.activeElement.scrollLeft>0")
        page.evaluate("scrollTo(0,0)")
        page.screenshot(path=str(OUTPUT / f"customer-demo-{width}.png"), full_page=True)
        # Verify plan destinations and event payloads locally, without navigating to BOOTH.
        plan_links = page.locator('#choose-plan a[data-ga4-booth-click="1"]')
        expect(plan_links).to_have_count(2)
        assert plan_links.evaluate_all("els=>els.map(el=>el.href)") == [
            "https://price-profit-lab.booth.pm/items/9011039",
            "https://price-profit-lab.booth.pm/items/9011528",
        ]
        events = page.evaluate("""() => {
            const events = [];
            window.gtag = (...args) => events.push(args);
            for (const link of document.querySelectorAll('#choose-plan a[data-ga4-booth-click="1"]')) link.onclick();
            return events;
        }""")
        assert [event[1] for event in events] == ["booth_standard_click", "booth_pro_click"], events
        assert [event[2]["product_id"] for event in events] == ["9011039", "9011528"], events
        for event in events:
            assert event[2]["source_page"] == "/assets/service-excel-demo.html", events
            assert set(event[2]) == {"product_id", "source_page", "link_url", "transport_type"}, events
            assert event[2]["transport_type"] == "beacon", events
        # Inspect public destinations without requesting the live site or sending GA events.
        compare = page.locator('a[href="https://price-profit-lab.pages.dev/service-excel#plans"]')
        expect(compare).to_have_count(1)
        page.goto(base + "/service-excel.html#plans", wait_until="networkidle")
        expect(page.locator("#plans h2")).to_be_in_viewport()
        page.goto(base + "/service-excel-help.html#practice", wait_until="networkidle")
        expect(page.locator("#practice")).to_be_in_viewport()
        page.close()
    print("PASS customer demo: hero entry, 375/1280px width, images, keyboard scroll, plan destinations and local event payloads", flush=True)



def verify_notice_builder(browser, base):
    for width in (320, 375, 1280):
        context = browser.new_context(viewport={"width": width, "height": 900}, locale="ja-JP", accept_downloads=True)
        external = []
        def route_request(route):
            if route.request.url.startswith(base + "/"):
                route.continue_()
            else:
                external.append(route.request.url)
                route.abort()
        context.route("**/*", route_request)
        page = context.new_page()
        page.goto(base + "/service-price-notice-guide.html", wait_until="networkidle")
        page.locator('a[href="assets/service-notice-builder.html"]').click()
        expect(page.locator("#noticeForm")).to_be_visible()
        for name, value in {"name":"架空教室", "menu":"個人レッスン", "unit":"1名・1回60分", "old":"8000", "next":"8000", "date":"2026-11-01", "reason":"運営費の上昇", "contact":"店頭でご確認ください"}.items():
            page.locator(f'[name="{name}"]').fill(value)
        for name, value in {"tax":"税込", "basis":"use", "bookings":"old", "tickets":"none"}.items():
            page.locator(f'[name="{name}"]').select_option(value)
        page.get_by_role("button", name="文面を作る", exact=True).click()
        expect(page.locator("#noticeResult")).to_be_hidden()
        expect(page.locator("#noticeStatus")).to_contain_text("新料金を旧料金より高く")
        page.locator('[name="next"]').fill("9200")
        page.get_by_role("button", name="文面を作る", exact=True).click()
        expect(page.locator("#noticeResult")).to_be_focused()
        text = page.locator("#fullNotice").input_value()
        assert "2026年11月1日以降のご利用分から" in text and "9,200円" in text
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), (width, "Builder overflows")
        with page.expect_download() as download_info:
            page.get_by_role("button", name="掲示用をテキスト保存", exact=True).click()
        download = download_info.value
        assert download.suggested_filename == "price-change-notice.txt"
        assert Path(download.path()).read_text() == text
        page.locator('[name="basis"]').select_option("booking")
        expect(page.locator("#noticeResult")).to_be_hidden()
        page.locator('[name="bookings"]').select_option("custom")
        expect(page.locator('[name="bookingText"]')).to_be_visible()
        page.locator('[name="bookingText"]').fill("10月受付分は旧料金です。")
        page.get_by_role("button", name="文面を作る", exact=True).click()
        assert "以降に受け付けるご予約から" in page.locator("#shortNotice").input_value()
        assert "10月受付分は旧料金です。" in page.locator("#fullNotice").input_value()
        page.screenshot(path=str(OUTPUT / f"notice-builder-{width}.png"))
        assert not external, external
        context.close()
    print("PASS notice builder: 320/375/1280px, dates, application basis, validation, stale-output hiding, local text download and no external requests", flush=True)



def verify_offline_notice(browser, base):
    import zipfile
    import tempfile
    archive_path = ROOT / "assets/service-notice-builder-free-v1.zip"
    with zipfile.ZipFile(archive_path) as archive:
        assert archive.testzip() is None
        assert archive.namelist() == ["notice-builder.html", "README.txt"]
        assert archive.read("notice-builder.html") == (ROOT / "assets/service-notice-builder-offline.html").read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            archive.extractall(directory)
            context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP", offline=True)
            requests = []
            page = context.new_page()
            page.on("request", lambda request: requests.append(request.url) if request.url.startswith(("http:", "https:")) else None)
            page.goto((Path(directory) / "notice-builder.html").as_uri())
            expect(page.locator("#noticeForm")).to_be_visible()
            for name, value in {"name":"架空教室", "menu":"個人レッスン", "unit":"1名・1回60分", "old":"8000", "next":"9200", "date":"2026-11-01", "reason":"運営費の上昇", "contact":"店頭でご確認ください"}.items():
                page.locator(f'[name="{name}"]').fill(value)
            for name, value in {"tax":"税込", "basis":"use", "bookings":"old", "tickets":"none"}.items():
                page.locator(f'[name="{name}"]').select_option(value)
            page.get_by_role("button", name="文面を作る", exact=True).click()
            assert "9,200円" in page.locator("#fullNotice").input_value()
            assert not requests, requests
            context.close()
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    page.goto(base + "/service-price-notice-guide.html")
    with page.expect_download() as info:
        page.locator('a[href="assets/service-notice-builder-free-v1.zip"]').click()
    assert Path(info.value.path()).read_bytes() == archive_path.read_bytes()
    context.close()
    print("PASS portable notice: article download, ZIP content parity, file-origin generation with network offline", flush=True)


def verify_analytics_preferences(browser):
    # Emulate the production origin using local fixture bytes. Never visit production
    # or send requests to Google Analytics from this test.
    context = browser.new_context(viewport={"width": 375, "height": 812}, locale="ja-JP")
    google_attempts = []
    fixtures = {"/privacy": "privacy.html", "/": "index.html", "/analytics.js": "analytics.js",
                "/analytics-settings.js": "analytics-settings.js", "/style.css": "style.css",
                "/calculator.js": "calculator.js", "/calculator-navigation.js": "calculator-navigation.js",
                "/site-events.js": "site-events.js"}

    def route_local(route):
        parsed = urlparse(route.request.url)
        if parsed.hostname == "price-profit-lab.pages.dev" and parsed.path in fixtures:
            local_file = ROOT / fixtures[parsed.path]
            mime = mimetypes.guess_type(str(local_file))[0] or "application/octet-stream"
            route.fulfill(status=200, content_type=mime, body=local_file.read_bytes())
        else:
            if parsed.hostname == "www.googletagmanager.com":
                google_attempts.append(route.request.url)
            route.abort()

    context.route("**/*", route_local)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    origin = "https://price-profit-lab.pages.dev"
    page.goto(origin + "/privacy", wait_until="networkidle")
    expect(page.locator("#analyticsStatus")).to_contain_text("通常の計測")
    assert page.evaluate("window['ga-disable-G-V55WPDJV07']") is False
    assert page.evaluate("dataLayer.length") == 2
    assert len(google_attempts) == 1
    page.locator("#analyticsStop").click()
    expect(page.locator("#analyticsStatus")).to_contain_text("計測を停止しました")
    assert page.evaluate("localStorage.getItem('ppl-analytics-opt-out')") == "1"
    page.evaluate("gtag('event','test_must_not_queue')")
    assert page.evaluate("dataLayer.length") == 2
    page.screenshot(path=str(OUTPUT / "analytics-preferences-mobile.png"))
    page.goto(origin + "/", wait_until="networkidle")
    assert page.evaluate("window['ga-disable-G-V55WPDJV07']") is True
    assert page.evaluate("dataLayer.length") == 0
    page.locator("#newPrice").fill("3900")
    expect(page.locator("#after")).to_have_text("190,000円")
    assert page.evaluate("dataLayer.length") == 0
    assert len(google_attempts) == 1, "Opted-out navigation must not request the Google library"
    page.goto(origin + "/privacy", wait_until="networkidle")
    expect(page.locator("#analyticsStatus")).to_contain_text("計測を停止する設定")
    page.locator("#analyticsResume").click()
    expect(page.locator("#analyticsStatus")).to_contain_text("通常の計測")
    page.wait_for_load_state("networkidle")
    assert page.evaluate("localStorage.getItem('ppl-analytics-opt-out')") is None
    assert page.evaluate("window['ga-disable-G-V55WPDJV07']") is False
    assert page.evaluate("dataLayer.length") == 2
    assert len(google_attempts) == 2
    assert not errors, errors
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    context.close()
    print("PASS analytics preferences: local fixtures at emulated production origin; stop, persistence, calculation, resume; no external requests sent", flush=True)


def verify_guide_finder(browser, base):
    page = browser.new_page(viewport={"width": 375, "height": 812}, locale="ja-JP")
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    requests = []
    page.on("request", lambda request: requests.append(request.url))
    page.goto(base + "/guides.html", wait_until="networkidle")
    expect(page.locator("#guide-finder")).to_be_visible()
    entries = page.locator("[data-guide-entry]:visible")
    expect(entries).to_have_count(26)
    expect(page.locator("#guideSearchStatus")).to_have_text("26件の案内のうち26件を表示しています。")
    initial_requests = len(requests)
    query = page.locator("#guideQuery")
    query.fill("キャンセル")
    assert entries.count() > 0
    for text in entries.all_text_contents():
        assert "キャンセル" in text
    page.locator("#guideCategory").select_option("cost")
    expect(entries).to_have_count(0)
    expect(page.locator("#guideNoResults")).to_be_visible()
    query.fill("送料")
    expect(entries).to_have_count(1)
    expect(entries.locator("a")).to_have_attribute("href", "shipping-profit-guide.html")
    page.locator("#guideCategory").select_option("all")
    query.fill("手数料　利益")
    assert entries.count() > 0
    for text in entries.all_text_contents():
        assert "手数料" in text and "利益" in text
    query.press("Enter")
    assert page.url == base + "/guides.html", "Search must not navigate or expose text in a URL"
    query.fill("<img src=x onerror=alert(1)>")
    expect(entries).to_have_count(0)
    expect(page.locator("#guide-finder img")).to_have_count(0)
    page.locator("#guideReset").click()
    expect(query).to_be_focused()
    expect(query).to_have_value("")
    expect(entries).to_have_count(26)
    expect(page.locator("#guideNoResults")).to_be_hidden()
    assert len(requests) == initial_requests, "Filtering must not make network requests"
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    page.screenshot(path=str(OUTPUT / "guide-directory-mobile.png"), full_page=True)
    query.fill("固定費")
    entries.locator("a").click()
    expect(page).to_have_url(base + "/cost-guide.html")
    page.close()
    context = browser.new_context(java_script_enabled=False, viewport={"width": 375, "height": 812})
    context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    page = context.new_page()
    page.goto(base + "/guides.html")
    expect(page.locator("#guide-finder")).to_be_hidden()
    expect(page.locator("[data-guide-entry]:visible")).to_have_count(26)
    context.close()
    print("PASS guide finder: keywords, category, combined/empty/reset, mobile, navigation, no network or URL query, no-JS fallback", flush=True)


def verify_reverse_price_boundary(browser, base):
    page = browser.new_page(viewport={"width": 375, "height": 812}, locale="ja-JP")
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    page.goto(base + "/reverse-price-calculator.html", wait_until="networkidle")
    for field, value in dict(target="0", fixedCost="0", quantity="1", unitCost="700", flatFee="0", rate="30").items():
        page.locator("#" + field).fill(value)
    expect(page.locator("#reversePrice")).to_have_text("1,000円")
    expect(page.locator("#reverseProfit")).to_have_text("0円")
    for cell in page.locator("#reverseScenarios tr td:last-child").all():
        expect(cell).to_have_text("1,000円")
    page.locator("#unitCost").fill("700.0000000000001")
    expect(page.locator("#reversePrice")).to_have_text("1,001円")
    page.locator("#reverseReset").click()
    expect(page.locator("#reversePrice")).to_have_text("3,411円")
    page.close()
    print("PASS reverse price: exact whole-yen boundary, real fraction, sensitivity rows and reset", flush=True)


def verify_breadcrumbs(browser, base):
    page = browser.new_page(viewport={"width": 375, "height": 812}, locale="ja-JP")
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    for filename, parent in [("profit-margin-guide", "guides"), ("service-pricing-guide", "guides"), ("product-help", "product"), ("service-excel-help", "service-excel")]:
        page.goto(base + "/" + filename + ".html", wait_until="networkidle")
        trail = page.get_by_role("navigation", name="現在位置")
        expect(trail).to_be_visible()
        expect(trail.locator('[aria-current="page"]')).to_have_text(page.locator("h1").inner_text().replace("\n", ""))
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (filename, "breadcrumb overflows")
        page.screenshot(path=str(OUTPUT / (filename + "-breadcrumb-mobile.png")))
        link = trail.locator('a[href="' + parent + '.html"]')
        link.focus()
        link.press("Enter")
        expect(page).to_have_url(base + "/" + parent + ".html")
    page.close()
    print("PASS mobile breadcrumbs: current page, parent navigation by keyboard, width and layout", flush=True)


def verify_product_selection(browser, base):
    page = browser.new_page(viewport={"width": 375, "height": 812}, locale="ja-JP")
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    requests = []
    page.on("request", lambda request: requests.append(request.url))
    page.goto(base + "/product.html", wait_until="networkidle")
    initial_requests = len(requests)
    box = page.locator("#product-selection")
    expect(box).to_be_visible()
    expect(page.locator("#selectionDetails")).to_be_hidden()
    submit = box.get_by_role("button", name="選び方を確認する", exact=True)
    submit.click()
    expect(page.locator("#selectionResult")).to_be_hidden()
    page.locator("#selectionMethod").select_option("free")
    submit.click()
    expect(page.locator("#selectionHeading")).to_have_text("まずは無料ツールから")
    expect(page.locator("#selectionLink")).to_have_attribute("href", "index.html#tool-choice")
    page.locator("#selectionMethod").select_option("excel")
    expect(page.locator("#selectionResult")).to_be_hidden()
    expect(page.locator("#selectionDetails")).to_be_visible()
    page.locator("#selectionEnvironment").select_option("pc")
    for purpose, heading, link in [
        ("merchandise", "物販向けExcelが用途の候補です｜2,980円", "product-help.html"),
        ("standard", "サービス業向けStandardが用途の候補です｜1,480円", "service-excel.html"),
        ("pro", "サービス業向けProが用途の候補です｜2,980円", "service-excel.html"),
        ("outside", "必要な機能が、このExcelの対象外です", "product.html#check"),
    ]:
        page.locator("#selectionPurpose").select_option(purpose)
        expect(page.locator("#selectionResult")).to_be_hidden()
        submit.focus()
        submit.press("Enter")
        expect(page.locator("#selectionHeading")).to_have_text(heading)
        expect(page.locator("#selectionHeading")).to_be_focused()
        expect(page.locator("#selectionLink")).to_have_attribute("href", link)
        if purpose == "pro":
            expect(page.locator("#selectionText")).to_contain_text("両方の購入は不要")
            box.screenshot(path=str(OUTPUT / "product-selection-mobile.png"))
    page.locator("#selectionPurpose").select_option("standard")
    for environment in ("unknown", "no"):
        page.locator("#selectionEnvironment").select_option(environment)
        submit.click()
        expect(page.locator("#selectionHeading")).to_have_text("先に利用環境をご確認ください")
        expect(page.locator("#selectionLink")).to_have_attribute("href", "index.html#tool-choice")
    assert len(requests) == initial_requests, "Answers must not cause network requests"
    assert page.url == base + "/product.html", "Answers must not be added to the URL"
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    box.get_by_role("button", name="回答をリセット").click()
    expect(page.locator("#selectionMethod")).to_have_value("")
    expect(page.locator("#selectionMethod")).to_be_focused()
    expect(page.locator("#selectionResult")).to_be_hidden()
    expect(page.locator("#selectionDetails")).to_be_hidden()
    page.close()
    context = browser.new_context(java_script_enabled=False)
    context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    page = context.new_page()
    page.goto(base + "/product.html")
    expect(page.locator("#product-selection")).to_be_hidden()
    expect(page.get_by_role("table", name="目的に合わせた3商品の比較")).to_be_visible()
    context.close()
    print("PASS product selection: free/3 products/out-of-scope/no-Excel/unknown, no stale result, keyboard/reset/mobile, no network or URL answers, no-JS table", flush=True)


def verify_cancellation_article_examples(browser, base):
    page = browser.new_page(viewport={"width": 375, "height": 812}, locale="ja-JP")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    for count, price, profit in [(80, "6261", "200,068.24円"), (64, "7155", "200,004.16円"), (48, "8647", "200,023.89円")]:
        page.goto(base + "/service-capacity-guide.html", wait_until="networkidle")
        page.locator(f'a[href="cancellation-calculator.html#example-capacity-{count}"]').click()
        expect(page.locator("#cancel-price")).to_have_value(price)
        expect(page.locator("#cancel-bookings")).to_have_value(str(count))
        expect(page.locator("#cancel-result-profit")).to_have_text(profit)
        expect(page.locator("#cancellationExampleStatus")).to_contain_text("架空例を入力しました")
        expect(page.locator("#cancel-price")).to_be_in_viewport()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    page.locator("#cancel-cost").fill("1")
    page.locator("#example-capacity-80").click()
    expect(page.locator("#cancel-cost")).to_have_value("2600")
    expect(page.locator("#cancel-result-profit")).to_have_text("200,068.24円")
    page.screenshot(path=str(OUTPUT / "capacity-example-mobile.png"), full_page=True)
    page.emulate_media(media="print")
    expect(page.locator("#cancellationExamples")).to_be_hidden()
    page.emulate_media(media="screen")
    page.locator("#cancellationReset").click()
    expect(page.locator("#cancel-result-profit")).to_have_text("181,840円")
    page.goto(base + "/cancellation-calculator.html?price=1#unknown", wait_until="networkidle")
    expect(page.locator("#cancel-price")).to_have_value("6000")
    assert not errors, errors
    page.close()
    print("PASS cancellation article examples: 3 links, fixed values, edit/switch/reset, mobile width, print exclusion and unknown URL ignored", flush=True)



def verify_homepage_entry(browser, base):
    targets = ["#calculator", "reverse-price-calculator.html", "price-increase-calculator.html",
               "profit-margin-calculator.html", "cancellation-calculator.html"]
    for width in [375, 1280]:
        page = browser.new_page(viewport={"width": width, "height": 900}, locale="ja-JP")
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
        page.goto(base + "/", wait_until="networkidle")
        navigation = page.get_by_role("navigation", name="5つの無料ツールを目的で選ぶ")
        expect(navigation.get_by_role("link")).to_have_count(5)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (width, "homepage overflows")
        expect(page.locator("#after")).to_have_text("136,000円")
        assert page.locator("#calculator").evaluate("el => !!(el.compareDocumentPosition(document.querySelector('#business-start')) & Node.DOCUMENT_POSITION_FOLLOWING)")
        page.screenshot(path=str(OUTPUT / f"homepage-entry-{width}.png"))
        for target in targets:
            page.goto(base + "/", wait_until="networkidle")
            navigation.locator(f'a[href="{target}"]').click()
            if target.startswith("#"):
                page.wait_for_function("document.querySelector('#calculator').getBoundingClientRect().top >= 0 && document.querySelector('#calculator').getBoundingClientRect().top < 40")
                expect(page.locator("#oldPrice")).to_be_in_viewport()
                page.screenshot(path=str(OUTPUT / f"homepage-input-{width}.png"))
            else:
                expect(page).to_have_url(base + "/" + target)
        page.close()
    context = browser.new_context(java_script_enabled=False, viewport={"width": 375, "height": 900})
    context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/") else route.abort())
    page = context.new_page()
    page.goto(base + "/")
    expect(page.get_by_role("navigation", name="5つの無料ツールを目的で選ぶ").get_by_role("link")).to_have_count(5)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    context.close()
    print("PASS homepage entry: 5 destinations, mobile/desktop, sample result unchanged, inputs before industry guide, no-JS links", flush=True)


def main():
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            for case in CASES:
                verify_case(browser, base, case)
            verify_homepage_entry(browser, base)
            verify_product_selection(browser, base)
            verify_breadcrumbs(browser, base)
            verify_reverse_price_boundary(browser, base)
            verify_guide_finder(browser, base)
            verify_article_examples(browser, base)
            verify_cancellation_article_examples(browser, base)
            verify_product_pages(browser, base)
            verify_customer_demo(browser, base)
            verify_notice_builder(browser, base)
            verify_offline_notice(browser, base)
            verify_analytics_preferences(browser)
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
