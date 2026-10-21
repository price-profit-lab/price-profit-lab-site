"""Maintain static, visible breadcrumbs and matching JSON-LD from page headings.

Run from the repository root. Reference:
https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://price-profit-lab.pages.dev/"


def build():
    count = 0
    for page in sorted(ROOT.glob("*.html")):
        if page.name in {"index.html", "privacy.html", "terms.html"}:
            continue
        text = page.read_text()
        heading = re.search(r"<h1\b[^>]*>(.*?)</h1>", text, re.S).group(1)
        name = html.unescape(re.sub(r"<[^>]*>", "", heading)).strip()
        trail = [("ホーム", "index.html", BASE)]
        if page.name.endswith("-guide.html"):
            trail.append(("解説記事", "guides.html", BASE + "guides"))
        elif page.name in {"product-help.html", "service-excel-help.html"}:
            product = "product" if page.name == "product-help.html" else "service-excel"
            label = "物販向けExcel" if product == "product" else "サービス業向けExcel"
            trail.append((label, product + ".html", BASE + product))
        trail.append((name, None, BASE + page.stem))
        items = []
        schema = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": []}
        for position, (label, link, url) in enumerate(trail, 1):
            label_html = html.escape(label)
            content = f'<a href="{link}">{label_html}</a>' if link else f'<span aria-current="page">{label_html}</span>'
            items.append("<li>" + content + "</li>")
            schema["itemListElement"].append({"@type": "ListItem", "position": position, "name": label, "item": url})
        navigation = '<nav class="breadcrumb" aria-label="現在位置"><ol>' + "".join(items) + "</ol></nav>"
        text = re.sub(r'<nav class="breadcrumb" aria-label="現在位置">.*?</nav>', "", text, flags=re.S)
        # Replace this script's previous output without touching other structured data.
        text = re.sub(r'<script type="application/ld\+json" data-breadcrumb-schema>.*?</script>', "", text, flags=re.S)
        encoded = json.dumps(schema, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
        text = text.replace("</head>", '<script type="application/ld+json" data-breadcrumb-schema>' + encoded + "</script></head>", 1)
        text = text.replace("<main>", "<main>" + navigation, 1)
        page.write_text(text)
        count += 1
    print(f"Updated breadcrumbs on {count} pages")


if __name__ == "__main__":
    build()
