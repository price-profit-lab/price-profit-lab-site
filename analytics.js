'use strict';
(function(){
 const id='G-V55WPDJV07',flag='ga-disable-'+id,key='ppl-analytics-opt-out';
 let optedOut=true;
 try{optedOut=window.localStorage.getItem(key)==='1';}catch(_){/* Do not measure when the preference cannot be read. */}
 window.dataLayer=window.dataLayer||[];
 window[flag]=location.hostname!=='price-profit-lab.pages.dev'||optedOut;
 window.gtag=function(){if(!window[flag])window.dataLayer.push(arguments);};
 // Apply another tab's opt-out immediately; resuming requires a fresh page.
 window.addEventListener('storage',event=>{if(event.key===key&&event.newValue==='1')window[flag]=true;});
 if(window[flag])return;
 const script=document.createElement('script');
 script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;
 document.head.appendChild(script);
 window.gtag('js',new Date());window.gtag('config',id);
})();
