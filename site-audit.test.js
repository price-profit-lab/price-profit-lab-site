'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const files=fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const sitemap=fs.readFileSync('sitemap.xml','utf8');
let linkCount=0;
for(const file of files){
 const html=fs.readFileSync(file,'utf8');
 const h1=(html.match(/<h1(?:\s|>)/g)||[]).length;
 assert.equal(h1,1,file+' must have exactly one h1');
 assert.match(html,/<meta name="description"/,file+' must have a meta description');
 assert.match(html,/<link rel="canonical"/,file+' must have a canonical URL');
 assert.match(html,/<html lang="ja"/,file+' must declare Japanese language');
 assert.match(html,/<meta name="viewport"/,file+' must have mobile viewport');
 assert.match(html,/<title>[^<]+<\/title>/,file+' must have a title');
 const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);
 assert.ok(canonical,file+' missing canonical href');
 const expectedCanonical=file==='index.html'?'https://price-profit-lab.pages.dev/':'https://price-profit-lab.pages.dev/'+file.slice(0,-5);
 assert.equal(canonical[1],expectedCanonical,file+' canonical does not match published path');
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
console.log('Static site checks passed: '+files.length+' pages, '+linkCount+' local references');
