import {audioFadeGain} from './export-audio.mjs';
// Practice can audition material outside the export range; normal Play cannot.
export function playbackGainAt(project,time,practice=false){
 if(!project)return 1;
 if(time<project.in||time>project.out)return practice?1:0;
 return audioFadeGain(time-project.in,project.out-project.in,project.audioFadeIn||0,project.audioFadeOut||0,project.audioFadeInCurve||'linear',project.audioFadeOutCurve||'linear');
}
export function playbackGainCurve(project,start,end,practice=false){
 const count=Math.max(2,Math.min(120001,Math.ceil(Math.max(0,end-start)*100)+1));
 return Float32Array.from({length:count},(_,i)=>playbackGainAt(project,start+(end-start)*i/(count-1),practice));
}
export function mountPlaybackEnvelope(media,{getProject,isPractice,onBoundary,onError}){
 let context=null,gain=null,source=null,destroyed=false,playing=false,anchor=null;
 function refresh(){
  if(!context||!gain||destroyed)return;const p=getProject();if(!p)return;
  const start=media.currentTime,practice=isPractice(),end=Math.max(start+.05,p.out),now=context.currentTime;
  gain.gain.cancelScheduledValues(0);anchor=null;
  if(playing&&!media.paused&&!media.seeking&&context.state!=='suspended'){
   // The first curve sample supplies the initial value. Do not schedule a second
   // automation event at the same instant inside the curve's occupied interval.
   const rate=Math.max(.01,media.playbackRate);gain.gain.setValueCurveAtTime(playbackGainCurve(p,start,end,practice),now,(end-start)/rate);
   anchor={media:start,clock:now,rate};
  }else gain.gain.setValueAtTime(playbackGainAt(p,start,practice),now);
 }
 async function prepare(){try{
  if(destroyed)return;
  if(!context){context=new AudioContext();source=context.createMediaElementSource(media);gain=context.createGain();gain.gain.value=playbackGainAt(getProject(),media.currentTime,isPractice());source.connect(gain);gain.connect(context.destination);}
  await context.resume();if(!destroyed)refresh();
 }catch(error){if(!destroyed)onError(error);}}
 function start(){playing=true;prepare();}
 function hold(){playing=false;refresh();}
 function seeked(){playing=!media.paused&&media.readyState>=3;refresh();}
 function boundary(){
  onBoundary();if(!context||!playing||!anchor||media.paused||media.seeking)return;
  // Media time can stop while the AudioContext clock continues (buffering,
  // device changes). Re-anchor to actual audio instead of letting a fade run ahead.
  const expected=anchor.media+(context.currentTime-anchor.clock)*anchor.rate;
  if(Math.abs(expected-media.currentTime)>.08)refresh();
 }
 const events={play:prepare,playing:start,pause:hold,waiting:hold,seeking:hold,seeked,ratechange:refresh,timeupdate:boundary,ended:hold};
 for(const [event,fn]of Object.entries(events))media.addEventListener(event,fn);
 return {refresh,destroy(){destroyed=true;for(const [event,fn]of Object.entries(events))media.removeEventListener(event,fn);source?.disconnect();gain?.disconnect();context?.close().catch(()=>{});}};
}
