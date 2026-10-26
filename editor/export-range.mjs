export function setExportEdge(project,edge,value,duration){
 if(!Number.isFinite(value)||!Number.isFinite(duration)||duration<=0)return;
 const gap=Math.min(.04,duration);
 project[edge]=Math.round((edge==='in'?Math.max(0,Math.min(project.out-gap,value)):Math.min(duration,Math.max(project.in+gap,value)))*1000)/1000;
}
// Use the waveform's actual rendered content width and scroll offset, not a
// separate full-track scale. The same projection works in every timeline mode.
export function exportMarkerPosition(time,duration,contentWidth,offset=0){return duration>0&&contentWidth>0?offset+time/duration*contentWidth:0;}
export function exportMarkerTime(clientX,contentLeft,contentWidth,duration){return contentWidth>0?(clientX-contentLeft)/contentWidth*duration:0;}
export function mountExportRange(root,{waveformRoot,getProject,getDuration,checkpoint,onChange,onListen,onStop,onFit}){
 const wrap=document.createElement('div');wrap.className='lv-export-range';
 wrap.innerHTML=`<div class="lv-export-range-heading"><strong>EXPORT</strong><button data-full>Entire track</button><button data-fit>Fit export</button><output data-summary></output><button data-listen>▶ Listen to export</button><button data-stop>Stop</button></div><div class="lv-audio-fades"><label>Audio fade in <input data-fade="audioFadeIn" type="number" min="0" max="60" step="0.1" value="0"> s</label><label>Fade out <input data-fade="audioFadeOut" type="number" min="0" max="60" step="0.1" value="0"> s</label><small>Drag blue IN / OUT flags on the waveform · amber A/B is the practice loop</small></div>`;
 const overlay=document.createElement('div');overlay.className='lv-export-overlay';overlay.setAttribute('aria-label','Export boundaries on waveform');
 overlay.innerHTML='<div class="lv-export-shade lv-export-before"></div><div class="lv-export-shade lv-export-after"></div><div class="lv-export-selection"></div><button type="button" role="slider" data-edge="in" aria-label="Export In marker"><span></span></button><button type="button" role="slider" data-edge="out" aria-label="Export Out marker"><span></span></button>';
 root.prepend(wrap);waveformRoot.append(overlay);const handles=[...overlay.querySelectorAll('[data-edge]')];let wave=null,unsub=[],drag=null;
 const geometry=()=>{const r=wave?.getWrapper().getBoundingClientRect(),host=waveformRoot.getBoundingClientRect();return r&&r.width>0?{width:r.width,left:r.left,offset:r.left-host.left,visible:Math.min(host.width,wave.getWidth())}:null;};
 const update=(edge,value)=>{const p=getProject();if(!p)return;setExportEdge(p,edge,value,getDuration());onChange();refresh();};
 for(const h of handles){
  h.onpointerdown=e=>{if(!getProject()||!geometry())return;e.preventDefault();e.stopPropagation();checkpoint();drag={handle:h,x:e.clientX};h.setPointerCapture(e.pointerId);};
  h.onpointermove=e=>{if(!h.hasPointerCapture(e.pointerId))return;drag.x=e.clientX;moveAt(e.clientX);};
  const release=e=>{if(h.hasPointerCapture(e.pointerId))h.releasePointerCapture(e.pointerId);drag=null;};h.onpointerup=release;h.onpointercancel=release;h.onlostpointercapture=()=>{drag=null;};
  h.onclick=e=>e.stopPropagation();h.ondblclick=e=>{e.preventDefault();e.stopPropagation();onFit?.();};
  h.onkeydown=e=>{const p=getProject();if(!p)return;const edge=h.dataset.edge,delta=['ArrowRight','ArrowUp'].includes(e.key)?1:['ArrowLeft','ArrowDown'].includes(e.key)?-1:0;if(!delta&&!['Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();checkpoint();update(edge,e.key==='Home'?0:e.key==='End'?getDuration():p[edge]+delta*(e.shiftKey?1:.1));};
 }
 function moveAt(x){const g=geometry();if(g&&drag)update(drag.handle.dataset.edge,exportMarkerTime(x,g.left,g.width,getDuration()));}
 // Auto-pan at the viewport edges so a range can be extended beyond a zoomed view.
 let raf=0,last=0;function pan(now){if(drag&&wave){const g=geometry(),host=waveformRoot.getBoundingClientRect();if(g){const x=drag.x-host.left,dt=Math.min(40,now-last||16),direction=x<24?-1:x>g.visible-24?1:0;if(direction){wave.setScroll(Math.max(0,wave.getScroll()+direction*dt*.5));moveAt(drag.x);}}}last=now;raf=requestAnimationFrame(pan);}raf=requestAnimationFrame(pan);
 for(const input of wrap.querySelectorAll('[data-fade]')){input.onfocus=checkpoint;input.oninput=()=>{const p=getProject();if(!p)return;p[input.dataset.fade]=Math.max(0,Math.min(60,Number(input.value)||0));onChange();};}
 wrap.querySelector('[data-full]').onclick=()=>{const p=getProject();if(!p)return;checkpoint();p.in=0;p.out=getDuration();onChange();refresh();};
 wrap.querySelector('[data-fit]').onclick=()=>onFit?.();wrap.querySelector('[data-listen]').onclick=onListen;wrap.querySelector('[data-stop]').onclick=onStop;
 function refreshOverlay(){const p=getProject(),g=geometry();overlay.hidden=!p||!g;if(!p||!g)return;const d=getDuration(),a=exportMarkerPosition(p.in,d,g.width,g.offset),b=exportMarkerPosition(p.out,d,g.width,g.offset),clamp=x=>Math.max(0,Math.min(g.visible,x));
  overlay.style.width=g.visible+'px';const before=overlay.querySelector('.lv-export-before'),after=overlay.querySelector('.lv-export-after'),selection=overlay.querySelector('.lv-export-selection');before.style.width=clamp(a)+'px';after.style.left=clamp(b)+'px';after.style.width=(g.visible-clamp(b))+'px';selection.style.left=clamp(a)+'px';selection.style.width=Math.max(0,clamp(b)-clamp(a))+'px';
  for(const h of handles){const edge=h.dataset.edge,x=edge==='in'?a:b,off=x<0?'before':x>g.visible?'after':'';h.style.left=Math.max(5,Math.min(g.visible-5,x))+'px';h.dataset.offscreen=off;h.querySelector('span').textContent=(off==='before'?'← ':'')+edge.toUpperCase()+' '+p[edge].toFixed(2)+(off==='after'?' →':'');h.title=`Export ${edge.toUpperCase()} · ${p[edge].toFixed(3)} seconds${off?' · outside this view; double-click to fit export':''}`;h.setAttribute('aria-valuemin',edge==='in'?'0':String(p.in));h.setAttribute('aria-valuemax',edge==='in'?String(p.out):String(d));h.setAttribute('aria-valuenow',String(p[edge]));h.setAttribute('aria-valuetext',p[edge].toFixed(3)+' seconds'+(off?' (outside view)':''));}
 }
 function refresh(){const p=getProject();if(!p){refreshOverlay();return;}const d=getDuration(),whole=p.in===0&&Math.abs(p.out-d)<.001;wrap.querySelector('[data-full]').setAttribute('aria-pressed',String(whole));wrap.querySelector('[data-summary]').textContent=`${whole?'Entire track':'Marked section'} · ${p.in.toFixed(3)}–${p.out.toFixed(3)} · ${(p.out-p.in).toFixed(1)}s`;for(const input of wrap.querySelectorAll('[data-fade]'))if(document.activeElement!==input)input.value=p[input.dataset.fade]||0;refreshOverlay();}
 const observer=new ResizeObserver(refreshOverlay);observer.observe(waveformRoot);
 function bindWaveform(next){for(const off of unsub)off();unsub=[];wave=next;if(wave)for(const event of ['scroll','redraw','redrawcomplete','ready','zoom','decode'])unsub.push(wave.on(event,refreshOverlay));refreshOverlay();}
 return {refresh,bindWaveform,destroy(){cancelAnimationFrame(raf);observer.disconnect();for(const off of unsub)off();overlay.remove();wrap.remove();}};
}
