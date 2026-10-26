import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {LYRIC_FONTS,lyricFont,validLyricFont,loadLyricFont,lyricFontLoaded} from '../editor/lyric-fonts.mjs';
import {defaultProject,validateProject} from '../editor/lyric-model.mjs';
test('curated font catalogue preserves system presets and bundles every font with its license',()=>{
 assert.equal(LYRIC_FONTS.length,27);assert.equal(new Set(LYRIC_FONTS.map(f=>f.id)).size,27);
 assert.equal(lyricFont('sans').family,'Arial,sans-serif');assert.equal(lyricFont('serif').family,'Georgia,serif');assert.equal(lyricFont('mono').family,'ui-monospace,monospace');
 for(const f of LYRIC_FONTS){validateProject({...defaultProject({id:'font-test',duration:20}),font:f.id},20);if(f.group==='System')continue;
  const file=readFileSync(new URL('../editor/fonts/'+f.id+'.woff2',import.meta.url));assert.equal(file.subarray(0,4).toString(),'wOF2');assert.ok(readFileSync(new URL('../editor/fonts/'+f.id+'-OFL.txt',import.meta.url),'utf8').includes('SIL OPEN FONT LICENSE'));assert.ok(f.weight>=400&&f.weight<=900);
 }
 assert.ok(validLyricFont('orbitron'));assert.ok(validLyricFont('exo2'));assert.ok(!validLyricFont('https://untrusted/font'));assert.throws(()=>validateProject({...defaultProject({id:'a',duration:20}),font:'invented'},20));
});
test('local font loading is shared, cached and completed before it is marked ready',async()=>{
 const oldFace=globalThis.FontFace,oldDoc=globalThis.document;let finish,requests=0,added=0;
 globalThis.FontFace=class{constructor(name,url,options){requests++;assert.equal(name,'Lyric Orbitron');assert.match(url,/fonts\/orbitron\.woff2/);assert.ok(options.weight);}load(){return new Promise(resolve=>{finish=()=>resolve(this);});}};
 globalThis.document={fonts:{add(){added++;}}};
 try{assert.equal(lyricFontLoaded('orbitron'),false);const a=loadLyricFont('orbitron'),b=loadLyricFont('orbitron');assert.equal(a,b);assert.equal(requests,1);assert.equal(lyricFontLoaded('orbitron'),false);finish();await a;assert.equal(added,1);assert.equal(lyricFontLoaded('orbitron'),true);await loadLyricFont('orbitron');assert.equal(requests,1);await loadLyricFont('sans');await assert.rejects(loadLyricFont('not-a-font'),/Unknown/);
 }finally{globalThis.FontFace=oldFace;globalThis.document=oldDoc;}
});
test('MP4 cannot pass its font-loading gate until the selected face is ready',async()=>{
 const {renderMP4}=await import('../editor/lyric-export.mjs');const oldFace=globalThis.FontFace,oldDoc=globalThis.document;let finish,settled=false;
 globalThis.FontFace=class{load(){return new Promise(resolve=>{finish=()=>resolve(this);});}};globalThis.document={fonts:{add(){}}};
 try{const render=renderMP4({project:{...defaultProject({id:'font-export',duration:10}),font:'exo2'}});render.catch(()=>{settled=true;});await Promise.resolve();assert.equal(settled,false);assert.equal(lyricFontLoaded('exo2'),false);finish();await assert.rejects(render,/MP4 export requires/);assert.equal(lyricFontLoaded('exo2'),true);
 }finally{globalThis.FontFace=oldFace;globalThis.document=oldDoc;}
});
