import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timelineRegions,regionTarget,timingChanged} from '../editor/timeline-regions.mjs';
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
