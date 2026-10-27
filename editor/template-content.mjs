import {richHTML,escapeHTML as esc,safeURL} from './model.mjs';
export function inlineHTML(value){return richHTML(value).replace(/<\/?(?:ul|ol|li|div|p)>/g,tag=>tag.startsWith('</')?'<br>':'').replace(/(?:<br>)+$/,'');}
export function validOverrides(value){
 if(value===undefined)return;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid template edits.');
 for(const [key,item] of Object.entries(value)){
  if(!/^[ta]:\d+$/.test(key)||!item||typeof item.original!=='string')throw Error('Invalid template edit.');
  if(key[0]==='t'){if(typeof item.html!=='string')throw Error('Invalid edited text.');}
  else {if(!item.attrs||typeof item.attrs!=='object')throw Error('Invalid edited media.');for(const [name,v]of Object.entries(item.attrs)){if(!['href','src','poster','alt'].includes(name)||typeof v!=='string'||(name!=='alt'&&!(name==='poster'&&v==='')&&!safeURL(v,name!=='href')))throw Error('Invalid media or link destination.');}}
 }
}
const valueAt=(obj,path)=>path.split('.').reduce((o,k)=>o?.[k],obj)??'';
export function markTemplate(doc,artist,overrides={}){
 const walker=doc.createTreeWalker(doc.body,4);const nodes=[];
 while(walker.nextNode()){const n=walker.currentNode;if(n.textContent.trim()&&!n.parentElement.closest('script,style,noscript,template'))nodes.push(n);}
 nodes.forEach((node,i)=>{
  const original=node.textContent,key='t:'+i,parent=node.parentElement;
  const direct=original.trim().match(/^\{\{([a-zA-Z0-9_.]+)\}\}$/)?.[1];
  const rendered=original.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g,(_,path)=>valueAt(artist,path));
  let el;if(parent.childNodes.length===1)el=parent;else{el=doc.createElement('span');el.dataset.studioFragment='';node.replaceWith(el);}
  el.dataset.studioText=key;el.dataset.studioOriginal=original;if(direct)el.dataset.config=direct;
  const saved=overrides[key];el.innerHTML=saved?.original===original?inlineHTML(saved.html):esc(rendered);
 });
 [...doc.body.querySelectorAll('a,img,video')].forEach((el,i)=>{
  const original=el.getAttribute(el.tagName==='A'?'href':'src')||'',key='a:'+i;
  el.dataset.studioAsset=key;el.dataset.studioAssetOriginal=original;
  const item=overrides[key];if(item?.original===original)for(const [name,value]of Object.entries(item.attrs||{}))if(['href','src','poster','alt'].includes(name))el.setAttribute(name,value);
 });
 // Expand template attributes without touching the original-value guards.
 for(const el of doc.querySelectorAll('*'))for(const attr of [...el.attributes])if(!attr.name.startsWith('data-studio-'))el.setAttribute(attr.name,attr.value.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g,(_,path)=>valueAt(artist,path)));
 for(const el of doc.head.querySelectorAll('title,style'))el.textContent=el.textContent.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g,(_,path)=>valueAt(artist,path));
}
// Only generated regions/data come from the deployed page. Editable template content
// remains bound to the connected repository snapshot, never to a stale deployment.
export function mergePublished(doc,published){
 if(!published)return;
 const live=new DOMParser().parseFromString(published,'text/html');
 const comments=root=>{const w=doc.createTreeWalker(root,128),out=[];while(w.nextNode())out.push(w.currentNode);return out;};
 const start=comments(doc).find(n=>n.textContent.trim()==='PLAYLISTS START'),end=comments(doc).find(n=>n.textContent.trim()==='PLAYLISTS END');
 const liveComments=comments(live),ls=liveComments.find(n=>n.textContent.trim()==='PLAYLISTS START'),le=liveComments.find(n=>n.textContent.trim()==='PLAYLISTS END');
 if(start&&end&&ls&&le){let node=start.nextSibling;while(node&&node!==end){const next=node.nextSibling;node.remove();node=next;}for(let n=ls.nextSibling;n&&n!==le;n=n.nextSibling)end.before(doc.importNode(n,true));}
 const data=live.getElementById('hero-video-data');if(data){const existing=doc.getElementById('hero-video-data');if(existing)existing.textContent=data.textContent;else doc.body.append(doc.importNode(data,true));}
}
export function mountCanvasMedia(doc,mediaPaths=[]){
 const hero=doc.getElementById('hero-video');let sources=[];
 try{sources=JSON.parse(doc.getElementById('hero-video-data')?.textContent||'[]');}catch{}
 if(!sources.length)sources=mediaPaths;
 for(const video of doc.querySelectorAll('video')){
  if(video===hero&&!video.getAttribute('src')&&sources.length)video.src=sources[0];
  video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;
  video.addEventListener('playing',()=>video.classList.add('is-playing'));
  if(video.getAttribute('src')||video.querySelector('source'))video.play().catch(()=>{});
 }
 const header=doc.querySelector('body>header');if(header){const update=()=>header.classList.toggle('is-scrolled',doc.defaultView.scrollY>36);doc.defaultView.addEventListener('scroll',update,{passive:true});update();}
 const year=doc.getElementById('year');if(year)year.textContent=String(new Date().getFullYear());
}
