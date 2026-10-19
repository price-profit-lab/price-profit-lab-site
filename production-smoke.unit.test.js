'use strict';
const assert=require('node:assert/strict');
const {sitemapPaths,validPurchaseLinks,validResponse,run}=require('./production-smoke.test.js');
const base='https://price-profit-lab.pages.dev';
function page(path,body){return {status:200,body:'<link rel="canonical" href="'+base+path+'">'+body};}
const urls=['/', '/product','/reverse-price-calculator','/price-increase-calculator','/service-excel','/service-pricing-guide',...Array.from({length:7},(_,i)=>'/guide-'+i)];
const xml='<urlset>'+urls.map(path=>'<url><loc>'+base+path+'</loc></url>').join('')+'</urlset>';
assert.equal(sitemapPaths(xml).length,urls.length);
assert.throws(()=>sitemapPaths(xml.replace('</urlset>','<url><loc>'+base+'/product</loc></url></urlset>')),/Duplicate/);
assert.throws(()=>sitemapPaths(xml.replace(base+'/product','https://example.com/product')),/Invalid sitemap URL/);
assert.throws(()=>sitemapPaths(xml.replace(base+'/price-increase-calculator','https://example.com/other')),/Invalid sitemap URL/);
assert.throws(()=>sitemapPaths('<urlset></urlset>'),/short sitemap/);
assert.throws(()=>sitemapPaths('not XML'),/Missing XML/);
console.log('Production sitemap parser tests passed');

const assets=['/calculator.js','/reverse-price.js','/price-increase-calculator.js','/site-events.js','/style.css'];
const assetResponse={status:200,body:'const example = 123;'.repeat(10)};
assert.equal(validResponse('/calculator.js',assetResponse,assets),true,'Valid JS asset must pass');
assert.equal(validResponse('/style.css',{status:200,body:'body { margin: 0; }'.repeat(10)},assets),true,'Valid CSS asset must pass');
assert.equal(validResponse('/calculator.js',{status:404,body:assetResponse.body},assets),false,'Missing asset must fail');
assert.equal(validResponse('/product',page('/product','<html><title>商品</title><a href="https://price-profit-lab.booth.pm/items/9001298">購入</a></html>'),assets),true);
assert.equal(validResponse('/product',page('/product','<html><title>商品</title></html>'),assets),false,'Missing purchase link must fail');
assert.equal(validResponse('/robots.txt',{status:200,body:'User-agent: *\\nSitemap: https://price-profit-lab.pages.dev/sitemap.xml'},assets),true);
console.log('Production response validation tests passed');

const service='<html><title>サービス料金</title><h1>比較</h1><a href="https://price-profit-lab.booth.pm/items/9011039">Standard</a><a href="https://price-profit-lab.booth.pm/items/9011528">Pro</a><p>1,480円 / 2,980円</p><a href="service-pricing-guide.html">ガイド</a></html>';
assert.equal(validResponse('/service-excel',page('/service-excel',service),assets),true);
for(const marker of ['9011039','9011528','1,480円','2,980円','service-pricing-guide.html']){
 assert.equal(validResponse('/service-excel',page('/service-excel',service.replace(marker,'wrong')),assets),false,'Detect missing service marker: '+marker);
}
const fallback='<html><title>無料計算</title><h1>無料ツール</h1></html>';
assert.equal(validResponse('/service-excel',{status:200,body:fallback},assets),false,'Reject homepage fallback at service URL');
assert.equal(validResponse('/service-pricing-guide',{status:200,body:fallback},assets),false,'Reject homepage fallback at guide URL');
const guide='<html><title>料金の決め方</title><h1>サービス業の料金の決め方</h1><p>165,600円 / 195,420円</p><a href="service-excel.html">Excel</a></html>';
assert.equal(validResponse('/service-pricing-guide',page('/service-pricing-guide',guide),assets),true);
assert.equal(validResponse('/service-pricing-guide',page('/service-pricing-guide',guide.replace('service-excel.html','wrong.html')),assets),false);
assert.equal(validResponse('/service-excel',{status:404,body:service},assets),false);
assert.throws(()=>sitemapPaths(xml.replace(base+'/service-excel',base+'/other-service')),/Required sitemap entry missing/);
assert.throws(()=>sitemapPaths(xml.replace(base+'/service-pricing-guide',base+'/other-guide')),/Required sitemap entry missing/);
console.log('Service product and article availability checks passed');

