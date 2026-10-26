import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timelineRegions,regionTarget,timingChanged,deleteTimelineItem} from '../editor/timeline-regions.mjs';
const lines=[{start:0,end:2,text:'One two',words:[{start:0,end:1,text:'One'},{start:1,end:2,text:'two'}]},{start:3,end:5,text:'Three four',words:[{start:3,end:4,text:'Three'},{start:4,end:5,text:'four'}]}];
test('Words spans sentence boundaries while Sentence isolates a parent and its words',()=>{
 assert.deepEqual(timelineRegions(lines,'words',0).map(e=>e.id),['w-0-0','w-0-1','w-1-0','w-1-1']);
 const sentence=timelineRegions(lines,'sentence',1);assert.deepEqual(sentence.map(e=>e.id),['s-1','w-1-0','w-1-1']);
 assert.equal(sentence[0].row,lines[1]);assert.equal(sentence[1].row,lines[1].words[0]);
 assert.deepEqual(timelineRegions(lines,'lines',0).map(e=>e.id),['l-0','l-1']);
});
test('qualified word targets keep edits bound to their own sentence',()=>{
 assert.deepEqual(regionTarget('w-1-0'),{kind:'word',lineIndex:1,wordIndex:0});
 assert.deepEqual(regionTarget('s-1'),{kind:'line',lineIndex:1,wordIndex:null});
 assert.equal(regionTarget('practice-loop'),null);
});
test('blur-only updates cannot rebuild the region between double-click presses',()=>{
 const row=lines[0];assert.equal(timingChanged({start:0,end:2},row),false);
 assert.equal(timingChanged({start:0,end:2.00000001},row),false);
 assert.equal(timingChanged({start:.1,end:2},row),true);
});


test('deleting a selected word preserves every remaining timestamp and the sentence range',()=>{
 const edited=structuredClone(lines),before=structuredClone(edited);const result=deleteTimelineItem(edited,{kind:'word',lineIndex:0,wordIndex:0});
 assert.deepEqual(result,{removedSentence:false,lineIndex:0,wordIndex:0,kind:'word'});
 assert.equal(edited[0].text,'two');assert.deepEqual(edited[0].words,[before[0].words[1]]);assert.equal(edited[0].start,0);assert.equal(edited[0].end,2);assert.deepEqual(edited[1],before[1]);
});
test('sentence deletion and last-word deletion remove only their parent without rippling later times',()=>{
 const edited=structuredClone(lines),before=structuredClone(edited);deleteTimelineItem(edited,{kind:'word',lineIndex:0,wordIndex:0});
 const last=deleteTimelineItem(edited,{kind:'word',lineIndex:0,wordIndex:0});assert.equal(last.removedSentence,true);assert.deepEqual(edited,[before[1]]);assert.equal(last.kind,'sentence');
 const empty=deleteTimelineItem(edited,{kind:'sentence',lineIndex:0});assert.equal(empty.kind,null);assert.equal(edited.length,0);
});
test('invalid or cleared timeline selections cannot delete anything',()=>{
 const edited=structuredClone(lines),before=structuredClone(edited);
 for(const selection of [{kind:null,lineIndex:0},{kind:'word',lineIndex:0,wordIndex:-1},{kind:'word',lineIndex:5,wordIndex:0},{kind:'sentence',lineIndex:-1}])assert.equal(deleteTimelineItem(edited,selection),null);
 assert.deepEqual(edited,before);
});
