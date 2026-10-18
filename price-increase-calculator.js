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
   if(old.value.trim()===''||next.value.trim()===''){error.textContent='現在の価格と変更後の価格を入力してください。';result.hidden=true;return false;}
   const r=calculatePriceIncrease(Number(old.value),Number(next.value));
   if(!r){error.textContent='現在の価格は0円より大きい値、変更後の価格は0円以上を入力してください。';result.hidden=true;return false;}
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
