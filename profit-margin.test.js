'use strict';
const assert=require('node:assert/strict');
const {calculateMargin,initMarginCalculator}=require('./profit-margin.js');
const sample={price:1600,cost:1200,fee:5,flat:40,target:25};
const r=calculateMargin(sample);
assert.equal(r.margin,25);assert.equal(r.net,280);assert.equal(r.netRate,17.5);assert.equal(r.targetPrice,1772);
assert.equal(calculateMargin({...sample,price:1500}).markup,25);
assert.equal(calculateMargin({...sample,price:1500}).margin,20);
for(const cost of [0,.01,7,1200,999999999.99])for(const fee of [0,.01,5,99.98])for(const target of [0,.01,25,99.98]){
 const v={...sample,cost,fee,target};const actual=calculateMargin(v);
 const den=10000n-BigInt(Math.round(fee*100))-BigInt(Math.round(target*100));
 if(den<=0n){assert.equal(actual.targetPrice,null);continue;}
 const rhs=BigInt(Math.round(cost*100)+4000)*100n;
 assert.ok(BigInt(actual.targetPrice)*den>=rhs,'Rounded price must meet target');
 if(actual.targetPrice>1)assert.ok(BigInt(actual.targetPrice-1)*den<rhs,'One yen below must miss target');
}
assert.equal(calculateMargin({...sample,cost:0}).markup,null);
assert.equal(calculateMargin({...sample,cost:0,flat:0,target:0}).targetPrice,1);
assert.equal(calculateMargin({...sample,cost:2000}).net,-520);
assert.equal(calculateMargin({...sample,fee:100}).targetPrice,null);
for(const key of Object.keys(sample))for(const n of [-1,NaN,Infinity,.001,1e10])assert.equal(calculateMargin({...sample,[key]:n}).field,key);
assert.equal(calculateMargin({...sample,price:0}).field,'price');
const els={},calls=[];
for(const [key,value] of Object.entries(sample))els['margin-'+key]={value:String(value),defaultValue:String(value),attributes:{},setAttribute(k,v){this.attributes[k]=v}};
for(const id of ['marginForm','marginError','marginResult','marginReset','margin-difference','margin-margin','margin-markup','margin-net','margin-netRate','margin-targetPrice','marginTargetNote'])els[id]={textContent:'',hidden:false,listeners:{},addEventListener(k,f){this.listeners[k]=f}};
els.marginForm.reset=()=>{for(const key of Object.keys(sample)){const e=els['margin-'+key];e.value=e.defaultValue}};
global.gtag=(...args)=>calls.push(args);
initMarginCalculator({getElementById:id=>els[id]});
assert.equal(els['margin-targetPrice'].textContent,'1,772円');assert.equal(calls.length,0);
els['margin-price'].value='';els.marginForm.listeners.input();assert.equal(els.marginResult.hidden,true);assert.equal(calls.length,0);
els['margin-price'].value='1500';els.marginForm.listeners.input();assert.equal(els.marginResult.hidden,false);assert.equal(els['margin-margin'].textContent,'20％');
assert.deepEqual(calls,[['event','profit_margin_interaction']],'Only event name, never input data');
els['margin-target'].value='95';els.marginForm.listeners.input();assert.equal(els['margin-targetPrice'].textContent,'算出不可');assert.equal(els['margin-net'].textContent,'185円');
els.marginReset.listeners.click();assert.equal(els['margin-net'].textContent,'280円');assert.equal(els.marginError.textContent,'');assert.equal(calls.length,1);
delete global.gtag;initMarginCalculator({getElementById:id=>els[id]});els.marginForm.listeners.input();
console.log('Margin calculations, 80 target boundaries, validation, DOM recovery/reset and analytics privacy passed');
