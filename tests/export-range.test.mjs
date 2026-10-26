import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultProject,validateProject} from '../editor/lyric-model.mjs';
import {exportMarkerPosition,exportMarkerTime,setExportEdge} from '../editor/export-range.mjs';
import {FADE_CURVES,fadeCurveGain,setFadeLength,audioFadeGain,croppedAudio} from '../editor/export-audio.mjs';
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
 const curved=croppedAudio(source,2,7,2,0,'slow','linear');assert.ok(Math.abs(curved.getChannelData(0)[10]-.2)<1e-6);assert.ok(Math.abs(curved.getChannelData(1)[10]+.1)<1e-6);
 const dry=croppedAudio(source,2,7);assert.equal(dry.getChannelData(0)[0],Math.fround(.8));
 }finally{globalThis.AudioBuffer=previous;}
});

test('waveform export markers follow zoom and scroll and map pointer position back to time',()=>{for(const width of [320,1600,8000])for(const offset of [0,-200,-1200])for(const time of [0,2,8,16]){const x=exportMarkerPosition(time,16,width,offset);assert.ok(Math.abs(exportMarkerTime(100+x,100+offset,width,16)-time)<1e-9);}assert.equal(exportMarkerPosition(8,16,1600,-600),200);assert.equal(exportMarkerPosition(0,0,0),0);assert.equal(exportMarkerTime(10,0,0,16),0);});

test('graphical fade curves are bounded, monotonic and have exact silent/full endpoints',()=>{for(const curve of FADE_CURVES){assert.equal(fadeCurveGain(0,curve),0);assert.equal(fadeCurveGain(1,curve),1);let last=0;for(let i=0;i<=100;i++){const gain=fadeCurveGain(i/100,curve);assert.ok(gain>=last&&gain<=1);last=gain;}assert.equal(audioFadeGain(0,10,2,3,curve,curve),0);assert.equal(audioFadeGain(10,10,2,3,curve,curve),0);assert.equal(audioFadeGain(5,10,2,3,curve,curve),1);}assert.equal(fadeCurveGain(.5,'slow'),.25);assert.ok(Math.abs(fadeCurveGain(.5,'fast')-Math.sqrt(.5))<1e-9);assert.equal(fadeCurveGain(.5,'smooth'),.5);assert.ok(Math.abs(fadeCurveGain(.5,'equal-power')-Math.SQRT1_2)<1e-9);});
test('fade length dragging clamps to clip bounds without changing export or lyric timing',()=>{const p={in:2,out:12};setFadeLength(p,'in',3.1256);assert.equal(p.audioFadeIn,3.126);setFadeLength(p,'out',50);assert.equal(p.audioFadeOut,10);setFadeLength(p,'out',-1);assert.equal(p.audioFadeOut,0);setFadeLength(p,'in',NaN);assert.equal(p.audioFadeIn,3.126);assert.equal(p.in,2);assert.equal(p.out,12);});
test('saved fade curve names validate and old projects keep linear envelopes',()=>{const p=defaultProject({id:'a',duration:10});assert.equal(p.audioFadeInCurve,'linear');for(const curve of FADE_CURVES)validateProject({...p,audioFadeInCurve:curve,audioFadeOutCurve:curve},10);assert.throws(()=>validateProject({...p,audioFadeInCurve:'unknown'},10),/curve/);delete p.audioFadeInCurve;delete p.audioFadeOutCurve;validateProject(p,10);assert.equal(audioFadeGain(1,10,2,3),audioFadeGain(1,10,2,3,'linear','linear'));for(let t=0;t<=1;t+=.01)for(const curve of FADE_CURVES){const gain=audioFadeGain(t,1,2,3,curve,curve);assert.ok(gain>=0&&gain<=1);}});
