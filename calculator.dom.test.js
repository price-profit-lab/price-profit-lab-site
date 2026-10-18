'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const defaults={oldPrice:'3000',newPrice:'3300',unitCost:'900',oldCount:'100',newCount:'90',fixedCost:'80000',rate:'0',flatFee:'0',target:'150000',hours:'100'};
const elements={};
function element(id,value=''){
 return elements[id]={id,value,defaultValue:value,textContent:'',hidden:false,className:'',listeners:{},children:[],
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
assert.equal(events.length,1);
elements.resetSample.listeners.click();
assert.equal(elements.oldCount.value,'100');
assert.equal(elements.newPrice.value,'3300');
assert.equal(elements.results.hidden,false);
assert.equal(elements.error.textContent,'');
assert.equal(elements.after.textContent,'136,000円');
assert.equal(events.length,1,'Reset must not count as a second manual interaction');
console.log('Main calculator DOM and GA4 event tests passed');
