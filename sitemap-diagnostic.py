"""Read-only HTTP/format comparison. A Googlebot user agent is NOT real Googlebot."""
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET

BASE = "https://price-profit-lab.pages.dev"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
OUTPUT = Path("sitemap-diagnostic-output")
AGENTS = {
    "ordinary": "price-profit-lab-diagnostic/1.0",
    "googlebot-user-agent-only": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
}
HEADERS = ("content-type", "content-encoding", "cache-control", "age", "server", "cf-ray", "cf-mitigated", "x-robots-tag")


class OwnSiteRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urllib.parse.urlsplit(newurl)
        if target.scheme != "https" or target.netloc != urllib.parse.urlsplit(BASE).netloc:
            raise ValueError("Unexpected redirect outside the public HTTPS site")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def parse_sitemap(body):
    root = ET.fromstring(body)
    if root.tag != NS + "urlset":
        raise ValueError("Not a sitemap urlset with the expected namespace")
    urls = [node.text or "" for node in root.findall(NS + "url/" + NS + "loc")]
    if not urls or len(urls) != len(set(urls)):
        raise ValueError("Empty sitemap or duplicate URLs")
    if any(not url.startswith(BASE + "/") for url in urls):
        raise ValueError("Unexpected sitemap URL host or scheme")
    return urls


def fetch(path, label, agent, expected):
    result = {"path": path, "agent_label": label, "checked_at_utc": datetime.now(timezone.utc).isoformat()}
    try:
        request = urllib.request.Request(BASE + path, headers={"User-Agent": agent, "Accept-Encoding": "identity"})
        opener = urllib.request.build_opener(OwnSiteRedirects())
        try:
            response = opener.open(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            result.update(status=response.status, final_url=response.geturl(), headers={name: response.headers.get(name) for name in HEADERS})
            body = response.read(4 * 1024 * 1024 + 1)
        if len(body) > 4 * 1024 * 1024:
            raise ValueError("Response exceeds diagnostic size limit")
        result["wire_bytes"] = len(body)
        result["wire_sha256"] = hashlib.sha256(body).hexdigest()
        if result["headers"]["content-encoding"] == "gzip":
            body = gzip.decompress(body)
        result["decoded_sha256"] = hashlib.sha256(body).hexdigest()
        if path == "/sitemap.xml":
            urls = parse_sitemap(body)
            result.update(url_count=len(urls), matches_repository_urls=set(urls) == set(expected))
            result["ok"] = result["status"] == 200 and result["matches_repository_urls"]
        else:
            robots = urllib.robotparser.RobotFileParser()
            robots.parse(body.decode("utf-8-sig").splitlines())
            result.update(allows_sitemap=robots.can_fetch("Googlebot", BASE + "/sitemap.xml"), allows_home=robots.can_fetch("Googlebot", BASE + "/"), declared_sitemaps=robots.site_maps())
            result["ok"] = result["status"] == 200 and result["allows_sitemap"] and result["allows_home"] and BASE + "/sitemap.xml" in (result["declared_sitemaps"] or [])
    except Exception as error:
        result.update(ok=False, error=type(error).__name__ + ": " + str(error))
    return result


def main():
    expected = parse_sitemap(Path("sitemap.xml").read_bytes())
    results = [fetch(path, label, agent, expected) for path in ("/sitemap.xml", "/robots.txt") for label, agent in AGENTS.items()]
    report = {
        "limitation": "GitHub runner requests with two user-agent strings; not verified Googlebot, not Google-origin traffic, and not historical server logs.",
        "same_sitemap_body_for_agents": results[0].get("decoded_sha256") == results[1].get("decoded_sha256") if all("decoded_sha256" in r for r in results[:2]) else None,
        "results": results,
    }
    OUTPUT.mkdir(exist_ok=True)
    (OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not all(result["ok"] for result in results):
        raise SystemExit("At least one read-only diagnostic check failed; inspect report.json")


if __name__ == "__main__":
    main()
