import {test} from 'node:test';import assert from 'node:assert/strict';
import {retimeWord,practiceBounds,originalSentences,insertSentence,estimateMissingWords,defaultProject,validateEdit,validateProject,retimeLine,replaceLineText,distributeWords,shiftAll,splitLine,mergeLine,subtitles,creativeFiles,activeLine} from '../editor/lyric-model.mjs';
import {dimensions,drawLyricFrame,previewLyricHit} from '../editor/lyric-renderer.mjs';
const line=()=>({text:'Find your frequency',start:1,end:4,words:[{text:'Find',start:1,end:2},{text:'your',start:2,end:3},{text:'frequency',start:3,end:4}]});
const edit=()=>({schemaVersion:1,id:'track-one',duration:30,lines:[line()]});
test('all five format dimensions use even pixel sizes and standard outputs',()=>{for(const ratio of ['1:1','3:4','4:5','16:9','9:16'])for(const resolution of [720,1080]){const p={ratio,resolution};for(const n of dimensions(p))assert.equal(n%2,0);}assert.deepEqual(dimensions({ratio:'9:16',resolution:1080}),[1080,1920]);assert.deepEqual(dimensions({ratio:'16:9',resolution:720}),[1280,720]);});
test('moving and resizing a line carries word timing proportionally',()=>{const l=line();retimeLine(l,2,8,30);assert.deepEqual(l.words.map(w=>[w.start,w.end]),[[2,4],[4,6],[6,8]]);assert.equal(l.words[0].timingSource,'manual');});
test('estimated timing remains labelled and replacement text receives new timings',()=>{const l=line();l.words[0].estimated=true;retimeLine(l,2,5,30);assert.equal(l.words[0].estimated,true);replaceLineText(l,'New words');assert.ok(l.words.every(w=>w.estimated&&w.end>w.start));distributeWords(l);assert.ok(l.words.every(w=>w.estimated));assert.equal(l.words.at(-1).end,l.end);});
test('global shift clamps at track bounds without dropping duration',()=>{const lines=[line()];assert.equal(shiftAll(lines,-3,30),-1);assert.equal(lines[0].start,0);assert.equal(lines[0].end,3);assert.equal(shiftAll(lines,100,30),27);assert.equal(lines[0].end,30);});
test('split then merge preserves the lyric words and valid bounds',()=>{const lines=[line()];assert.ok(splitLine(lines,0,2.5));assert.equal(lines.length,2);validateEdit({schemaVersion:1,id:'a',duration:30,lines});mergeLine(lines,0);assert.equal(lines[0].text,'Find your frequency');assert.equal(lines[0].start,1);assert.equal(lines[0].end,4);});
test('manual documents reject traversal, nonfinite and out-of-line words',()=>{validateEdit(edit());for(const patch of [{id:'../other'},{duration:NaN},{lines:[{...line(),start:-1}]},{lines:[{...line(),words:[{text:'Find',start:0,end:1}]}]}])assert.throws(()=>validateEdit({...edit(),...patch}));});
test('video project validates ranges, artwork and allowed styling',()=>{const p=defaultProject({id:'track-one',duration:30});validateProject(p,30);for(const patch of [{ratio:'2:0'},{in:10,out:5},{out:31},{color:'url(evil)'},{artworkData:'data:text/html;base64,AAAA'}])assert.throws(()=>validateProject({...p,...patch},30));});
test('saved creative files are separate from analysis results and bound to their IDs',()=>{const e=edit(),p={...defaultProject({id:e.id,duration:30}),trackDuration:30};const files=creativeFiles({edits:{[e.id]:e},projects:{[e.id]:p}});assert.deepEqual(Object.keys(files),['lyric-edits/track-one.json','video-projects/track-one.json']);assert.throws(()=>creativeFiles({edits:{wrong:e},projects:{}}));});
test('subtitle export formats and overlapping line selection are deterministic',()=>{const s=subtitles([line()]);assert.match(s,/00:00:01,000 --> 00:00:04,000/);assert.match(subtitles([line()],'vtt'),/^WEBVTT/);assert.equal(activeLine([{...line(),text:'first'},{...line(),start:2,text:'second'}],2.5).text,'second');});
test('renderer uses the same deterministic canvas path for every effect',()=>{const calls=[];const ctx=new Proxy({measureText:text=>({width:text.length*18}),createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>key in target?target[key]:(...args)=>{calls.push([key,...args]);},set:(target,key,value)=>{target[key]=value;return true;}});const canvas={width:720,height:1280,getContext:()=>ctx};for(const effect of ['karaoke','pop','neon','fade','typewriter'])drawLyricFrame(canvas,null,{...defaultProject({id:'a',duration:30}),effect},[line()],2.3,{title:'Track',artist:'Artist'});assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='your'));});

