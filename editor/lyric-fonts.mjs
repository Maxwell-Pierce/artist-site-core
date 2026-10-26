import {FONT_CATALOG} from './font-catalog.mjs';
const SYSTEM=[{id:'sans',name:'Modern sans',group:'System',family:'Arial,sans-serif',weight:800},{id:'serif',name:'Editorial serif',group:'System',family:'Georgia,serif',weight:800},{id:'mono',name:'Studio mono',group:'System',family:'ui-monospace,monospace',weight:800}];
export const LYRIC_FONTS=[...FONT_CATALOG.map(f=>({...f,family:`"Lyric ${f.name}",sans-serif`})),...SYSTEM];
export const lyricFont=id=>LYRIC_FONTS.find(f=>f.id===id)||SYSTEM[0];
export const validLyricFont=id=>LYRIC_FONTS.some(f=>f.id===id);
const loaded=new Set(SYSTEM.map(f=>f.id)),pending=new Map();
export const lyricFontLoaded=id=>loaded.has(id);
export function loadLyricFont(id){
 if(!validLyricFont(id))return Promise.reject(Error('Unknown lyric font.'));
 if(loaded.has(id))return Promise.resolve();if(pending.has(id))return pending.get(id);
 const font=lyricFont(id),face=new FontFace('Lyric '+font.name,`url("${new URL('./fonts/'+font.id+'.woff2',import.meta.url)}")`,{weight:font.range,style:'normal'});
 const task=face.load().then(result=>{document.fonts.add(result);loaded.add(id);pending.delete(id);}).catch(()=>{pending.delete(id);throw Error(`Could not load ${font.name}. Choose another font or reload Studio before exporting.`);});
 pending.set(id,task);return task;
}
