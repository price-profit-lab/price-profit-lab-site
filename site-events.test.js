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
 assert.equal((html.match(/<script src="analytics\.js"><\/script>/g)||[]).length,1,file+' must load the shared preference-aware bootstrap exactly once');
 assert.ok(!html.includes('www.googletagmanager.com'),file+' must not bypass preferences with a direct Google script');
 assert.ok(html.indexOf('<script src="analytics.js"></script>')<html.indexOf('</head>'),file+' applies preferences before body interactions');
}
console.log('All Japanese pages use the shared preference-aware analytics bootstrap in the head');

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

// Use the real analytics preference gate with the real navigation listener.
for(const sourcePage of ['/service-excel','/service-excel.html','/cancellation-calculator','/cancellation-calculator.html'])for(const optedOut of [false,true]){
 const listeners={},events=[],scripts=[];
 const context={
  location:{pathname:sourcePage,hostname:'price-profit-lab.pages.dev'},
  localStorage:{getItem(){return optedOut?'1':null}},
  dataLayer:events,addEventListener(){},
  document:{addEventListener(type,fn){listeners[type]=fn},createElement(){return {}},head:{appendChild(el){scripts.push(el)}}}
 };
 context.window=context;
 vm.runInNewContext(fs.readFileSync('analytics.js','utf8'),context);
 vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),context);
 events.length=0;
 const clickDemo=href=>listeners.click({target:{closest(){return {getAttribute(){return href}}}}});
 for(const href of ['assets/service-excel-demo.html','./assets/service-excel-demo','assets/service-excel-demo.html?email=private@example.com#demo'])clickDemo(href);
 assert.equal(events.length,optedOut?0:3,'Demo clicks respect the analytics preference');
 for(const e of events){
  assert.equal(e[1],'service_excel_demo_click');
  assert.deepEqual(Object.keys(e[2]),['source_page']);
  assert.equal(e[2].source_page,sourcePage);
  assert.ok(!JSON.stringify(e).includes('private@example.com'));
 }
 const count=events.length;
 for(const href of ['https://example.com/assets/service-excel-demo.html','assets/service-excel-demo-copy.html','assets/service-excel-demo.html/extra'])clickDemo(href);
 context.location.pathname='/guides';clickDemo('assets/service-excel-demo.html');
 assert.equal(events.length,count,'External, lookalike and unrelated-page links are ignored');
 context.location.pathname='/service-excel.html';clickDemo('assets/service-excel-demo.html');
 assert.equal(events.length,count+(optedOut?0:1),'Product HTML alias is supported');
}
assert.doesNotThrow(()=>withoutGa.click({target:{closest(){return {getAttribute(){return 'assets/service-excel-demo.html'}}}}}));
console.log('Demo navigation: preference gate, URL privacy, exact destination and source-page checks passed');


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
 assert.equal(event[1],guide==='product-help'?'product_help_click':'service_excel_help_click');
 assert.equal(event[2].source_page,'/product');
 assert.deepEqual(Object.keys(event[2]),['source_page'],'Only source path is sent; guide type uses fixed event names');
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

// Exercise the real inline purchase handlers without navigating or loading GA.
for(const [file,item,eventName] of [
 ['index.html','9001298','booth_product_click'],
 ['product.html','9001298','booth_product_click'],
 ['service-excel.html','9011039','booth_standard_click'],
 ['service-excel.html','9011528','booth_pro_click']
]){
 const target='https://price-profit-lab.booth.pm/items/'+item;
 const anchors=[...fs.readFileSync(file,'utf8').matchAll(/<a\b[^>]*>/g)]
  .map(m=>m[0]).filter(tag=>tag.includes('href="'+target+'"')&&tag.includes('data-ga4-booth-click="1"'));
 assert.ok(anchors.length>0,file+' needs the tracked purchase link');
 for(const tag of anchors){
  const handler=tag.match(/onclick="([^"]+)"/)[1]
   .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi,(_,hex,decimal)=>String.fromCodePoint(parseInt(hex||decimal,hex?16:10)))
   .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  const calls=[];
  vm.runInNewContext('(function(){'+handler+'}).call(anchor)',{
   anchor:{href:target},gtag:(...args)=>calls.push(args)
  });
  assert.equal(calls.length,1,'Exactly one event for a purchase-link click');
  assert.equal(calls[0][0],'event');
  assert.equal(calls[0][1],eventName,'Standard and Pro need distinct event names');
  assert.equal(calls[0][2].product_id,item);
  assert.equal(calls[0][2].link_url,target);
  assert.equal(calls[0][2].transport_type,'beacon');
  assert.deepEqual(Object.keys(calls[0][2]),['product_id','link_url','transport_type']);
  assert.doesNotThrow(()=>vm.runInNewContext('(function(){'+handler+'}).call(anchor)',{anchor:{href:target}}),'Purchase link must work without GA');
 }
}
console.log('Single purchase-click events and Standard/Pro separation passed');

