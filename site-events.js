'use strict';
(function(){
 if(typeof document==='undefined'||!document.addEventListener)return;
 document.addEventListener('click',function(event){
  const anchor=event.target&&typeof event.target.closest==='function'?event.target.closest('a[href]'):null;
  if(!anchor||typeof gtag!=='function')return;
  const href=anchor.getAttribute('href')||'';
  if(!/^product(?:\.html)?(?:[#?].*)?$/.test(href))return;
  const page=typeof location!=='undefined'?location.pathname:'unknown';
  gtag('event','product_detail_click',{source_page:page});
 });
})();
