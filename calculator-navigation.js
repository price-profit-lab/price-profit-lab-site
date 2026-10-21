'use strict';
function initCalculatorNavigation(doc){
 for(const button of doc.querySelectorAll('[data-calculator-result]')){
  const result=doc.getElementById(button.getAttribute('data-calculator-result'));
  const error=doc.getElementById(button.getAttribute('data-calculator-error'));
  if(!result||!error)continue;
  button.hidden=false;
  button.addEventListener('click',()=>{
   let target;
   if(result.hidden||error.textContent.trim()){
    target=doc.querySelector('input[aria-invalid="true"]')||error;
   }else{
    target=result.querySelector('h2')||result.querySelector('.metrics')||result;
   }
   if(target.tagName!=='INPUT')target.setAttribute('tabindex','-1');
   target.setAttribute('data-result-focus','');
   if(target!==error&&target.tagName!=='INPUT'&&target.tagName!=='H2'){
    target.setAttribute('role','region');target.setAttribute('aria-label','計算結果');
   }
   target.focus({preventScroll:true});
   target.scrollIntoView({behavior:'instant',block:'start'});
  });
 }
}
if(typeof document!=='undefined')initCalculatorNavigation(document);
if(typeof module!=='undefined')module.exports={initCalculatorNavigation};
