'use strict';
const assert=require('node:assert/strict');
const {build}=require('./assets/service-notice-builder.js');
const v={name:'架空教室',menu:'個人レッスン',unit:'1名・1回60分',old:'8000',next:'9200',tax:'税込',date:'2026-11-01',basis:'use',reason:'運営費の上昇',contact:'店頭でご確認ください',bookings:'old',tickets:'none'};
let r=build(v);
for(const text of Object.values(r)){
 assert.ok(text.includes('2026年11月1日以降のご利用分から'));
 assert.ok(text.includes('8,000円')&&text.includes('9,200円'));
 assert.ok(text.includes('このお知らせの前に受け付けたご予約は、旧料金'));
 assert.ok(!text.includes('回数券'));
}
r=build({...v,basis:'booking',bookings:'custom',bookingText:'10月受付分は旧料金です。',tickets:'custom',ticketText:'購入済み券は記載条件どおり利用できます。'});
assert.ok(r.full.includes('11月1日以降に受け付けるご予約から'));
assert.ok(r.short.includes('10月受付分は旧料金です。'));
assert.ok(r.full.includes('購入済み券は記載条件どおり'));
for(const patch of [{date:'2026-02-30'},{old:'0'},{next:'8000'},{next:'1.5'},{next:'1000000001'},{tax:''},{basis:''},{bookings:''},{bookings:'custom',bookingText:' '},{tickets:'custom',ticketText:''},{reason:' '}])assert.throws(()=>build({...v,...patch}));
assert.ok(build({...v,date:'2028-02-29'}).full.includes('2028年2月29日'));
assert.ok(build({...v,name:'<script>sample</script>'}).full.includes('<script>sample</script>'),'Output stays plain text');
console.log('Notice builder: dates, price boundaries, application basis and existing-customer terms passed');
