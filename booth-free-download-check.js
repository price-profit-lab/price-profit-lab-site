'use strict';
// Read-only inspection of public listing metadata, never the download payload.
const fs=require('node:fs');
const EXPECTED_FILE='service-notice-builder-free-v1.zip';
const ITEM_URL='https://price-profit-lab.booth.pm/items/9025062';
function inspect(html){
 const unknown=reason=>({status:'unverified',reason});
 if(typeof html!=='string'||!html.includes('<html'))return unknown('Not an HTML product page');
 // Ignore text in scripts, comments and styles: filenames in prose are insufficient.
 const markup=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const title=markup.match(/<title>([^<]+)<\/title>/i);
 if(!title||!title[1].includes('料金改定のお知らせ作成ひな形')||!title[1].includes('BOOTH'))return unknown('Expected product title unavailable');
 if(!/<meta\b(?=[^>]*\sproperty=["']og:url["'])(?=[^>]*\scontent=["']https:\/\/price-profit-lab\.booth\.pm\/items\/9025062["'])[^>]*>/i.test(markup))return unknown('Expected shop/item identity unavailable');
 const files=[];
 for(const match of markup.matchAll(/<a\b[^>]*>/gi)){
  const tag=match[0];
  const href=tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  const name=tag.match(/\btitle\s*=\s*(["'])(.*?)\1/i);
  if(!href||!name)continue;
  let url;try{url=new URL(href[2].replace(/&amp;/g,'&'));}catch{continue;}
  if(url.origin==='https://booth.pm'&&/^\/downloadables\/\d+$/.test(url.pathname))files.push(name[2]);
 }
 const unique=[...new Set(files)];
 if(!unique.length)return unknown('No readable download-file anchors; login, blocking or markup change possible');
 // A wrong file is actionable even if the page's price markup has changed.
 if(unique.length!==1||unique[0]!==EXPECTED_FILE)return {status:'mismatch',reason:'Unexpected distribution filename',files:unique};
 const prices=[...markup.matchAll(/<div\b[^>]*class=["'][^"']*\bvariation-price\b[^"']*["'][^>]*>([^<]*)<\/div>/gi)].map(m=>m[1].trim());
 if(!prices.length)return unknown('Price unavailable');
 if(prices.some(p=>!/[¥￥]\s*0$/.test(p)))return {status:'mismatch',reason:'Expected free variation price',prices};
 return {status:'matches',item:ITEM_URL,file:EXPECTED_FILE,price:0,
  scope:'Public filename and displayed price only; ZIP contents, receipt and publication status are not verified'};
}
if(require.main===module){
 const file=process.argv[2];
 if(!file){console.error('Usage: node booth-free-download-check.js /path/to/public-listing.html');process.exitCode=2;}
 else{try{const result=inspect(fs.readFileSync(file,'utf8'));console.log(JSON.stringify(result));process.exitCode=result.status==='matches'?0:result.status==='mismatch'?1:2;}
 catch(_){console.error('Public listing HTML could not be read');process.exitCode=2;}}
}
module.exports={inspect};
