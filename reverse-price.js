'use strict';
// Reverse-pricing calculation; values are yen, quantities and percentages.
function reversePrice(v){
 const {target,fixedCost,quantity,unitCost,flatFee,rate}=v;
 if(![target,fixedCost,quantity,unitCost,flatFee,rate].every(Number.isFinite)||
    target<0||fixedCost<0||unitCost<0||flatFee<0||quantity<=0||
    !Number.isInteger(quantity)||rate<0||rate>=100)return null;
 const exact=((target+fixedCost)/quantity+unitCost+flatFee)/(1-rate/100);
 if(!Number.isFinite(exact)||exact<0)return null;
 const price=Math.ceil(exact);
 if(!Number.isSafeInteger(price))return null;
 const monthlyProfit=(price*(1-rate/100)-unitCost-flatFee)*quantity-fixedCost;
 if(!Number.isFinite(monthlyProfit))return null;
 return {price,monthlyProfit,exact};
}
if(typeof document!=='undefined'){
 const ids=['target','fixedCost','quantity','unitCost','flatFee','rate'];
 const labels={target:'目標月間利益',fixedCost:'月間固定費',quantity:'想定月間販売数',unitCost:'1件あたり変動費',flatFee:'1件あたり定額手数料',rate:'販売手数料率'};
 const form=document.getElementById('reversePricingForm');
 if(form){
  const fmt=n=>Math.round(n).toLocaleString('ja-JP')+'円';
  function update(){
   const v={};
   for(const id of ids){const el=document.getElementById(id);el.setAttribute('aria-invalid','false');el.setAttribute('aria-describedby','reverseError');}
   for(const id of ids){
    const el=document.getElementById(id),n=Number(el.value);
    if(el.value.trim()===''){showError(labels[id]+'を入力してください。',id);return;}
    if(id==='quantity'&&(!Number.isFinite(n)||n<=0||!Number.isInteger(n))){showError('想定月間販売数は1以上の整数で入力してください。',id);return;}
    if(id==='rate'&&(!Number.isFinite(n)||n<0||n>=100)){showError('販売手数料率は0%以上100%未満で入力してください。',id);return;}
    if(!Number.isFinite(n)||n<0){showError(labels[id]+'は0以上の数値で入力してください。',id);return;}
    v[id]=n;
   }
   const r=reversePrice(v);
   if(!r){showError('入力値が計算可能な範囲を超えています。価格・費用・販売数・手数料率を見直してください。');return;}
   document.getElementById('reverseError').textContent='';
   document.getElementById('reverseResult').hidden=false;
   document.getElementById('reverseSensitivity').hidden=false;
   document.getElementById('reversePrice').textContent=fmt(r.price);
   document.getElementById('reverseProfit').textContent=fmt(r.monthlyProfit);
   const scenarios=document.getElementById('reverseScenarios');
   if(scenarios){
    scenarios.replaceChildren();
    for(const pct of [80,100,120]){
     const qty=Math.max(1,Math.floor(v.quantity*pct/100));
     const result=reversePrice({...v,quantity:qty});
     const tr=document.createElement('tr');
     for(const value of [pct+'%',qty.toLocaleString('ja-JP')+'件',result?fmt(result.price):'算出不可']){
      const td=document.createElement('td');td.textContent=value;tr.append(td);
     }
     scenarios.append(tr);
    }
   }
  }
  function showError(message,id){
   if(id)document.getElementById(id).setAttribute('aria-invalid','true');
   document.getElementById('reverseError').textContent=message;
   document.getElementById('reverseResult').hidden=true;
   document.getElementById('reverseSensitivity').hidden=true;
  }
  let tracked=false;
  form.addEventListener('input',()=>{update();if(!tracked&&!document.getElementById('reverseError').textContent){tracked=true;if(typeof gtag==='function')gtag('event','reverse_price_interaction');}});
  document.getElementById('reverseReset').addEventListener('click',()=>{form.reset();update();});
  update();
 }
}
if(typeof module!=='undefined')module.exports={reversePrice};

