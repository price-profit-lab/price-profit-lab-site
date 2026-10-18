# 価格と利益の計算室 | Price & Profit Lab

小規模ネットショップ運営者、ハンドメイド販売者、個人事業主向けの**無料の価格・利益計算ツール**です。

価格や販売数、原価、手数料などを入力して、値上げ前後の利益や、目標利益に必要な価格を試算できます。登録不要でブラウザーから利用できます。

**公式サイト:** https://price-profit-lab.pages.dev/

## 無料で使える計算ツール

- [値上げ前後の利益シミュレーター](https://price-profit-lab.pages.dev/#calculator) — 価格変更と販売数の変化が月間利益に与える影響を比較
- [値上げ率の計算](https://price-profit-lab.pages.dev/price-increase-calculator) — 旧価格と新価格から値上げ率を計算
- [目標利益から販売価格を逆算](https://price-profit-lab.pages.dev/reverse-price-calculator) — 目標とする利益に必要な販売価格を試算

[価格設定・利益計算の解説記事](https://price-profit-lab.pages.dev/guides)も公開しています。

## Excel版

複数商品の比較や月次実績の記録には、別売りの買い切りExcelテンプレート（2,980円・税込）があります。

- [Excel版の機能と購入前の確認事項](https://price-profit-lab.pages.dev/product)
- [BOOTHの商品ページ](https://price-profit-lab.booth.pm/items/9001298)

## 計算結果について

表示される結果は入力条件に基づく試算です。将来の販売数、需要、売上、利益を保証するものではありません。実際の経営判断では税金、資金繰り、在庫なども別途考慮してください。

## 開発・動作確認

このリポジトリは静的Webサイトのソースとテストを管理しています。

- ローカルプレビュー: `python3 -m http.server 8000`
- 計算ロジックのテスト: `node test-calculator.js`
- 公開環境: Cloudflare Pages

サービスに関する案内は、個人名ではなく「価格と利益の計算室」のブランド名で行っています。
