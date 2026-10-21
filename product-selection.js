'use strict';
(function () {
  const box = document.getElementById('product-selection');
  if (!box) return;
  const form = document.getElementById('selectionForm');
  const method = document.getElementById('selectionMethod');
  const details = document.getElementById('selectionDetails');
  const environment = document.getElementById('selectionEnvironment');
  const purpose = document.getElementById('selectionPurpose');
  const result = document.getElementById('selectionResult');
  const heading = document.getElementById('selectionHeading');
  const text = document.getElementById('selectionText');
  const link = document.getElementById('selectionLink');
  function clearResult() { result.hidden = true; }
  function updateQuestions() {
    const spreadsheet = method.value === 'excel';
    details.hidden = !spreadsheet;
    environment.required = spreadsheet;
    purpose.required = spreadsheet;
    clearResult();
  }
  method.addEventListener('change', updateQuestions);
  environment.addEventListener('change', clearResult);
  purpose.addEventListener('change', clearResult);
  // Only fixed links and copy are shown. No answers enter URLs, storage or analytics.
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    let answer;
    if (method.value === 'free') {
      answer = ['まずは無料ツールから', '一度の試算なら、無料の5ツールから目的に合うものを選べます。Excel商品の購入は不要です。', 'index.html#tool-choice', '無料ツールの使い分けを見る'];
    } else if (purpose.value === 'outside') {
      answer = ['必要な機能が、このExcelの対象外です', '会計帳簿・確定申告、在庫や資金繰りの自動管理、予約受付・日別カレンダー管理には対応していません。この用途を目的に購入しないでください。', 'product.html#check', '購入前の確認事項を見る'];
    } else if (environment.value !== 'pc') {
      answer = ['先に利用環境をご確認ください', '有料商品にはPCのMicrosoft Excelが別途必要です。スマホだけでの利用や、Numbers・Googleスプレッドシートでの動作は確認していません。環境が決まるまでは無料Webツールを利用できます。', 'index.html#tool-choice', '無料ツールを確認する'];
    } else if (purpose.value === 'merchandise') {
      answer = ['物販向けExcelが用途の候補です｜2,980円', '最大20商品の価格比較と、12か月の実績を手入力で記録する商品です。予約枠・キャンセル率の専用試算はありません。下の比較表と動作確認環境を確認してから判断してください。', 'product-help.html', '物販向けExcelの入力方法を見る'];
    } else if (purpose.value === 'standard') {
      answer = ['サービス業向けStandardが用途の候補です｜1,480円', '1種類のサービスで、料金改定・キャンセル・提供枠を試算する用途です。12か月の実績管理は含みません。購入前に機能と動作確認環境をご確認ください。', 'service-excel.html', 'Standard／Proの機能・環境を見る'];
    } else if (purpose.value === 'pro') {
      answer = ['サービス業向けProが用途の候補です｜2,980円', '最大6サービスの比較や、条件を単独で変えた改善施策の比較を行う用途です。Standardの基本機能を含むので両方の購入は不要です。12か月の実績管理は含みません。', 'service-excel.html', 'Standard／Proの機能・環境を見る'];
    }
    if (!answer) return;
    heading.textContent = answer[0];
    text.textContent = answer[1];
    link.setAttribute('href', answer[2]);
    link.textContent = answer[3];
    result.hidden = false;
    heading.focus();
  });
  form.addEventListener('reset', () => {
    details.hidden = true;
    environment.required = false;
    purpose.required = false;
    clearResult();
    method.focus();
  });
  updateQuestions();
  box.hidden = false;
})();
