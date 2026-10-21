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
 const scenarios=doc.getElementById('cancellationScenarios');
 const money=n=>(Object.is(n,-0)?0:n).toLocaleString('ja-JP',{maximumFractionDigits:2})+'円';
 const count=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:2})+'件';
 const examples={
  'example-capacity-80':{label:'予約80件・料金6,261円',price:6261,bookings:80},
  'example-capacity-64':{label:'予約64件・料金7,155円',price:7155,bookings:64},
  'example-capacity-48':{label:'予約48件・料金8,647円',price:8647,bookings:48}
 };
 const exampleStatus=doc.getElementById('cancellationExampleStatus');
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
  scenarios.replaceChildren();
  const rates=[...new Set([0,5,10,20,values.cancellation])].sort((a,b)=>a-b);
  for(const rate of rates){
   const scenario=calculateCancellation({...values,cancellation:rate});
   const row=doc.createElement('tr');
   const rateCell=doc.createElement('th');rateCell.setAttribute('scope','row');
   rateCell.textContent=String(rate)+'％'+(rate===values.cancellation?'（入力中）':'');row.append(rateCell);
   for(const text of [count(scenario.completed),money(scenario.profit),(scenario.profitChange>0?'+':'')+money(scenario.profitChange)]){
    const cell=doc.createElement('td');cell.textContent=text;row.append(cell);
   }
   scenarios.append(row);
  }
  return true;
 }
 function interact(){
  if(update()&&!tracked){tracked=true;if(typeof gtag==='function')gtag('event','cancellation_calculator_interaction');}
 }
 function setExample(id,manual){
  if(!Object.hasOwn(examples,id))return;
  const example=examples[id];
  const values={price:example.price,cost:2600,fee:3,fixed:50000,bookings:example.bookings,cancellation:10};
  for(const [key,value] of Object.entries(values))inputs[key].value=String(value);
  if(exampleStatus)exampleStatus.textContent=example.label+'の架空例を入力しました。数値は自由に変更できます。';
  if(manual)interact();else update();
 }
 for(const input of Object.values(inputs))input.addEventListener('input',interact);
 const exampleControls=doc.getElementById('cancellationExamples');
 if(exampleControls)exampleControls.hidden=false;
 for(const id of Object.keys(examples)){
  const button=doc.getElementById(id);
  if(button)button.addEventListener('click',()=>setExample(id,true));
 }
 doc.getElementById('cancellationReset').addEventListener('click',()=>{
  for(const input of Object.values(inputs))input.value=input.defaultValue;
  if(exampleStatus)exampleStatus.textContent='基本サンプルに戻しました。';
  update();
 });
 update();
 // Only fixed public examples are accepted. Never parse amounts from a URL.
 const hash=doc.defaultView&&doc.defaultView.location?doc.defaultView.location.hash:'';
 const id=hash.slice(1);
 if(Object.hasOwn(examples,id)){
  setExample(id,false);
  if(typeof form.scrollIntoView==='function')form.scrollIntoView({behavior:'instant',block:'start'});
 }
}
if(typeof document!=='undefined')initCancellationCalculator(document);
if(typeof module!=='undefined')module.exports={calculateCancellation,initCancellationCalculator};

