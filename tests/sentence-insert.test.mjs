import {test} from 'node:test';
import assert from 'node:assert/strict';
import {suggestSentenceInsertion,applySentenceInsertion,insertionTexts} from '../editor/sentence-insert.mjs';
import {validateEdit,clone} from '../editor/lyric-model.mjs';
const base=()=>[{text:'First line',start:0,end:2,words:[{text:'First',start:0,end:1},{text:'line',start:1,end:2}]},{text:'Last line',start:8,end:10,words:[{text:'Last',start:8,end:9},{text:'line',start:9,end:10}]}];
function valid(lines,duration=16){validateEdit({schemaVersion:1,id:'demo',duration,lines});}
test('multiline paste skips section headings and estimates within a gap without moving anchors',()=>{
 assert.deepEqual(insertionTexts('[Verse]\nA new line\n\nAnother line'),['A new line','Another line']);
 const lines=base(),before=clone(lines),plan=suggestSentenceInsertion({lines,index:0,position:'after',text:'A new line\nAnother line',duration:16,useAudio:false});
 assert.ok(plan.ready);assert.equal(plan.overlap,false);assert.equal(plan.lines.length,2);assert.ok(plan.lines[0].start>=2);assert.ok(plan.lines[1].end<=8);assert.equal(plan.lines[0].end,plan.lines[1].start);
 assert.ok(plan.lines.every(l=>l.reviewRequired&&l.words.every(w=>w.estimated)));
 const result=applySentenceInsertion(lines,plan);assert.equal(result.index,1);assert.deepEqual(lines[0],before[0]);assert.deepEqual(lines.at(-1),before[1]);valid(lines);
});
test('matching source timings and recognised word anchors are recovered after a sentence was removed',()=>{
 const source={text:'Missing source line',originalText:'Missing source line',start:3,end:5,words:[{text:'Missing',start:3,end:3.7,timingSource:'manual'},{text:'source',start:3.8,end:4.2},{text:'line',start:4.3,end:5}]};
 const original=clone(source),plan=suggestSentenceInsertion({lines:base(),index:0,text:'missing source line!',duration:16,sourceLines:[source]});
 assert.ok(plan.ready);assert.equal(plan.lines[0].start,3);assert.equal(plan.lines[0].end,5);assert.equal(plan.lines[0].timingSource,'source-restored');
 assert.deepEqual(plan.lines[0].words.map(w=>[w.start,w.end]),[[3,3.7],[3.8,4.2],[4.3,5]]);assert.deepEqual(source,original);valid(plan.lines);
});
test('no-gap insertion does not steal time and an explicit overlapping loop requires opt-in',()=>{
 const lines=base();lines[1].start=2;const before=clone(lines);
 const gap=suggestSentenceInsertion({lines,index:0,text:'Missing line',duration:16});assert.equal(gap.ready,false);assert.match(gap.error,/free space/);
 const loop=suggestSentenceInsertion({lines,index:0,position:'loop',loop:{start:1,end:4},text:'Missing line',duration:16,useAudio:false});assert.ok(loop.ready);assert.ok(loop.overlap);
 assert.throws(()=>applySentenceInsertion(lines,loop),/overlaps/);assert.deepEqual(lines,before);applySentenceInsertion(lines,loop,{allowOverlap:true});assert.equal(lines.length,3);
});
test('audio activity trims silent edges but remains explicitly estimated and preserves stereo energy',()=>{
 const sampleRate=1000,length=16000,left=Float32Array.from({length},(_,i)=>i>=2500&&i<4500?.5:0),right=Float32Array.from(left,x=>-x),audioBuffer={sampleRate,length,numberOfChannels:2,getChannelData:c=>c?right:left};
 const plan=suggestSentenceInsertion({lines:base(),index:0,text:'A missing phrase',duration:16,audioBuffer});assert.ok(plan.ready);const row=plan.lines[0];assert.ok(row.start>=2.3&&row.start<2.6);assert.ok(row.end>4.4&&row.end<4.7);assert.equal(row.timingSource,'estimated-insert-audio');assert.ok(row.words.every(w=>w.estimated));valid(plan.lines);
});
test('before, playhead and empty-track proposals stay within duration and do not stretch across an entire outro',()=>{
 const before=suggestSentenceInsertion({lines:base(),index:1,position:'before',text:'Another sentence',duration:16,useAudio:false});assert.ok(before.ready);assert.ok(before.start>=2&&before.end<=8);
 const at=suggestSentenceInsertion({lines:base(),position:'playhead',playhead:5,text:'Another sentence',duration:16,useAudio:false});assert.ok(at.ready);assert.ok(at.start>=5&&at.end<=8);
 assert.equal(suggestSentenceInsertion({lines:base(),position:'playhead',playhead:1,text:'Another sentence',duration:16}).ready,false);
 const empty=suggestSentenceInsertion({lines:[],text:'New sentence',duration:600,useAudio:false});assert.ok(empty.ready);assert.ok(empty.end<8);valid(empty.lines,600);
});
test('multiple source anchors are ordered and leave estimated text between them',()=>{
 const sourceLines=[{text:'Known first',start:3,end:4,words:[]},{text:'Known last',start:6,end:7,words:[]}];const plan=suggestSentenceInsertion({lines:base(),index:0,text:'Known first\nNew middle\nKnown last',sourceLines,duration:16,useAudio:false});
 assert.ok(plan.ready);assert.deepEqual(plan.lines.map(l=>[l.start,l.end]),[[3,4],[4,6],[6,7]]);valid(plan.lines);
});
test('repeated source text chooses the occurrence in the insertion gap and stale overlap is rejected',()=>{
 const lines=base(),sourceLines=[{text:'Again',start:.5,end:1.5,words:[]},{text:'Again',start:4,end:5,words:[]}];const plan=suggestSentenceInsertion({lines,index:0,text:'Again',sourceLines,duration:16});assert.equal(plan.lines[0].start,4);
 lines.push({text:'A concurrent line',start:4,end:5,words:[]});assert.throws(()=>applySentenceInsertion(lines,plan),/overlaps/);
});
