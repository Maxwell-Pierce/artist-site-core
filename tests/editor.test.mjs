import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate,blocksHTML} from '../editor/model.mjs';
import {GitHubRepository} from '../editor/github.mjs';
const artist={name:'Artist',slug:'artist',theme:{bg:'#123456'}};
test('reject dangerous pages and preserve escaped text',()=>{
 const pages={schemaVersion:1,pages:[{slug:'story',title:'Story',blocks:[{type:'text',text:'<script>alert(1)</script>'}]}]};
 validate(artist,pages);assert.match(blocksHTML(pages.pages[0]),/&lt;script&gt;/);
 pages.pages[0].blocks=[{type:'link',href:'javascript:alert(1)'}];assert.throws(()=>validate(artist,pages));
 pages.pages[0].blocks=[];pages.pages[0].slug='../index';assert.throws(()=>validate(artist,pages));
});
test('commit checks branch head and updates non-forcibly with all files',async()=>{
 const requests=[];const request=async(url,init)=>{requests.push({url,...init});let value={};if(url.includes('/git/ref/'))value={object:{sha:'base'}};else if(url.endsWith('/git/commits/base'))value={tree:{sha:'old-tree'}};else if(url.endsWith('/git/trees'))value={sha:'new-tree'};else if(url.endsWith('/git/commits'))value={sha:'commit'};return {ok:true,status:200,json:async()=>value};};
 const repo=new GitHubRepository('owner/site','secret',request);const sha=await repo.commit('main','base',{'artist.json':'{}','pages.json':'{}'},'Publish');assert.equal(sha,'commit');
 const tree=JSON.parse(requests.find(r=>r.url.endsWith('/git/trees')).body);assert.equal(tree.tree.length,2);assert.equal(tree.base_tree,'old-tree');assert.equal(JSON.parse(requests.at(-1).body).force,false);
});
test('stale head never writes',async()=>{
 const requests=[];const repo=new GitHubRepository('owner/site','token',async(url,init)=>{requests.push(init);return {ok:true,status:200,json:async()=>({object:{sha:'new'}})};});
 await assert.rejects(repo.commit('main','old',{'artist.json':'{}'},'Publish'),/branch changed/);assert.equal(requests.length,1);assert.equal(requests[0].method,'GET');
});
test('GitHub errors do not leak token or remote payload',async()=>{
 const repo=new GitHubRepository('owner/site','secret',async()=>({ok:false,status:403}));await assert.rejects(repo.head('main'),error=>!error.message.includes('secret')&&error.message.includes('403'));
});

test('default browser fetch is invoked with the global receiver',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async function(url,options){
  assert.equal(this,globalThis,'browser fetch must not receive a repository instance');
  assert.equal(url,'https://api.github.com/repos/owner/site/git/ref/heads/main');
  return {ok:true,status:200,json:async()=>({object:{sha:'head'}})};
 };
 try {assert.equal(await new GitHubRepository('owner/site','token').head('main'),'head');}
 finally {globalThis.fetch=original;}
});

test('rich text keeps formatting but removes attributes and executable elements',async()=>{
 const {richHTML}=await import('../editor/model.mjs');
 const result=richHTML('<b onclick="evil()">Hello &amp; goodbye</b><img src=x onerror=evil()><a href="javascript:x">link</a><ul><li>One</li></ul>');
 assert.equal(result,'<b>Hello &amp; goodbye</b>link<ul><li>One</li></ul>');
 assert.equal(richHTML('&lt;img&gt; &#65; &nbsp;'),'&lt;img&gt; A \u00a0');
});
test('all supported sections validate on home and extra pages',async()=>{
 const {newSection,sectionTypes}=await import('../editor/page-canvas.mjs');
 const blocks=sectionTypes.map(newSection);const pages={schemaVersion:1,pages:[{slug:'story',title:'Story',blocks}],home:{blocks:structuredClone(blocks)}};
 validate(artist,pages);assert.match(blocksHTML(pages.pages[0]),/<figure>/);assert.match(blocksHTML(pages.pages[0]),/class="text-link"/);
 pages.home.blocks[0]={type:'image',src:'javascript:evil'};assert.throws(()=>validate(artist,pages));
 pages.home={};assert.throws(()=>validate(artist,pages));
 assert.throws(()=>newSection('script'));
});
test('legacy plain text remains escaped and rich body is opt-in',()=>{
 const page={title:'Story',blocks:[{type:'text',text:'<b>literal</b>'}]};
 assert.match(blocksHTML(page),/<p style="white-space:pre-wrap">&lt;b&gt;literal&lt;\/b&gt;<\/p>/);
 page.blocks[0].richText='<b>Formatted</b>';assert.match(blocksHTML(page),/<div style="white-space:pre-wrap"><b>Formatted<\/b><\/div>/);
});
