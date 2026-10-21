'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const defaults={oldPrice:'3000',newPrice:'3300',unitCost:'900',oldCount:'100',newCount:'90',fixedCost:'80000',rate:'0',flatFee:'0',target:'150000',hours:'100'};
const elements={};
function element(id,value=''){
 return elements[id]={id,value,defaultValue:value,textContent:'',hidden:false,className:'',listeners:{},children:[],attributes:{},
 setAttribute(name,value){this.attributes[name]=value},
 addEventListener(type,fn){this.listeners[type]=fn},
 replaceChildren(){this.children=[]},
 append(child){this.children.push(child)}};
}
for(const [id,value] of Object.entries(defaults))element(id,value);
for(const id of ['error','results','before','after','diff','hourly','needed','breakeven','goal','scenarios','resetSample'])element(id);
const events=[];
const document={getElementById(id){return elements[id]??null},createElement(tag){return {tag,children:[],textContent:'',append(child){this.children.push(child)}}}};
vm.runInNewContext(fs.readFileSync('calculator.js','utf8'),{document,gtag:(...args)=>events.push(args),module:{exports:{}},Number,Math});
assert.equal(elements.before.textContent,'130,000円');
assert.equal(elements.after.textContent,'136,000円');
assert.equal(elements.needed.textContent,'88件');
assert.equal(elements.scenarios.children.length,9);
assert.equal(events.length,0,'Initial sample is not a manual interaction');
elements.newPrice.value='3500';elements.newPrice.listeners.input();
assert.equal(elements.after.textContent,'154,000円');
assert.equal(events.length,1);
assert.equal(events[0][1],'calculator_interaction');
elements.oldCount.value='2.5';elements.oldCount.listeners.input();
assert.equal(elements.results.hidden,true);
assert.ok(elements.error.textContent);
assert.equal(elements.error.textContent,'現在の月間販売数は0以上の整数で入力してください。');
assert.equal(elements.oldCount.attributes['aria-invalid'],'true');
assert.equal(events.length,1);
elements.resetSample.listeners.click();
assert.equal(elements.oldCount.value,'100');
assert.equal(elements.newPrice.value,'3300');
assert.equal(elements.results.hidden,false);
assert.equal(elements.error.textContent,'');
assert.equal(elements.after.textContent,'136,000円');
assert.equal(events.length,1,'Reset must not count as a second manual interaction');
for(const id of Object.keys(defaults)){
 assert.equal(elements[id].attributes['aria-invalid'],'false','Reset clears invalid state: '+id);
 assert.equal(elements[id].attributes['aria-describedby'],'error');
}
for(const [id,value,message] of [
 ['newPrice','','変更後の単価を入力してください。'],
 ['fixedCost','-1','月間固定費は0以上の数値で入力してください。'],
 ['rate','101','販売手数料率は0%以上100%以下で入力してください。'],
 ['newCount','1.5','変更後の想定販売数は0以上の整数で入力してください。']
]){
 elements[id].value=value;elements[id].listeners.input();
 assert.equal(elements.error.textContent,message);
 assert.equal(elements.results.hidden,true,'Invalid inputs hide outdated results');
 assert.equal(elements[id].attributes['aria-invalid'],'true');
 for(const other of Object.keys(defaults))if(other!==id)assert.equal(elements[other].attributes['aria-invalid'],'false');
 elements[id].value=defaults[id];elements[id].listeners.input();
 assert.equal(elements.error.textContent,'');
 assert.equal(elements.results.hidden,false);
 assert.equal(elements[id].attributes['aria-invalid'],'false');
 assert.equal(elements.after.textContent,'136,000円');
}
assert.equal(events.length,1,'Validation and correction do not duplicate interaction events');
console.log('Main calculator DOM and GA4 event tests passed');

function examplePage(hash){
 const els={};
 for(const [id,source] of Object.entries(elements))els[id]={...source,value:defaults[id]||'',defaultValue:defaults[id]||'',textContent:'',hidden:false,listeners:{},children:[],attributes:{}};
 for(const id of ['example-shop','example-discount','exampleStatus'])els[id]={...els.error,id,listeners:{},children:[],attributes:{}};
 const calls=[];
 vm.runInNewContext(fs.readFileSync('calculator.js','utf8'),{
  document:{getElementById:id=>els[id]||null,createElement:document.createElement},
  location:{hash},gtag:(...args)=>calls.push(args),module:{exports:{}}
 });
 return {els,calls};
}
const discount=examplePage('#example-discount');
assert.equal(discount.els.newPrice.value,'2700');
assert.equal(discount.els.newCount.value,'128');
assert.equal(discount.els.before.textContent,'101,000円');
assert.equal(discount.els.after.textContent,'101,200円');
assert.equal(discount.els.needed.textContent,'128件');
assert.equal(discount.calls.length,0,'Opening an article example is not manual calculator interaction');
discount.els.oldCount.value='1.5';discount.els.oldCount.listeners.input();
assert.equal(discount.els.results.hidden,true);
discount.els['example-shop'].listeners.click();
assert.equal(discount.els.results.hidden,false);
assert.equal(discount.els.error.textContent,'');
assert.equal(discount.els.unitCost.value,'1300');
assert.equal(discount.els.after.textContent,'102,575円');
assert.equal(discount.els.needed.textContent,'85件');
assert.equal(discount.calls.length,1,'A sample button is one manual interaction');
assert.deepEqual(Array.from(discount.calls[0]),['event','calculator_interaction'],'No input values are sent');
discount.els['example-discount'].listeners.click();
assert.equal(discount.calls.length,1,'Switching samples must not duplicate the interaction event');
discount.els.resetSample.listeners.click();
for(const [id,value] of Object.entries(defaults))assert.equal(discount.els[id].value,value,'Reset restores base values after presets: '+id);
assert.equal(discount.els.after.textContent,'136,000円');
assert.equal(discount.calls.length,1);
const shop=examplePage('#example-shop');
assert.equal(shop.els.after.textContent,'102,575円');
assert.equal(shop.calls.length,0);
for(const hash of ['#unknown','#constructor','#example-discount?newPrice=1']){
 const unknown=examplePage(hash);
 assert.equal(unknown.els.newPrice.value,'3300','Only exact allowlisted sample labels can set inputs');
 assert.equal(unknown.els.after.textContent,'136,000円');
}
console.log('Article presets, valid input recovery, reset and event privacy checks passed');

