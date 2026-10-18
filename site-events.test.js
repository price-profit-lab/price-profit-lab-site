'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const listeners={};
const events=[];
const document={addEventListener(type,fn){listeners[type]=fn}};
vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),{
 document,location:{pathname:'/shipping-profit-guide'},
 gtag:(...args)=>events.push(args)
});
assert.equal(typeof listeners.click,'function');
function click(href){
 const anchor={getAttribute(name){return name==='href'?href:null}};
 listeners.click({target:{closest(selector){assert.equal(selector,'a[href]');return anchor}}});
}
click('product.html');
click('product.html#compare');
click('product');
click('product?ref=guide');
assert.equal(events.length,4);
for(const event of events){
 assert.equal(event[0],'event');
 assert.equal(event[1],'product_detail_click');
 assert.equal(event[2].source_page,'/shipping-profit-guide');
 assert.deepEqual(Object.keys(event[2]),['source_page']);
}
click('index.html');
click('https://price-profit-lab.booth.pm/items/9001298');
assert.equal(events.length,4,'Unrelated links must not be counted');
listeners.click({target:{closest(){return null}}});
assert.equal(events.length,4);
click('reverse-price-calculator.html');
click('price-increase-calculator.html');
click('price-increase-calculator#example');
assert.equal(events.length,7,'Free tool navigation should be counted');
assert.deepEqual(events.slice(4).map(e=>e[1]),['free_tool_navigation','free_tool_navigation','free_tool_navigation']);
assert.deepEqual(events.slice(4).map(e=>e[2].tool),['reverse-price-calculator','price-increase-calculator','price-increase-calculator']);
for(const e of events.slice(4)){
 assert.equal(e[2].source_page,'/shipping-profit-guide');
 assert.deepEqual(Object.keys(e[2]),['source_page','tool']);
}
click('index.html#calculator');
click('index#calculator');
click('#calculator');
assert.equal(events.length,10,'Main calculator navigation should be counted');
for(const e of events.slice(7)){
 assert.equal(e[1],'free_tool_navigation');
 assert.equal(e[2].tool,'profit-calculator');
 assert.deepEqual(Object.keys(e[2]),['source_page','tool']);
}
console.log('Product and all free-tool navigation analytics tests passed');
