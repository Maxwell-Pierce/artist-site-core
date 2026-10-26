// Return a clamped waveform viewport, in seconds and pixels per second.
export function timelineViewport(view,line,duration,width,padding=.5){
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(width)||width<=30)return null;
 const pixels=width-30;
 let start=0,end=duration;
 if(view!=='lines'&&line&&Number.isFinite(line.start)&&Number.isFinite(line.end)){
  const lead=Math.max(0,Number(padding)||0);
  start=Math.max(0,line.start-lead);end=Math.min(duration,line.end+lead);
  const span=Math.min(duration,Math.max(view==='words'?12:.25,end-start));
  start=Math.max(0,Math.min(duration-span,(start+end-span)/2));end=start+span;
 }
 const zoom=Math.max(.25,Math.min(1200,pixels/Math.max(.25,end-start)));
 // A minimum zoom can leave a long recording wider than the container.
 return {start:Math.max(0,Math.min(start,duration-pixels/zoom)),zoom};
}
