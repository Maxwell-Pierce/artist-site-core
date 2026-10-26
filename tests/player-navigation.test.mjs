import {test} from 'node:test';import assert from 'node:assert/strict';
import {adjacentSentence} from '../editor/player-navigation.mjs';
test('player sentence navigation follows playback chronology and clamps track edges',()=>{
 const lines=[{start:8},{start:.2},{start:2}],before=structuredClone(lines);
 assert.equal(adjacentSentence(lines,0,1),1);assert.equal(adjacentSentence(lines,0,-1),1);
 assert.equal(adjacentSentence(lines,2,1),0);assert.equal(adjacentSentence(lines,3,-1),1);
 assert.equal(adjacentSentence(lines,9,1),0);assert.equal(adjacentSentence(lines,9,-1),2);
 assert.deepEqual(lines,before);assert.equal(adjacentSentence([],0,1),null);assert.equal(adjacentSentence([{start:null}],0,1),null);
});
