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

const beforeService=events.length;
for(const href of ['service-excel.html','service-excel.html#compare','service-excel','service-excel?ref=guide','./service-excel.html']){
 click(href);
}
assert.equal(events.length,beforeService+5,'Service comparison navigation should be counted once');
for(const event of events.slice(beforeService)){
 assert.equal(event[1],'service_product_detail_click');
 assert.equal(event[2].source_page,'/shipping-profit-guide');
 assert.deepEqual(Object.keys(event[2]),['source_page'],'Do not send form values or URL query parameters');
}
for(const href of ['https://example.com/service-excel.html','service-excel-copy.html','https://price-profit-lab.booth.pm/items/9011039','https://price-profit-lab.booth.pm/items/9011528']){
 click(href);
}
assert.equal(events.length,beforeService+5,'Unrelated and separately tracked purchase links must not be counted as comparison navigation');
console.log('Service comparison navigation analytics tests passed');

const beforeCancellation=events.length;
for(const href of ['cancellation-calculator.html','cancellation-calculator','./cancellation-calculator.html','cancellation-calculator.html?ref=home']){
 click(href);
}
assert.equal(events.length,beforeCancellation+4);
for(const event of events.slice(beforeCancellation)){
 assert.equal(event[1],'free_tool_navigation');
 assert.equal(event[2].tool,'cancellation-calculator');
 assert.deepEqual(Object.keys(event[2]),['source_page','tool'],'Do not send input amounts or URL query parameters');
}
click('cancellation-calculator-copy.html');
click('https://example.com/cancellation-calculator.html');
assert.equal(events.length,beforeCancellation+4);
const selfEvents=[];
const selfListeners={};
vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),{
 document:{addEventListener(type,fn){selfListeners[type]=fn}},
 location:{pathname:'/cancellation-calculator'},gtag:(...args)=>selfEvents.push(args)
});
selfListeners.click({target:{closest(){return {getAttribute(){return 'cancellation-calculator.html'}}}}});
assert.equal(selfEvents.length,0,'Do not count navigation to current calculator');
console.log('Cancellation free-tool navigation and privacy checks passed');

const trackedPages=fs.readdirSync('.').filter(path=>path.endsWith('.html'));
for(const file of trackedPages){
 const html=fs.readFileSync(file,'utf8');
 const match=html.match(/<script>([^<]*gtag[^<]*)<\/script>/);
 if(!match)continue;
 for(const hostname of ['price-profit-lab.pages.dev','price-profit-lab-staging.pages.dev','build-id.price-profit-lab.pages.dev','price-profit-lab.pages.dev.example.com','localhost']){
  const context={location:{hostname},dataLayer:[]};context.window=context;
  vm.runInNewContext(match[1],context);
  context.gtag('event','test_event');
  if(hostname==='price-profit-lab.pages.dev'){
   assert.equal(context.dataLayer.length,3,file+' should initialize production GA and queue event');
   assert.equal(context.dataLayer[1][0],'config');
   assert.equal(context.dataLayer[1][1],'G-V55WPDJV07');
  }else{
   assert.equal(context.dataLayer.length,0,file+' must not track preview/test traffic');
   assert.equal(context['ga-disable-G-V55WPDJV07'],true);
  }
 }
}
console.log('Production-only GA initialization and event guards passed for all tracked pages');

const imageEvents=[];
const imageListeners={};
const imageLocation={pathname:'/service-excel'};
vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),{
 document:{addEventListener(type,fn){imageListeners[type]=fn}},
 location:imageLocation,gtag:(...args)=>imageEvents.push(args)
});
function imageClick(href){
 imageListeners.click({target:{closest(){return {getAttribute(name){return name==='href'?href:null}}}}});
}
imageClick('assets/service-standard-excel-mac.png');
imageClick('./assets/service-pro-actions-excel-mac.png');
assert.equal(imageEvents.length,2);
assert.deepEqual(imageEvents.map(e=>e[1]),['standard_screenshot_click','pro_screenshot_click']);
for(const event of imageEvents){
 assert.equal(event[2].source_page,'/service-excel');
 assert.deepEqual(Object.keys(event[2]),['source_page'],'Only the page path is sent');
}
for(const href of ['https://example.com/assets/service-standard-excel-mac.png','assets/other.png','assets/service-standard-excel-mac.png?email=private@example.com','assets/service-pro-actions-excel-mac.png#private','https://price-profit-lab.booth.pm/items/9011039']){
 imageClick(href);
}
assert.equal(imageEvents.length,2,'Unrelated URLs and query-bearing paths are not screenshot events');
imageLocation.pathname='/guides';
imageClick('assets/service-standard-excel-mac.png');
assert.equal(imageEvents.length,2,'Only the product page screenshot links are classified');
imageLocation.pathname='/service-excel.html';
imageClick('assets/service-pro-actions-excel-mac.png');
assert.equal(imageEvents.length,3,'HTML alias is supported');
const withoutGa={};
vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),{document:{addEventListener(type,fn){withoutGa[type]=fn}},location:{pathname:'/service-excel'}});
assert.doesNotThrow(()=>withoutGa.click({target:{closest(){return {getAttribute(){return 'assets/service-standard-excel-mac.png'}}}}}),'Navigation must not throw when analytics is unavailable');
console.log('Product screenshot click classification and privacy checks passed');

const helpEvents=[];
const helpListeners={};
const helpLocation={pathname:'/product'};
vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),{
 document:{addEventListener(type,fn){helpListeners[type]=fn}},
 location:helpLocation,gtag:(...args)=>helpEvents.push(args)
});
function helpClick(href){
 helpListeners.click({target:{closest(){return {getAttribute(name){return name==='href'?href:null}}}}});
}
for(const [href,guide] of [
 ['product-help.html','product-help'],
 ['product-help','product-help'],
 ['./product-help.html#start','product-help'],
 ['service-excel-help.html','service-excel-help'],
 ['service-excel-help','service-excel-help'],
 ['./service-excel-help.html?email=private@example.com#start','service-excel-help']
]){
 const count=helpEvents.length;
 helpClick(href);
 assert.equal(helpEvents.length,count+1,'One event per supported guide navigation');
 const event=helpEvents.at(-1);
 assert.equal(event[0],'event');
 assert.equal(event[1],'excel_help_click');
 assert.equal(event[2].source_page,'/product');
 assert.equal(event[2].guide,guide);
 assert.deepEqual(Object.keys(event[2]),['source_page','guide'],'Only source path and allowlisted guide label are sent');
 assert.ok(!JSON.stringify(event).includes('private@example.com'),'Never send query values');
}
const helpCount=helpEvents.length;
for(const href of ['https://example.com/product-help.html','//example.com/service-excel-help','product-help-copy.html','assets/product-help.html','product-help.html/extra','javascript:product-help','mailto:service-excel-help'])helpClick(href);
assert.equal(helpEvents.length,helpCount,'External and lookalike paths are ignored');
for(const guide of ['product-help','service-excel-help']){
 for(const suffix of ['','.html']){
  helpLocation.pathname='/'+guide+suffix;
  helpClick(guide+'.html#trouble');
 }
}
assert.equal(helpEvents.length,helpCount,'Do not count navigation within the current help page');
assert.doesNotThrow(()=>withoutGa.click({target:{closest(){return {getAttribute(){return 'product-help.html'}}}}}),'Guide links work when analytics is unavailable');
console.log('Excel guide navigation, self-link exclusion and payload privacy checks passed');

