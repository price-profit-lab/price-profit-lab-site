'use strict';
// Read-only production checks. No credentials or customer data are accessed.
const https=require('node:https');
const fs=require('node:fs');
const pathModule=require('node:path');
const BASE='https://price-profit-lab.pages.dev';
const MAX_BYTES=1500000;
function fetchText(url){
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{timeout:15000,headers:{'User-Agent':'PriceProfitLab-UptimeCheck/1.1'}},res=>{
   let body='';
   res.setEncoding('utf8');
   res.on('data',chunk=>{
    body+=chunk;
    if(body.length>MAX_BYTES)req.destroy(new Error('Response too large'));
   });
   res.on('end',()=>resolve({status:res.statusCode,body}));
  });
  req.on('timeout',()=>req.destroy(new Error('Timed out')));
  req.on('error',reject);
 });
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
function validResponse(path,res,assets,expectedHeading){
 if(res.status!==200)return false;
 if(path==='/robots.txt')return res.body.includes('Sitemap:');
 if(assets.includes(path))return res.body.length>100;
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
  '/service-pricing-guide':['<h1>サービス業の料金の決め方','165,600円','195,420円','href="service-excel.html"'],
  '/guides':['href="service-pricing-guide.html"']
 };
 return (requirements[path]||[]).every(marker=>html.includes(marker));
}
async function checkOnce(){
 const errors=[];
 let sitemap;
 try{
  sitemap=await fetchText(BASE+'/sitemap.xml');
  if(sitemap.status!==200)throw new Error('HTTP '+sitemap.status);
 }catch(err){console.error('FAIL /sitemap.xml '+err.message);return false;}
 let paths;
 try{paths=sitemapPaths(sitemap.body,fs.readFileSync(pathModule.join(__dirname,'sitemap.xml'),'utf8'));console.log('PASS /sitemap.xml '+paths.length+' URLs');}
 catch(err){console.error('FAIL /sitemap.xml '+err.message);process.exitCode=1;return;}
 const assets=['/calculator.js','/reverse-price.js','/price-increase-calculator.js','/site-events.js','/style.css'];
 const checks=[...paths,'/robots.txt',...assets];
 for(let offset=0;offset<checks.length;offset+=6){
  await Promise.all(checks.slice(offset,offset+6).map(async path=>{
   try{
    let expectedHeading;
    if(paths.includes(path)){
     const localFile=path==='/'?'index.html':path.slice(1)+'.html';
     const local=fs.readFileSync(pathModule.join(__dirname,localFile),'utf8');
     const match=local.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i);
     if(!match)throw new Error('Repository page missing h1');
     expectedHeading=match[1];
    }
    const res=await fetchText(BASE+path);
    const valid=validResponse(path,res,assets,expectedHeading);
    console.log((valid?'PASS':'FAIL')+' '+path+' HTTP '+res.status);
    if(!valid)errors.push(path);
   }catch(err){console.error('FAIL '+path+' '+err.message);errors.push(path);}
  }));
 }
 if(errors.length){console.error('Production checks failed: '+errors.join(', '));return false;}
 console.log('Production checks passed: '+checks.length+' endpoints and sitemap');
 return true;
}
async function run(){
 for(let attempt=1;attempt<=3;attempt++){
  console.log('Production check attempt '+attempt+'/3');
  if(await checkOnce())return;
  if(attempt<3)await new Promise(resolve=>setTimeout(resolve,20000));
 }
 process.exitCode=1;
}
if(require.main===module)run().catch(err=>{console.error(err);process.exitCode=1;});
module.exports={sitemapPaths,validResponse};
