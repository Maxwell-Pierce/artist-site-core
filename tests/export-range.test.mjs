import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultProject,validateProject} from '../editor/lyric-model.mjs';
import {setExportEdge} from '../editor/export-range.mjs';
import {audioFadeGain,croppedAudio} from '../editor/export-audio.mjs';
test('new exports cover the whole track including tracks longer than ten minutes',()=>{
 const p=defaultProject({id:'long-track',duration:901});assert.equal(p.in,0);assert.equal(p.out,901);assert.equal(p.audioFadeIn,0);validateProject(p,901);
 const saved={...p,in:12,out:42};validateProject(saved,901);assert.equal(saved.in,12);assert.equal(saved.out,42);
 for(const audioFadeIn of [-1,Infinity,61])assert.throws(()=>validateProject({...p,audioFadeIn},901),/fades/);
 validateProject({...p,audioFadeIn:2,audioFadeOut:3},901);
});
test('export markers clamp independently without crossing or moving the other edge',()=>{
 const p={in:2,out:8};setExportEdge(p,'in',99,10);assert.equal(p.in,7.96);assert.equal(p.out,8);
 setExportEdge(p,'out',-3,10);assert.equal(p.out,8);setExportEdge(p,'in',-3,10);assert.equal(p.in,0);
 setExportEdge(p,'out',99,10);assert.equal(p.out,10);setExportEdge(p,'in',NaN,10);assert.equal(p.in,0);
});
test('audio envelopes are relative to cropped edges and overlapping fades stay bounded',()=>{
 assert.equal(audioFadeGain(0,10,2,3),0);assert.equal(audioFadeGain(1,10,2,3),.5);assert.equal(audioFadeGain(5,10,2,3),1);assert.equal(audioFadeGain(8.5,10,2,3),.5);assert.equal(audioFadeGain(10,10,2,3),0);
 assert.equal(audioFadeGain(0,10),1);assert.equal(audioFadeGain(10,10),1);
 for(let t=0;t<=1;t+=.01){const g=audioFadeGain(t,1,2,3);assert.ok(g>=0&&g<=1);}
});
test('stereo crop and fades preserve channel separation and leave source samples unchanged',()=>{
 const previous=globalThis.AudioBuffer;
 globalThis.AudioBuffer=class{constructor({length,numberOfChannels,sampleRate}){Object.assign(this,{length,numberOfChannels,sampleRate,duration:length/sampleRate});this.data=Array.from({length:numberOfChannels},()=>new Float32Array(length));}getChannelData(c){return this.data[c];}copyToChannel(a,c){this.data[c].set(a);}};
 try{const source=new AudioBuffer({length:100,numberOfChannels:2,sampleRate:10});source.data[0].fill(.8);source.data[1].fill(-.4);const result=croppedAudio(source,2,7,1,1);
 assert.equal(result.length,50);assert.equal(result.duration,5);assert.equal(result.getChannelData(0)[0],0);assert.equal(Math.abs(result.getChannelData(1)[49]),0);assert.ok(Math.abs(result.getChannelData(0)[20]-.8)<1e-6);assert.ok(Math.abs(result.getChannelData(1)[20]+.4)<1e-6);assert.equal(source.getChannelData(0)[20],Math.fround(.8));
 const dry=croppedAudio(source,2,7);assert.equal(dry.getChannelData(0)[0],Math.fround(.8));
 }finally{globalThis.AudioBuffer=previous;}
});
