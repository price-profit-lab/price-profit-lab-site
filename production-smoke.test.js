'use strict';
// Production smoke checks: public pages only; no analytics, credentials or Search Console access.
const https=require('node:https');
const base='https://price-profit-lab.pages.dev';
const pages=['/','/product','/reverse-price-calculator','/price-increase-calculator','/price-increase-notice-guide','/shipping-profit-guide','/sitemap.xml','/robots.txt'];
function fetchPage(path){
 return new Promise((resolve,reject)=>{
  const req=https.get(base+path,{timeout:15000,headers:{'User-Agent':'PriceProfitLab-UptimeCheck/1.0'}},res=>{
   let body='';
   res.setEncoding('utf8');
   res.on('data',chunk=>{body+=chunk;if(body.length>1500000)req.destroy(new Error('Response too large'));});
   res.on('end',()=>resolve({status:res.statusCode,body,location:res.headers.location}));
  });
  req.on('timeout',()=>req.destroy(new Error('Timed out')));
  req.on('error',reject);
 });
}
async function check(){
 let failed=0;
 for(const path of pages){
  try{
   const res=await fetchPage(path);
   const ok=res.status===200&&(
    path==='/sitemap.xml'?res.body.includes('<urlset')&&res.body.includes('/price-increase-calculator</loc>'):
    path==='/robots.txt'?res.body.includes('Sitemap:'):
    res.body.includes('<html')&&res.body.includes('価格と利益の計算室')
   );
   console.log((ok?'PASS':'FAIL')+' '+path+' HTTP '+res.status+(res.location?' -> '+res.location:''));
   if(!ok)failed++;
  }catch(err){failed++;console.error('FAIL '+path+' '+err.message);}
 }
 if(failed){console.error(failed+' production checks failed');process.exitCode=1;}
 else console.log('Production checks passed: '+pages.length+' endpoints');
}
check().catch(err=>{console.error(err);process.exitCode=1;});
