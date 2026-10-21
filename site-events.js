'use strict';
(function(){
 if(typeof document==='undefined'||!document.addEventListener)return;
 document.addEventListener('click',function(event){
  const anchor=event.target&&typeof event.target.closest==='function'?event.target.closest('a[href]'):null;
  if(!anchor||typeof gtag!=='function')return;
  const href=anchor.getAttribute('href')||'';
  const page=typeof location!=='undefined'?location.pathname:'unknown';
  // Classify only the two known local help pages. Never send href/query/form data.
  const help=/^(?:\.\/)?(product-help|service-excel-help)(?:\.html)?(?:[#?].*)?$/.exec(href);
  if(help){
   if(page!=='/'+help[1]&&page!=='/'+help[1]+'.html'){
    gtag('event',help[1]==='product-help'?'product_help_click':'service_excel_help_click',{source_page:page});
   }
   return;
  }
  if(/^product(?:\.html)?(?:[#?].*)?$/.test(href)){
   gtag('event','product_detail_click',{source_page:page});
   return;
  }
  if(/^(?:\.\/)?service-excel(?:\.html)?(?:[#?].*)?$/.test(href)){
   gtag('event','service_product_detail_click',{source_page:page});
   return;
  }
  // Only classify the two original screenshots on the product comparison page.
  // Send fixed labels only; never send image URLs, query strings or form values.
  const screenshot=/^(?:\.\/)?assets\/(service-standard-excel-mac|service-pro-actions-excel-mac)\.png$/.exec(href);
  if((page==='/service-excel'||page==='/service-excel.html')&&screenshot){
   gtag('event',screenshot[1]==='service-standard-excel-mac'?'standard_screenshot_click':'pro_screenshot_click',{source_page:page});
   return;
  }
  // Track free-tool navigation, including the homepage calculator anchor. No form values are sent.
  if(/^(?:index(?:\.html)?)?#(?:calculator|example-shop|example-discount)$/.test(href)&&page!=='/'&&page!=='/index.html'){
   gtag('event','free_tool_navigation',{source_page:page,tool:'profit-calculator'});
   return;
  }
  const match=/^(?:\.\/)?(reverse-price-calculator|price-increase-calculator|cancellation-calculator|profit-margin-calculator)(?:\.html)?(?:[#?].*)?$/.exec(href);
  if(match&&page!=='/'+match[1]&&page!=='/'+match[1]+'.html'){
   gtag('event','free_tool_navigation',{source_page:page,tool:match[1]});
  }
 });
})();