const presetEvents=[];
const presetListeners={};
vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),{
 document:{addEventListener(type,fn){presetListeners[type]=fn}},
 location:{pathname:'/discount-profit-guide'},gtag:(...args)=>presetEvents.push(args)
});
for(const href of ['index.html#example-discount','index.html#example-shop']){
 presetListeners.click({target:{closest(){return {getAttribute(){return href}}}}});
}
assert.equal(presetEvents.length,2);
for(const event of presetEvents){
 assert.equal(event[1],'free_tool_navigation');
 assert.equal(event[2].tool,'profit-calculator');
 assert.deepEqual(Object.keys(event[2]),['source_page','tool']);
}
console.log('Article example links retain free-tool navigation measurement');

const beforeMargin=events.length;
for(const href of ['profit-margin-calculator.html','profit-margin-calculator','./profit-margin-calculator.html?amount=secret'])click(href);
assert.equal(events.length,beforeMargin+3);
for(const event of events.slice(beforeMargin)){
 assert.equal(event[1],'free_tool_navigation');assert.equal(event[2].tool,'profit-margin-calculator');
 assert.deepEqual(Object.keys(event[2]),['source_page','tool']);
}
click('profit-margin-calculator-copy.html');click('https://example.com/profit-margin-calculator.html');
assert.equal(events.length,beforeMargin+3);
const marginSelf=[];const marginListeners={};
vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),{document:{addEventListener(k,f){marginListeners[k]=f}},location:{pathname:'/profit-margin-calculator'},gtag:(...args)=>marginSelf.push(args)});
marginListeners.click({target:{closest(){return {getAttribute(){return 'profit-margin-calculator.html'}}}}});
assert.equal(marginSelf.length,0);
console.log('Margin tool navigation, query privacy and self-link exclusion passed');


// Free notice entry metrics must remain distinct from paid-product events.
for(const hostname of ['price-profit-lab.pages.dev','preview.pages.dev'])for(const optedOut of [false,true]){
 const listeners={},events=[];
 const context={location:{pathname:'/service-price-notice-guide',hostname},
  localStorage:{getItem(){return optedOut?'1':null}},dataLayer:events,addEventListener(){},
  document:{addEventListener(type,fn){listeners[type]=fn},createElement(){return {}},head:{appendChild(){}}}};
 context.window=context;
 vm.runInNewContext(fs.readFileSync('analytics.js','utf8'),context);
 vm.runInNewContext(fs.readFileSync('site-events.js','utf8'),context);
 events.length=0;
 const click=href=>listeners.click({target:{closest(){return {getAttribute(){return href}}}}});
 const enabled=hostname==='price-profit-lab.pages.dev'&&!optedOut;
 const targets=[['assets/service-notice-builder.html','notice_builder_open_click'],
  ['./assets/service-notice-builder','notice_builder_open_click'],
  ['assets/service-notice-builder-free-v1.zip','notice_zip_download_click'],
  ['https://price-profit-lab.booth.pm/items/9025062','notice_booth_free_click']];
 for(const [href] of targets)click(href+'?private=do-not-send#private');
 assert.equal(events.length,enabled?targets.length:0);
 for(let i=0;i<events.length;i++){
  assert.equal(events[i][1],targets[i][1]);
  assert.deepEqual(Object.keys(events[i][2]),['source_page']);
  assert.equal(events[i][2].source_page,'/service-price-notice-guide');
  assert.ok(!JSON.stringify(events[i]).includes('do-not-send'));
 }
 const count=events.length;
 for(const href of ['https://example.com/assets/service-notice-builder.html',
  'assets/service-notice-builder-copy.html','assets/service-notice-builder.html/extra',
  'https://price-profit-lab.booth.pm/items/90250620',
  'https://price-profit-lab.booth.pm.evil.test/items/9025062',
  'https://price-profit-lab.booth.pm/items/9011039'])click(href);
 context.location.pathname='/shipping-profit-guide';for(const [href] of targets)click(href);
 assert.equal(events.length,count,'Lookalikes, paid products and unrelated source pages are ignored');
 context.location.pathname='/service-price-notice-guide.html';click(targets[0][0]);
 assert.equal(events.length,count+(enabled?1:0));
}
console.log('Free notice entry metrics: fixed labels, paid-product separation, privacy and preference gate passed');
