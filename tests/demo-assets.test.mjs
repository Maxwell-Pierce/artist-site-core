import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateEdit,defaultProject,validateProject,timingStats} from '../editor/lyric-model.mjs';
const base=new URL('../editor/demo/heavns-moving-out-of-frame/',import.meta.url);
const read=name=>readFileSync(new URL(name,base));
const track=JSON.parse(read('track.json')),edit=JSON.parse(read('lyrics.json'));
test('shared music demo bundles original audio and artwork without external media dependencies',()=>{
 assert.equal(track.title,'HEAVNS - Moving Out Of Frame');
 for(const [name,key,magic]of [[track.audio,'audioSHA256','OggS'],[track.artwork,'artworkSHA256','\x89PNG']]){
  assert.ok(name.startsWith('./')&&!name.includes('..'));const bytes=read(name);
  assert.equal(bytes.subarray(0,4).toString('latin1'),magic);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),track.demoProvenance[key]);
 }
 assert.ok(track.lyrics.includes("i'm moving out of frame tonight"));
 assert.equal(track.demoProvenance.sourceTrackID,track.id);
});
test('shared demo timings validate for full-track export and preserve estimation provenance',()=>{
 assert.ok(track.duration>240&&track.duration<246);assert.equal(edit.duration,track.duration);assert.equal(edit.id,track.id);validateEdit(edit);
 const stats=timingStats(edit.lines);assert.ok(stats.lines>60);assert.ok(stats.words>350);assert.equal(stats.timed,stats.words);assert.ok(stats.estimated>0);
 const source=JSON.parse(read('source-lyrics.json'));assert.equal(source.id,track.id);assert.ok(source.lines.some(l=>l.words.some(w=>w.start===null)));
 const project=defaultProject(track);assert.equal(project.out,track.duration);validateProject(project,track.duration);
});
