'use strict';
// Read-only production checks. No credentials or customer data are accessed.
const https=require('node:https');
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
function sitemapPaths(xml){
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
 for(const required of ['/','/product','/reverse-price-calculator','/price-increase-calculator']){
  if(!paths.has(required))throw new Error('Required sitemap entry missing: '+required);
 }
 return [...paths];
}
async function run(){
 const errors=[];
 let sitemap;
 try{
  sitemap=await fetchText(BASE+'/sitemap.xml');
  if(sitemap.status!==200)throw new Error('HTTP '+sitemap.status);
 }catch(err){console.error('FAIL /sitemap.xml '+err.message);process.exitCode=1;return;}
 let paths;
 try{paths=sitemapPaths(sitemap.body);console.log('PASS /sitemap.xml '+paths.length+' URLs');}
 catch(err){console.error('FAIL /sitemap.xml '+err.message);process.exitCode=1;return;}
 const assets=['/calculator.js','/reverse-price.js','/price-increase-calculator.js','/site-events.js','/style.css'];
 const checks=[...paths,'/robots.txt',...assets];
 for(const path of checks){
  try{
   const res=await fetchText(BASE+path);
   const valid=res.status===200&&(path==='/robots.txt'?
    res.body.includes('Sitemap:'):
    /<html\b/i.test(res.body)&&/<title>[^<]+<\/title>/i.test(res.body));
   console.log((valid?'PASS':'FAIL')+' '+path+' HTTP '+res.status);
   if(!valid)errors.push(path);
  }catch(err){console.error('FAIL '+path+' '+err.message);errors.push(path);}
 }
 if(errors.length){console.error('Production checks failed: '+errors.join(', '));process.exitCode=1;}
 else console.log('Production checks passed: '+checks.length+' endpoints and sitemap');
}
if(require.main===module)run().catch(err=>{console.error(err);process.exitCode=1;});
module.exports={sitemapPaths};
