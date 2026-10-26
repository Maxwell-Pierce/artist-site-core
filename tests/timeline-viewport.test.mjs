import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timelineViewport} from '../editor/timeline-viewport.mjs';
test('overview zooms out from a short sentence to the complete track',()=>{
 const line={start:100,end:104};
 const overview=timelineViewport('lines',line,300,1230);
 const words=timelineViewport('words',line,300,1230);
 const sentence=timelineViewport('sentence',line,300,1230);
 assert.equal(overview.start,0);assert.equal(overview.zoom,4);
 assert.equal(words.zoom,100);assert.equal(sentence.zoom,240);
 assert.equal(sentence.start,99.5);
});
test('context stays inside the recording at either edge',()=>{
 for(const line of [{start:0,end:2},{start:298,end:300}]){
  const v=timelineViewport('words',line,300,1230);
  assert.ok(v.start>=0);assert.ok(v.start+1200/v.zoom<=300);
  assert.ok(v.start<=line.start);assert.ok(v.start+1200/v.zoom>=line.end);
 }
 assert.equal(timelineViewport('sentence',{start:0,end:2},2,1230).start,0);
 assert.equal(timelineViewport('lines',null,0,1230),null);
 assert.equal(timelineViewport('lines',null,100,0),null);
});
