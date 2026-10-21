'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('reverse-price.js','utf8');
const defaults={target:'150000',fixedCost:'80000',quantity:'100',unitCost:'900',flatFee:'40',rate:'5'};
const elements={};
function element(id,value=''){
 return elements[id]={id,value,defaultValue:value,textContent:'',hidden:false,listeners:{},attributes:{},
  setAttribute(name,value){this.attributes[name]=value},
  addEventListener(type,fn){this.listeners[type]=fn},
  reset(){for(const [key,v] of Object.entries(defaults))elements[key].value=v},
  replaceChildren(){this.children=[]},
  append(child){(this.children??=[]).push(child)},
 };
}
for(const [id,value] of Object.entries(defaults))element(id,value);
for(const id of ['reversePricingForm','reverseReset','reverseError','reverseResult','reverseSensitivity','reversePrice','reverseProfit','reverseScenarios'])element(id);
const events=[];
const document={
 getElementById(id){return elements[id]??null},
 createElement(tag){return {tag,children:[],textContent:'',append(child){this.children.push(child)}}}
};
vm.runInNewContext(source,{document,gtag:(...args)=>events.push(args),module:{exports:{}},Number,Math});
const form=elements.reversePricingForm;
assert.equal(elements.reversePrice.textContent,'3,411円');
assert.equal(elements.reverseProfit.textContent,'150,045円');
assert.equal(elements.reverseScenarios.children.length,3);
assert.equal(elements.reverseScenarios.children[0].children[2].textContent,'4,016円');
assert.equal(elements.reverseScenarios.children[2].children[2].textContent,'3,008円');
assert.equal(events.length,0,'Initial sample display must not count as user interaction');
elements.quantity.value='80';form.listeners.input();
assert.equal(elements.reversePrice.textContent,'4,016円');
assert.equal(events.length,1);
assert.equal(events[0][1],'reverse_price_interaction');
elements.quantity.value='0';form.listeners.input();
assert.equal(elements.reverseResult.hidden,true);
assert.equal(elements.reverseSensitivity.hidden,true);
assert.ok(elements.reverseError.textContent.length>0);
assert.equal(elements.reverseError.textContent,'想定月間販売数は1以上の整数で入力してください。');
assert.equal(elements.quantity.attributes['aria-invalid'],'true');
assert.equal(events.length,1,'Invalid inputs must not trigger more events');
elements.reverseReset.listeners.click();
assert.equal(elements.quantity.value,'100');
assert.equal(elements.reverseResult.hidden,false);
assert.equal(elements.reverseSensitivity.hidden,false);
assert.equal(elements.reverseError.textContent,'');
assert.equal(elements.reversePrice.textContent,'3,411円');
assert.equal(events.length,1,'Reset must not create another interaction event');
for(const id of Object.keys(defaults)){
 assert.equal(elements[id].attributes['aria-invalid'],'false');
 assert.equal(elements[id].attributes['aria-describedby'],'reverseError');
}
for(const [id,value,message] of [
 ['target','','目標月間利益を入力してください。'],
 ['fixedCost','-1','月間固定費は0以上の数値で入力してください。'],
 ['quantity','1.5','想定月間販売数は1以上の整数で入力してください。'],
 ['quantity','-1','想定月間販売数は1以上の整数で入力してください。'],
 ['rate','100','販売手数料率は0%以上100%未満で入力してください。']
]){
 elements[id].value=value;form.listeners.input();
 assert.equal(elements.reverseError.textContent,message);
 assert.equal(elements[id].attributes['aria-invalid'],'true');
 assert.equal(elements.reverseResult.hidden,true);
 assert.equal(elements.reverseSensitivity.hidden,true);
 elements[id].value=defaults[id];form.listeners.input();
 assert.equal(elements[id].attributes['aria-invalid'],'false');
 assert.equal(elements.reverseError.textContent,'');
 assert.equal(elements.reverseResult.hidden,false);
 assert.equal(elements.reverseSensitivity.hidden,false);
 assert.equal(elements.reversePrice.textContent,'3,411円');
}
elements.target.value='1e308';form.listeners.input();
assert.match(elements.reverseError.textContent,/計算可能な範囲/);
assert.equal(elements.reverseResult.hidden,true);
elements.reverseReset.listeners.click();
assert.equal(elements.reversePrice.textContent,'3,411円');
assert.equal(events.length,1,'Error correction must not duplicate analytics events');
for(const [id,value] of Object.entries({target:'0',fixedCost:'0',quantity:'1',unitCost:'700',flatFee:'0',rate:'30'}))elements[id].value=value;
form.listeners.input();
assert.equal(elements.reversePrice.textContent,'1,000円','Whole-yen boundary must display without an extra yen');
assert.equal(elements.reverseProfit.textContent,'0円');
for(const row of elements.reverseScenarios.children)assert.equal(row.children[2].textContent,'1,000円');
elements.unitCost.value='700.0000000000001';form.listeners.input();
assert.equal(elements.reversePrice.textContent,'1,001円','A real fraction above the boundary must still round up');
elements.reverseReset.listeners.click();
assert.equal(elements.reversePrice.textContent,'3,411円');
console.log('Reverse calculator DOM and event tests passed');

