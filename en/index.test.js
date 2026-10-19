'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const values={currency:'$',oldPrice:'30',newPrice:'33',unitCost:'9',oldCount:'100',newCount:'90',fixedCost:'800',rate:'0',flatFee:'0'};
const nodes={};
for(const id of [...Object.keys(values),'before','after','diff','needed','scenarios','error','reset']){
 nodes[id]={_value:values[id]||'',get value(){return this._value},set value(v){this._value=String(v)},textContent:'',innerHTML:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn},replaceChildren(){this.innerHTML=''}};
}
const context=vm.createContext({document:{getElementById:id=>nodes[id]}});
vm.runInContext(script,context);
function input(id,value){nodes[id].value=value;nodes[id].listeners.input()}
function reset(){nodes.reset.listeners.click()}
assert.equal(nodes.before.textContent,'$1,300');
assert.equal(nodes.after.textContent,'$1,360');
assert.equal(nodes.needed.textContent,'88 units');
input('oldPrice','1e308');
assert.ok(nodes.error.textContent,'Overflow must show an input error');
for(const id of ['before','after','diff','needed'])assert.equal(nodes[id].textContent,'—');
assert.equal(nodes.scenarios.innerHTML,'');
input('oldPrice','30');
assert.equal(nodes.error.textContent,'');
assert.equal(nodes.after.textContent,'$1,360');
reset();input('newPrice','1e308');input('newCount','0');
assert.ok(nodes.error.textContent,'Overflow in sales scenarios must be rejected even when projected sales are zero');
assert.equal(nodes.scenarios.innerHTML,'');
reset();input('oldPrice','');
assert.ok(nodes.error.textContent);
reset();input('oldCount','1.5');assert.ok(nodes.error.textContent);
reset();input('rate','101');assert.ok(nodes.error.textContent);
reset();assert.equal(nodes.error.textContent,'');assert.equal(nodes.after.textContent,'$1,360');
console.log('English calculator sample, overflow, invalid input, recovery and reset checks passed');
