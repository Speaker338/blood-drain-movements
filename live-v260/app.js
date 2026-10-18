const $ = s => document.querySelector(s);
const canvas = $('#scene'), ctx = canvas.getContext('2d');
const IDLE = 'idle_retry1_native145_review', WALK = 'walk_cycle45_inherited', DODGE = 'dodge_native96';
const keys = new Set(), fingers = new Map();
const state = {mode:'free',clip:null,requested:null,frame:0,clock:0,x:0,y:600,facing:1,paused:false,action:false,tourIndex:0,tourTime:0,ready:false};
let clips = [], sheets = new Map(), serial = 0, last = performance.now(), width = 1000, height = 720;
let background;
const order = [IDLE,WALK,DODGE,'feed_hold72_alignment_pending','jump_air14_partial','crouch_native145_diagnostic'];
function image(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Не удалось загрузить '+url));im.src=url;});}
function clearInput(){keys.clear();fingers.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
function paused(value){state.paused=value;$('#pause').textContent=value?'Продолжить':'Пауза';clearInput();}
function reset(){state.x=width/2;state.y=600;state.facing=1;clearInput();}
function uiMode(){ $('#mode').textContent=state.mode==='tour'?'Автопоказ · все 6 подборок':state.mode==='preview'?'Просмотр на месте':'Свободное управление'; $('#tour').textContent=state.mode==='tour'?'■ Остановить показ':'▶ Показать всё'; }
async function choose(id){
  if(state.requested===id)return;
  const token=++serial, next=clips.find(c=>c.id===id); if(!next)return;
  state.requested=id;state.ready=false;$('#loading').hidden=false;$('#loading').textContent='Загружаю: '+next.label;
  try{
    const entries=await Promise.all([...new Set(next.frames.map(f=>f.sheet))].map(async url=>[url,await image(url)]));
    if(token!==serial)return;
    sheets=new Map(entries);state.clip=next;state.frame=0;state.clock=0;state.ready=true;
    $('#loading').hidden=true;$('#motion').textContent=next.label;$('#verdict').textContent=next.verdict;$('#note').textContent=next.notes;
    $('.review').classList.toggle('rejected',id==='crouch_native145_diagnostic');$('#seek').max=next.frames.length-1;
    render();
  }catch(error){if(token!==serial)return;state.requested=null;$('#loading').textContent=error.message+'. Выберите движение повторно или обновите страницу.';}
}
function manual(){if(state.mode!=='free'){state.mode='free';state.action=false;$('#clip').value='free';uiMode();} }
function dodge(){if(!clips.length)return;manual();clearInput();state.action=true;paused(false);choose(DODGE);if(state.clip?.id===DODGE&&state.ready){state.frame=0;state.clock=0;}}
function direction(){
  let dx=0,dy=0;const all=new Set([...keys,...fingers.values()]);
  if(all.has('left'))dx--;if(all.has('right'))dx++;if(all.has('up'))dy--;if(all.has('down'))dy++;
  const magnitude=Math.hypot(dx,dy);if(magnitude>0){dx/=magnitude;dy/=magnitude;}return {dx,dy};
}
function frameStep(delta){if(!state.clip||!state.ready)return;paused(true);state.frame=(state.frame+delta+state.clip.frames.length)%state.clip.frames.length;state.clock=0;render();}
function frameTick(dt,once){
  if(!state.clip)return false;
  state.clock+=dt;
  while(state.clock>=state.clip.frames[state.frame].duration){
    state.clock-=state.clip.frames[state.frame].duration;
    if(state.frame===state.clip.frames.length-1){if(once){state.clock=0;return true;}state.frame=0;}else state.frame++;
  }return false;
}
function update(dt){
  if(state.paused||!clips.length)return;
  dt*=Number($('#speed').value);
  if(state.mode==='free'){
    if(state.action){if(state.ready&&state.clip.id===DODGE&&frameTick(dt,true)){state.action=false;choose(IDLE);}return;}
    const {dx,dy}=direction(),moving=!!(dx||dy);
    choose(moving?WALK:IDLE);
    if(!state.ready)return;
    if(dx)state.facing=dx<0?-1:1;
    state.x=Math.max(100,Math.min(width-100,state.x+dx*82*dt));state.y=Math.max(520,Math.min(655,state.y+dy*46*dt));
    frameTick(dt,false);
  }else if(state.ready){
    frameTick(dt,false);
    if(state.mode==='tour'){
      state.tourTime+=dt;
      const duration=state.clip.frames.reduce((sum,f)=>sum+f.duration,0);
      const limit=state.clip.id===WALK?duration*2:state.clip.id==='jump_air14_partial'?duration*3:duration;
      if(state.clip.id===WALK){state.x=width/2+Math.sin(state.tourTime/limit*Math.PI*2)*Math.min(140,width/2-110);state.facing=state.tourTime<limit*.25||state.tourTime>limit*.75?1:-1;}
      if(state.tourTime>=limit){state.tourTime=0;state.tourIndex=(state.tourIndex+1)%order.length;reset();$('#clip').value=order[state.tourIndex];choose(order[state.tourIndex]);}
    }
  }
}
function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);const old=width;width=720*rect.width/rect.height;state.x=state.x?Math.max(100,Math.min(width-100,state.x/old*width)):width/2;render();}
function render(){
  ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);ctx.clearRect(0,0,width,height);
  const bg=$('#background').value;
  if(bg==='warehouse'&&background){const scale=Math.max(width/background.width,height/background.height);ctx.drawImage(background,(width-background.width*scale)/2,height-background.height*scale,background.width*scale,background.height*scale);ctx.fillStyle='#11131b18';ctx.fillRect(0,0,width,height);}
  else{ctx.fillStyle=bg==='light'?'#dedad4':'#222128';ctx.fillRect(0,0,width,height);ctx.fillStyle=bg==='light'?'#c6c1bb':'#2d2b32';ctx.fillRect(0,430,width,290);ctx.strokeStyle=bg==='light'?'#b7b0a9':'#403c45';for(let y=450;y<720;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}}
  if(!state.clip)return;
  const scale=.83+(state.y-520)/135*.18;
  ctx.fillStyle=bg==='light'?'#37313938':'#0008';ctx.beginPath();ctx.ellipse(state.x,state.y+3,48*scale,11*scale,0,0,Math.PI*2);ctx.fill();
  const c=state.clip,f=c.frames[state.frame],im=sheets.get(f.sheet);
  if(im){ctx.save();ctx.translate(state.x,state.y);ctx.scale(scale*state.facing,scale);ctx.drawImage(im,...f.region,-c.pivot[0],-c.pivot[1],...c.cell);ctx.restore();}
  $('#seek').value=state.frame;$('#frame').textContent=`${state.frame+1} / ${c.frames.length} · ${$('#speed').value}×`;
  $('#position').textContent=state.mode==='free'?'Склад · '+(state.action?'уклонение':c.id===WALK?'ходьба':'стойка'):state.mode==='tour'?`Подборка ${state.tourIndex+1} / ${order.length}`:'Просмотр · без перемещения';
  canvas.dataset.x=state.x.toFixed(2);canvas.dataset.y=state.y.toFixed(2);canvas.dataset.clip=c.id;canvas.dataset.frame=state.frame;canvas.dataset.facing=state.facing;canvas.dataset.paused=state.paused;canvas.dataset.ready=state.ready;canvas.dataset.mode=state.mode;
}
function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);render();requestAnimationFrame(tick);}
const map={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down'};
document.addEventListener('keydown',e=>{
  if(e.target instanceof Element && (e.target.matches('select,input')||e.target.isContentEditable))return;
  if(map[e.code]){e.preventDefault();manual();keys.add(map[e.code]);}
  else if(e.code==='Space'&&!e.repeat){e.preventDefault();dodge();}
  else if(e.code==='Escape'){paused(!state.paused);}
});
document.addEventListener('keyup',e=>{if(map[e.code])keys.delete(map[e.code]);});
for(const button of document.querySelectorAll('[data-direction]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();manual();if(state.paused)paused(false);button.setPointerCapture(e.pointerId);fingers.set(e.pointerId,button.dataset.direction);button.classList.add('held');});
  const release=e=>{fingers.delete(e.pointerId);button.classList.remove('held');};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
window.addEventListener('blur',()=>{clearInput();paused(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden)paused(true);last=performance.now();});
$('#dodge').onclick=dodge;$('#pause').onclick=()=>paused(!state.paused);$('#flip').onclick=()=>{state.facing*=-1;render();};$('#reset').onclick=()=>{reset();render();};
$('#tour').onclick=()=>{clearInput();state.action=false;if(state.mode==='tour'){manual();choose(IDLE);}else{state.mode='tour';state.tourTime=0;state.tourIndex=0;reset();$('#clip').value=order[0];choose(order[0]);}paused(false);uiMode();};
$('#clip').onchange=()=>{clearInput();state.action=false;state.mode=$('#clip').value==='free'?'free':'preview';reset();paused(false);choose(state.mode==='free'?IDLE:$('#clip').value);uiMode();};
$('#prev').onclick=()=>frameStep(-1);$('#next').onclick=()=>frameStep(1);$('#seek').oninput=()=>{if(!state.clip)return;paused(true);state.frame=Math.min(state.clip.frames.length-1,Number($('#seek').value));state.clock=0;render();};
$('#background').onchange=render;$('#speed').onchange=render;
new ResizeObserver(resize).observe(canvas);
async function init(){
  const response=await fetch('clips.json');if(!response.ok)throw new Error('Список движений недоступен');clips=(await response.json()).clips;
  for(const id of order){const c=clips.find(c=>c.id===id),option=document.createElement('option');option.value=id;option.textContent=c.label;$('#clip').append(option);}
  background=await image('warehouse.webp');await choose(IDLE);requestAnimationFrame(tick);
}
init().catch(e=>{$('#loading').hidden=false;$('#loading').textContent=e.message+'. Обновите страницу.';});
