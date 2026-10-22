'use strict';
(function(root){
 function build(v){
  const required=['name','menu','unit','tax','date','basis','reason','contact','bookings','tickets'];
  if(required.some(k=>!String(v[k]||'').trim()))throw Error('必須項目と、予約済み・回数券の扱いを選んでください。');
  if(!['use','booking'].includes(v.basis)||!['税込','税抜'].includes(v.tax))throw Error('適用基準と料金表示を選んでください。');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date))throw Error('適用日を確認してください。');
  const [year,month,day]=v.date.split('-').map(Number),d=new Date(Date.UTC(year,month-1,day));
  if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)throw Error('適用日を確認してください。');
  const old=Number(v.old),next=Number(v.next);
  if(!Number.isSafeInteger(old)||!Number.isSafeInteger(next)||old<=0||next<=old||next>1000000000)throw Error('料金は1円以上の整数で、新料金を旧料金より高くしてください（上限10億円）。');
  if(!['old','custom'].includes(v.bookings)||!['none','custom'].includes(v.tickets))throw Error('予約済み・回数券の扱いを選んでください。');
  if(v.bookings==='custom'&&!String(v.bookingText||'').trim())throw Error('予約済みの方に適用する、決定済みの扱いを記入してください。');
  if(v.tickets==='custom'&&!String(v.ticketText||'').trim())throw Error('回数券・継続契約の、決定済みの扱いを記入してください。');
  const date=`${year}年${month}月${day}日`;
  const from=v.basis==='use'?`${date}以降のご利用分から`:`${date}以降に受け付けるご予約から`;
  const booking=v.bookings==='old'?'このお知らせの前に受け付けたご予約は、旧料金でご利用いただけます。':v.bookingText.trim();
  const ticket=v.tickets==='custom'?`購入済みの回数券・継続契約：${v.ticketText.trim()}\n`:'';
  const money=n=>n.toLocaleString('ja-JP')+'円';
  const greeting=`いつも${v.name.trim()}をご利用いただき、ありがとうございます。`;
  const change=`${v.reason.trim()}という事情により、${from}、${v.menu.trim()}の料金を改定いたします。`;
  const detail=`対象：${v.menu.trim()}（${v.unit.trim()}）\n旧料金：${money(old)}\n新料金：${money(next)}\n料金表示：${v.tax}`;
  const end=`詳しい内容・お問い合わせ：${v.contact.trim()}\n今後ともよろしくお願いいたします。`;
  return {
   full:`料金改定のお知らせ\n\n${greeting}\n\n${change}\n\n${detail}\n\n予約済みの方：${booking}\n${ticket}\n${end}\n\n${v.name.trim()}`,
   short:`${greeting}\n\n${change}\n${v.unit.trim()}：${money(old)} → ${money(next)}（${v.tax}）\n\n予約済みの方：${booking}\n${ticket}\n${end}`
  };
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={build};
 if(!root.document)return;
 const doc=root.document,form=doc.getElementById('noticeForm');
 if(!form)return;
 form.hidden=false;
 const status=doc.getElementById('noticeStatus'),result=doc.getElementById('noticeResult');
 for(const [select,input] of [['bookings','bookingText'],['tickets','ticketText']]){
  const sync=()=>{const show=form.elements[select].value==='custom';doc.getElementById(input+'Wrap').hidden=!show;form.elements[input].required=show;};
  form.elements[select].addEventListener('change',sync);sync();
 }
 form.addEventListener('submit',e=>{
  e.preventDefault();
  try{
   const v=Object.fromEntries(new FormData(form).entries()),texts=build(v);
   doc.getElementById('fullNotice').value=texts.full;doc.getElementById('shortNotice').value=texts.short;
   result.hidden=false;status.textContent='下書きができました。日付・料金・予約済みの扱いを確認してからお使いください。';
   result.focus();
  }catch(err){status.textContent=err.message;result.hidden=true;}
 });
 form.addEventListener('input',()=>{if(!result.hidden){result.hidden=true;status.textContent='入力が変わりました。「文面を作る」を押すと更新します。';}});
 for(const button of doc.querySelectorAll('[data-copy]'))button.addEventListener('click',async()=>{
  const area=doc.getElementById(button.dataset.copy);
  try{await root.navigator.clipboard.writeText(area.value);status.textContent='文面をコピーしました。';}
  catch(_){area.focus();area.select();status.textContent='文面を選択しました。端末のコピー操作をお使いください。';}
 });
 doc.getElementById('downloadNotice').addEventListener('click',()=>{
  const blob=new Blob([doc.getElementById('fullNotice').value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=doc.createElement('a');
  a.href=url;a.download='price-change-notice.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
})(typeof window==='undefined'?globalThis:window);
