'use strict';
const assert=require('node:assert/strict');
const {reversePrice}=require('./reverse-price.js');
const base={target:150000,fixedCost:80000,quantity:100,unitCost:900,flatFee:40,rate:5};
const r=reversePrice(base);
assert.equal(r.price,3411);
assert.ok(r.monthlyProfit>=150000);
assert.equal(reversePrice({...base,quantity:80}).price,4016);
assert.equal(reversePrice({...base,rate:0,flatFee:0}).price,3200);
assert.equal(reversePrice({...base,quantity:0}),null);
assert.equal(reversePrice({...base,quantity:1.5}),null);
assert.equal(reversePrice({...base,rate:100}),null);
assert.equal(reversePrice({...base,rate:-1}),null);
assert.equal(reversePrice({...base,target:-1}),null);
assert.equal(reversePrice({...base,quantity:NaN}),null);
assert.equal(reversePrice({...base,quantity:1,rate:99.9999,target:100000000000}),null);
assert.equal(reversePrice({target:0,fixedCost:0,quantity:1,unitCost:0,flatFee:0,rate:0}).price,0);
// Volume sensitivity: 80, 100, and 120 percent of the baseline.
assert.equal(reversePrice({...base,quantity:80}).price,4016);
assert.equal(reversePrice({...base,quantity:100}).price,3411);
assert.equal(reversePrice({...base,quantity:120}).price,3008);
// Exact whole-yen boundaries must not gain a yen from binary floating-point noise.
const boundary={target:0,fixedCost:0,quantity:1,unitCost:700,flatFee:0,rate:30};
assert.equal(reversePrice(boundary).price,1000);
assert.equal(reversePrice({...boundary,unitCost:7}).price,10);
assert.equal(reversePrice({...boundary,unitCost:0.7}).price,1);
// A real fractional amount above the boundary still needs the next yen.
assert.equal(reversePrice({...boundary,unitCost:700.0000000000001}).price,1001);
assert.equal(reversePrice({...boundary,unitCost:0.7000000000000001}).price,2);
assert.equal(reversePrice({...boundary,unitCost:1e-7,rate:1e-7}).price,1);
assert.equal(reversePrice({...boundary,unitCost:5e-324,rate:0}).price,1);
// Independent integer-cent accounting checks both sufficiency and minimality.
// This does not re-use the reverse-price division or its decimal conversion.
let cases=0;
for(const fee of [0,1,125,500,1750,3000,9999]){
 for(const quantity of [1,3,20,100]){
  for(const cents of [0,1,70,700,12345,70000]){
   for(const targetCents of [0,1,10000]){
    const fixedCents=137,flatCents=41;
    const result=reversePrice({target:targetCents/100,fixedCost:fixedCents/100,quantity,unitCost:cents/100,flatFee:flatCents/100,rate:fee/100});
    assert.ok(result);
    const profitAt=price=>(BigInt(price)*100n*(10000n-BigInt(fee))-BigInt(cents+flatCents)*10000n)*BigInt(quantity)-BigInt(fixedCents)*10000n;
    assert.ok(profitAt(result.price)>=BigInt(targetCents)*10000n,'Returned price must meet the target');
    assert.ok(profitAt(result.price-1)<BigInt(targetCents)*10000n,'One yen less must fail the target');
    cases++;
   }
  }
 }
}
console.log('Reverse minimum-price accounting checks passed: '+cases+' cases');
console.log('All reverse pricing tests passed');
