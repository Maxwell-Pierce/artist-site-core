import {validOverrides} from './template-content.mjs';
export const clone = value => JSON.parse(JSON.stringify(value));
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validate(artist, pages) {
 if (!artist.name?.trim()) throw Error('Enter an artist name.');
 if (!/^[a-z0-9-]+$/.test(artist.slug)) throw Error('Artist identifier must use lowercase letters, numbers and hyphens.');
 for (const color of Object.values(artist.theme || {})) if (!/^#[a-f\d]{6}$/i.test(color)) throw Error('Choose six-digit theme colours.');
 if (!/^assets\//.test(artist.entrance?.portrait || 'assets/mark.svg') || artist.entrance?.portrait?.includes('..')) throw Error('Portrait must be inside assets/.');
 if(pages.navigation!==undefined){if(!Array.isArray(pages.navigation))throw Error('Invalid navigation.');for(const link of pages.navigation)if(!link.label?.trim()||!safeURL(link.href))throw Error('Menu items need a label and safe destination.');}
 const seen = new Set(['index','admin','offline']);
 if (pages.schemaVersion !== 1 || !Array.isArray(pages.pages)) throw Error('Unsupported page format.');
 for (const page of pages.pages) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) || seen.has(page.slug)) throw Error('Each page needs a unique address using lowercase letters, numbers and hyphens.');
  seen.add(page.slug);
  if (!page.title?.trim()) throw Error('Each page needs a title.');
  validateBlocks(page.blocks);
 }
 if(pages.home!==undefined){validateBlocks(pages.home?.blocks);validOverrides(pages.home?.overrides);
  if(pages.home.collections!==undefined){if(!pages.home.collections||typeof pages.home.collections!=='object'||Array.isArray(pages.home.collections))throw Error('Invalid collection edits.');for(const [id,item]of Object.entries(pages.home.collections)){if(!/^[a-zA-Z0-9_-]+$/.test(id)||!item||typeof item!=='object')throw Error('Invalid collection edit.');for(const [key,value]of Object.entries(item))if(!['title','description','artwork'].includes(key)||typeof value!=='string'||(key==='artwork'&&!safeURL(value,true)))throw Error('Invalid collection field.');}}
 }
}
function validateBlocks(blocks){
 if(!Array.isArray(blocks))throw Error('Page sections are invalid.');
 for(const block of blocks){
  if(!block||!['text','image','link'].includes(block.type))throw Error('Unsupported section type.');
  if(block.type==='image'&&!safeURL(block.src,true))throw Error('Images need an assets/ path or HTTPS URL.');
  if(block.type==='link'&&!safeURL(block.href))throw Error('Links need an HTTPS URL, anchor or local page address.');
 }
}

export function safeURL(value, image = false) {
 if (typeof value !== 'string' || /[\\\s\x00-\x1f]/.test(value) || value.includes('..')) return false;
 return /^https:\/\/[^/]+/i.test(value) || (image ? /^assets\/[a-z\d_./-]+$/i.test(value) : /^(?:#[a-z\d_-]+|[a-z\d_/-]+\.html(?:#[a-z\d_-]+)?)$/i.test(value));
}
// Rich content uses a small, attribute-free vocabulary; old plain text remains plain.
export function richHTML(value) {
 return String(value ?? '').split(/(<[^>]*>)/g).map(token=>{
  if(!token.startsWith('<')) return escapeHTML(token.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi,entity=>{const key=entity.slice(1,-1).toLowerCase();if(key[0]==='#'){const n=key[1]==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'�';}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'}[key];}));
  const tag=token.match(/^<\s*(\/?)\s*(strong|b|em|i|u|br|p|div|ul|ol|li)\b[^>]*>$/i);
  return tag ? '<'+tag[1]+tag[2].toLowerCase()+'>' : '';
 }).join('');
}
export function sectionHTML(b) {
 if(b.type==='image')return `<figure><img style="max-width:100%;border-radius:16px" src="${escapeHTML(b.src)}" alt="${escapeHTML(b.alt)}"><figcaption>${escapeHTML(b.caption)}</figcaption></figure>`;
 if(b.type==='link')return `<p><a class="text-link" href="${escapeHTML(b.href)}">${escapeHTML(b.text)} ↗</a></p>`;
 return `${b.heading ? `<h2>${escapeHTML(b.heading)}</h2>` : ''}${b.richText !== undefined ? `<div style="white-space:pre-wrap">${richHTML(b.richText)}</div>` : `<p style="white-space:pre-wrap">${escapeHTML(b.text)}</p>`}`;
}
export function blocksHTML(page) {
 return `<section class="section"><p class="eyebrow">${escapeHTML(page.label || page.title)}</p><h1>${escapeHTML(page.title)}</h1>${page.blocks.map(sectionHTML).join('')}</section>`;
}
