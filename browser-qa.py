"""Run real-browser calculator/print checks against a local checkout only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from threading import Thread
import re
import unicodedata

from playwright.sync_api import sync_playwright, expect
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "browser-qa-output"
CASES = [
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
    page.goto(base + case["path"], wait_until="networkidle")
    expect(page.locator(".print-only")).to_be_hidden()
    page.locator(case["field"]).fill(case["value"])
    expect(page.locator(case["metric"])).to_have_text(case["expected"])
    expect(page.locator(case["result"])).to_be_visible()
    if case["name"] == "cancellation":
        expect(page.locator("#cancellationScenarios tr")).to_have_count(5)
        expect(page.locator("#cancellationScenarios")).to_contain_text("7.5％（入力中）")
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
    expect(page.locator(".print-actions")).to_be_hidden()
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
    page.locator(case["reset"]).click()
    expect(page.locator(case["metric"])).to_have_text(case["sample"])
    expect(page.locator(case["result"])).to_be_visible()
    if case["name"] == "cancellation":
        expect(page.locator("#cancellationScenarios tr")).to_have_count(4)
        expect(page.locator("#cancel-cancellation")).to_have_value("10")
    assert not errors, errors
    print(f"PASS {case['name']}: edited input/result, print handler, print CSS, PDF text ({len(reader.pages)} pages), invalid hiding and reset", flush=True)
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
            if product == "service-excel":
                expect(page.locator(".workbook-screenshots img")).to_have_count(2)
                for img in page.locator(".workbook-screenshots img").all():
                    assert img.evaluate("el=>el.complete&&el.naturalWidth>0"), "Product screenshot failed to load"
                image_scroller = page.locator(".workbook-image-scroll").last
                image_scroller.focus()
                assert image_scroller.evaluate("el=>el===document.activeElement"), "Screenshot scroll area must be keyboard focusable"
                if width == 375:
                    assert image_scroller.evaluate("el=>el.scrollWidth>el.clientWidth"), "Wide screenshot should scroll on mobile"
                    image_scroller.press("ArrowRight")
                    # Wait for the browser's keyboard scrolling, without network access.
                    page.wait_for_function("document.activeElement.scrollLeft>0")
            if width == 375:
                page.evaluate("scrollTo(0,0)")
                page.screenshot(path=str(OUTPUT / (product + "-mobile.png")))
                tables.first.screenshot(path=str(OUTPUT / (product + "-comparison-mobile.png")))
            guide_link = page.locator('a[href="' + guide + '.html"]').first
            guide_link.click()
            expect(page).to_have_url(base + "/" + guide + ".html")
            expect(page.locator("h1")).to_be_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (guide, width, "guide overflows viewport")
            assert not errors, errors
            print(f"PASS {product} {width}px: viewport, purchase targets, table scrolling, images and guide navigation", flush=True)
        page.close()


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
            verify_product_pages(browser, base)
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
