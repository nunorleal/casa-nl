const {test}=require('node:test');
const assert=require('node:assert/strict');
const T=require('../dist/shelly-transport.js');
const credentials={server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE-TEST-KEY'};
const cover={id:'deadbeef0011',channel:0,position:'close'};
const group={devices:[{id:'deadbeef0011',channel:0},{id:'deadbeef0022',channel:1}],position:'open'};
const response=(status,data)=>({status,text:async()=>data});
test('direct routes preserve ID, channel zero, position, auth encoding and status selection',()=>{
 const c=T.build(credentials,'cover',cover);assert.equal(c.url,'https://shelly-1-eu.shelly.cloud/v2/devices/api/set/cover?auth_key=FAKE-TEST-KEY');assert.deepEqual(c.body,cover);
 assert.deepEqual(T.build(credentials,'status',{ids:['DEADBEEF0011','deadbeef0011']}).body,{ids:['deadbeef0011'],select:['status']});
 const g=T.build(credentials,'covers',group);assert.deepEqual(g.body,{cover:{ids:['deadbeef0011_0','deadbeef0022_1'],command:{position:'open'}}});
 assert.equal(new URL(T.build({...credentials,authKey:'fake+ &?'},'cover',cover).url).searchParams.get('auth_key'),'fake+ &?');
});
test('invalid hosts, channels, actions and duplicate pairs never produce requests',()=>{
 for(const server of ['http://shelly-1-eu.shelly.cloud','https://example.com','https://shelly-1-eu.shelly.cloud/elsewhere'])assert.throws(()=>T.build({...credentials,server},'cover',cover));
 for(const channel of [-1,16,0.5])assert.throws(()=>T.build(credentials,'cover',{...cover,channel}));
 assert.throws(()=>T.build(credentials,'covers',{...group,devices:[group.devices[0],group.devices[0]]}));
 assert.throws(()=>T.build(credentials,'cover',{...cover,position:'toggle'}));
});
test('empty HTTP 200 command acknowledgement and actual device status are decoded',()=>{
 assert.deepEqual(T.decode(T.build(credentials,'cover',cover),200,''),{accepted:true});
 const devices=[{id:cover.id,online:1,status:{'cover:0':{current_pos:50}}}];assert.deepEqual(T.decode(T.build(credentials,'status',{ids:[cover.id]}),200,JSON.stringify(devices)),{devices});
 assert.throws(()=>T.decode(T.build(credentials,'status',{ids:[cover.id]}),200,'{}'));
});
test('group failures are mapped case insensitively without inventing acceptance',()=>{
 const req=T.build(credentials,'covers',group);
 assert.deepEqual(T.decode(req,200,'{"failedCommands":{"DEADBEEF0022_1":"DEVICE_OFFLINE"}}'),{accepted:['deadbeef0011_0'],failed:{deadbeef0022_1:'DEVICE_OFFLINE'}});
 assert.equal(T.decode(req,200,'').accepted.length,2);
 for(const text of ['[]','false','{"failedCommands":null}','{"failedCommands":{"unknown_0":"ERROR"}}','{"failedCommands":{"deadbeef0011_0":null}}','not-json'])assert.throws(()=>T.decode(req,200,text));
});
test('HTTP and API errors use safe messages, never raw server content or credentials',()=>{
 const req=T.build(credentials,'cover',cover);
 for(const status of [401,403,429,500])assert.throws(()=>T.decode(req,status,'FAKE-TEST-KEY'),e=>!e.message.includes('FAKE-TEST-KEY'));
 assert.throws(()=>T.decode(req,200,'{"error":"DEVICE_OFFLINE"}'),/offline/);
 assert.throws(()=>T.decode(req,400,'{"error":"FAKE-TEST-KEY"}'),e=>!e.message.includes('FAKE-TEST-KEY'));
});
test('serialized requests enforce spacing, disable redirects/cookies/referrer and continue after failure without retry',async()=>{
 let clock=100000;const calls=[],storage=new Map();
 const transport=T.create({now:()=>clock,sleep:async ms=>{clock+=ms},storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async(url,options)=>{
  calls.push({time:clock,url,options});if(calls.length===1)throw new TypeError('network failed '+url);return response(200,'');
 }});
 const first=transport.request(credentials,'cover',cover);const second=transport.request(credentials,'cover',{...cover,position:'stop'});
 await assert.rejects(first,e=>!e.message.includes(credentials.authKey)&&/não foi repetido/.test(e.message));await second;
 assert.equal(calls.length,2);assert.ok(calls[1].time-calls[0].time>=1100);
 for(const {options}of calls){assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.method,'POST')}
 assert.deepEqual(JSON.parse(calls[1].options.body),{...cover,position:'stop'});
});
test('queued request is cancelled when settings change, without sending or retrying',async()=>{
 let sends=0,current=true;
 const transport=T.create({sleep:async()=>{current=false},fetch:async()=>{sends++;return response(200,'')}});
 await assert.rejects(transport.request(credentials,'cover',cover,()=>current),/cancelado/);assert.equal(sends,0);
});
test('timeout aborts once and reports uncertain outcome; storage unavailability does not block control',async()=>{
 let sends=0;const transport=T.create({timeout:5,sleep:async()=>{},storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},fetch:async(_,options)=>{
  sends++;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'}))));
 }});
 await assert.rejects(transport.request(credentials,'cover',cover),/sem confirmação/);assert.equal(sends,1);
});
