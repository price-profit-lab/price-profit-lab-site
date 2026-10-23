'use strict';
// Read-only production checks. No credentials or customer data are accessed.
const https=require('node:https');
const fs=require('node:fs');
const pathModule=require('node:path');
const {createHash}=require('node:crypto');
const BASE='https://price-profit-lab.pages.dev';
const MAX_BYTES=1500000;
function fetchResource(url,binary=false){
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{timeout:15000,headers:{'User-Agent':'PriceProfitLab-UptimeCheck/1.1'}},res=>{
   const chunks=[];
   let bytes=0;
   res.on('data',chunk=>{
    bytes+=chunk.length;
    if(bytes>MAX_BYTES){req.destroy(new Error('Response too large'));return;}
    chunks.push(chunk);
   });
   res.on('end',()=>{
    const body=Buffer.concat(chunks);
    resolve({status:res.statusCode,body:binary?body:body.toString('utf8')});
   });
  });
  req.on('timeout',()=>req.destroy(new Error('Timed out')));
  req.on('error',reject);
 });
}
function validAssetResponse(res,expectedHash){
 return res.status===200&&Buffer.isBuffer(res.body)&&
  createHash('sha256').update(res.body).digest('hex')===expectedHash;
}
function validImageResponse(res,expectedHash){
 return validAssetResponse(res,expectedHash)&&
  res.body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
}
function fragmentLinkErrors(pages){
 // Reuse the fetched HTML: validate deployed destinations without extra requests.
 const markup=html=>html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const normalize=pathname=>pathname.replace(/\/index(?:\.html)?$/,'/').replace(/\.html$/,'');
 const documents=new Map([...pages].map(([pathname,html])=>[normalize(pathname),markup(html)]));
 const errors=[];
 for(const [source,html] of documents){
  for(const anchor of html.matchAll(/<a\b[^>]*>/gi)){
   const href=anchor[0].match(/\shref\s*=\s*(["'])(.*?)\1/i);
   if(!href)continue;
   let url;
   try{url=new URL(href[2].replace(/&amp;/g,'&'),BASE+source);}catch{continue;}
   if(url.origin!==BASE||!url.hash)continue;
   // Text fragments can accompany an element fragment, or stand alone.
   const raw=url.hash.slice(1).split(':~:')[0];
   if(!raw)continue;
   const target=normalize(url.pathname);
   // Image/download links are not HTML fragment destinations.
   if(!documents.has(target)&&/\.[^/]+$/.test(target))continue;
   const destination=documents.get(target);
   if(destination===undefined){errors.push(source+' -> '+target+' (page unavailable)');continue;}
   let id;
   try{id=decodeURIComponent(raw);}catch{errors.push(source+' -> '+target+' (invalid fragment)');continue;}
   const ids=[...destination.matchAll(/\sid\s*=\s*(["'])(.*?)\1/gi)].map(match=>match[2]);
   if(!ids.includes(id))errors.push(source+' -> '+target+'#'+id+' (anchor missing)');
  }
 }
 return errors;
}
function sitemapPaths(xml,expectedXml){
 if(!xml.includes('<urlset'))throw new Error('Missing XML sitemap urlset');
 const urls=[...xml.matchAll(/<loc>\s*(https:\/\/[^<\s]+)\s*<\/loc>/g)].map(m=>m[1]);
 if(urls.length<10)throw new Error('Unexpectedly short sitemap');
 const paths=new Set();
 for(const url of urls){
  const parsed=new URL(url);
  if(parsed.origin!==BASE||parsed.search||parsed.hash)throw new Error('Invalid sitemap URL '+url);
  paths.add(parsed.pathname);
 }
 if(paths.size!==urls.length)throw new Error('Duplicate sitemap entries');
 for(const required of ['/','/product','/reverse-price-calculator','/price-increase-calculator','/service-excel','/service-pricing-guide']){
  if(!paths.has(required))throw new Error('Required sitemap entry missing: '+required);
 }
 if(expectedXml!==undefined){
  const expected=sitemapPaths(expectedXml);
  const missing=expected.filter(path=>!paths.has(path));
  const unexpected=[...paths].filter(path=>!expected.includes(path));
  if(missing.length||unexpected.length)throw new Error('Sitemap differs from repository; missing: '+missing.join(', ')+'; unexpected: '+unexpected.join(', '));
 }
 return [...paths];
}
function validPurchaseLinks(html,expectedIds){
 const seen=new Set();
 // Check actual anchors, not URLs in prose, scripts, or commented-out buttons.
 const markup=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 for(const anchor of markup.matchAll(/<a\b[^>]*>/gi)){
  const tracked=/\sdata-ga4-booth-click\s*=\s*(["'])1\1/i.test(anchor[0]);
  const match=anchor[0].match(/\shref\s*=\s*(["'])(.*?)\1/i);
  if(!match){if(tracked)return false;continue;}
  let url;
  try{url=new URL(match[2],BASE);}catch{return false;}
  if(!tracked&&(!url.hostname.endsWith('.booth.pm')||!url.pathname.startsWith('/items/')))continue;
  const id=url.pathname.match(/^\/items\/(\d+)\/?$/);
  if(url.protocol!=='https:'||url.host!=='price-profit-lab.booth.pm'||!id||!expectedIds.includes(id[1]))return false;
  // A valid set of item IDs is insufficient: Standard and Pro can be swapped.
  const labels={'9011039':'Standard','9011528':'Pro'};
  const rest=markup.slice(anchor.index+anchor[0].length);
  const closing=rest.search(/<\/a\s*>/i);
  if(closing<0||/<a\b/i.test(rest.slice(0,closing)))return false;
  const text=rest.slice(0,closing).replace(/<[^>]*>/g,' ');
  for(const [item,label] of Object.entries(labels)){
   if(new RegExp('\\b'+label+'\\b','i').test(text)&&id[1]!==item)return false;
  }
  if(tracked){
   const handler=anchor[0].match(/\sonclick\s*=\s*(["'])([\s\S]*?)\1/i);
   if(!handler)return false;
   const decoded=handler[2].replace(/&#(?:0*39|x0*27);|&apos;/gi,"'").replace(/&#(?:0*34|x0*22);|&quot;/gi,'"');
   const events={'9001298':'booth_product_click','9011039':'booth_standard_click','9011528':'booth_pro_click'};
   const event=decoded.match(/gtag\(\s*['"]event['"]\s*,\s*['"]([^'"]+)['"]/);
   const product=decoded.match(/\bproduct_id\s*:\s*['"](\d+)['"]/);
   if(!event||event[1]!==events[id[1]]||!product||product[1]!==id[1])return false;
   if(labels[id[1]]&&!new RegExp('\\b'+labels[id[1]]+'\\b','i').test(text))return false;
  }
  seen.add(id[1]);
 }
 return expectedIds.every(id=>seen.has(id));
}
function validResponse(path,res,assets,expectedHeading,expectedAssetHash){
 if(res.status!==200)return false;
 if(path==='/robots.txt')return res.body.includes('Sitemap:');
 if(assets.includes(path))return validAssetResponse(res,expectedAssetHash);
 const html=res.body;
 if(!html.includes('<html')||!/<title>[^<]+<\/title>/.test(html))return false;
 const canonicalTag=html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i);
 const canonical=canonicalTag&&canonicalTag[0].match(/\bhref=["']([^"']+)["']/i);
 if(!canonical||canonical[1]!==BASE+path)return false;
 if(expectedHeading!==undefined){
  const heading=html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i);
  if(!heading||heading[1]!==expectedHeading)return false;
 }
 const requirements={
  '/product':['https://price-profit-lab.booth.pm/items/9001298'],
  '/':['href="service-excel.html"'],
  '/service-excel':['https://price-profit-lab.booth.pm/items/9011039','https://price-profit-lab.booth.pm/items/9011528','1,480円','2,980円','href="service-pricing-guide.html"'],
  '/service-pricing-guide':['id="excel-formulas"','data-formula-cell="B14"','165,600円','195,420円','href="service-excel.html"'],
  '/guides':['href="service-pricing-guide.html"'],
  '/en/':['<html lang="en"','id="oldPrice"','id="newPrice"','id="error"']
 };
 const expectedProducts={'/product':['9001298'],'/service-excel':['9011039','9011528']};
 if(expectedProducts[path]&&!validPurchaseLinks(html,expectedProducts[path]))return false;
 return (requirements[path]||[]).every(marker=>html.includes(marker));
}
async function checkOnce(){
 const errors=[];
 const livePages=new Map();
 let sitemap;
 try{
  sitemap=await fetchResource(BASE+'/sitemap.xml');
  if(sitemap.status!==200)throw new Error('HTTP '+sitemap.status);
 }catch(err){console.error('FAIL /sitemap.xml '+err.message);return false;}
 let paths;
 try{paths=sitemapPaths(sitemap.body,fs.readFileSync(pathModule.join(__dirname,'sitemap.xml'),'utf8'));console.log('PASS /sitemap.xml '+paths.length+' URLs');}
 catch(err){console.error('FAIL /sitemap.xml '+err.message);return false;}
 const assets=['/analytics.js','/analytics-settings.js','/calculator-navigation.js','/profit-margin.js','/cancellation-calculator.js','/calculator.js','/reverse-price.js','/price-increase-calculator.js','/site-events.js','/guides-filter.js','/product-selection.js','/style.css'];
 // Include the English calculator even though it is not in the Japanese sitemap.
 const pages=[...new Set([...paths,'/en/'])];
 const images=['/assets/service-standard-excel-mac.png','/assets/service-pro-actions-excel-mac.png','/assets/free-tools-share.png'];
 const checks=[...pages,'/robots.txt',...assets,...images];
 for(let offset=0;offset<checks.length;offset+=6){
  await Promise.all(checks.slice(offset,offset+6).map(async path=>{
   try{
    let expectedHeading;
    if(pages.includes(path)){
     const localFile=path==='/'?'index.html':path.endsWith('/')?path.slice(1)+'index.html':path.slice(1)+'.html';
     const local=fs.readFileSync(pathModule.join(__dirname,localFile),'utf8');
     const match=local.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i);
     if(!match)throw new Error('Repository page missing h1');
     expectedHeading=match[1];
    }
    const image=images.includes(path);
    const binary=image||assets.includes(path);
    const res=await fetchResource(BASE+path,binary);
    if(pages.includes(path)&&res.status===200)livePages.set(path,res.body);
    const expectedHash=binary?createHash('sha256').update(fs.readFileSync(pathModule.join(__dirname,path.slice(1)))).digest('hex'):undefined;
    const valid=image?validImageResponse(res,expectedHash):validResponse(path,res,assets,expectedHeading,expectedHash);
    console.log((valid?'PASS':'FAIL')+' '+path+' HTTP '+res.status);
    if(!valid)errors.push(path);
   }catch(err){console.error('FAIL '+path+' '+err.message);errors.push(path);}
  }));
 }
 const linkErrors=fragmentLinkErrors(livePages);
 for(const error of linkErrors)console.error('FAIL live link '+error);
 errors.push(...linkErrors);
 if(!linkErrors.length)console.log('PASS live HTML fragment destinations');
 if(errors.length){console.error('Production checks failed: '+errors.join(', '));return false;}
 console.log('Production checks passed: '+checks.length+' endpoints and sitemap');
 return true;
}
async function run(check=checkOnce,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
 for(let attempt=1;attempt<=3;attempt++){
  console.log('Production check attempt '+attempt+'/3');
  if(await check())return true;
  if(attempt<3)await wait(20000);
 }
 return false;
}
if(require.main===module)run().then(ok=>{if(!ok)process.exitCode=1;}).catch(err=>{console.error(err);process.exitCode=1;});
module.exports={sitemapPaths,validPurchaseLinks,validResponse,validImageResponse,validAssetResponse,fragmentLinkErrors,run};


