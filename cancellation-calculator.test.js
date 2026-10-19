'use strict';
const assert=require('node:assert/strict');
const {calculateCancellation,initCancellationCalculator}=require('./cancellation-calculator.js');
const sample={price:6000,cost:2600,fee:3,fixed:50000,bookings:80,cancellation:10};
const result=calculateCancellation(sample);
assert.deepEqual(result,{margin:3220,cancelled:8,completed:72,baseline:207600,profit:181840,profitChange:-25760,lostSales:48000});
for(const [rate,completed,profit] of [[0,80,207600],[20,64,156080],[25,60,143200],[100,0,-50000]]){
 const r=calculateCancellation({...sample,cancellation:rate});
 assert.equal(r.completed,completed);assert.equal(r.profit,profit);
 assert.ok(Math.abs(r.profit-r.baseline-r.profitChange)<1e-8);
}
assert.equal(calculateCancellation({...sample,bookings:0}).profit,-50000);
assert.equal(calculateCancellation({...sample,fee:100}).margin,-2600);
const negative=calculateCancellation({...sample,price:1000});
assert.ok(negative.margin<0&&negative.profitChange>0,'Cancellation avoids loss when contribution is negative');
assert.equal(calculateCancellation({...sample,bookings:3,cancellation:10}).completed,2.7);
assert.equal(calculateCancellation({...sample,price:0,cost:0,fee:0,fixed:0,bookings:0,cancellation:0}).profit,0);
for(const [field,values] of Object.entries({
 price:[-1,Infinity,NaN,1e9+1,'6000'],cost:[-1,1e9+1],fee:[-1,100.01],
 fixed:[-1,1e12+1],bookings:[-1,1.5,1e6+1],cancellation:[-1,100.01,NaN]
})){
 for(const value of values)assert.equal(calculateCancellation({...sample,[field]:value}).field,field);
}
const upper=calculateCancellation({price:1e9,cost:1e9,fee:100,fixed:1e12,bookings:1e6,cancellation:100});
for(const n of Object.values(upper))assert.ok(Number.isFinite(n),'Upper bounds must stay finite');
function element(value=''){
 return {value,defaultValue:value,textContent:'',className:'',hidden:false,attrs:{},events:{},
 setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;}};
}
const nodes={};
for(const [key,value] of Object.entries(sample))nodes['cancel-'+key]=element(String(value));
for(const key of ['cancellationForm','cancellationError','cancellationResult','cancellationWarning','cancellationReset',...['baseline','profit','profitChange','lostSales','margin','completed','cancelled'].map(k=>'cancel-result-'+k)])nodes[key]=element();
initCancellationCalculator({getElementById:key=>nodes[key]});
assert.equal(nodes['cancel-result-profit'].textContent,'181,840円');
assert.equal(nodes.cancellationResult.hidden,false);
nodes['cancel-price'].value='';nodes['cancel-price'].events.input();
assert.equal(nodes.cancellationResult.hidden,true);
assert.match(nodes.cancellationError.textContent,/1件の料金/);
assert.equal(nodes['cancel-price'].attrs['aria-invalid'],'true');
nodes['cancel-price'].value='1000';nodes['cancel-price'].events.input();
assert.equal(nodes.cancellationResult.hidden,false);
assert.equal(nodes.cancellationWarning.hidden,false);
assert.equal(nodes['cancel-price'].attrs['aria-invalid'],'false');
assert.ok(nodes['cancel-result-profitChange'].textContent.startsWith('+'));
nodes['cancel-cancellation'].value='101';nodes['cancel-cancellation'].events.input();
assert.equal(nodes.cancellationResult.hidden,true);
nodes.cancellationReset.events.click();
assert.equal(nodes.cancellationResult.hidden,false);
assert.equal(nodes.cancellationWarning.hidden,true);
assert.equal(nodes['cancel-price'].value,'6000');
assert.equal(nodes['cancel-result-profit'].textContent,'181,840円');
console.log('Cancellation model, boundaries, invalid input, warning and reset checks passed');
