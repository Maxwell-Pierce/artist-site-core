// One gain function drives the visible envelope, listening preview and MP4 audio.
export const FADE_CURVES=['linear','slow','fast','smooth','equal-power'];
export function fadeCurveGain(progress,curve='linear'){
 const x=Math.max(0,Math.min(1,progress));
 if(curve==='slow')return x*x;
 if(curve==='fast')return Math.sqrt(x);
 if(curve==='smooth')return x*x*(3-2*x);
 if(curve==='equal-power')return Math.sin(x*Math.PI/2);
 return x;
}
export function setFadeLength(project,edge,seconds){
 if(!['in','out'].includes(edge)||!Number.isFinite(seconds))return;
 project[edge==='in'?'audioFadeIn':'audioFadeOut']=Math.round(Math.max(0,Math.min(60,project.out-project.in,seconds))*1000)/1000;
}
// Crop and envelope copies only; decoded source channels and lyric timing stay intact.
export function audioFadeGain(time,duration,fadeIn=0,fadeOut=0,fadeInCurve='linear',fadeOutCurve='linear'){
 const incoming=fadeIn>0?fadeCurveGain(time/fadeIn,fadeInCurve):1;
 const outgoing=fadeOut>0?fadeCurveGain((duration-time)/fadeOut,fadeOutCurve):1;
 return Math.min(incoming,outgoing);
}
export function croppedAudio(buffer,start,end,fadeIn=0,fadeOut=0,fadeInCurve='linear',fadeOutCurve='linear'){
 const first=Math.round(start*buffer.sampleRate),length=Math.max(1,Math.min(buffer.length-first,Math.round((end-start)*buffer.sampleRate))),channels=Math.min(2,buffer.numberOfChannels);
 const result=new AudioBuffer({length,numberOfChannels:channels,sampleRate:buffer.sampleRate});
 const duration=(length-1)/buffer.sampleRate;
 for(let c=0;c<channels;c++){
  result.copyToChannel(buffer.getChannelData(c).subarray(first,first+length),c);
  const data=result.getChannelData(c);
  for(let i=0;i<length;i++)data[i]*=audioFadeGain(i/buffer.sampleRate,duration,fadeIn,fadeOut,fadeInCurve,fadeOutCurve);
 }
 return result;
}
