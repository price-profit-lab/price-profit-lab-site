'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('price-increase-calculator.js','utf8');
const m={exports:{}};
vm.runInNewContext(source,{module:m,Number,Math});
const calc=m.exports.calculatePriceIncrease;
assert.equal(calc(3000,3300).percent,10);
assert.equal(calc(3000,2700).percent,-10);
assert.equal(calc(100,100).percent,0);
assert.equal(calc(100,120).amount,20);
assert.equal(calc(0,100),null);
assert.equal(calc(-1,100),null);
assert.equal(calc(100,-1),null);
assert.equal(calc(Infinity,100),null);
assert.equal(calc(100,NaN),null);
const elements={};
function el(id,value=''){return elements[id]={value,defaultValue:value,textContent:'',hidden:false,listeners:{},attributes:{},setAttribute(name,value){this.attributes[name]=value},addEventListener(type,fn){this.listeners[type]=fn}}}
el('oldPrice','3000');el('newPrice','3300');
for(const id of ['increaseError','increaseResult','increaseAmount','increasePercent','increaseLabel','increaseReset'])el(id);
const document={getElementById(id){return elements[id]??null}};
const events=[];
vm.runInNewContext(source,{document,gtag:(...a)=>events.push(a),module:{exports:{}},Number,Math});
assert.equal(elements.increasePercent.textContent,'+10%');
assert.equal(elements.increaseAmount.textContent,'+300円');
assert.equal(events.length,0);
elements.newPrice.value='2700';elements.newPrice.listeners.input();
assert.equal(elements.increasePercent.textContent,'-10%');
assert.equal(elements.increaseLabel.textContent,'値下げ');
assert.equal(events.length,1);
assert.equal(events[0][1],'price_increase_rate_interaction');
elements.oldPrice.value='0';elements.oldPrice.listeners.input();
assert.equal(elements.increaseResult.hidden,true);
assert.ok(elements.increaseError.textContent);
assert.equal(elements.increaseError.textContent,'現在の価格は0円より大きい数値で入力してください。');
assert.equal(elements.oldPrice.attributes['aria-invalid'],'true');
elements.increaseReset.listeners.click();
assert.equal(elements.oldPrice.value,'3000');
assert.equal(elements.newPrice.value,'3300');
assert.equal(elements.increaseResult.hidden,false);
assert.equal(events.length,1);
for(const id of ['oldPrice','newPrice']){
 assert.equal(elements[id].attributes['aria-invalid'],'false');
 assert.equal(elements[id].attributes['aria-describedby'],'increaseError');
}
for(const [id,value,message] of [
 ['oldPrice','','現在の価格を入力してください。'],
 ['newPrice','','変更後の価格を入力してください。'],
 ['newPrice','-1','変更後の価格は0円以上の数値で入力してください。']
]){
 elements[id].value=value;elements[id].listeners.input();
 assert.equal(elements.increaseError.textContent,message);
 assert.equal(elements[id].attributes['aria-invalid'],'true');
 assert.equal(elements.increaseResult.hidden,true);
 elements[id].value=elements[id].defaultValue;elements[id].listeners.input();
 assert.equal(elements[id].attributes['aria-invalid'],'false');
 assert.equal(elements.increaseResult.hidden,false);
 assert.equal(elements.increaseError.textContent,'');
 assert.equal(elements.increasePercent.textContent,'+10%');
}
elements.oldPrice.value='1e-308';elements.newPrice.value='1e308';elements.oldPrice.listeners.input();
assert.match(elements.increaseError.textContent,/計算可能な範囲/);
assert.equal(elements.increaseResult.hidden,true);
elements.increaseReset.listeners.click();
assert.equal(elements.increasePercent.textContent,'+10%');
assert.equal(events.length,1,'Error correction must not duplicate analytics events');
console.log('Price increase calculator and DOM tests passed');

