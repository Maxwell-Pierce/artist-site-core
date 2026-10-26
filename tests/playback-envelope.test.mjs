import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playbackGainAt,playbackGainCurve,mountPlaybackEnvelope} from '../editor/playback-envelope.mjs';
import {audioFadeGain} from '../editor/export-audio.mjs';
const project={in:2,out:12,audioFadeIn:2,audioFadeOut:3,audioFadeInCurve:'equal-power',audioFadeOutCurve:'smooth'};
test('normal Play uses the export envelope while practice can audition outside its bounds',()=>{assert.equal(playbackGainAt(project,1),0);assert.equal(playbackGainAt(project,13),0);assert.equal(playbackGainAt(project,1,true),1);assert.equal(playbackGainAt(project,13,true),1);for(let t=2;t<=12;t+=.1)assert.equal(playbackGainAt(project,t),audioFadeGain(t-2,10,2,3,'equal-power','smooth'));const curve=playbackGainCurve(project,2,12);assert.equal(curve[0],0);assert.equal(curve.at(-1),0);assert.ok(curve.every(x=>x>=0&&x<=1));});
test('playback envelope schedules gain again on seek, speed and settings changes and releases its context',async()=>{const old=globalThis.AudioContext,events={},calls=[];let current=structuredClone(project),closed=false;globalThis.AudioContext=class{currentTime=1;destination={};createMediaElementSource(){return {connect(){},disconnect(){}};}createGain(){return {connect(){},disconnect(){},gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},setValueCurveAtTime(curve,start,span){calls.push({curve,start,span});}}};}async resume(){}async close(){closed=true;}};try{const media={currentTime:2,playbackRate:1,paused:false,readyState:4,addEventListener:(name,fn)=>{events[name]=fn;},removeEventListener:name=>{delete events[name];}};const controller=mountPlaybackEnvelope(media,{getProject:()=>current,isPractice:()=>false,onBoundary(){},onError:e=>{throw e;}});await events.play();await events.playing();assert.equal(calls.at(-1).span,10);media.currentTime=4;events.seeked();assert.equal(calls.at(-1).span,8);media.playbackRate=.5;events.ratechange();assert.equal(calls.at(-1).span,16);current.audioFadeInCurve='slow';controller.refresh();assert.ok(calls.at(-1).curve[0]>.99);controller.destroy();assert.ok(closed);assert.equal(Object.keys(events).length,0);}finally{globalThis.AudioContext=old;}});
test('fade clock waits for audible playback and reanchors after buffering and drift',async()=>{
 const old=globalThis.AudioContext,events={},calls=[];let ctx;
 globalThis.AudioContext=class{currentTime=0;state='running';destination={};constructor(){ctx=this;}createMediaElementSource(){return{connect(){},disconnect(){}};}createGain(){return{connect(){},disconnect(){},gain:{value:1,cancelScheduledValues(){},setValueAtTime(value,time){calls.push({type:'hold',value,time});},setValueCurveAtTime(curve,time,span){calls.push({type:'curve',curve,time,span});}}};}async resume(){}async close(){}};
 try{
  const media={currentTime:2,playbackRate:1,paused:false,seeking:false,readyState:2,addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]};
  const controller=mountPlaybackEnvelope(media,{getProject:()=>project,isPractice:()=>false,onBoundary(){},onError:e=>{throw e;}});
  await events.play();assert.equal(calls.at(-1).type,'hold');
  ctx.currentTime=5;media.readyState=4;await events.playing();assert.equal(calls.at(-1).type,'curve');assert.equal(calls.at(-1).time,5);assert.equal(calls.at(-1).curve[0],0);assert.equal(calls.at(-1).span,10);
  ctx.currentTime=6;media.currentTime=3;events.waiting();assert.equal(calls.at(-1).type,'hold');
  ctx.currentTime=12;await events.playing();assert.equal(calls.at(-1).time,12);assert.equal(calls.at(-1).span,9);assert.ok(Math.abs(calls.at(-1).curve[0]-Math.SQRT1_2)<1e-6);
  const before=calls.length;ctx.currentTime=13;media.currentTime=4;events.timeupdate();assert.equal(calls.length,before);
  ctx.currentTime=15;media.currentTime=4.2;events.timeupdate();assert.ok(calls.length>before);assert.equal(calls.at(-1).time,15);
  media.seeking=true;events.seeking();assert.equal(calls.at(-1).type,'hold');media.currentTime=9;media.seeking=false;events.seeked();assert.equal(calls.at(-1).type,'curve');assert.equal(calls.at(-1).span,3);
  media.paused=true;events.pause();assert.equal(calls.at(-1).type,'hold');controller.destroy();assert.equal(Object.keys(events).length,0);
 }finally{globalThis.AudioContext=old;}
});
