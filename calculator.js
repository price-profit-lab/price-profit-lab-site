'use strict';
// All calculations are performed in the browser; no user input is transmitted.
const $=id=>document.getElementById(id);
const yen=n=>Number.isFinite(n)?Math.round(n).toLocaleString('ja-JP')+'円':'算出不可';
const count=n=>Number.isFinite(n)?Math.ceil(n).toLocaleString('ja-JP')+'件':'算出不可';
function calc(v){
 const {oldPrice,newPrice,unitCost,oldCount,newCount,fixedCost,rate,flatFee,target,hours}=v;
 const oldMargin=oldPrice-unitCost-oldPrice*rate/100-flatFee;
 const newMargin=newPrice-unitCost-newPrice*rate/100-flatFee;
 const before=oldMargin*oldCount-fixedCost,after=newMargin*newCount-fixedCost;
 // When zero sales already meet the target, the required quantity is zero,
 // even if the per-sale contribution margin is zero or negative.
 const required=(profit)=>profit<=-fixedCost?0:(newMargin>0?Math.max(0,Math.ceil((profit+fixedCost)/newMargin-1e-10)):NaN);
 const needed=required(before);
 const breakeven=required(0);
 const goal=required(target);
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
if(typeof document!=='undefined'&&$('oldPrice')){let used=false;fields.forEach(f=>$(f).addEventListener('input',()=>{update();if(!used&&!$('error').textContent){used=true;if(typeof gtag==='function')gtag('event','calculator_interaction');}}));const reset=$('resetSample');if(reset)reset.addEventListener('click',()=>{for(const f of fields)$(f).value=$(f).defaultValue;update();});update();}
if(typeof module!=='undefined')module.exports={calc};


