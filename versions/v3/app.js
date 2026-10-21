'use strict';
const paths={home:'M3 10.5 12 3l9 7.5M5 9v12h5v-7h4v7h5V9',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z|M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',blind:'M5 4h14M5 8h14M5 12h14M5 16h14M12 16v5',light:'M9 18h6M9 21h6M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4',settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8|M10 3h4l1 3 3 1 3 1v4l-3 1-1 3-1 3h-4l-1-3-3-1-3-1v-4l3-1 1-3Z',layers:'m12 3 10 6-10 6L2 9Zm-9 10 9 5 9-5M3 17l9 5 9-5',scan:'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5',open:'M5 3h14M5 7h14M5 11h14M8 21l4-5 4 5',close:'M5 3h14M5 7h14M5 11h14M8 17l4 5 4-5',up:'m6 14 6-6 6 6M12 8v12',down:'m6 10 6 6 6-6M12 16V4',pause:'M9 5v14M15 5v14',moon:'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z','arrow-right':'M4 12h16m-6-6 6 6-6 6',shield:'M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6ZM8 12l3 3 5-6',x:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',room:'M3 21V3h18v18ZM9 3v8h12M3 15h6v6'};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${(paths[name]||paths.home).split('|').map(d=>`<path d="${d}"/>`).join('')}</svg>`}
Object.assign(paths,{chevron:'m9 5 7 7-7 7',touch:'M9 12V5a2 2 0 0 1 4 0v6l4 1c2 0 3 2 2 4l-2 5H9l-5-7a2 2 0 0 1 3-2l2 2',sliders:'M3 6h18M3 18h18M7 3v6M17 15v6M3 12h18M13 9v6'});
function fillIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon))}fillIcons();
const defaults=[
{id:'master',name:'Quarto principal',short:'Quarto',description:'Zona de descanso · piso 0',light:false,blind:0,bx:84,by:18,lx:63,ly:17,wash:[41,3,42,25]},
{id:'bedroom2',name:'Quarto 2',short:'Quarto 2',description:'Segunda divisão · piso 0',light:false,blind:0,bx:84,by:39,lx:64,ly:43,wash:[46,31,37,25]},
{id:'living',name:'Sala',short:'Sala',description:'Zona de estar · piso 0',light:true,blind:60,bx:84,by:67,lx:40,ly:66,wash:[20,57,48,31]},
{id:'kitchen',name:'Cozinha',short:'Cozinha',description:'Zona de refeições · piso 0',light:true,blind:30,bx:86,by:87,lx:56,ly:86,wash:[25,76,58,18]},
{id:'bath1',name:'Casa de banho 1',short:'I.S. 01',description:'Instalação sanitária · piso 0',light:false,lx:23,ly:13,wash:[10,3,23,16]},
{id:'bath2',name:'Casa de banho 2',short:'I.S. 02',description:'Instalação sanitária · piso 0',light:false,lx:31,ly:46,wash:[22,39,17,17]},
{id:'hall',name:'Corredor',short:'Corredor',description:'Entrada e circulação · piso 0',light:true,lx:15,ly:47,wash:[10,25,12,47]},
{id:'balcony',name:'Varanda',short:'Varanda',description:'Espaço exterior · piso 0',light:false,lx:89,ly:83,wash:[83,77,11,16]}
];
let rooms=structuredClone(defaults), mode='blinds', selected='living', labels=true, toastTimer;
const motions=new Map();
try{const saved=JSON.parse(localStorage.getItem('casa-nl-realistic-v2'));if(Array.isArray(saved))rooms=defaults.map(r=>{const s=saved.find(s=>s.id===r.id);if(!s)return r;return{...r,light:typeof s.light==='boolean'?s.light:r.light,...('blind'in r&&Number.isFinite(s.blind)?{blind:Math.max(0,Math.min(100,s.blind))}:{})}})}catch{}
function persist(){try{localStorage.setItem('casa-nl-realistic-v2',JSON.stringify(rooms))}catch{}}
function notify(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3400)}
function current(){return rooms.find(r=>r.id===selected)}
function blindText(r){return motions.has(r.id)?'Em movimento':r.blind===0?'Totalmente fechado':r.blind===100?'Totalmente aberto':'Parcialmente aberto'}

