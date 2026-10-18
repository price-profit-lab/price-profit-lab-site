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
 for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const url=m[1];
  if(/^(?:https?:|mailto:|tel:|#|data:)/.test(url))continue;
  const target=url.split('#')[0].split('?')[0];
  if(!target)continue;
  assert.ok(fs.existsSync(path.join(path.dirname(file),target)),file+' references missing '+target);
  linkCount++;
 }
 if(!['privacy.html','terms.html'].includes(file)){
  const expected=file==='index.html'?'https://price-profit-lab.pages.dev/':'https://price-profit-lab.pages.dev/'+file.slice(0,-5);
  assert.ok(sitemap.includes('<loc>'+expected+'</loc>'),file+' missing in sitemap');
 }
}
console.log('Static site checks passed: '+files.length+' pages, '+linkCount+' local references');
