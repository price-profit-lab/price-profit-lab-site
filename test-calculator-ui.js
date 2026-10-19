'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function page(overrides={}) {
 const defaults={oldPrice:3000,newPrice:3300,unitCost:900,oldCount:100,newCount:90,fixedCost:80000,rate:0,flatFee:0,target:150000,hours:100,...overrides};
 const elements={};
 const element=()=>({textContent:'',hidden:false,className:'',children:[],listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){this.children=[];},append(child){this.children.push(child);}});
 for(const [id,value] of Object.entries(defaults))elements[id]={...element(),value:String(value),defaultValue:String(value)};
 for(const id of ['error','results','before','after','diff','hourly','needed','breakeven','goal','scenarios','resetSample'])elements[id]=element();
 const document={getElementById:id=>elements[id],createElement:()=>element()};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'calculator.js'),'utf8'),{document,module:{exports:{}}});
 return {elements,defaults};
}

let checks=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
for(const [oldCount,pct,expected]of [[90,30,63],[50,30,35],[70,10,63],[100,25,75],[1,50,0],[0,30,0]]){
 check(`scenario ${oldCount} bookings minus ${pct}%`,()=>{
  const {elements:e}=page({oldCount});
  const row=e.scenarios.children.find(row=>row.children[0].textContent===pct+'%');
  assert.equal(row.children[1].textContent,expected.toLocaleString('ja-JP')+'件');
 });
}
check('sample profit is unchanged',()=>{const {elements:e}=page();assert.equal(e.before.textContent,'130,000円');assert.equal(e.after.textContent,'136,000円');});
check('invalid count hides results',()=>{const {elements:e}=page();e.oldCount.value='1.5';e.oldCount.listeners.input();assert.equal(e.results.hidden,true);assert.ok(e.error.textContent);});
check('blank price hides results',()=>{const {elements:e}=page();e.oldPrice.value='';e.oldPrice.listeners.input();assert.equal(e.results.hidden,true);});
check('reset restores sample',()=>{const {elements:e}=page();e.newPrice.value='9999';e.newPrice.listeners.input();e.resetSample.listeners.click();assert.equal(e.newPrice.value,'3300');assert.equal(e.after.textContent,'136,000円');});
check('zero hours is unavailable',()=>{const {elements:e}=page({hours:0});assert.equal(e.hourly.textContent,'算出不可');});
console.log('UI regression tests passed:',checks);