test('editor fills recognition gaps and preserves existing estimated/manual anchors',()=>{
 const l={text:'Find your own frequency',start:1,end:5,words:[{text:'Find',start:1,end:2,timingSource:'manual'},{text:'your',start:null,end:null},{text:'own',start:null,end:null},{text:'frequency',start:4,end:5,estimated:true,timingSource:'estimated-line-rhythm'}]};
 const first=structuredClone(l.words[0]),last=structuredClone(l.words[3]);assert.equal(estimateMissingWords(l),2);assert.deepEqual(l.words[0],first);assert.deepEqual(l.words[3],last);assert.equal(l.words[1].start,2);assert.equal(l.words[2].end,4);assert.ok(l.words.slice(1,3).every(w=>w.estimated));assert.equal(estimateMissingWords(l),0);
 const calls=[];const ctx=new Proxy({measureText:text=>({width:text.length*18}),createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:(...args)=>{if(k==='fillText')calls.push([args[0],t.fillStyle]);},set:(t,k,v)=>{t[k]=v;return true;}});
 const project=defaultProject({id:'a',duration:5});drawLyricFrame({width:720,height:1280,getContext:()=>ctx},null,project,[l],(l.words[1].start+l.words[1].end)/2,{});assert.ok(calls.some(([text,color])=>text.trim()==='your'&&color===project.accent));
});
test('line-only lyrics receive estimates but unsafe gaps do not move anchors',()=>{
 const l={text:'Find your frequency',start:0,end:3,words:[]};assert.equal(estimateMissingWords(l),3);assert.ok(l.words.every(w=>w.estimated&&w.end>w.start));assert.equal(l.words.at(-1).end,3);
 const tight={text:'one two three',start:0,end:1,words:[{text:'one',start:0,end:.5},{text:'two',start:null,end:null},{text:'three',start:.52,end:1}]};assert.equal(estimateMissingWords(tight),0);assert.equal(tight.words[1].start,null);
});

test('practice loop adds bounded context without changing subtitle timing',()=>{const l=line(),before=structuredClone(l);assert.deepEqual(practiceBounds(l,4,.5),{start:.5,end:4});assert.deepEqual(l,before);assert.equal(practiceBounds(null,4),null);});
test('original transcript includes missing sentences and stays separate from manual edits',()=>{const source={lines:[{text:'Corrected words',originalText:'Original words'}],untimed:['Missing sentence']};assert.deepEqual(originalSentences({},source),['Original words','Missing sentence']);assert.deepEqual(originalSentences({lyrics:'[Verse]\nOriginal words\nMissing sentence'},source),['[Verse]','Original words','Missing sentence']);const lines=[line()];const i=insertSentence(lines,'New sentence',5,7,10);assert.equal(i,1);assert.equal(lines[i].text,'New sentence');assert.ok(lines[i].words.every(w=>w.estimated));assert.equal(insertSentence(lines,'Bad',7,5,10),-1);});

test('inserted word uses existing silence and preserves all recognized anchors',()=>{const l={text:'we love music',start:0,end:4,words:[{text:'we',start:0,end:.5},{text:'love',start:1,end:2},{text:'music',start:3,end:4}]};const before=structuredClone(l.words);replaceLineText(l,'we really love music');assert.deepEqual(l.words[0],before[0]);assert.deepEqual(l.words[2],before[1]);assert.deepEqual(l.words[3],before[2]);assert.equal(l.words[1].start,.5);assert.equal(l.words[1].end,1);assert.ok(l.words[1].estimated);});
test('insertion without a gap borrows adjacent words only and remains ordered',()=>{const l=line();replaceLineText(l,'Find your own frequency');assert.deepEqual(l.words[0],line().words[0]);assert.equal(l.words[1].start,2);assert.equal(l.words.at(-1).end,4);assert.ok(l.words.slice(1).every(w=>w.estimated));for(let i=1;i<l.words.length;i++)assert.ok(l.words[i].start>=l.words[i-1].end);});
test('deletion, punctuation and repeated words preserve matching timings',()=>{const l=line();replaceLineText(l,'Find frequency!');assert.deepEqual(l.words[0],line().words[0]);assert.equal(l.words[1].start,3);assert.equal(l.words[1].end,4);assert.equal(l.words[1].estimated,undefined);const r={text:'go go now',start:0,end:3,words:[{text:'go',start:0,end:1},{text:'go',start:1,end:2},{text:'now',start:2,end:3}]};replaceLineText(r,'go go right now');assert.equal(r.words[0].start,0);assert.equal(r.words[0].end,1);assert.ok(r.words.every(w=>w.end>w.start));});
test('correction keeps remote anchors and repeated typing is based on the original session',()=>{const l=line(),base=structuredClone(l);replaceLineText(l,'Find my frequency',base);assert.deepEqual(l.words[0],base.words[0]);assert.deepEqual(l.words[2],base.words[2]);assert.equal(l.words[1].start,2);assert.equal(l.words[1].end,3);replaceLineText(l,'',base);replaceLineText(l,'Find your frequency',base);assert.deepEqual(l.words,base.words);});
test('multiple edits, prefix/suffix inserts and complete replacement stay inside the line',()=>{for(const text of ['Please Find your frequency now','Find my own frequency please','Entirely different sentence','Find your own special frequency']){const l=line();replaceLineText(l,text);validateEdit({schemaVersion:1,id:'x',duration:10,lines:[l]});for(let i=1;i<l.words.length;i++)assert.ok(l.words[i].start>=l.words[i-1].end);}});

