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
 let context=null,gain=null,source=null,destroyed=false;
 function refresh(){if(!context||!gain||destroyed)return;const p=getProject();if(!p)return;const start=media.currentTime,practice=isPractice(),end=Math.max(start+.05,p.out),now=context.currentTime;gain.gain.cancelScheduledValues(0);gain.gain.setValueAtTime(playbackGainAt(p,start,practice),now);if(!media.paused)gain.gain.setValueCurveAtTime(playbackGainCurve(p,start,end,practice),now,(end-start)/Math.max(.01,media.playbackRate));}
 async function play(){try{if(destroyed)return;if(!context){context=new AudioContext();source=context.createMediaElementSource(media);gain=context.createGain();gain.gain.value=playbackGainAt(getProject(),media.currentTime,isPractice());source.connect(gain);gain.connect(context.destination);}await context.resume();refresh();}catch(error){onError(error);}}
 const boundary=()=>{onBoundary();};const events={play,pause:refresh,seeked:refresh,ratechange:refresh,timeupdate:boundary};for(const [event,fn]of Object.entries(events))media.addEventListener(event,fn);
 return {refresh,destroy(){destroyed=true;for(const [event,fn]of Object.entries(events))media.removeEventListener(event,fn);source?.disconnect();gain?.disconnect();context?.close().catch(()=>{});}};
}
