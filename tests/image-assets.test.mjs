import {test} from 'node:test';import assert from 'node:assert/strict';
import {imageAsset,imageFiles,imageSource} from '../editor/image-assets.mjs';import {GitHubRepository} from '../editor/github.mjs';
test('draft image assets retain binary bytes and use a safe publishable path',()=>{
 const data='data:image/webp;base64,UklGRg==',asset=imageAsset(data,'0123456789abcdef');assert.equal(asset.path,'assets/uploads/0123456789abcdef.webp');assert.equal(imageSource(asset.path,{[asset.path]:asset.file}),data);
 assert.deepEqual(imageFiles({[asset.path]:asset.file}),{[asset.path]:{encoding:'base64',content:'UklGRg=='}});assert.equal(imageSource('assets/original.png',{}),'assets/original.png');
 assert.throws(()=>imageAsset('data:image/svg+xml;base64,AAAA','0123456789abcdef'));
 assert.throws(()=>imageFiles({'../unsafe.webp':asset.file}));assert.throws(()=>imageAsset(data,'../path'));
});
test('image binaries and content are committed in the same tree before the ref moves',async()=>{
 const calls=[];const repo=new GitHubRepository('owner/site','secret',async(url,init)=>{calls.push({url,...init});let data={};if(url.includes('/git/ref/'))data={object:{sha:'base'}};else if(url.endsWith('/git/commits/base'))data={tree:{sha:'old'}};else if(url.endsWith('/git/blobs'))data={sha:'binary-sha'};else if(url.endsWith('/git/trees'))data={sha:'tree'};else if(url.endsWith('/git/commits'))data={sha:'commit'};return{ok:true,status:200,json:async()=>data};});
 const path='assets/uploads/0123456789abcdef.webp';await repo.commit('main','base',{'pages.json':'{}',[path]:{encoding:'base64',content:'UklGRg=='}},'Image update');
 const blob=calls.find(c=>c.url.endsWith('/git/blobs'));assert.deepEqual(JSON.parse(blob.body),{encoding:'base64',content:'UklGRg=='});
 const tree=JSON.parse(calls.find(c=>c.url.endsWith('/git/trees')).body);assert.deepEqual(tree.tree.find(e=>e.path===path),{path,mode:'100644',type:'blob',sha:'binary-sha'});assert.equal(tree.tree.find(e=>e.path==='pages.json').content,'{}');assert.equal(calls.at(-1).method,'PATCH');
});
