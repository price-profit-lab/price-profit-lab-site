'use strict';
(function(){
 if(typeof document==='undefined'||!document.addEventListener)return;
 document.addEventListener('click',function(event){
  const anchor=event.target&&typeof event.target.closest==='function'?event.target.closest('a[href]'):null;
  if(!anchor||typeof gtag!=='function')return;
  const href=anchor.getAttribute('href')||'';
  const page=typeof location!=='undefined'?location.pathname:'unknown';
  if(/^product(?:\.html)?(?:[#?].*)?$/.test(href)){
   gtag('event','product_detail_click',{source_page:page});
   return;
  }
  // Track free-tool navigation, including the homepage calculator anchor. No form values are sent.
  if(/^(?:index(?:\.html)?)?#calculator$/.test(href)&&page!=='/'&&page!=='/index.html'){
   gtag('event','free_tool_navigation',{source_page:page,tool:'profit-calculator'});
   return;
  }
  const match=/^(?:\.\/)?(reverse-price-calculator|price-increase-calculator)(?:\.html)?(?:[#?].*)?$/.exec(href);
  if(match&&page!=='/'+match[1]&&page!=='/'+match[1]+'.html'){
   gtag('event','free_tool_navigation',{source_page:page,tool:match[1]});
  }
 });
})();
