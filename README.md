# 価格と利益の計算室 | Price & Profit Lab

小規模ネットショップ運営者、ハンドメイド販売者、個人事業主向けの**無料の価格・利益計算ツール**です。

価格や販売数、原価、手数料などを入力して、値上げ前後の利益や、目標利益に必要な価格を試算できます。登録不要でブラウザーから利用できます。

**公式サイト:** https://price-profit-lab.pages.dev/

## 無料で使える計算ツール

- [値上げ前後の利益シミュレーター](https://price-profit-lab.pages.dev/#calculator) — 価格変更と販売数の変化が月間利益に与える影響を比較
- [値上げ率の計算](https://price-profit-lab.pages.dev/price-increase-calculator) — 旧価格と新価格から値上げ率を計算
- [目標利益から販売価格を逆算](https://price-profit-lab.pages.dev/reverse-price-calculator) — 目標とする利益に必要な販売価格を試算
- [予約キャンセルの利益計算](https://price-profit-lab.pages.dev/cancellation-calculator) — キャンセル率ごとの実施件数と月間利益を比較
- [利益率・販売価格の計算](https://price-profit-lab.pages.dev/profit-margin-calculator) — 原価・料率・定額手数料から1件の残額を計算し、目標とする残額の率から売価を逆算

登録不要。5種類とも計算結果の印刷・PDF保存に対応しています。PDFは再編集できる入力データの保存ではありません。

[価格設定・利益計算の解説記事](https://price-profit-lab.pages.dev/guides)も公開しています。

## Excel版

用途に合わせて、別売りの買い切りExcelテンプレートを選べます。Microsoft Excelは別途必要です。

| 商品 | 価格（税込） | 主な用途 |
| --- | --- | --- |
| 物販向けExcel | 2,980円 | 最大20商品の価格比較と12か月の実績管理（手入力） |
| サービス業向けStandard | 1,480円 | 1種類のサービスの料金・予約枠・キャンセルを含む試算 |
| サービス業向けPro | 2,980円 | Standardの基本機能、最大6サービスの比較、条件を単独変更した改善施策比較 |

ProにはStandardの基本機能が含まれるため、両方の購入は不要です。サービス業向け2商品に12か月の実績管理は含まれません。

- [Excel版の機能と購入前の確認事項](https://price-profit-lab.pages.dev/product)
- [BOOTHの商品ページ](https://price-profit-lab.booth.pm/items/9001298)
- [サービス業向けStandard／Proの機能・入力例・動作環境](https://price-profit-lab.pages.dev/service-excel)
- [3商品の用途比較](https://price-profit-lab.pages.dev/product#choose-excel)

## 計算結果について

表示される結果は入力条件に基づく試算です。将来の販売数、需要、売上、利益を保証するものではありません。実際の経営判断では税金、資金繰り、在庫なども別途考慮してください。

## 開発・動作確認

このリポジトリは静的Webサイトのソースとテストを管理しています。

- ローカルプレビュー: `python3 -m http.server 8000`
- 計算ロジックのテスト: `node test-calculator.js`
- 公開環境: Cloudflare Pages

サービスに関する案内は、個人名ではなく「価格と利益の計算室」のブランド名で行っています。
