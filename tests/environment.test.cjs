const test=require('node:test');const assert=require('node:assert/strict');
const {darkness,resolveDay,solarDay,weather}=require('../dist/environment-core.js');
test('electric light always overrides ambient darkness',()=>{for(const day of [true,false,null])assert.equal(darkness({light:true,blind:0},day),0)});
test('natural light follows every shutter percentage exactly, with no residual night overlay at 100%',()=>{const {naturalLight}=require('../dist/environment-core.js');for(const id of ['master','bedroom2','living','kitchen'])for(let opening=0;opening<=100;opening+=.5){const room={id,light:false,blind:opening};assert.equal(naturalLight(room,true),opening/100);assert.equal(darkness(room,true),1-opening/100);assert.equal(naturalLight(room,false),0);assert.equal(darkness(room,false),1)}assert.equal(darkness({light:false,blind:50},true),.5);assert.equal(darkness({light:false,blind:100},true),0)});
test('natural light is independent of the electric switch and clamps shutter limits',()=>{const {naturalLight}=require('../dist/environment-core.js');assert.equal(naturalLight({light:true,blind:50},true),.5);assert.equal(naturalLight({blind:-10},true),0);assert.equal(naturalLight({blind:110},true),1);assert.equal(naturalLight({blind:NaN},true),0);assert.equal(naturalLight({blind:100},null),0)});
test('windowless rooms depend on electric light; balcony receives daylight',()=>{assert.equal(darkness({id:'bath1',light:false},true),1);assert.equal(darkness({id:'hall',light:false},true),1);assert.equal(darkness({id:'balcony',light:false},true),0)});
test('sunrise and sunset boundaries use absolute timestamps',()=>{const data={daily:{time:[1000,87400],sunrise:[2000,88400],sunset:[3000,89400]}};assert.equal(resolveDay('auto',null,data,1999*1000),false);assert.equal(resolveDay('auto',null,data,2000*1000),true);assert.equal(resolveDay('auto',null,data,3000*1000),false);assert.equal(resolveDay('auto',null,data,88500*1000),true)});
test('manual previews and unavailable location',()=>{assert.equal(resolveDay('day',null,null),true);assert.equal(resolveDay('night',null,null),false);assert.equal(resolveDay('auto',null,null),null)});
test('solar fallback respects longitude and seasons, without local device timezone',()=>{assert.equal(solarDay(Date.parse('2026-06-21T12:00:00Z'),40,-8),true);assert.equal(solarDay(Date.parse('2026-06-21T00:00:00Z'),40,-8),false);assert.equal(solarDay(Date.parse('2026-06-21T12:00:00Z'),40,172),false);assert.equal(solarDay(Date.parse('2026-12-21T08:00:00Z'),60,0),false)});
test('weather icons distinguish sun, night, precipitation and unknown',()=>{assert.equal(weather(0,true).icon,'sun');assert.equal(weather(0,false).icon,'moon');assert.equal(weather(63,true).icon,'rain');assert.equal(weather(95,true).icon,'storm');assert.equal(weather(73,true).icon,'snow');assert.equal(weather(undefined,true).text,'Estado do tempo indisponível')});
test('electric night render follows lights, independently of shutters',()=>{const {electricOpacity}=require('../dist/environment-core.js');for(const opening of [0,50,100]){assert.equal(electricOpacity({light:true,blind:opening},false),1);assert.equal(electricOpacity({light:false,blind:opening},false),0)}});
test('daylight and electric light blend as shutters close',()=>{const {electricOpacity}=require('../dist/environment-core.js');assert.equal(electricOpacity({light:true,blind:100},true),.45);assert.equal(electricOpacity({light:true,blind:50},true),.725);assert.equal(electricOpacity({light:true,blind:0},true),1);assert.equal(electricOpacity({id:'bath1',light:true},true),1);assert.equal(electricOpacity({id:'balcony',light:true},true),.45);assert.equal(electricOpacity({light:false,blind:0},true),0)});

test('switched-on lights always have a visible layer in full daylight',()=>{const {electricOpacity}=require('../dist/environment-core.js');for(const id of ['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony']){assert.ok(electricOpacity({id,light:true,blind:100},true)>=.45);assert.equal(electricOpacity({id,light:false,blind:100},true),0)}});

test('hall and central bathroom follow bedroom 2, upper bathroom follows master at every opening',()=>{
 const {naturalLight,electricOpacity}=require('../dist/environment-core.js');
 for(let opening=0;opening<=100;opening+=.5){
  const rooms=[{id:'master',name:'Quarto principal',blind:100-opening,light:false},{id:'bedroom2',name:'Quarto 2',blind:opening,light:true}];
  for(const [id,expected]of [['hall',opening/100],['bath2',opening/100],['bath1',(100-opening)/100]]){
   const room={id,light:false};assert.equal(naturalLight(room,true,rooms),expected);assert.equal(darkness(room,true,rooms),1-expected);
   assert.equal(naturalLight(room,false,rooms),0);assert.equal(darkness(room,false,rooms),1);
   assert.equal(electricOpacity({...room,light:true},true,rooms),Math.round((1-.55*expected)*1000)/1000);
   assert.equal(darkness({...room,light:true},false,rooms),0);
  }
 }
});
test('linked rooms use live shutter values independently of custom room names or electric switches',()=>{
 const {naturalLight}=require('../dist/environment-core.js'),rooms=[{id:'bedroom2',name:'Escritório',blind:25,light:false}];
 assert.equal(naturalLight({id:'hall',light:true},true,rooms),.25);rooms[0].blind=75;rooms[0].light=true;
 assert.equal(naturalLight({id:'bath2',light:false},true,rooms),.75);
 assert.equal(naturalLight({id:'bath1'},true,rooms),0);
});
