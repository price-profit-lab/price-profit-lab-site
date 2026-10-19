'use strict';
const cancellationFields={
 price:{label:'1件の料金',max:1000000000},
 cost:{label:'実施1件あたりの費用',max:1000000000},
 fee:{label:'売上にかかる手数料率',max:100},
 fixed:{label:'月間固定費',max:1000000000000},
 bookings:{label:'月間予約件数',max:1000000,integer:true},
 cancellation:{label:'想定キャンセル率',max:100}
};
function calculateCancellation(input){
 for(const [key,rule] of Object.entries(cancellationFields)){
  const n=input[key];
  if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>rule.max||(rule.integer&&!Number.isInteger(n))){
   return {error:rule.label+'は0以上'+rule.max.toLocaleString('ja-JP')+'以下の'+(rule.integer?'整数':'数値')+'で入力してください。',field:key};
  }
 }
 const margin=input.price*(1-input.fee/100)-input.cost;
 const cancelled=input.bookings*input.cancellation/100;
 const completed=input.bookings-cancelled;
 const baseline=margin*input.bookings-input.fixed;
 const profit=margin*completed-input.fixed;
 return {margin,cancelled,completed,baseline,profit,profitChange:-margin*cancelled,lostSales:input.price*cancelled};
}
function initCancellationCalculator(doc){
 const form=doc.getElementById('cancellationForm');
 if(!form)return;
 const inputs=Object.fromEntries(Object.keys(cancellationFields).map(key=>[key,doc.getElementById('cancel-'+key)]));
 const error=doc.getElementById('cancellationError');
 const result=doc.getElementById('cancellationResult');
 const warning=doc.getElementById('cancellationWarning');
 const money=n=>(Object.is(n,-0)?0:n).toLocaleString('ja-JP',{maximumFractionDigits:2})+'円';
 const count=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:2})+'件';
 let tracked=false;
 function update(){
  error.textContent='';
  for(const input of Object.values(inputs))input.setAttribute('aria-invalid','false');
  const values={};
  for(const [key,input] of Object.entries(inputs)){
   if(input.value.trim()===''){
    error.textContent=cancellationFields[key].label+'を入力してください。';
    input.setAttribute('aria-invalid','true');result.hidden=true;return false;
   }
   values[key]=Number(input.value);
  }
  const r=calculateCancellation(values);
  if(r.error){error.textContent=r.error;inputs[r.field].setAttribute('aria-invalid','true');result.hidden=true;return false;}
  result.hidden=false;
  for(const key of ['baseline','profit','profitChange','lostSales','margin']){
   doc.getElementById('cancel-result-'+key).textContent=(key==='profitChange'&&r[key]>0?'+':'')+money(r[key]);
  }
  doc.getElementById('cancel-result-completed').textContent=count(r.completed);
  doc.getElementById('cancel-result-cancelled').textContent=count(r.cancelled);
  doc.getElementById('cancel-result-profitChange').className=r.profitChange<0?'bad':r.profitChange>0?'good':'';
  warning.hidden=r.margin>0;
  warning.textContent=r.margin<0?'1件あたりの残額がマイナスです。この条件では実施するほど赤字が増えるため、キャンセル後の参考利益が高く表示されます。料金や費用の入力を見直してください。':r.margin===0?'1件あたりの残額が0円のため、件数が変わっても参考利益は変わりません。':'';
  return true;
 }
 for(const input of Object.values(inputs))input.addEventListener('input',()=>{
  if(update()&&!tracked){tracked=true;if(typeof gtag==='function')gtag('event','cancellation_calculator_interaction');}
 });
 doc.getElementById('cancellationReset').addEventListener('click',()=>{
  for(const input of Object.values(inputs))input.value=input.defaultValue;
  update();
 });
 update();
}
if(typeof document!=='undefined')initCancellationCalculator(document);
if(typeof module!=='undefined')module.exports={calculateCancellation,initCancellationCalculator};
