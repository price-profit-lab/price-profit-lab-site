'use strict';
const assert=require('node:assert/strict');
const {calc}=require('./calculator.js');
const base={oldPrice:3000,newPrice:3300,unitCost:900,oldCount:100,newCount:90,fixedCost:80000,rate:0,flatFee:0,target:150000,hours:100};
const test=(changes)=>calc({...base,...changes});
const normal=test({});
assert.equal(normal.before,130000);
assert.equal(normal.after,136000);
assert.equal(normal.diff,6000);
assert.equal(normal.needed,88);
assert.equal(normal.breakeven,34);
assert.equal(normal.goal,96);
assert.equal(normal.hourly,1360);
assert.equal(test({newCount:0}).after,-80000);
assert.equal(test({newPrice:0}).needed,NaN);
assert.equal(test({newPrice:900,flatFee:0,fixedCost:0,target:0,oldCount:0}).needed,0);
assert.equal(test({newPrice:900,flatFee:0,fixedCost:0,target:0,oldCount:0}).breakeven,0);
assert.equal(test({newPrice:900,flatFee:0,fixedCost:0,target:0,oldCount:0}).goal,0);
assert.equal(test({newPrice:800,fixedCost:0,target:0,oldCount:0}).goal,0);
assert.equal(test({newPrice:800,fixedCost:100,target:0,oldCount:0}).goal,NaN);
assert.equal(test({rate:10,flatFee:30}).after,(3300-900-330-30)*90-80000);
assert.equal(test({hours:0}).hourly,NaN);
// Extra regression cases: fee boundaries, negative profit, and zero-sales targets.
assert.equal(test({newPrice:3300,rate:100,flatFee:0,unitCost:0}).goal,NaN);
assert.equal(test({newPrice:3300,rate:0,flatFee:3300,unitCost:0,fixedCost:0,oldCount:0,target:0}).goal,0);
assert.equal(test({newPrice:1000,unitCost:1500,oldCount:0,newCount:10,fixedCost:0}).after,-5000);
assert.equal(test({newPrice:1000,unitCost:1500,oldCount:0,newCount:10,fixedCost:0}).needed,0);
assert.equal(test({newPrice:1000,unitCost:1500,oldCount:0,newCount:10,fixedCost:0}).breakeven,0);
assert.equal(test({newPrice:1000,unitCost:1500,oldCount:0,newCount:10,fixedCost:0,target:1}).goal,NaN);
// A real fraction must require one more sale, however close to an integer.
const boundary={oldPrice:1,newPrice:1,unitCost:0,oldCount:1,newCount:1,fixedCost:0,rate:0,flatFee:0,target:1,hours:0};
assert.equal(calc({...boundary,target:1.00000000001}).goal,2);
assert.equal(calc({...boundary,fixedCost:1.00000000001}).breakeven,2);
assert.equal(calc({...boundary,oldPrice:1.00000000001}).needed,2);
assert.equal(calc({...boundary,target:1e-12}).goal,1);
assert.equal(calc({...boundary,oldPrice:0.46,newPrice:0.46,unitCost:0.03,oldCount:10000000}).needed,10000000);
assert.equal(calc({...boundary,newPrice:1e-20}).goal,NaN,'Unrepresentable whole counts must not be rounded to an unsafe integer');
// Independent integer oracle: money in cents, fee in basis points. Verify both
// sufficiency and minimality, including zero/negative margins and zero goals.
let checked=0;
for(const price of [0,1,46,100,330000])for(const cost of [0,3,100])for(const fee of [0,500,3333,10000])for(const quantity of [0,1,17]){
 const oldPrice=300000,flat=4,fixed=8000,target=15000;
 const oldMargin=oldPrice*(10000-fee)-(cost+flat)*10000;
 const newMargin=price*(10000-fee)-(cost+flat)*10000;
 const r=calc({oldPrice:oldPrice/100,newPrice:price/100,unitCost:cost/100,oldCount:quantity,newCount:0,fixedCost:fixed/100,rate:fee/100,flatFee:flat/100,target:target/100,hours:0});
 for(const [key,numerator] of [['needed',oldMargin*quantity],['breakeven',fixed*10000],['goal',(target+fixed)*10000]]){
  const result=r[key];
  if(numerator<=0)assert.equal(result,0);
  else if(newMargin<=0)assert.ok(Number.isNaN(result));
  else{
   assert.ok(Number.isSafeInteger(result));
   assert.ok(result*newMargin>=numerator,`${key}: enough sales`);
   assert.ok((result-1)*newMargin<numerator,`${key}: smallest count`);
  }
  checked++;
 }
}
console.log(`All calculator boundary tests passed; ${checked} independent whole-sale decisions checked`);