// Coordinates use the original image space; the SVG viewBox matches its CSS crop.
// Shared geometry for lighting and touch targets. The upper passage belongs to the
// main bedroom; the corridor starts between the doors, at image y=470.
const lightingZones={
master:'M354 169H837V470H119V349H335V366H354Z',
bedroom2:'M239 502H837V782H418V593H239Z',
bath1:'M119 175H333V348H119Z',
bath2:'M238 613H399V782H238Z',
hall:'M119 470H219V593H238V706H219V783H119Z',
living:'M120 805H837V1080H854V1118H239V1034H120Z',
kitchen:'M239 1118H854V1220H239Z',
balcony:'M854 1072L955 1032V1220H854Z'
};
function drawRoomLighting(){
 const host=document.getElementById('light-washes');
 if(!host.querySelector('.room-lighting')){
  host.innerHTML=`<svg class="room-lighting" viewBox="0 140 1024 1180" preserveAspectRatio="none" aria-hidden="true"><defs>${Object.entries(lightingZones).map(([id,d])=>`<clipPath id="night-clip-${id}" clipPathUnits="userSpaceOnUse"><path d="${d}" fill="white"/></clipPath>`).join('')}</defs>${Object.entries(lightingZones).map(([id,d])=>`<g data-light-zone="${id}"><image class="room-night-render" href="assets/planta-noturna.png" x="0" y="0" width="1024" height="1536" preserveAspectRatio="none" clip-path="url(#night-clip-${id})"/><path class="room-warmth" d="${d}"/></g>`).join('')}</svg>`;
 }
 Object.keys(lightingZones).forEach(id=>{const r=rooms.find(r=>r.id===id);host.querySelector(`[data-light-zone="${id}"]`).classList.toggle('is-off',!r.light)});
}

function drawPlan(){
 const hits=Object.entries(lightingZones).map(([id,d])=>`<path class="room-hit" d="${d}" data-room="${id}" role="button" tabindex="0" aria-label="Abrir controlos de ${rooms.find(r=>r.id===id).name}"/>`).join('');
 document.getElementById('hotspots').innerHTML=`<svg class="room-hit-zones" viewBox="0 140 1024 1180" preserveAspectRatio="none">${hits}</svg>`+rooms.map(r=>`<button class="room-pin ${r.light?'':'is-off'}" data-room="${r.id}" style="--x:${r.lx}%;--y:${r.ly}%" aria-label="Abrir controlos de ${r.name}, luz ${r.light?'ligada':'desligada'}"><i></i><span>${r.id==='bath1'||r.id==='bath2'?'WC':r.name}</span></button>`).join('');
 document.getElementById('hotspots').classList.toggle('labels-hidden',!labels);drawRoomLighting();
}

