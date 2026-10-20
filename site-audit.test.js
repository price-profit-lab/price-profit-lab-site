'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {validPurchaseLinks}=require('./production-smoke.test.js');

function sharingMetadataIssue(html,canonical){
 const head=html.match(/<head(?:\s[^>]*)?>([\s\S]*?)<\/head>/i);
 if(!head)return 'missing head';
 const clean=head[1].replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const tags=[...clean.matchAll(/<meta\b[^>]*>/gi)].map(match=>{
  const attrs={};
  for(const attr of match[0].matchAll(/([:\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g))attrs[attr[1].toLowerCase()]=attr[3];
  return attrs;
 });
 const expected={
  'og:title':value=>value.trim().length>0,
  'og:description':value=>value.trim().length>0,
  'og:url':value=>value===canonical,
  'og:site_name':value=>value==='価格と利益の計算室',
  'og:locale':value=>value==='ja_JP',
  'og:type':value=>['website','article'].includes(value)
 };
 for(const [key,valid] of Object.entries(expected)){
  const matches=tags.filter(attrs=>attrs.property===key);
  if(matches.length!==1||typeof matches[0].content!=='string'||!valid(matches[0].content))return 'invalid or duplicate '+key;
 }
 const cards=tags.filter(attrs=>attrs.name==='twitter:card');
 if(cards.length!==1||!['summary','summary_large_image'].includes(cards[0].content))return 'invalid or duplicate twitter:card';
 return null;
}
const sampleCanonical='https://price-profit-lab.pages.dev/example';
const sharingFixture='<head><meta content="A different share title" property="og:title"><meta property="og:description" content="Description"><meta property="og:url" content="'+sampleCanonical+'"><meta property="og:site_name" content="価格と利益の計算室"><meta property="og:locale" content="ja_JP"><meta property="og:type" content="website"><meta name="twitter:card" content="summary"></head>';
assert.equal(sharingMetadataIssue(sharingFixture,sampleCanonical),null,'Accept metadata attributes in either order');
assert.equal(sharingMetadataIssue(sharingFixture.replaceAll('"',"'"),sampleCanonical),null,'Accept single-quoted attributes');
for(const key of ['og:title','og:description','og:url','og:site_name','og:locale','og:type','twitter:card']){
 const tag=sharingFixture.match(new RegExp('<meta\\b[^>]*(?:property|name)="'+key+'"[^>]*>'))[0];
 for(const altered of [
  sharingFixture.replace(tag,''),
  sharingFixture.replace(tag,tag+tag),
  sharingFixture.replace(tag,'<!-- '+tag+' -->'),
  sharingFixture.replace(tag,'')+'<body>'+tag+'</body>',
  sharingFixture.replace(tag,'<script>'+JSON.stringify(tag)+'</script>')
 ])assert.ok(sharingMetadataIssue(altered,sampleCanonical),'Reject missing, duplicate, commented, body or script metadata: '+key);
}
assert.ok(sharingMetadataIssue(sharingFixture.replace('content="Description"','content="  "'),sampleCanonical),'Reject blank description');
assert.ok(sharingMetadataIssue(sharingFixture.replace(sampleCanonical,'https://example.com/wrong'),sampleCanonical),'Reject wrong sharing URL');
assert.ok(sharingMetadataIssue(sharingFixture.replace('content="summary"','content="unsupported"'),sampleCanonical),'Reject invalid card type');
console.log('Sharing metadata omission, duplicate and false-positive checks passed');

const files=fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const sitemap=fs.readFileSync('sitemap.xml','utf8');
let linkCount=0;
for(const file of files){
 const html=fs.readFileSync(file,'utf8');
 const h1=(html.match(/<h1(?:\s|>)/g)||[]).length;
 assert.equal(h1,1,file+' must have exactly one h1');
 const main=html.match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/);
 assert.ok(main,file+' missing main landmark');
 const mainHeading=main[1].search(/<h1(?:\s|>)/);
 const mainButton=main[1].search(/<a\b[^>]*class="[^"]*button/);
 if(mainButton!==-1)assert.ok(mainHeading<mainButton,file+' CTA appears before page heading');
 assert.match(html,/<meta name="description"/,file+' must have a meta description');
 assert.match(html,/<link rel="canonical"/,file+' must have a canonical URL');
 assert.match(html,/<html lang="ja"/,file+' must declare Japanese language');
 assert.match(html,/<meta name="viewport"/,file+' must have mobile viewport');
 assert.match(html,/<title>[^<]+<\/title>/,file+' must have a title');
 const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);
 assert.ok(canonical,file+' missing canonical href');
 const expectedCanonical=file==='index.html'?'https://price-profit-lab.pages.dev/':'https://price-profit-lab.pages.dev/'+file.slice(0,-5);
 assert.equal(canonical[1],expectedCanonical,file+' canonical does not match published path');
 assert.equal(sharingMetadataIssue(html,canonical[1]),null,file+' sharing metadata must be complete and match its canonical URL');
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
  const data=JSON.parse(m[1]);
  assert.equal(data['@context'],'https://schema.org',file+' JSON-LD context invalid');
  assert.ok(data['@type'],file+' JSON-LD type missing');
  if(data['@type']==='Product'){
   assert.equal(data.offers.priceCurrency,'JPY',file+' product currency invalid');
   assert.equal(Number(data.offers.price),2980,file+' product price inconsistent');
  }
 }
 if(!['privacy.html','terms.html'].includes(file)){
  assert.match(html,/<script src="site-events\.js"><\/script>/,file+' missing product navigation tracking');
 }
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const m of html.matchAll(/href="#([^"]+)"/g)){
  assert.ok(ids.has(m[1]),file+' links to missing anchor #'+m[1]);
 }

 for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const url=m[1];
  if(/^(?:https?:|mailto:|tel:|#|data:)/.test(url))continue;
  const target=url.split('#')[0].split('?')[0];
  if(!target)continue;
  const localPath=path.join(path.dirname(file),target);
  assert.ok(fs.existsSync(localPath),file+' references missing '+target);
  const hash=url.split('#')[1];
  if(hash&&target.endsWith('.html')){
   const linkedHtml=fs.readFileSync(localPath,'utf8');
   assert.ok(linkedHtml.includes('id="'+decodeURIComponent(hash)+'"'),file+' links to missing '+target+'#'+hash);
  }
  linkCount++;
 }
 if(!['privacy.html','terms.html'].includes(file)){
  const expected=file==='index.html'?'https://price-profit-lab.pages.dev/':'https://price-profit-lab.pages.dev/'+file.slice(0,-5);
  assert.ok(sitemap.includes('<loc>'+expected+'</loc>'),file+' missing in sitemap');
 }
}
const homepage=fs.readFileSync('index.html','utf8');
assert.match(homepage,/id="tool-choice"/,'Homepage missing free vs paid selection guide');
for(const target of ['price-increase-calculator.html','reverse-price-calculator.html','product.html#compare']){
 assert.ok(homepage.includes('href="'+target+'"'),'Homepage selection guide missing '+target);
}
for(const target of ['online-shop-profit-guide.html','handmade-pricing-guide.html','consignment-profit-guide.html']){
 assert.ok(homepage.includes('href="'+target+'"'),'Homepage missing audience onboarding link '+target);
}
const share=fs.readFileSync('share.html','utf8');
assert.match(share,/サイト名・提供元の表記/,'Sharing page must explain brand-only attribution');
assert.match(share,/「価格と利益の計算室」/,'Sharing page must name the public brand');
const product=fs.readFileSync('product.html','utf8');
assert.ok(validPurchaseLinks(product,['9001298']),'Product purchase anchors must lead to the merchandise item');
assert.ok(validPurchaseLinks(fs.readFileSync('service-excel.html','utf8'),['9011039','9011528']),'Service purchase anchors must lead to Standard and Pro');
assert.ok((product.match(/https:\/\/price-profit-lab\.booth\.pm\/items\/9001298/g)||[]).length>=3,'Product page should have multiple purchase links');
assert.match(product,/購入前の3つの判断ポイント/,'Product page missing buyer qualification');
assert.match(product,/Excel版を買わなくても/,'Product page missing free alternative disclosure');
for(const asset of ['calculator.js','reverse-price.js','price-increase-calculator.js','site-events.js','style.css']){
 assert.ok(fs.existsSync(asset),'Missing public asset '+asset);
}
console.log('Static site checks passed: '+files.length+' pages, '+linkCount+' local references');

