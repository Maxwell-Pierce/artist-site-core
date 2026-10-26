export function setExportEdge(project,edge,value,duration){
 if(!Number.isFinite(value)||!Number.isFinite(duration)||duration<=0)return;
 const gap=Math.min(.04,duration);
 project[edge]=Math.round((edge==='in'?Math.max(0,Math.min(project.out-gap,value)):Math.min(duration,Math.max(project.in+gap,value)))*1000)/1000;
}
export function mountExportRange(root,{getProject,getDuration,checkpoint,onChange,onListen,onStop}){
 const wrap=document.createElement('div');wrap.className='lv-export-range';
 wrap.innerHTML=`<div class="lv-export-range-heading"><strong>EXPORT RANGE</strong><button data-full>Entire track</button><output data-summary></output><button data-listen>▶ Listen to export</button><button data-stop>Stop</button></div><div class="lv-export-ruler" aria-label="Export range across the entire track"><div class="lv-export-fill"></div><button type="button" role="slider" data-edge="in" aria-label="Export In marker">IN</button><button type="button" role="slider" data-edge="out" aria-label="Export Out marker">OUT</button></div><div class="lv-audio-fades"><label>Audio fade in <input data-fade="audioFadeIn" type="number" min="0" max="60" step="0.1" value="0"> s</label><label>Fade out <input data-fade="audioFadeOut" type="number" min="0" max="60" step="0.1" value="0"> s</label><small>Drag In / Out above · fades are relative to the export edges</small></div>`;
 root.prepend(wrap);const ruler=wrap.querySelector('.lv-export-ruler'),fill=wrap.querySelector('.lv-export-fill'),handles=[...wrap.querySelectorAll('[data-edge]')];
 const update=(edge,value)=>{const p=getProject();if(!p)return;setExportEdge(p,edge,value,getDuration());onChange();refresh();};
 for(const h of handles){
  h.onpointerdown=e=>{if(!getProject())return;e.preventDefault();checkpoint();h.setPointerCapture(e.pointerId);};
  h.onpointermove=e=>{if(!h.hasPointerCapture(e.pointerId))return;const r=ruler.getBoundingClientRect();update(h.dataset.edge,(e.clientX-r.left)/r.width*getDuration());};
  h.onpointerup=e=>{if(h.hasPointerCapture(e.pointerId))h.releasePointerCapture(e.pointerId);};
  h.onkeydown=e=>{const p=getProject();if(!p)return;const edge=h.dataset.edge,delta=['ArrowRight','ArrowUp'].includes(e.key)?1:['ArrowLeft','ArrowDown'].includes(e.key)?-1:0;if(!delta&&!['Home','End'].includes(e.key))return;e.preventDefault();checkpoint();update(edge,e.key==='Home'?0:e.key==='End'?getDuration():p[edge]+delta*(e.shiftKey?1:.1));};
 }
 for(const input of wrap.querySelectorAll('[data-fade]')){input.onfocus=checkpoint;input.oninput=()=>{const p=getProject();if(!p)return;p[input.dataset.fade]=Math.max(0,Math.min(60,Number(input.value)||0));onChange();};}
 wrap.querySelector('[data-full]').onclick=()=>{const p=getProject();if(!p)return;checkpoint();p.in=0;p.out=getDuration();onChange();refresh();};
 wrap.querySelector('[data-listen]').onclick=onListen;wrap.querySelector('[data-stop]').onclick=onStop;
 function refresh(){const p=getProject();if(!p)return;const d=getDuration(),a=100*p.in/d,b=100*p.out/d;fill.style.left=a+'%';fill.style.width=(b-a)+'%';const whole=p.in===0&&Math.abs(p.out-d)<.001;wrap.querySelector('[data-full]').setAttribute('aria-pressed',String(whole));wrap.querySelector('[data-summary]').textContent=`${whole?'Entire track':'Marked section'} · ${p.in.toFixed(3)}–${p.out.toFixed(3)} · ${(p.out-p.in).toFixed(1)}s`;for(const h of handles){const edge=h.dataset.edge;h.style.left=(edge==='in'?a:b)+'%';h.setAttribute('aria-valuemin',edge==='in'?'0':String(p.in));h.setAttribute('aria-valuemax',edge==='in'?String(p.out):String(d));h.setAttribute('aria-valuenow',String(p[edge]));h.setAttribute('aria-valuetext',p[edge].toFixed(3)+' seconds');}for(const input of wrap.querySelectorAll('[data-fade]'))if(document.activeElement!==input)input.value=p[input.dataset.fade]||0;}
 return {refresh};
}