function drawList(){document.getElementById('device-list').innerHTML=rooms.filter(r=>mode==='lights'||'blind'in r).map(r=>`<button class="device-item" data-room="${r.id}" aria-label="Selecionar ${r.name}" aria-pressed="${selected===r.id}"><span class="device-icon">${icon(mode==='blinds'?'blind':'light')}</span><span class="device-copy">${r.name}<small>${mode==='blinds'?blindText(r):r.light?'Iluminação ligada':'Iluminação desligada'}</small></span>${mode==='blinds'?`<b class="device-percent"><span data-position="${r.id}">${Math.round(r.blind)}</span>%</b>`:`<span class="light-state-value ${r.light?'on':''}">${r.light?'Ligada':'Desligada'}</span>`}</button>`).join('')}
function drawDetail(){
 const r=current();
 document.getElementById('detail-card').innerHTML=`<div class="detail-eyebrow">CONTROLOS DA DIVISÃO</div><h2 id="room-title">${r.name}</h2><p class="detail-subtitle">${r.description}</p><div class="detail-divider light-control"><div class="detail-row"><div><h3>Iluminação</h3><p>${r.light?'Luz ligada':'Luz apagada · ambiente noturno'}</p></div><button class="switch" role="switch" aria-checked="${r.light}" aria-label="Iluminação de ${r.name}" id="light-toggle"></button></div></div>${'blind'in r?`<div class="detail-divider"><div class="detail-row"><div><h3>Estore</h3><p id="detail-status">${blindText(r)}</p></div><span>${icon('blind')}</span></div><div class="window-scene" aria-hidden="true"><div class="window-outside"></div><div class="window-blind" style="height:${100-r.blind}%"></div></div><div class="position-value"><span>Abertura</span><strong><span id="detail-percent">${Math.round(r.blind)}</span><em>%</em></strong></div><div class="range-wrap"><input type="range" id="blind-range" min="0" max="100" value="${Math.round(r.blind)}" aria-label="Abertura do estore de ${r.name}" style="--value:${r.blind}%"><div class="range-labels"><span>Fechado</span><span>Aberto</span></div></div><div class="blind-controls"><button data-command="open">${icon('up')}Abrir</button><button data-command="pause">${icon('pause')}Parar</button><button data-command="close">${icon('down')}Fechar</button></div></div>`:''}<p class="selected-device-note">${icon('shield')}Demonstração · sem ligação à Shelly</p>`;
 const range=document.getElementById('blind-range');if(range){range.addEventListener('input',()=>{stopMotion(r.id);r.blind=Number(range.value);updatePositions();persist()});range.addEventListener('change',()=>{drawList();notify(`${r.name} · estore a ${Math.round(r.blind)}% (simulação)`)})}
}

function updateSummary(){const count=rooms.filter(r=>r.light).length;document.getElementById('summary-number').textContent=count;document.getElementById('summary-label').textContent='luzes ligadas';document.getElementById('plan-status').textContent=rooms.filter(r=>r.blind>0).length+' estores abertos';}

function updatePositions(){rooms.filter(r=>'blind'in r).forEach(r=>{document.querySelectorAll(`[data-position="${r.id}"]`).forEach(el=>el.textContent=Math.round(r.blind));const badge=document.querySelector(`.hotspot[data-room="${r.id}"]`);if(badge&&mode==='blinds'){badge.classList.toggle('is-closed',r.blind===0);badge.setAttribute('aria-label',`Estore de ${r.name}, ${Math.round(r.blind)}% aberto`)}const item=document.querySelector(`.device-item[data-room="${r.id}"] .device-copy small`);if(item&&mode==='blinds')item.textContent=blindText(r)});if(document.getElementById('blind-range')){const r=current();document.getElementById('detail-percent').textContent=Math.round(r.blind);document.getElementById('detail-status').textContent=blindText(r);document.querySelector('.window-blind').style.height=(100-r.blind)+'%';const input=document.getElementById('blind-range');input.value=Math.round(r.blind);input.style.setProperty('--value',r.blind+'%')}updateSummary()}
function render(){drawPlan();drawList();drawDetail();updateSummary();persist()}
function stopMotion(id){if(motions.has(id)){clearInterval(motions.get(id));motions.delete(id)}}
function move(r,target){stopMotion(r.id);if(r.blind===target)return;const start=r.blind,begin=performance.now(),duration=Math.max(600,Math.abs(target-start)*27);const timer=setInterval(()=>{const progress=Math.min(1,(performance.now()-begin)/duration);r.blind=Math.round((start+(target-start)*progress)*10)/10;if(progress===1){stopMotion(r.id);r.blind=target;persist()}updatePositions()},40);motions.set(r.id,timer);updatePositions()}
function showPopup(id){document.querySelectorAll('dialog[open]').forEach(d=>{if(d.id!==id)d.close()});const d=document.getElementById(id);if(!d.open)d.showModal();}
function selectRoom(id){selected=id;render();showPopup('room-dialog')}
function setMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.mode===mode));b.tabIndex=b.dataset.mode===mode?0:-1});document.getElementById('global-panel').setAttribute('aria-labelledby',mode==='blinds'?'tab-blinds':'tab-lights');document.getElementById('list-heading').textContent=mode==='blinds'?'Os seus estores':'A sua iluminação';document.getElementById('device-total').textContent=mode==='blinds'?'4 dispositivos':'8 dispositivos';document.getElementById('all-open').innerHTML=icon(mode==='blinds'?'open':'light')+`<span>${mode==='blinds'?'Abrir todos':'Ligar todas'}</span>`;document.getElementById('all-close').innerHTML=icon(mode==='blinds'?'close':'moon')+`<span>${mode==='blinds'?'Fechar todos':'Apagar todas'}</span>`;render()}

