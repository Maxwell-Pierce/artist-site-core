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
  if (!Array.isArray(page.blocks)) throw Error('Page sections are invalid.');
  for (const block of page.blocks) {
   if (!['text','image','link'].includes(block.type)) throw Error('Unsupported section type.');
   if (block.type === 'image' && !safeURL(block.src, true)) throw Error('Images need an assets/ path or HTTPS URL.');
   if (block.type === 'link' && !safeURL(block.href)) throw Error('Links need an HTTPS URL, anchor or local page address.');
  }
 }
}
export function safeURL(value, image = false) {
 if (typeof value !== 'string' || /[\\\s\x00-\x1f]/.test(value) || value.includes('..')) return false;
 return /^https:\/\/[^/]+/i.test(value) || (image ? /^assets\/[a-z\d_./-]+$/i.test(value) : /^(?:#[a-z\d_-]+|[a-z\d_/-]+\.html(?:#[a-z\d_-]+)?)$/i.test(value));
}
export function blocksHTML(page) {
 return `<section class="section"><p class="eyebrow">${escapeHTML(page.label || page.title)}</p><h1>${escapeHTML(page.title)}</h1>${page.blocks.map(b => {
  if (b.type === 'image') return `<figure><img style="max-width:100%;border-radius:16px" src="${escapeHTML(b.src)}" alt="${escapeHTML(b.alt)}"><figcaption>${escapeHTML(b.caption)}</figcaption></figure>`;
  if (b.type === 'link') return `<p><a class="text-link" href="${escapeHTML(b.href)}">${escapeHTML(b.text)} ↗</a></p>`;
  return `${b.heading ? `<h2>${escapeHTML(b.heading)}</h2>` : ''}<p style="white-space:pre-wrap">${escapeHTML(b.text)}</p>`;
 }).join('')}</section>`;
}
