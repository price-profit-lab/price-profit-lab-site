'use strict';
// All calculations are performed in the browser; no user input is transmitted.
const $=id=>document.getElementById(id);
const yen=n=>Number.isFinite(n)?Math.round(n).toLocaleString('ja-JP')+'円':'算出不可';
const count=n=>Number.isFinite(n)?Math.ceil(n).toLocaleString('ja-JP')+'件':'算出不可';
// Use the decimal input values for whole-sale decisions, without an epsilon.
function requiredSales(v){
 const parts=value=>{const [m,e='0']=value.toString().split('e');const [w,f='']=m.split('.');return {n:BigInt(w+f),p:Number(e)-f.length};};
 const values=[v.oldPrice,v.newPrice,v.unitCost,v.flatFee,v.fixedCost,v.target].map(parts);
 const places=Math.max(0,...values.map(x=>-x.p));
 const [oldPrice,newPrice,cost,flat,fixed,target]=values.map(x=>x.n*10n**BigInt(x.p+places));
 const fee=parts(v.rate),feePlaces=Math.max(0,-fee.p);
 const hundred=100n*10n**BigInt(feePlaces);
 const remaining=hundred-fee.n*10n**BigInt(fee.p+feePlaces);
 const margin=price=>price*remaining-(cost+flat)*hundred;
 const newMargin=margin(newPrice);
 const required=n=>{
  if(n<=0n)return 0;
  if(newMargin<=0n)return NaN;
  const quantity=Number((n+newMargin-1n)/newMargin);
  return Number.isSafeInteger(quantity)?quantity:NaN;
 };
 return {needed:required(margin(oldPrice)*BigInt(v.oldCount)),breakeven:required(fixed*hundred),goal:required((target+fixed)*hundred)};
}
function calc(v){
 const {oldPrice,newPrice,unitCost,oldCount,newCount,fixedCost,rate,flatFee,target,hours}=v;
 const oldMargin=oldPrice-unitCost-oldPrice*rate/100-flatFee;
 const newMargin=newPrice-unitCost-newPrice*rate/100-flatFee;
 const before=oldMargin*oldCount-fixedCost,after=newMargin*newCount-fixedCost;
 const {needed,breakeven,goal}=requiredSales(v);
 return {before,after,diff:after-before,needed,breakeven,goal,hourly:hours>0?after/hours:NaN,oldMargin,newMargin};
}
const fields=['oldPrice','newPrice','unitCost','oldCount','newCount','fixedCost','rate','flatFee','target','hours'];
const fieldLabels={oldPrice:'現在の単価',newPrice:'変更後の単価',unitCost:'1件あたり変動費',oldCount:'現在の月間販売数',newCount:'変更後の想定販売数',fixedCost:'月間固定費',rate:'販売手数料率',flatFee:'1件あたり定額手数料',target:'目標月間利益',hours:'月間作業時間'};
function update(){
 const v={};
 for(const f of fields){$(f).setAttribute('aria-invalid','false');$(f).setAttribute('aria-describedby','error');}
 for(const f of fields){
  const el=$(f),n=Number(el.value);
  let message='';
  if(el.value.trim()==='')message=fieldLabels[f]+'を入力してください。';
  else if(!Number.isFinite(n)||n<0)message=fieldLabels[f]+'は0以上の数値で入力してください。';
  else if(f==='rate'&&n>100)message='販売手数料率は0%以上100%以下で入力してください。';
  else if((f==='oldCount'||f==='newCount')&&!Number.isInteger(n))message=fieldLabels[f]+'は0以上の整数で入力してください。';
  if(message){el.setAttribute('aria-invalid','true');$('error').textContent=message;$('results').hidden=true;return;}
  v[f]=n;
 }
 $('error').textContent='';$('results').hidden=false;const r=calc(v);
 for(const [id,val] of Object.entries({before:r.before,after:r.after,diff:r.diff,hourly:r.hourly}))$(id).textContent=yen(val);
 for(const [id,val] of Object.entries({needed:r.needed,breakeven:r.breakeven,goal:r.goal}))$(id).textContent=count(val);
 $('diff').className=r.diff>=0?'good':'bad';
 const rows=[0,5,10,15,20,25,30,40,50];$('scenarios').replaceChildren();for(const pct of rows){const qty=Math.floor(v.oldCount*(100-pct)/100);const p=r.newMargin*qty-v.fixedCost;const tr=document.createElement('tr');for(const s of [pct+'%',qty.toLocaleString('ja-JP')+'件',yen(p),yen(p-r.before)]){const td=document.createElement('td');td.textContent=s;tr.append(td)}$('scenarios').append(tr)}
}
if(typeof document!=='undefined'&&$('oldPrice')){
 let used=false;
 const interact=()=>{update();if(!used&&!$('error').textContent){used=true;if(typeof gtag==='function')gtag('event','calculator_interaction');}};
 const examples={
  'example-shop':{label:'手数料のあるネット販売',values:{oldPrice:3000,newPrice:3300,unitCost:1300,oldCount:100,newCount:85,fixedCost:50000,rate:5,flatFee:40,target:101000,hours:0}},
  'example-discount':{label:'10％値引き',values:{oldPrice:3000,newPrice:2700,unitCost:1500,oldCount:100,newCount:128,fixedCost:30000,rate:5,flatFee:40,target:101000,hours:0}}
 };
 const setExample=(id,manual)=>{
  if(!Object.hasOwn(examples,id))return;
  const example=examples[id];fields.forEach(field=>{$(field).value=String(example.values[field]);});
  if(manual)interact();else update();
  if($('exampleStatus'))$('exampleStatus').textContent=example.label+'の架空例を入力しました。数値は自由に変更できます。';
 };
 fields.forEach(f=>$(f).addEventListener('input',interact));
 for(const id of Object.keys(examples)){const button=$(id);if(button)button.addEventListener('click',()=>setExample(id,true));}
 const reset=$('resetSample');if(reset)reset.addEventListener('click',()=>{for(const f of fields)$(f).value=$(f).defaultValue;if($('exampleStatus'))$('exampleStatus').textContent='基本サンプルに戻しました。';update();});
 update();
 // Only fixed, public example labels are accepted; never read amounts from URLs.
 if(typeof location!=='undefined'){
  const id=location.hash.slice(1);
  if(Object.hasOwn(examples,id)){
   setExample(id,false);
   const calculator=$('calculator');
   if(calculator)calculator.scrollIntoView({behavior:'instant',block:'start'});
  }
 }
}
if(typeof module!=='undefined')module.exports={calc};