document.addEventListener('click',e=>{const room=e.target.closest('[data-room]');if(room){selectRoom(room.dataset.room);return}const tab=e.target.closest('[data-mode]');if(tab){setMode(tab.dataset.mode);return}const command=e.target.closest('[data-command]');if(command){const r=current();if(command.dataset.command==='pause'){stopMotion(r.id);updatePositions();persist();notify(`Estore de ${r.name} parado a ${Math.round(r.blind)}% · simulação`)}else{move(r,command.dataset.command==='open'?100:0);notify(`${command.dataset.command==='open'?'A abrir':'A fechar'} o estore de ${r.name} · simulação`)}return}if(e.target.closest('#light-toggle')){current().light=!current().light;render();document.getElementById('light-toggle').focus({preventScroll:true});notify(`${current().name} · luz ${current().light?'ligada':'desligada'} (simulação)`)}});
document.querySelectorAll('[data-mode]').forEach(tab=>tab.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setMode(mode==='blinds'?'lights':'blinds');document.querySelector(`[data-mode="${mode}"]`).focus()}}));
function all(target){if(mode==='blinds'){rooms.filter(r=>'blind'in r).forEach(r=>move(r,target?100:0));notify(`${target?'A abrir':'A fechar'} todos os estores · simulação`)}else{rooms.forEach(r=>r.light=target);render();notify(`${target?'Todas as luzes ligadas':'Todas as luzes apagadas'} · simulação`)}}
document.getElementById('all-open').addEventListener('click',()=>all(true));
document.getElementById('all-close').addEventListener('click',()=>all(false));
document.getElementById('toggle-labels').addEventListener('click',()=>{labels=!labels;document.getElementById('hotspots').classList.toggle('labels-hidden',!labels);document.getElementById('toggle-labels').setAttribute('aria-pressed',String(labels))});
function scene(mode){rooms.forEach(r=>{r.light=mode==='morning'?r.id==='kitchen':mode==='night'?r.id==='hall':false;if('blind'in r)move(r,mode==='morning'?100:0)});render();notify(({night:'Boa noite',morning:'Bom dia',away:'Sair de casa'})[mode]+' ativado · simulação')}
document.getElementById('night-scene').addEventListener('click',()=>scene('night'));
document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>scene(b.dataset.scene)));
document.getElementById('settings').addEventListener('click',()=>showPopup('settings-dialog'));
document.getElementById('close-settings').addEventListener('click',()=>document.getElementById('settings-dialog').close());
document.getElementById('reset').addEventListener('click',()=>{for(const id of [...motions.keys()])stopMotion(id);rooms=structuredClone(defaults);selected='living';setMode('lights');document.getElementById('settings-dialog').close();notify('Demonstração reposta')});
document.getElementById('open-controls').addEventListener('click',()=>showPopup('controls-dialog'));
document.getElementById('open-overview').addEventListener('click',()=>showPopup('controls-dialog'));
document.getElementById('open-scenes').addEventListener('click',()=>showPopup('scenes-dialog'));
document.getElementById('home-button').addEventListener('click',()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
document.querySelectorAll('dialog').forEach(d=>{let outside=false;const isOutside=e=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};d.addEventListener('pointerdown',e=>outside=e.target===d&&isOutside(e));d.addEventListener('click',e=>{if(outside&&e.target===d&&isOutside(e))d.close();outside=false})});
document.getElementById('hotspots').addEventListener('keydown',e=>{if(e.target.matches('.room-hit')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectRoom(e.target.dataset.room)}});
window.addEventListener('pagehide',persist);setMode('lights');
