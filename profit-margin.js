'use strict';
const marginRules={price:{label:'販売価格',max:1e9,positive:true},cost:{label:'1件あたり原価・変動費',max:1e9},fee:{label:'販売手数料率',max:100},flat:{label:'1件あたり定額手数料',max:1e9},target:{label:'目標とする残額の率',max:100}};
function calculateMargin(v){
 for(const [key,rule] of Object.entries(marginRules)){
  const n=v[key];
  if(!Number.isFinite(n)||n<0||n>rule.max||(rule.positive&&n===0)||Number(n.toFixed(2))!==n)return {error:rule.label+'は'+(rule.positive?'0より大きく':'0以上')+rule.max.toLocaleString('ja-JP')+'以下、小数第2位までの数値で入力してください。',field:key};
 }
 const price=BigInt(Math.round(v.price*100)),cost=BigInt(Math.round(v.cost*100)),flat=BigInt(Math.round(v.flat*100));
 const fee=BigInt(Math.round(v.fee*100)),target=BigInt(Math.round(v.target*100));
 const net=Number(price*(10000n-fee)-(cost+flat)*10000n)/1e6;
 const denominator=10000n-fee-target;
 // Integer arithmetic avoids an extra yen from floating-point ceiling errors.
 const numerator=(cost+flat)*100n;
 const targetPrice=denominator>0n?Math.max(1,Number((numerator+denominator-1n)/denominator)):null;
 return {difference:v.price-v.cost,margin:(v.price-v.cost)/v.price*100,markup:v.cost===0?null:(v.price-v.cost)/v.cost*100,net,netRate:net/v.price*100,targetPrice};
}
function initMarginCalculator(doc){
 const form=doc.getElementById('marginForm');if(!form)return;
 const el=id=>doc.getElementById(id),inputs=Object.fromEntries(Object.keys(marginRules).map(k=>[k,el('margin-'+k)]));
 const money=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:2})+'円';
 const percent=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:2})+'％';
 let tracked=false;
 function update(){
  el('marginError').textContent='';
  for(const input of Object.values(inputs))input.setAttribute('aria-invalid','false');
  const v={};
  for(const [key,input] of Object.entries(inputs)){
   if(input.value.trim()===''){el('marginError').textContent=marginRules[key].label+'を入力してください。';input.setAttribute('aria-invalid','true');el('marginResult').hidden=true;return false;}
   v[key]=Number(input.value);
  }
  const r=calculateMargin(v);
  if(r.error){el('marginError').textContent=r.error;inputs[r.field].setAttribute('aria-invalid','true');el('marginResult').hidden=true;return false;}
  el('marginResult').hidden=false;
  for(const key of ['difference','net'])el('margin-'+key).textContent=money(r[key]);
  for(const key of ['margin','netRate'])el('margin-'+key).textContent=percent(r[key]);
  el('margin-markup').textContent=r.markup===null?'算出不可（原価0円）':percent(r.markup);
  el('margin-targetPrice').textContent=r.targetPrice===null?'算出不可':money(r.targetPrice);
  el('marginTargetNote').textContent=r.targetPrice===null?'この逆算式では算出できません。手数料率と目標の率の合計を100％未満にしてください。':'1円単位で切り上げた売価です（最低1円）。手数料の端数処理・固定費は含みません。';
  el('margin-net').className=r.net<0?'bad':'good';
  return true;
 }
 form.addEventListener('input',()=>{if(update()&&!tracked){tracked=true;if(typeof gtag==='function')gtag('event','profit_margin_interaction');}});
 el('marginReset').addEventListener('click',()=>{form.reset();update();});
 update();
}
if(typeof document!=='undefined')initMarginCalculator(document);
if(typeof module!=='undefined')module.exports={calculateMargin,initMarginCalculator};
