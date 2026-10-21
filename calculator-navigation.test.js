'use strict';
const assert=require('node:assert/strict');
const {initCalculatorNavigation}=require('./calculator-navigation.js');
function element(tagName){return {tagName,attrs:{},focusCalls:[],scrollCalls:[],setAttribute(k,v){this.attrs[k]=v},focus(v){this.focusCalls.push(v)},scrollIntoView(v){this.scrollCalls.push(v)}}}
function fixture({heading=true,metrics=true,invalid=false,missing=false}={}){
 const h=element('H2'),m=element('DIV'),result=element('SECTION'),error=element('P'),input=element('INPUT');
 result.hidden=false;error.textContent='';
 result.querySelector=s=>s==='h2'&&heading?h:s==='.metrics'&&metrics?m:null;
 const b={hidden:true,getAttribute:k=>k==='data-calculator-result'?'result':'error',addEventListener(k,f){this[k]=f}};
 const doc={querySelectorAll:()=>[b],getElementById:k=>missing?null:k==='result'?result:error,querySelector:()=>invalid?input:null};
 initCalculatorNavigation(doc);return {b,h,m,result,error,input};
}
const a=fixture();assert.equal(a.b.hidden,false);a.b.click();assert.equal(a.h.focusCalls.length,1);assert.equal(a.h.scrollCalls[0].behavior,'instant');assert.deepEqual(a.h.focusCalls[0],{preventScroll:true});
const b=fixture({heading:false});b.b.click();assert.equal(b.m.focusCalls.length,1);assert.equal(b.m.attrs['aria-label'],'計算結果');
const c=fixture({heading:false,metrics:false});c.b.click();assert.equal(c.result.focusCalls.length,1);
const bad=fixture({invalid:true});bad.result.hidden=true;bad.error.textContent='入力してください';bad.b.click();assert.equal(bad.input.focusCalls.length,1);assert.equal(bad.h.focusCalls.length,0);
assert.equal(bad.input.attrs.tabindex,undefined,'Error navigation must keep inputs in keyboard tab order');
const generic=fixture();generic.result.hidden=true;generic.error.textContent='計算範囲外';generic.b.click();assert.equal(generic.error.focusCalls.length,1);
const absent=fixture({missing:true});assert.equal(absent.b.hidden,true);assert.equal(absent.b.click,undefined);
console.log('Calculator result navigation: heading/metrics/fallback, error focus and missing configuration passed');
