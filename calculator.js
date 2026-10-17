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
 const needed=newMargin>0?Math.max(0,Math.ceil((before+fixedCost)/newMargin-1e-10)):NaN;
 const breakeven=newMargin>0?Math.max(0,Math.ceil(fixedCost/newMargin-1e-10)):NaN;
 const goal=newMargin>0?Math.max(0,Math.ceil((target+fixedCost)/newMargin-1e-10)):NaN;
 return {before,after,diff:after-before,needed,breakeven,goal,hourly:hours>0?after/hours:NaN,oldMargin,newMargin};
}
const fields=['oldPrice','newPrice','unitCost','oldCount','newCount','fixedCost','rate','flatFee','target','hours'];
function update(){const v={};for(const f of fields){const el=$(f),n=Number(el.value);if(el.value.trim()===''||!Number.isFinite(n)||n<0||(f==='rate'&&n>100)||(f==='oldCount'&& !Number.isInteger(n))||(f==='newCount'&&!Number.isInteger(n))){$('error').textContent='入力欄には0以上の数値を入力してください。手数料率は0〜100%、販売数は整数です。';$('results').hidden=true;return;}v[f]=n;}
 $('error').textContent='';$('results').hidden=false;const r=calc(v);
 for(const [id,val] of Object.entries({before:r.before,after:r.after,diff:r.diff,hourly:r.hourly}))$(id).textContent=yen(val);
 for(const [id,val] of Object.entries({needed:r.needed,breakeven:r.breakeven,goal:r.goal}))$(id).textContent=count(val);
 $('diff').className=r.diff>=0?'good':'bad';
 const rows=[0,5,10,15,20,25,30,40,50];$('scenarios').replaceChildren();for(const pct of rows){const qty=Math.floor(v.oldCount*(1-pct/100));const p=r.newMargin*qty-v.fixedCost;const tr=document.createElement('tr');for(const s of [pct+'%',qty.toLocaleString('ja-JP')+'件',yen(p),yen(p-r.before)]){const td=document.createElement('td');td.textContent=s;tr.append(td)}$('scenarios').append(tr)}
}
if(typeof document!=='undefined'&&$('oldPrice')){fields.forEach(f=>$(f).addEventListener('input',update));update();}
if(typeof module!=='undefined')module.exports={calc};
