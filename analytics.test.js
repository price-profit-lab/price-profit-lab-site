'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {initAnalyticsSettings}=require('./analytics-settings.js');
const key='ppl-analytics-opt-out',flag='ga-disable-G-V55WPDJV07';
function page(hostname='price-profit-lab.pages.dev',value=null,blocked=false){
 const scripts=[],listeners={};
 const context={location:{hostname},localStorage:{getItem(){if(blocked)throw Error('blocked');return value;}},addEventListener(k,f){listeners[k]=f},document:{createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}}};
 context.window=context;vm.runInNewContext(fs.readFileSync('analytics.js','utf8'),context);
 return {context,scripts,listeners};
}
for(const host of ['price-profit-lab.pages.dev','price-profit-lab-staging.pages.dev','build.price-profit-lab.pages.dev','price-profit-lab.pages.dev.example.com','localhost'])for(const optOut of [null,'1']){
 const p=page(host,optOut);p.context.gtag('event','test_event');const enabled=host==='price-profit-lab.pages.dev'&&optOut!=='1';
 assert.equal(p.context.dataLayer.length,enabled?3:0);assert.equal(p.scripts.length,enabled?1:0);assert.equal(p.context[flag],!enabled);
 if(enabled){assert.equal(p.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-V55WPDJV07');assert.equal(p.context.dataLayer[1][1],'G-V55WPDJV07');}
}
const blocked=page('price-profit-lab.pages.dev',null,true);assert.equal(blocked.context[flag],true);assert.equal(blocked.scripts.length,0);
const otherTab=page();otherTab.listeners.storage({key,newValue:'1'});otherTab.context.gtag('event','no_send');assert.equal(otherTab.context.dataLayer.length,2);assert.equal(otherTab.context[flag],true);
function controls({blocked=false,ignoreWrite=false}={}){
 let value=null,reloads=0;
 const els={analyticsStatus:{textContent:''},analyticsStop:{hidden:true,listeners:{},addEventListener(k,f){this.listeners[k]=f}},analyticsResume:{hidden:true,listeners:{},addEventListener(k,f){this.listeners[k]=f}}};
 const win={localStorage:{getItem(){if(blocked)throw Error('blocked');return value;},setItem(k,v){assert.equal(k,key);if(blocked)throw Error('blocked');if(!ignoreWrite)value=v;},removeItem(k){assert.equal(k,key);if(blocked)throw Error('blocked');value=null;}},location:{reload(){reloads++;}}};
 initAnalyticsSettings({getElementById:id=>els[id]},win);return {els,win,value:()=>value,reloads:()=>reloads};
}
const ui=controls();assert.equal(ui.els.analyticsStop.hidden,false);ui.els.analyticsStop.listeners.click();assert.equal(ui.value(),'1');assert.equal(ui.win[flag],true);assert.match(ui.els.analyticsStatus.textContent,/停止しました/);ui.els.analyticsResume.listeners.click();assert.equal(ui.value(),null);assert.equal(ui.reloads(),1);
for(const options of [{blocked:true},{ignoreWrite:true}]){const c=controls(options);c.els.analyticsStop.listeners.click();assert.equal(c.win[flag],true);assert.match(c.els.analyticsStatus.textContent,/保存できません/);}
const fail=controls({blocked:true});fail.els.analyticsResume.listeners.click();assert.equal(fail.reloads(),0);assert.equal(fail.win[flag],true);
assert.equal(controls({blocked:true}).win[flag],true,'A settings read failure must actually stop this page');
console.log('Analytics: production/preview, stored opt-out, blocked storage, cross-tab stop, controls and persistence errors passed');
