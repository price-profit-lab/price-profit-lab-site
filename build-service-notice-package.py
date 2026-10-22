"""Build a deterministic, self-contained free notice template package."""
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parent


def build():
    html = (ROOT / 'assets/service-notice-builder.html').read_text()
    script = (ROOT / 'assets/service-notice-builder.js').read_text()
    html = html.replace('<script src="service-notice-builder.js" defer></script>', '')
    html = html.replace('</body>', '<script>' + script + '</script></body>')

    def absolute(match):
        target = match.group(1)
        target = target[3:] if target.startswith('../') else 'assets/' + target
        return 'href="https://price-profit-lab.pages.dev/' + target + '"'

    html = re.sub(r'href="((?:\.\./)[^"]+|service-excel-demo\.html)"', absolute, html)
    html = html.replace('無料・登録不要です。', '無料のファイル版です。PCでこのHTMLをブラウザーで開いて使います。')
    html = html.replace('<div class="intro"><h1>', '<div class="intro"><p>ファイル版 v1.0／2026年10月22日</p><h1>')
    html = html.replace('月謝制・契約変更用の文面は対象外です。', '月謝制・契約変更用の文面は対象外です。計算・文面作成はオフラインでも使えます。解説や商品へのリンクを開くときはインターネット接続が必要です。スマホでは<a href="https://price-profit-lab.pages.dev/assets/service-notice-builder">Web版</a>をご利用ください。')
    (ROOT / 'assets/service-notice-builder-offline.html').write_text(html)
    output = ROOT / 'assets/service-notice-builder-free-v1.zip'
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in [('notice-builder.html', html.encode()), ('README.txt', (ROOT / 'service-notice-package-README.txt').read_bytes())]:
            info = zipfile.ZipInfo(name, (2026, 10, 22, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    return output


if __name__ == '__main__':
    print(build())
