import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAudioAnalysis,VISUALIZER_STYLES,visualizerDefaults,visualizerSettings,validateVisualizers,visualizerGeometry,visualizerHit} from '../editor/audio-visualizer.mjs';
import {defaultProject,validateProject,creativeFiles} from '../editor/lyric-model.mjs';
import {drawLyricFrame} from '../editor/lyric-renderer.mjs';
function audio({frequency=1000,silent=false,opposite=false}={}){const sampleRate=48000,length=sampleRate*2;const left=Float32Array.from({length},(_,i)=>silent?0:Math.sin(2*Math.PI*frequency*i/sampleRate)*.4),right=Float32Array.from(left,x=>opposite?-x:x);return {sampleRate,length,numberOfChannels:2,getChannelData:c=>c?right:left};}
test('silence has no spectrum energy and seeks are deterministic',()=>{
 const silence=createAudioAnalysis(audio({silent:true})).at(1,{density:48,smoothing:90});assert.ok(silence.bins.every(x=>x===0));assert.equal(silence.rms,0);
 const a=createAudioAnalysis(audio()),config={density:64,smoothing:80},before=a.at(1,config);a.at(.4,config);a.at(1.8,config);assert.deepEqual(a.at(1,config),before);
 assert.deepEqual(createAudioAnalysis(audio()).at(1,config),before,'independent preview/export engines agree');
});
test('FFT places a known tone in its log frequency band and preserves opposite-phase stereo',()=>{
 const config={density:64,smoothing:0},a=createAudioAnalysis(audio()).at(1,config),b=createAudioAnalysis(audio({opposite:true})).at(1,config);
 assert.deepEqual(a.bins,b.bins);assert.ok(a.rms>.25);
 let peak=0;for(let i=1;i<a.bins.length;i++)if(a.bins[i]>a.bins[peak])peak=i;
 const frequency=40*Math.pow(16000/40,(peak+.5)/64);assert.ok(Math.abs(frequency-1000)<120,`peak is ${frequency}`);
});
test('legacy projects load with no visualizer and style settings survive saving',()=>{
 const p=defaultProject({id:'test',duration:5});delete p.visualizers;validateProject(p,5);assert.equal(visualizerSettings(p).type,'none');
 p.trackDuration=5;p.visualizers={active:'ring',styles:{ring:{...visualizerDefaults('ring'),color:'#ff0055',x:23,scale:72},bars:{...visualizerDefaults('bars'),color:'#abcdef',y:80}}};
 const saved=JSON.parse(creativeFiles({edits:{},projects:{test:p}})['video-projects/test.json']);assert.deepEqual(saved.visualizers,p.visualizers);assert.equal(visualizerSettings(saved).x,23);
 for(const patch of [{scale:NaN},{color:'url(evil)'},{density:48.5},{layer:'unknown'},{scale:900}])assert.throws(()=>validateVisualizers({active:'ring',styles:{ring:patch}}));
 assert.throws(()=>validateVisualizers({active:'script',styles:{}}));
});
test('hit testing follows position, scale and rotation',()=>{
 const v={type:'bars',...visualizerDefaults('bars'),rotation:90,x:30,y:60};const g=visualizerGeometry(v,720,1280);
 assert.ok(visualizerHit(v,720,1280,g.x,g.y).inside);
 assert.ok(!visualizerHit(v,720,1280,0,0).inside);
 assert.ok(visualizerHit(v,720,1280,g.x-g.height/2,g.y+g.width/2).resize);
});
test('all styles render from the same analysis in every format without export guides',()=>{
 const analysis=createAudioAnalysis(audio()),record=[];let ctx;
 const gradient={addColorStop(){}};ctx=new Proxy({globalAlpha:1,measureText:text=>({width:text.length*12}),createLinearGradient:()=>gradient},{get:(t,k)=>k in t?t[k]:(...args)=>record.push([k,...args]),set:(t,k,v)=>(t[k]=v,true)});
 const p=defaultProject({id:'test',duration:2});p.showTitle=false;p.showProgress=false;
 for(const [type]of VISUALIZER_STYLES)for(const [w,h]of [[720,1280],[1280,720],[720,720]]){
  p.visualizers={active:type,styles:{[type]:visualizerDefaults(type)}};
  drawLyricFrame({width:w,height:h,getContext:()=>ctx},null,p,[],1,{}, {audioAnalysis:analysis});
 }
 assert.ok(record.some(([k])=>k==='arc'));assert.ok(record.some(([k])=>k==='lineTo'));assert.ok(!record.some(([k])=>k==='strokeRect'));
});