test('visual word dragging stays inside sentence and preserves other word timings',()=>{const l=line(),before=structuredClone(l.words);l.words[1].estimated=true;assert.ok(retimeWord(l,1,-5,-4));assert.equal(l.words[1].start,1);assert.equal(l.words[1].end,2);assert.equal(l.words[1].estimated,undefined);assert.equal(l.words[1].timingSource,'manual');assert.deepEqual(l.words[0],before[0]);assert.deepEqual(l.words[2],before[2]);retimeWord(l,1,8,9);assert.equal(l.words[1].start,3);assert.equal(l.words[1].end,4);assert.equal(retimeWord(l,1,3,2),false);});


test('Original ignores saved Flight references and falls back to original alignment, including missing lines',()=>{
 const source={lines:[{text:'Corrected words',originalText:'Original line'},{text:'Second line'}],untimed:['Missing from recognition']};
 for(const lyrics of ['$26','$aF','$undefined',''])assert.deepEqual(originalSentences({lyrics},source),['Original line','Second line','Missing from recognition']);
 assert.deepEqual(originalSentences({lyrics:'$26',alignedLyrics:[{text:'Catalog alignment'}]},{}),['Catalog alignment']);
 assert.deepEqual(originalSentences({lyrics:'$26'},{}),[]);
 assert.deepEqual(originalSentences({lyrics:'$26',alignedLyrics:[{text:'$27'}]},{lines:[{text:'$28'}]}),[]);
 assert.deepEqual(originalSentences({lyrics:'$26 is the price\n[Chorus]\nRepeat this'},source),['$26 is the price','[Chorus]','Repeat this']);
});

test('word edge resizing anchors the opposite edge at sentence bounds',()=>{
 const l=line(),before=structuredClone(l.words),w=l.words[1],start=w.start,end=w.end;
 retimeWord(l,1,start,20,'end');assert.equal(w.start,start);assert.equal(w.end,l.end);
 retimeWord(l,1,start,l.end-.1,'end');assert.equal(w.start,start);assert.equal(w.end,l.end-.1);
 retimeWord(l,1,-20,w.end,'start');assert.equal(w.start,l.start);assert.equal(w.end,l.end-.1);
 assert.deepEqual(l.words[0],before[0]);assert.deepEqual(l.words[2],before[2]);
 const a=line(),original=a.words[1].start;retimeWord(a,1,original,20);assert.equal(a.words[1].start,original);assert.equal(a.words[1].end,a.end);
 const b=line(),anchor=b.words[1].end;retimeWord(b,1,-20,anchor);assert.equal(b.words[1].start,b.start);assert.equal(b.words[1].end,anchor);
});
test('repeated word extensions and contractions never accumulate start drift',()=>{
 const l=line(),w=l.words[1],start=w.start;
 for(let i=0;i<20;i++){retimeWord(l,1,start,l.end+1,'end');retimeWord(l,1,start,start+.08,'end');assert.equal(w.start,start);}
 retimeWord(l,1,start,start+.001,'end');assert.equal(w.start,start);assert.equal(w.end,Math.round((start+.04)*1000)/1000);
});

test('preview lyric targets use rendered word geometry and the visible overlapping sentence',()=>{
 const ctx=new Proxy({globalAlpha:1,measureText:t=>({width:t.length*18}),createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>{t[k]=v;return true;}}),canvas={width:720,height:1280,getContext:()=>ctx},lines=[line(),{...line(),start:2,text:'Visible sentence'}],project=defaultProject({id:'a',duration:30});
 const hit=drawLyricFrame(canvas,null,project,lines,2.3,{});assert.equal(hit.lineIndex,1);assert.ok(hit.rects.length);const r=hit.rects[0];assert.equal(previewLyricHit(hit,r.x+r.width/2,r.y+r.height/2),1);assert.equal(previewLyricHit(hit,0,0),null);assert.equal(previewLyricHit(drawLyricFrame(canvas,null,project,lines,10,{}),360,800),null);
});
