'use strict';
function initAnalyticsSettings(doc,win){
 const status=doc.getElementById('analyticsStatus'),stop=doc.getElementById('analyticsStop'),resume=doc.getElementById('analyticsResume');
 if(!status||!stop||!resume)return;
 const key='ppl-analytics-opt-out',flag='ga-disable-G-V55WPDJV07';
 stop.hidden=false;resume.hidden=false;
 try{status.textContent=win.localStorage.getItem(key)==='1'?'このブラウザーでは計測を停止する設定です。':'このブラウザーでは通常の計測を利用する設定です。';}
 catch(_){status.textContent='設定を読み取れないため、このページでは計測を停止しています。ブラウザーの保存設定をご確認ください。';}
 stop.addEventListener('click',()=>{
  win[flag]=true;
  try{
   win.localStorage.setItem(key,'1');
   if(win.localStorage.getItem(key)!=='1')throw new Error('Preference was not saved');
   status.textContent='計測を停止しました。このブラウザーの次回閲覧にも適用します。';
  }catch(_){status.textContent='停止設定を保存できませんでした。このページの計測は停止しましたが、次回閲覧への継続適用は確認できません。';}
 });
 resume.addEventListener('click',()=>{
  try{
   win.localStorage.removeItem(key);
   if(win.localStorage.getItem(key)==='1')throw new Error('Preference was not removed');
   win.location.reload();
  }catch(_){win[flag]=true;status.textContent='再開設定を保存できませんでした。このページでは計測停止を維持します。';}
 });
}
if(typeof document!=='undefined')initAnalyticsSettings(document,window);
if(typeof module!=='undefined')module.exports={initAnalyticsSettings};
