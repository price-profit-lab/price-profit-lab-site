'use strict';
function calculatePriceIncrease(oldPrice,newPrice){
 if(!Number.isFinite(oldPrice)||!Number.isFinite(newPrice)||oldPrice<=0||newPrice<0)return null;
 const amount=newPrice-oldPrice;
 const percent=amount/oldPrice*100;
 if(!Number.isFinite(amount)||!Number.isFinite(percent))return null;
 return {amount,percent};
}
if(typeof document!=='undefined'){
 const old=document.getElementById('oldPrice');
 const next=document.getElementById('newPrice');
 const error=document.getElementById('increaseError');
 const result=document.getElementById('increaseResult');
 if(old&&next&&error&&result){
  const yen=n=>Math.round(n).toLocaleString('ja-JP')+'円';
  const percent=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:2})+'%';
  let tracked=false;
  function update(){
   for(const input of [old,next]){input.setAttribute('aria-invalid','false');input.setAttribute('aria-describedby','increaseError');}
   for(const [input,label] of [[old,'現在の価格'],[next,'変更後の価格']]){
    let message='';
    if(input.value.trim()==='')message=label+'を入力してください。';
    else if(!Number.isFinite(Number(input.value))||(input===old?Number(input.value)<=0:Number(input.value)<0))message=label+(input===old?'は0円より大きい数値で入力してください。':'は0円以上の数値で入力してください。');
    if(message){input.setAttribute('aria-invalid','true');error.textContent=message;result.hidden=true;return false;}
   }
   const r=calculatePriceIncrease(Number(old.value),Number(next.value));
   if(!r){error.textContent='入力値が計算可能な範囲を超えています。現在の価格と変更後の価格を見直してください。';result.hidden=true;return false;}
   error.textContent='';result.hidden=false;
   document.getElementById('increaseAmount').textContent=(r.amount>0?'+':'')+yen(r.amount);
   document.getElementById('increasePercent').textContent=(r.percent>0?'+':'')+percent(r.percent);
   document.getElementById('increaseLabel').textContent=r.amount>0?'値上げ':r.amount<0?'値下げ':'変更なし';
   return true;
  }
  for(const input of [old,next])input.addEventListener('input',()=>{
   if(update()&&!tracked){tracked=true;if(typeof gtag==='function')gtag('event','price_increase_rate_interaction');}
  });
  const reset=document.getElementById('increaseReset');
  if(reset)reset.addEventListener('click',()=>{old.value=old.defaultValue;next.value=next.defaultValue;update();});
  update();
 }
}
if(typeof module!=='undefined')module.exports={calculatePriceIncrease};

