const assert=require('node:assert/strict');const {calc}=require('./calculator');
const sample={oldPrice:3000,newPrice:3300,unitCost:900,oldCount:100,newCount:90,fixedCost:80000,rate:0,flatFee:0,target:150000,hours:100};
const r=calc(sample);assert.equal(r.before,130000);assert.equal(r.after,136000);assert.equal(r.diff,6000);assert.equal(r.needed,88);assert.equal(r.breakeven,34);assert.equal(r.goal,96);assert.equal(r.hourly,1360);
const loss=calc({...sample,newPrice:100,unitCost:900});assert.ok(Number.isNaN(loss.needed));
const zero=calc({...sample,oldCount:0,newCount:0,fixedCost:0});assert.equal(zero.before,0);assert.equal(zero.after,0);assert.equal(zero.needed,0);
console.log('Calculator tests passed');
