import {VISUALIZER_STYLES,visualizerDefaults,visualizerSettings,visualizerHit} from './audio-visualizer.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function icon(type){
 const heights=[8,17,11,25,19,12,21,7];let shape='';
 if(type==='none')shape='<circle cx="32" cy="20" r="13"/><path d="M22 30 42 10"/>';
 else if(type==='radial'||type==='ring'){
  if(type==='ring')shape='<path d="M32 5 38 8 44 9 45 16 48 20 44 25 42 32 35 33 30 36 24 32 18 30 19 23 16 18 21 13 25 7Z"/>';
  else for(let i=0;i<20;i++){const a=i/20*Math.PI*2,r=13+(i%4)*2;shape+=`<path d="M${32+9*Math.cos(a)} ${20+9*Math.sin(a)}L${32+r*Math.cos(a)} ${20+r*Math.sin(a)}"/>`;}
 }else if(type==='wave')shape='<path d="M3 20h7l4-8 5 18 5-25 5 29 5-20 4 12 5-13 5 7h13"/>';
 else heights.forEach((h,i)=>{const x=7+i*7;if(type==='dots')for(let j=0;j<h/5;j++)shape+=`<circle cx="${x}" cy="${33-j*6}" r="1.5"/>`;else shape+=`<path d="M${x} ${type==='mirror'?20-h/2:34-h}V${type==='mirror'?20+h/2:34}"/>`;});
 return `<svg viewBox="0 0 64 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
}
export function mountVisualizerControls(host,canvas,{getProject,checkpoint,changed,draw}){
 host.innerHTML='<h3>Audio visualizers</h3><p class="hint">Choose a style, then drag it in the preview. Drag the white corner to resize. Each style keeps its own settings.</p><div class="lv-visualizer-picker" role="group" aria-label="Visualizer style"></div><div class="lv-visualizer-settings" hidden></div>';
 const picker=host.querySelector('.lv-visualizer-picker'),controls=host.querySelector('.lv-visualizer-settings'),fields=new Map();
 const active=()=>visualizerSettings(getProject());
 const visible=()=>!host.hidden&&!host.closest('#lv-content')?.classList.contains('lv-hide-inspector');
 function update(patch){const project=getProject();if(!project)return;const v=active();if(v.type==='none')return;project.visualizers??={active:'none',styles:{}};project.visualizers.styles[v.type]={...visualizerDefaults(v.type),...project.visualizers.styles[v.type],...patch};changed({video:true});refresh();}
 for(const [type,name,description]of [['none','None','Artwork and lyrics'],...VISUALIZER_STYLES]){
  const button=document.createElement('button');button.type='button';button.dataset.visualizer=type;button.innerHTML=icon(type)+`<strong>${name}</strong><small>${description}</small>`;button.onclick=()=>{const p=getProject();if(!p)return;checkpoint();p.visualizers??={active:'none',styles:{}};p.visualizers.active=type;if(type!=='none')p.visualizers.styles[type]??=visualizerDefaults(type);changed({video:true});refresh();};picker.append(button);
 }
 function field(key,label,type,min,max,step=1){
  const wrap=document.createElement('label');wrap.textContent=label;const output=document.createElement('output'),input=document.createElement('input');input.type=type;input.setAttribute('aria-label','Visualizer '+label);if(type==='range'){input.min=min;input.max=max;input.step=step;wrap.append(output);}input.onfocus=checkpoint;input.oninput=()=>update({[key]:type==='color'?input.value:Number(input.value)});wrap.append(input);controls.append(wrap);fields.set(key,{input,output});
 }
 for(const [k,label,min,max]of [['x','Position X',0,100],['y','Position Y',0,100],['scale','Scale',10,150],['rotation','Rotation',-180,180],['opacity','Opacity',0,100],['glow','Glow',0,40],['sensitivity','Sensitivity',25,300],['smoothing','Smoothing',0,90],['density','Detail',16,96],['thickness','Line weight',1,12]])field(k,label,'range',min,max);
 field('color','Primary colour','color');field('accent','Accent colour','color');
 const layer=document.createElement('label');layer.textContent='Layer';const select=document.createElement('select');select.setAttribute('aria-label','Visualizer layer');select.innerHTML='<option value="behind">Behind lyrics</option><option value="front">In front of lyrics</option>';select.onfocus=checkpoint;select.onchange=()=>update({layer:select.value});layer.append(select);controls.append(layer);fields.set('layer',{input:select});
 const actions=document.createElement('div');actions.className='lv-visualizer-actions';for(const [label,patch]of [['Centre',{x:50,y:50}],['Lower third',{x:50,y:79}],['Reset style',null]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{if(!getProject())return;checkpoint();update(patch||visualizerDefaults(active().type));};actions.append(button);}controls.append(actions);
 const palettes=document.createElement('div');palettes.className='lv-visualizer-actions';palettes.setAttribute('aria-label','Visualizer palettes');for(const [name,color,accent]of [['Silver','#ffffff','#8b9bab'],['Mint','#b4f2d4','#68c9df'],['Violet','#b296ff','#ff91cf'],['Ember','#ffd29b','#ff6655']]){const button=document.createElement('button');button.type='button';button.textContent=name;button.style.borderColor=accent;button.onclick=()=>{if(!getProject())return;checkpoint();update({color,accent});};palettes.append(button);}controls.append(palettes);
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Driven by the loaded audio. Smoothing controls response time. Guides and resize handles stay out of the MP4.';controls.append(hint);
 function refresh(){const v=active();for(const button of picker.children)button.setAttribute('aria-pressed',String(button.dataset.visualizer===v.type));controls.hidden=v.type==='none';for(const [key,{input,output}]of fields){input.value=v[key];if(output)output.value=String(v[key])+(key==='rotation'?'°':['x','y','scale','opacity','sensitivity'].includes(key)?'%':'');input.disabled=v.type==='wave'&&['density','smoothing'].includes(key)||['bars','mirror','dots'].includes(v.type)&&key==='thickness';}draw();}
 let drag=null;
 const coords=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
 function down(e){if(e.button!==0||!visible()||!getProject()||active().type==='none')return;const p=coords(e),v=active(),hit=visualizerHit(v,canvas.width,canvas.height,p.x,p.y);if(!hit.inside)return;e.preventDefault();checkpoint();canvas.focus();canvas.setPointerCapture(e.pointerId);drag={...p,v,resize:hit.resize,distance:Math.hypot(p.x-canvas.width*v.x/100,p.y-canvas.height*v.y/100)};}
 function move(e){if(!drag)return;const p=coords(e);if(drag.resize){const distance=Math.hypot(p.x-canvas.width*drag.v.x/100,p.y-canvas.height*drag.v.y/100);update({scale:Math.round(clamp(drag.v.scale*distance/Math.max(1,drag.distance),10,150))});}else update({x:Math.round(clamp(drag.v.x+(p.x-drag.x)/canvas.width*100,0,100)*10)/10,y:Math.round(clamp(drag.v.y+(p.y-drag.y)/canvas.height*100,0,100)*10)/10});}
 function up(e){drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
 function key(e){if(!visible()||!getProject()||active().type==='none'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();checkpoint();const v=active(),amount=e.shiftKey?5:1;update(e.key==='ArrowLeft'||e.key==='ArrowRight'?{x:clamp(v.x+(e.key==='ArrowLeft'?-amount:amount),0,100)}:{y:clamp(v.y+(e.key==='ArrowUp'?-amount:amount),0,100)});}
 canvas.tabIndex=0;canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('keydown',key);
 return {refresh,isSelected:visible,destroy(){canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('keydown',key);}};
}
