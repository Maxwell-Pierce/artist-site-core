export const VISUALIZER_STYLES=[
 ['bars','Spectrum bars','Frequency columns'],['mirror','Mirrored bars','Symmetric spectrum'],
 ['radial','Radial spectrum','Circular frequency bars'],['ring','Pulse ring','Continuous spectrum contour'],
 ['wave','Waveform','Audio signal trace'],['dots','Frequency dots','A reactive dot matrix']
];
const styles=new Set(VISUALIZER_STYLES.map(([id])=>id));
export function visualizerDefaults(type){return {x:50,y:['ring','radial'].includes(type)?42:79,scale:['ring','radial'].includes(type)?80:90,rotation:0,opacity:85,color:'#b4f2d4',accent:'#68c9df',glow:12,sensitivity:100,smoothing:60,density:48,thickness:3,layer:'behind'};}
export function visualizerSettings(project){const type=project?.visualizers?.active||'none';return {type,...visualizerDefaults(type),...project?.visualizers?.styles?.[type]};}
export function validateVisualizers(value){
 if(value===undefined)return;
 if(!value||typeof value!=='object'||Array.isArray(value)||!['none',...styles].includes(value.active)||!value.styles||typeof value.styles!=='object'||Array.isArray(value.styles))throw Error('Invalid visualizer settings.');
 for(const [type,patch]of Object.entries(value.styles)){
  if(!styles.has(type)||!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Invalid visualizer style.');
  const v={...visualizerDefaults(type),...patch};
  for(const [k,lo,hi]of [['x',0,100],['y',0,100],['scale',10,150],['rotation',-180,180],['opacity',0,100],['glow',0,40],['sensitivity',25,300],['smoothing',0,90],['density',16,96],['thickness',1,12]])if(!Number.isFinite(v[k])||v[k]<lo||v[k]>hi)throw Error('Invalid visualizer '+k+'.');
  if(!Number.isInteger(v.density)||!['behind','front'].includes(v.layer)||![v.color,v.accent].every(c=>typeof c==='string'&&/^#[a-f\d]{6}$/i.test(c)))throw Error('Invalid visualizer colour or layer.');
 }
}
const FFT=2048,HALF=FFT/2;
const window=Float32Array.from({length:FFT},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(FFT-1)));
function spectrum(input){
 const re=Float64Array.from(input),im=new Float64Array(FFT);
 for(let i=1,j=0;i<FFT;i++){let bit=FFT>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
 for(let size=2;size<=FFT;size<<=1){const angle=-2*Math.PI/size,wr=Math.cos(angle),wi=Math.sin(angle);for(let start=0;start<FFT;start+=size){let ur=1,ui=0;for(let j=0;j<size/2;j++){const a=start+j,b=a+size/2,tr=ur*re[b]-ui*im[b],ti=ur*im[b]+ui*re[b];re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=ur*wr-ui*wi;ui=ur*wi+ui*wr;ur=next;}}}
 return Float32Array.from({length:HALF},(_,i)=>(re[i]*re[i]+im[i]*im[i])/(FFT*FFT/16));
}
// Timestamp-based analysis, with a bounded cache. No playback-state dependency.
export function createAudioAnalysis(buffer){
 const cache=new Map(),channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,i)=>buffer.getChannelData(i));
 function frame(index){
  if(cache.has(index))return cache.get(index);
  const power=new Float32Array(HALF),wave=new Float32Array(128);let energy=0;
  const stop=Math.floor(index/30*buffer.sampleRate),start=stop-FFT;
  channels.forEach((data,c)=>{const samples=new Float32Array(FFT);for(let i=0;i<FFT;i++){const x=data[start+i]||0;samples[i]=x*window[i];energy+=x*x/channels.length;if(c===0&&i%16===0)wave[i/16]=x;}const p=spectrum(samples);for(let i=0;i<HALF;i++)power[i]+=p[i]/channels.length;});
  const result={power,wave,rms:Math.sqrt(energy/FFT)};cache.set(index,result);if(cache.size>180)cache.delete(cache.keys().next().value);return result;
 }
 return {at(time,config={}){
  const count=Math.max(16,Math.min(96,Math.round(config.density||48))),index=Math.round(time*30),v=frame(index),bins=new Float32Array(count),history=1+Math.floor((config.smoothing||0)/20);let total=0;
  for(let back=0;back<history;back++){const weight=Math.pow(.65,back),source=frame(index-back).power;total+=weight;for(let j=0;j<count;j++){const nyquist=Math.min(16000,buffer.sampleRate/2),low=40*Math.pow(nyquist/40,j/count),high=40*Math.pow(nyquist/40,(j+1)/count);const a=Math.min(HALF-1,Math.max(1,Math.floor(low*FFT/buffer.sampleRate))),b=Math.min(HALF,Math.max(a+1,Math.ceil(high*FFT/buffer.sampleRate)));let peak=0;for(let k=a;k<b;k++)peak=Math.max(peak,source[k]);const db=10*Math.log10(Math.max(1e-12,peak));bins[j]+=weight*Math.max(0,Math.min(1,(db+72)/60));}}
  for(let j=0;j<count;j++)bins[j]/=total;
  return {bins,wave:v.wave,rms:v.rms};
 }};
}
export function visualizerGeometry(v,w,h){const s=Math.min(w,h)*v.scale/100,circular=['radial','ring'].includes(v.type);return {x:w*v.x/100,y:h*v.y/100,width:s*.88,height:s*(circular?.88:.3)};}
export function visualizerHit(v,w,h,x,y){const g=visualizerGeometry(v,w,h),a=-v.rotation*Math.PI/180,dx=x-g.x,dy=y-g.y,lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a),pad=Math.max(12,Math.min(w,h)*.015);return {inside:Math.abs(lx)<=g.width/2+pad&&Math.abs(ly)<=g.height/2+pad,resize:Math.abs(lx-g.width/2)<pad*1.5&&Math.abs(ly-g.height/2)<pad*1.5};}
export function drawAudioVisualizer(ctx,w,h,v,features,{guides=false}={}){
 if(!styles.has(v.type))return;const g=visualizerGeometry(v,w,h),s=Math.min(w,h),gain=v.sensitivity/100,values=features?.bins||new Float32Array(v.density),wave=features?.wave||new Float32Array(128),amp=x=>Math.min(1,Math.max(0,x*gain));
 ctx.save();ctx.translate(g.x,g.y);ctx.rotate(v.rotation*Math.PI/180);ctx.globalAlpha=v.opacity/100;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=v.thickness*s/720;ctx.shadowColor=v.accent;ctx.shadowBlur=v.glow*s/720;
 const gradient=ctx.createLinearGradient(-g.width/2,0,g.width/2,0);gradient.addColorStop(0,v.color);gradient.addColorStop(1,v.accent);ctx.strokeStyle=gradient;ctx.fillStyle=gradient;
 const n=values.length,step=g.width/n;
 if(v.type==='bars'||v.type==='mirror')for(let i=0;i<n;i++){const level=amp(values[i])*g.height,x=-g.width/2+(i+.5)*step;ctx.lineWidth=Math.max(1,step*.6);ctx.beginPath();ctx.moveTo(x,v.type==='mirror'?level/2:g.height/2);ctx.lineTo(x,v.type==='mirror'?-level/2:g.height/2-level);ctx.stroke();}
 if(v.type==='wave'){ctx.beginPath();for(let i=0;i<wave.length;i++){const x=(i/(wave.length-1)-.5)*g.width,y=Math.max(-1,Math.min(1,wave[i]*gain))*g.height/2;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();}
 if(v.type==='dots'){const radius=Math.max(1,step*.24);for(let i=0;i<n;i++){const count=Math.floor(amp(values[i])*8);for(let j=0;j<count;j++){ctx.beginPath();ctx.arc(-g.width/2+(i+.5)*step,g.height/2-(j+.5)*g.height/8,radius,0,Math.PI*2);ctx.fill();}}}
 if(v.type==='radial'||v.type==='ring'){
  const radius=g.width*.29,extent=g.width*.19;
  const value=i=>amp(values[Math.min(n-1,Math.floor((i<n/2?i:n-1-i)*2))]);
  ctx.beginPath();for(let i=0;i<n;i++){const a=i/n*Math.PI*2-Math.PI/2,r=radius+value(i)*extent,x=Math.cos(a),y=Math.sin(a);if(v.type==='radial'){ctx.moveTo(x*radius,y*radius);ctx.lineTo(x*r,y*r);}else if(i)ctx.lineTo(x*r,y*r);else ctx.moveTo(x*r,y*r);}if(v.type==='ring')ctx.closePath();ctx.stroke();
  ctx.globalAlpha*=.3;ctx.beginPath();ctx.arc(0,0,radius*.96,0,Math.PI*2);ctx.stroke();
 }
 if(guides){ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.strokeStyle='#ffffffb0';ctx.lineWidth=1;ctx.setLineDash([6,5]);ctx.strokeRect(-g.width/2,-g.height/2,g.width,g.height);ctx.setLineDash([]);ctx.fillStyle='#ffffff';ctx.fillRect(g.width/2-5,g.height/2-5,10,10);}
 ctx.restore();
}