const shop='https://price-profit-lab.booth.pm/items/';
const buy=(id)=>'<a href="'+shop+id+'">Purchase</a>';
assert.equal(validPurchaseLinks(buy('9011039')+buy('9011528'),['9011039','9011528']),true);
assert.equal(validPurchaseLinks("<a href='"+shop+"9011039?ref=guide#buy'>Standard</a>",['9011039']),true,'Allow tracking query and fragment');
for(const html of [
 '<p>'+shop+'9001298</p>',
 '<a href="#">'+shop+'9001298</a>',
 '<!-- '+buy('9001298')+' -->',
 '<script>'+JSON.stringify(buy('9001298'))+'</script>',
 buy('9001298').replace('https:','http:'),
 buy('9001298').replace('price-profit-lab.booth.pm','other-shop.booth.pm'),
 buy('9001298')+buy('9011039'),
 buy('9001298')+'<a href="'+shop+'9001298extra">Wrong item path</a>'
])assert.equal(validPurchaseLinks(html,['9001298']),false,'Reject invalid purchase markup: '+html);
assert.equal(validPurchaseLinks(buy('9011039'),['9011039','9011528']),false,'Both service items are required');
for(const attrs of ['href="#"','href="https://example.com/items/9001298"','','data-href="'+shop+'9001298"']){
 assert.equal(validPurchaseLinks(buy('9001298')+'<a data-ga4-booth-click="1" '+attrs+'>Buy</a>',['9001298']),false,'Every tracked purchase button must have a valid destination');
}
const textOnly=service.replace(/href="https:\/\/price-profit-lab.booth.pm\/items\/\d+"/g,'href="#"')+'<p>'+shop+'9011039 '+shop+'9011528</p>';
assert.equal(validResponse('/service-excel',page('/service-excel',textOnly),assets),false,'URLs left in text cannot replace live purchase links');
console.log('Actual purchase anchors, product identity and commented-link regression checks passed');

const currentXml=xml.replace('</urlset>','<url><loc>'+base+'/cancellation-profit-guide</loc></url></urlset>');
assert.throws(()=>sitemapPaths(xml,currentXml),/Sitemap differs from repository/,'Old live sitemap must fail');
assert.equal(sitemapPaths(currentXml,currentXml).length,urls.length+1);
assert.throws(()=>sitemapPaths(currentXml,xml),/unexpected/,'Unexpected live entries must fail');
const article='<html><title>New article</title><h1>New article</h1></html>';
assert.equal(validResponse('/cancellation-profit-guide',page('/cancellation-profit-guide',article),assets,'New article'),true);
assert.equal(validResponse('/cancellation-profit-guide',page('/',fallback),assets),false,'Generic homepage fallback must fail');
assert.equal(validResponse('/cancellation-profit-guide',{status:200,body:article},assets),false,'Missing canonical must fail');
assert.equal(validResponse('/cancellation-profit-guide',page('/wrong',article),assets),false,'Wrong canonical must fail');
assert.equal(validResponse('/cancellation-profit-guide',page('/cancellation-profit-guide',article),assets,'Updated heading'),false,'Stale heading must fail');
console.log('Repository sitemap, generic fallback and stale heading checks passed');

const english='<html lang="en"><title>Profit calculator</title><h1>Calculate profit</h1><input id="oldPrice"><input id="newPrice"><p id="error"></p></html>';
assert.equal(validResponse('/en/',page('/en/',english),assets,'Calculate profit'),true);
assert.equal(validResponse('/en/',page('/',english),assets,'Calculate profit'),false,'English homepage fallback must fail');
assert.equal(validResponse('/en/',page('/en/',english.replace('lang="en"','lang="ja"')),assets,'Calculate profit'),false,'Wrong language must fail');
assert.equal(validResponse('/en/',page('/en/',english.replace('id="error"','id="missing"')),assets,'Calculate profit'),false,'Missing calculator error output must fail');
assert.equal(validResponse('/en/',{status:404,body:english},assets,'Calculate profit'),false);
assert.equal(validResponse('/en/',page('/en/',english),assets,'New heading'),false,'Stale English heading must fail');
console.log('English calculator production identity and fallback checks passed');

(async()=>{
 let attempts=0,waits=0;
 assert.equal(await run(async()=>++attempts===3,async ms=>{assert.equal(ms,20000);waits++;}),true,'Deployment propagation can recover');
 assert.equal(attempts,3);assert.equal(waits,2);
 attempts=0;waits=0;
 assert.equal(await run(async()=>{attempts++;return false;},async()=>{waits++;}),false,'Persistent failure must fail');
 assert.equal(attempts,3);assert.equal(waits,2);
 console.log('Deployment retry recovery and exhaustion checks passed');
})().catch(err=>{console.error(err);process.exitCode=1;});

