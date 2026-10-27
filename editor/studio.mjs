import {prepareImage,imageFiles,imageSource} from './image-assets.mjs';
import {mountPageCanvas} from './page-canvas.mjs';
import {markTemplate,mergePublished,mountCanvasMedia} from './template-content.mjs';
import {rememberConnection, rememberedConnection, forgottenConnection} from './connection.mjs';
import {validatePresence, mountPresence, platforms, safePresenceURL} from './presence.mjs';
import {creativeFiles} from './lyric-model.mjs';
import {GitHubRepository} from './github.mjs';
import {clone,escapeHTML as esc,validate,blocksHTML} from './model.mjs';
const $=id=>document.getElementById(id);
let uploadedImages={},inlineSettings=null;
let publishedHTML='',videoPaths=[],repo,artist,pages,source,base,branch,repository,tab='home',selected=0,dirty=false,busy=false,history=[],previewTimer,draftBranch,draftHead,existingPages=[],assetPaths=[],previewGeneration=0,baseCSS='',presenceCSS='',previewTracks=[],creative={edits:{},projects:{}},lyricIDs=[],lyricDispose=null,lyricMount=0;
const notice=(message,error=false)=>{$('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').hidden=!error&&message.startsWith('Connected. Edits preview immediately.');};
const key=()=>`artist-studio:${repository}:${branch}`;
function snapshot(){return {artist:clone(artist),pages:clone(pages),creative:clone(creative),uploadedImages:clone(uploadedImages)};}
function checkpoint(){history.push(snapshot());if(history.length>50)history.shift();$('undo').disabled=false;}
function changed(refresh=true){dirty=true;$('dirty').textContent='Unpublished changes';try{localStorage.setItem(key(),JSON.stringify({...snapshot(),base,savedAt:new Date().toISOString()}));}catch{notice('Changes are in memory; browser storage is unavailable. Export a backup before closing.');}clearTimeout(previewTimer);if(refresh)previewTimer=setTimeout(preview,150);}
function field(parent,label,value,update,type='text',options){
 const wrap=document.createElement('label');wrap.textContent=label;
 const input=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');
 if(type==='select')for(const option of options){const el=document.createElement('option');el.value=option;el.textContent=option;input.append(el);}else if(type!=='textarea')input.type=type;
 input.value=value??'';input.addEventListener('focus',()=>checkpoint(),{once:true});
 input.addEventListener(type==='select'?'change':'input',()=>{update(input.value);changed(!parent.closest('.studio-inline-settings'));});wrap.append(input);parent.append(wrap);if(label==='Portrait asset path'||label==='Image asset path or HTTPS URL'||label==='Video asset path or HTTPS URL'){const select=document.createElement('select');select.setAttribute('aria-label','Choose an existing image');const empty=document.createElement('option');empty.value='';empty.textContent='Choose an existing image…';select.append(empty);for(const path of (label==='Video asset path or HTTPS URL'?videoPaths:assetPaths)){const option=document.createElement('option');option.value=path;option.textContent=path;select.append(option);}select.onchange=()=>{if(!select.value)return;checkpoint();input.value=select.value;update(select.value);changed();};wrap.append(select);}return input;
}
function configField(parent,label,path,type,options){const keys=path.split('.');let obj=artist;for(const k of keys.slice(0,-1))obj=obj[k]??=( {} );const prop=keys.at(-1);field(parent,label,obj[prop],v=>obj[prop]=v,type,options);}
function button(parent,text,fn,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.onclick=fn;parent.append(b);return b;}
function render(){
 closeInlineSettings();
 lyricDispose?.();lyricDispose=null;const mount=++lyricMount;$('workspace').classList.toggle('lyric-mode',tab==='lyrics');if(tab==='lyrics')$('preview-audio').pause();
 const target=$('fields');target.replaceChildren();$('workspace').classList.toggle('canvas-mode',tab==='home'||tab==='page');measureContentShell();pageSettings.hidden=tab!=='page';
 const titles={home:'Home page',pages:'Pages & navigation',identity:'Identity & entrance',theme:'Colours & appearance',events:'DJ events & calendar',socials:'Social & music links',lyrics:'Lyrics & video studio'};
 $('panel-title').textContent=tab==='page'?(pages.pages[selected]?.title||'New page'):titles[tab];
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.tab===tab);b.title=b.textContent.trim();b.setAttribute('aria-label',b.textContent.trim());});
 const list=$('page-list');list.replaceChildren();pages.pages.forEach((p,i)=>button(list,`${p.nav===false?'○':'▤'} ${p.label||p.title}`,()=>{tab='page';selected=i;render();preview();}));
 if(tab==='lyrics'){target.textContent='Loading lyric timeline…';import('./lyric-studio.mjs').then(({mountLyricStudio})=>{if(mount!==lyricMount||tab!=='lyrics')return;lyricDispose=mountLyricStudio(target,{repo,getBase:()=>base,tracks:previewTracks,lyricIDs,getState:()=>creative,onChange:changed});}).catch(error=>{target.textContent='Could not load the timeline: '+error.message;});
 }else if(tab==='home'){
  renderCanvasSettings(target);
 }else if(tab==='identity'){
  for(const [label,path,type] of [['Artist name','name'],['First part of name','nameFirst'],['Second part of name','nameLast'],['Tagline','tagline'],['Search description','description','textarea'],['Entrance eyebrow','entrance.eyebrow'],['Portrait asset path','entrance.portrait'],['Portrait description','entrance.portraitAlt'],['Entrance message','entrance.tagline'],['Enter button','entrance.button']])configField(target,label,path,type);
  configField(target,'Portrait effect','entrance.effect','select',['fade','eye-glow']);
 }else if(tab==='theme'){
  for(const [prop,label] of Object.entries({bg:'Background',surface:'Panels',ink:'Primary text',muted:'Secondary text',gold:'Primary accent',pink:'Secondary accent'}))configField(target,label,'theme.'+prop,'color');
 }else if(tab==='events'){renderEvents(target);
 }else if(tab==='socials'){renderSocials(target);
 }else if(tab==='pages'){
  const p=document.createElement('p');p.className='hint';p.textContent='Pages are added alongside existing HTML pages. Existing handcrafted pages are preserved. Use the arrows to set menu order.';target.append(p);
  const menuHead=document.createElement('h3');menuHead.textContent='Main menu';target.append(menuHead);
  if(!pages.navigation){button(target,'Customise existing menu',()=>{checkpoint();const doc=new DOMParser().parseFromString(source,'text/html');pages.navigation=[...doc.querySelectorAll('header nav a')].map(a=>({label:a.textContent.trim(),href:a.getAttribute('href')}));changed();render();});}else{pages.navigation.forEach((item,i)=>{const card=document.createElement('div');card.className='block';field(card,'Menu label',item.label,v=>item.label=v);field(card,'Destination',item.href,v=>item.href=v);const row=document.createElement('div');row.className='row';for(const delta of [-1,1])button(row,delta<0?'↑':'↓',()=>{checkpoint();[pages.navigation[i],pages.navigation[i+delta]]=[pages.navigation[i+delta],item];changed();render();}).disabled=i+delta<0||i+delta>=pages.navigation.length;button(row,'Remove',()=>{checkpoint();pages.navigation.splice(i,1);changed();render();});card.append(row);target.append(card);});button(target,'+ Menu link',()=>{checkpoint();pages.navigation.push({label:'Music',href:'index.html#music'});changed();render();});button(target,'Restore template menu',()=>{checkpoint();delete pages.navigation;changed();render();});}
  pages.pages.forEach((page,i)=>{const card=document.createElement('div');card.className='block';const row=document.createElement('div');row.className='block-head';const title=document.createElement('strong');title.textContent=page.title;row.append(title);button(row,'↑',()=>movePage(i,-1)).disabled=i===0;button(row,'↓',()=>movePage(i,1)).disabled=i===pages.pages.length-1;button(row,'Edit',()=>{tab='page';selected=i;render();preview();});card.append(row);target.append(card);});
 }else{
  const page=pages.pages[selected];if(!page){tab='pages';return render();}
  renderCanvasSettings(target);
  button(target,'Delete page',()=>{if(!confirm('Remove this page on the next publish?'))return;checkpoint();pages.pages.splice(selected,1);tab='pages';changed();render();},'danger');
 }
}
const previewToggle=document.createElement('button');previewToggle.id='canvas-view-mode';previewToggle.textContent='Preview';previewToggle.setAttribute('aria-pressed','false');previewToggle.onclick=()=>{closeInlineSettings();const doc=$('preview').contentDocument;if(!doc)return;const active=doc.body.classList.toggle('studio-preview-only');previewToggle.setAttribute('aria-pressed',String(active));previewToggle.textContent=active?'Resume editing':'Preview';for(const el of doc.querySelectorAll('[contenteditable]')){if(active&&el.contentEditable==='true'){el.dataset.studioResume='';el.contentEditable='false';}else if(!active&&el.hasAttribute('data-studio-resume')){el.contentEditable='true';delete el.dataset.studioResume;}}};document.querySelector('.preview-toolbar>div').prepend(previewToggle);
const pageSettings=button(document.querySelector('.preview-toolbar>div'),'Page settings',()=>selectCanvasSection({type:'page',page:pages.pages[selected]},selected,$('preview').contentDocument?.querySelector('h1')));pageSettings.hidden=true;
document.querySelector('body>header .actions').prepend($('dirty'));

function measureContentShell(){
 if(!$('workspace').hidden)$('workspace').style.setProperty('--content-shell-top',Math.max(44,$('workspace').getBoundingClientRect().top)+'px');
}
const contentShellObserver=new ResizeObserver(measureContentShell);contentShellObserver.observe(document.querySelector('body>header'));contentShellObserver.observe($('notice'));window.addEventListener('resize',measureContentShell);
function renderCanvasSettings(target){target.replaceChildren();}
function renderMediaShortcuts(){}
function closeInlineSettings(){inlineSettings?._cleanup?.();inlineSettings?.remove();inlineSettings=null;}
function selectCanvasSection(block,index,anchor){
 const doc=$('preview').contentDocument;if(!doc||doc.body.classList.contains('studio-preview-only'))return;
 // Keep the current popover stable while typing in it.
 closeInlineSettings();anchor=anchor||block.element||doc.querySelector(`[data-block="${index}"]`)||doc.querySelector('main');
 const target=doc.createElement('section');target.className='studio-inline-settings';target.setAttribute('role','dialog');target.setAttribute('aria-label','Inline '+block.type+' settings');
 const head=doc.createElement('div');head.className='studio-inline-head';const heading=doc.createElement('strong');heading.textContent=block.type==='page'?'Page settings':block.type==='template'?'Media / link settings':block.type==='collection'?'Collection image':`Section ${index+1} settings`;head.append(heading);const close=doc.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','Close inline settings');close.onclick=closeInlineSettings;head.append(close);target.append(head);doc.body.append(target);inlineSettings=target;
 const setAttribute=(el,name,value)=>{if(name==='src'||name==='poster'){if(name==='src')el.dataset.studioAssetPath=value;else el.dataset.studioPosterPath=value;el.setAttribute(name,imageSource(value,uploadedImages));if(el.tagName==='VIDEO')el.load();}else el.setAttribute(name,value);};
 function imageField(label,value,update){
  const wrap=doc.createElement('div');wrap.className='studio-image-field';const caption=doc.createElement('label');caption.textContent=label;wrap.append(caption);
  const current=doc.createElement('img');current.alt='Current image';current.src=imageSource(value,uploadedImages);current.hidden=!value;wrap.append(current);
  const path=doc.createElement('input');path.type='text';path.value=value;path.setAttribute('aria-label',label);path.onfocus=checkpoint;path.onchange=()=>{update(path.value);current.src=imageSource(path.value,uploadedImages);current.hidden=!path.value;changed(false);};wrap.append(path);
  const upload=doc.createElement('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';upload.setAttribute('aria-label','Upload replacement image');wrap.append(upload);
  const status=doc.createElement('p');status.className='studio-image-status';status.setAttribute('role','status');wrap.append(status);
  const gallery=doc.createElement('div');gallery.className='studio-image-gallery';
  for(const source of [...new Set([...assetPaths,...Object.keys(uploadedImages)])]){const b=doc.createElement('button');b.type='button';b.title=source;b.setAttribute('aria-label','Use image '+source);const thumb=doc.createElement('img');thumb.loading='lazy';thumb.src=imageSource(source,uploadedImages);thumb.alt='';b.append(thumb);b.onclick=()=>{checkpoint();path.value=source;current.src=imageSource(source,uploadedImages);current.hidden=false;update(source);changed(false);status.textContent='Image selected. Save draft / Publish to keep it.';};gallery.append(b);}wrap.append(gallery);
  upload.onchange=async()=>{const file=upload.files[0];if(!file)return;status.textContent='Preparing image…';upload.disabled=true;try{const asset=await prepareImage(file);if(!target.isConnected)return;checkpoint();uploadedImages[asset.path]=asset.file;path.value=asset.path;current.src=imageSource(asset.path,uploadedImages);current.hidden=false;update(asset.path);changed(false);status.textContent='Ready in this draft. Save draft / Publish uploads the image with your changes.';}catch(e){status.textContent=e.message;}finally{upload.disabled=false;upload.value='';}};
  target.append(wrap);
 }
 if(block.type==='page'){
  field(target,'Page address (.html is added)',block.page.slug,v=>block.page.slug=v);field(target,'Search description',block.page.description,v=>block.page.description=v,'textarea');field(target,'Show in navigation',block.page.nav===false?'Hidden':'Visible',v=>block.page.nav=v==='Visible','select',['Visible','Hidden']);button(target,'Delete page',()=>{if(!confirm('Remove this page on the next publish?'))return;checkpoint();pages.pages.splice(selected,1);tab='pages';changed();render();},'danger');
 }else if(block.type==='collection'){
  imageField('Collection image',block.collections[block.id]?.artwork??block.artwork,v=>{(block.collections[block.id]??={}).artwork=v;if(anchor?.tagName==='IMG')setAttribute(anchor,'src',v);});
 }else if(block.type==='social'){field(target,'Display label',block.link.label,v=>{block.link.label=v;const span=anchor?.querySelector('span');if(span)span.textContent=v;});field(target,'Profile URL',block.link.url,v=>block.link.url=v);
 }else if(block.type==='event'){field(target,'Venue',block.event.venue,v=>block.event.venue=v);field(target,'City / online location',block.event.city,v=>block.event.city=v);
 }else if(block.type==='template'){
  const el=block.element,attrs=el.tagName==='A'?['href']:el.tagName==='VIDEO'?['src','poster']:['src','alt'];
  for(const name of attrs){const update=v=>{const entry=block.edits[block.key]??={original:block.original,attrs:{}};entry.attrs[name]=v;setAttribute(el,name,v);};const value=(name==='src'?el.dataset.studioAssetPath:name==='poster'?el.dataset.studioPosterPath:null)||el.getAttribute(name)||'';
   if(name==='poster'||name==='src'&&el.tagName==='IMG')imageField(name==='poster'?'Video poster image':'Image',value,update);
   else field(target,name==='href'?'Destination':name==='src'?'Video asset path or HTTPS URL':'Alternative text',value,update);
  }
 }else if(block.type==='image'){imageField('Image',block.src,v=>{block.src=v;const img=anchor?.tagName==='IMG'?anchor:anchor?.querySelector('img');if(img)setAttribute(img,'src',v);});field(target,'Alternative text',block.alt,v=>{block.alt=v;const img=anchor?.tagName==='IMG'?anchor:anchor?.querySelector('img');if(img)img.alt=v;});}
 else if(block.type==='link')field(target,'Destination',block.href,v=>{block.href=v;anchor?.querySelector('a')?.setAttribute('href',v);});
 else field(target,'Section heading',block.heading,v=>{block.heading=v;const h=anchor?.querySelector('h2');if(h)h.textContent=v;});
 const place=()=>{if(!target.isConnected)return;const r=anchor?.getBoundingClientRect()||{left:10,bottom:10,top:10},w=doc.defaultView.innerWidth,h=doc.defaultView.innerHeight;target.style.left=Math.max(8,Math.min(w-target.offsetWidth-8,r.left))+'px';target.style.top=Math.max(8,Math.min(h-target.offsetHeight-8,r.bottom+8))+'px';};place();
 target.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeInlineSettings();anchor?.focus?.({preventScroll:true});}});
 const outside=e=>{if(!target.isConnected){doc.removeEventListener('pointerdown',outside,true);return;}if(!target.contains(e.target)&&!anchor?.contains(e.target)){closeInlineSettings();doc.removeEventListener('pointerdown',outside,true);}};doc.addEventListener('pointerdown',outside,true);doc.defaultView.addEventListener('scroll',place,{passive:true});doc.defaultView.addEventListener('resize',place);target._cleanup=()=>{doc.removeEventListener('pointerdown',outside,true);doc.defaultView.removeEventListener('scroll',place);doc.defaultView.removeEventListener('resize',place);};
}
function movePage(i,d){checkpoint();[pages.pages[i],pages.pages[i+d]]=[pages.pages[i+d],pages.pages[i]];changed();render();}
function moveBlock(i,d){checkpoint();const b=pages.pages[selected].blocks;[b[i],b[i+d]]=[b[i+d],b[i]];changed();render();}
async function preview(){
 if(!source||tab==='lyrics')return;
 closeInlineSettings();const generation=++previewGeneration;
 const scroll=['home','page'].includes(tab)?($('preview').contentDocument?.documentElement.scrollTop||0):0;
 let template=source;
 const marked=new DOMParser().parseFromString(source,'text/html');if(marked.body)markTemplate(marked,artist,pages.home?.overrides||{});template=marked.documentElement.outerHTML;
 let text=template;
 const doc=new DOMParser().parseFromString(text,'text/html');doc.querySelectorAll('script:not([type="application/json"]),iframe,object,embed,base,meta[http-equiv]').forEach(el=>el.remove());doc.querySelectorAll('*').forEach(el=>{for(const a of [...el.attributes])if(a.name.toLowerCase().startsWith('on')||(/^(?:href|src|action|formaction)$/i.test(a.name)&&/^\s*(?:javascript|data|vbscript):/i.test(a.value)))el.removeAttribute(a.name);});
 const baseEl=doc.createElement('base');baseEl.href=new URL('../',location.href).href;doc.head.prepend(baseEl);
 if(tab!=='page')mergePublished(doc,publishedHTML);
 if(tab==='page'&&pages.pages[selected])doc.querySelector('main').innerHTML=blocksHTML(pages.pages[selected]);
 const nav=doc.querySelector('header nav');if(nav&&pages.navigation){nav.replaceChildren();for(const [i,item] of pages.navigation.entries()){const a=doc.createElement('a');a.textContent=item.label;a.href=item.href;a.dataset.studioNavigation=i;nav.append(a);}}if(nav)for(const p of pages.pages.filter(p=>p.nav!==false)){const a=doc.createElement('a');a.textContent=p.label||p.title;a.href=p.slug+'.html';nav.append(a);}
 const palette={bg:'#100d1b',surface:'#1c1429',ink:'#f3ebdd',muted:'#b8abc6',gold:'#eac584',pink:'#f163bd'};
 // The base stylesheet is generated from this artist's colours. Replace those for the preview only.
 let css=baseCSS;
 for(const [k,old]of Object.entries(initialTheme||palette))if(artist.theme?.[k])css=css.replace(new RegExp(old.replace('#','\\#')+'([a-f0-9]{2})?\\b','gi'),(_,alpha)=>artist.theme[k]+(alpha||''));
 const style=doc.createElement('style');style.textContent=css+presenceCSS+'\nbody{overflow:visible!important} .entrance{display:none!important}';doc.head.append(style);
 try{mountPresence(artist,doc,Date.now(),tab!=='page');}catch{}
 doc.querySelectorAll('link[rel=stylesheet]').forEach(el=>{if(/(?:^|\/)style\.css(?:[?#]|$)/.test(el.getAttribute('href')||''))el.remove();});if(generation===previewGeneration){
  for(const el of doc.querySelectorAll('img[src],video[poster]')){const attr=el.tagName==='VIDEO'?'poster':'src',path=el.getAttribute(attr);if(uploadedImages[path]){if(attr==='src')el.dataset.studioAssetPath=path;else el.dataset.studioPosterPath=path;el.setAttribute(attr,imageSource(path,uploadedImages));}}
  const frame=$('preview');previewToggle.textContent='Preview';previewToggle.setAttribute('aria-pressed','false');frame.onload=()=>{
   if(generation!==previewGeneration||!['home','page'].includes(tab))return;
   const home=tab==='home';pages.home??={blocks:[]};pages.home.overrides??={};pages.home.collections??={};const page=home?pages.home:pages.pages[selected];
   mountPageCanvas(frame.contentDocument,{page,artist,home,templateEdits:pages.home.overrides,collections:pages.home.collections,navigation:pages.navigation,checkpoint,onChange:()=>{changed(false);if(!home){$('panel-title').textContent=page.title;const entry=$('page-list').children[selected];if(entry)entry.textContent=`${page.nav===false?'○':'▤'} ${page.label||page.title}`;}},onStructure:()=>{clearTimeout(previewTimer);const settings=$('section-settings');if(settings)settings.textContent='Select a section’s Settings to edit its image or destination.';changed(false);preview();},onSelect:selectCanvasSection});mountCanvasMedia(frame.contentDocument,videoPaths);renderMediaShortcuts(frame.contentDocument);frame.contentWindow.scrollTo(0,scroll);
  };frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
 }
}
let initialTheme;
$('connect-form').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;try{
 const nextRepo=new GitHubRepository($('repository').value.trim(),$('token').value.trim());const nextBranch=$('branch').value.trim();notice('Loading your site…');
 const nextBase=await nextRepo.head(nextBranch);const [a,p,s,b,t]=await Promise.all(['artist.json','pages.json','index.html','builder.json','tracks.json'].map(path=>nextRepo.read(path,nextBase)));
 if(!a||!s)throw Error('This repository needs artist.json and index.html.');if(!b||JSON.parse(b).enabled!==true)throw Error('Enable the editor with builder.json before connecting.');
 repo=nextRepo;repository=$('repository').value.trim();branch=nextBranch;base=nextBase;artist=JSON.parse(a);pages=p?JSON.parse(p):{schemaVersion:1,pages:[]};validate(artist,pages);validatePresence(artist);const tree=await nextRepo.api('/git/trees/'+nextBase+'?recursive=1');existingPages=tree.tree.filter(x=>/^[^/]+\.html$/.test(x.path)).map(x=>x.path.slice(0,-5));lyricIDs=tree.tree.filter(x=>/^lyrics\/[a-zA-Z0-9_-]+\.json$/.test(x.path)&&!['lyrics/report.json','lyrics/review.json'].includes(x.path)).map(x=>x.path.slice(7,-5));creative={edits:{},projects:{}};uploadedImages={};assetPaths=tree.tree.filter(x=>x.type==='blob'&&/^assets\/.*\.(png|jpe?g|webp|gif|svg|avif)$/i.test(x.path)).map(x=>x.path);baseCSS=await fetch('../style.css',{cache:'no-store'}).then(r=>r.text());presenceCSS=await fetch('./presence.css',{cache:'no-store'}).then(r=>r.text());previewTracks=t?JSON.parse(t).filter(track=>safePresenceURL(track.audio)):[];setupPreviewMusic();source=s;publishedHTML=await fetch('../index.html',{cache:'no-store'}).then(r=>r.ok?r.text():'').catch(()=>'');videoPaths=tree.tree.filter(x=>x.type==='blob'&&/^assets\/.*\.(mp4|webm|m4v|mov)$/i.test(x.path)).map(x=>x.path);initialTheme=clone(artist.theme);history=[];draftBranch=null;draftHead=null;dirty=false;try{if($('remember').checked)rememberConnection(localStorage,{repository,branch,token:nextRepo.token});else forgottenConnection(localStorage);}catch{notice('Connected, but this browser could not remember the connection.',true);}$('token').value='';$('connection').hidden=true;$('workspace').hidden=false;$('save').disabled=false;$('publish').disabled=false;render();await preview();notice('Connected. Edits preview immediately. Recover a local draft if you have unfinished changes.');
 }catch(error){notice(error.message,true);}finally{busy=false;}};
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{tab=b.dataset.tab;render();preview();};
$('add-page').onclick=()=>{checkpoint();let n=1;while(pages.pages.some(p=>p.slug==='new-page-'+n))n++;pages.pages.push({slug:'new-page-'+n,title:'New page '+n,label:'New page '+n,description:'',nav:true,blocks:[{type:'text',heading:'Your next chapter',text:'Tell your story.'}]});selected=pages.pages.length-1;tab='page';changed();render();};
$('undo').onclick=()=>{const state=history.pop();if(!state)return;({artist,pages}=state);creative=state.creative||{edits:{},projects:{}};uploadedImages=state.uploadedImages||{};$('undo').disabled=!history.length;changed();render();};
$('restore').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem(key()));if(!saved)throw Error('No local draft found for this repository and branch.');validate(saved.artist,saved.pages);if(saved.base!==base)throw Error('The repository changed since this draft. Export your draft before reconnecting and reconcile it with the newer content.');checkpoint();artist=saved.artist;pages=saved.pages;creative=saved.creative||{edits:{},projects:{}};uploadedImages=saved.uploadedImages||{};changed();render();notice(saved.base!==base?'Draft recovered onto a newer repository version. Review all fields before publishing.':'Local draft recovered.');}catch(e){notice(e.message,true);}};
$('export').onclick=()=>{if(!artist)return notice('Connect a repository first.');const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='artist-studio-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('disconnect').onclick=()=>{polling++;lyricDispose?.();lyricDispose=null;lyricMount++;$('preview-audio').pause();$('preview-audio').removeAttribute('src');try{forgottenConnection(localStorage);}catch{}repo.token='';repo=null;artist=null;pages=null;source=null;history=[];$('workspace').hidden=true;$('connection').hidden=false;$('save').disabled=$('publish').disabled=$('undo').disabled=true;$('preview').srcdoc='';notice('Disconnected. The access token has been discarded.');};
for(const mode of ['desktop','mobile'])$(mode).onclick=()=>{$('preview').style.maxWidth=mode==='mobile'?'390px':'100%';$('desktop').setAttribute('aria-pressed',mode==='desktop');$('mobile').setAttribute('aria-pressed',mode==='mobile');};
function files(){validate(artist,pages);validatePresence(artist);for(const page of pages.pages)if(existingPages.includes(page.slug))throw Error('Page address conflicts with existing HTML: '+page.slug);return {'artist.json':JSON.stringify(artist,null,2)+'\n','pages.json':JSON.stringify(pages,null,2)+'\n',...creativeFiles(creative),...imageFiles(uploadedImages)};}
async function save(publish){if(busy)return;busy=true;$('workspace').inert=true;$('undo').disabled=true;$('save').disabled=$('publish').disabled=true;try{
 const content=files();if(publish){notice('Publishing content…');base=await repo.commit(branch,base,content,'Publish website content');dirty=false;$('dirty').textContent='Publishing';try{localStorage.removeItem(key());}catch{}notice('Committed. GitHub Pages is publishing; you can continue editing.');monitor(base);
 }else{if(!draftBranch){draftBranch='studio/draft-'+Date.now();await repo.branch(draftBranch,base);draftHead=base;}draftHead=await repo.commit(draftBranch,draftHead,content,'Save website draft');notice('Draft saved to a separate GitHub branch. The live website has not changed.');}
 }catch(e){notice(e.message,true);}finally{busy=false;$('workspace').inert=false;$('undo').disabled=!history.length;$('save').disabled=$('publish').disabled=false;}}
$('save').onclick=()=>save(false);$('publish').onclick=()=>save(true);
let polling=0;
async function monitor(sha){const generation=++polling;for(let i=0;i<80&&generation===polling;i++){await new Promise(resolve=>setTimeout(resolve,15000));try{const response=await fetch('../build-info.json?studio='+Date.now(),{cache:'no-store'});const info=await response.json();if(info.siteCommit===sha){if(!dirty)$('dirty').textContent='Live';notice(dirty?'Previous publication is live. You have new unpublished changes.':'Your changes are live.');return;}}catch{}}if(generation===polling)notice('Publication is taking longer than expected. Check the Pages workflow in GitHub.');}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});

function setupPreviewMusic(){
 const select=$('preview-track'),audio=$('preview-audio');audio.pause();audio.removeAttribute('src');select.replaceChildren();
 for(const [i,track]of previewTracks.entries()){const option=document.createElement('option');option.value=String(i);option.textContent=track.title||'Untitled track';select.append(option);}
 if(!previewTracks.length){const option=document.createElement('option');option.textContent='No playable tracks in this catalog';select.append(option);audio.hidden=true;select.disabled=true;$('preview-audio-status').textContent='Add a playlist and refresh the site catalog to preview music.';return;}
 select.disabled=false;audio.hidden=false;audio.src=previewTracks[0].audio;
 select.onchange=()=>{const wasPlaying=!audio.paused;audio.src=previewTracks[Number(select.value)].audio;if(wasPlaying)audio.play().catch(()=>{$('preview-audio-status').textContent='Press Play to start this track.';});};
 audio.onerror=()=>{$('preview-audio-status').textContent='This audio could not load. Try another track or check the source link.';};audio.onplaying=()=>{$('preview-audio-status').textContent='Playing · your music continues while editing.';};audio.onpause=()=>{$('preview-audio-status').textContent='Paused · press Play to listen.';};
}
function renderEvents(target){
 const calendar=artist.calendar||{enabled:false,heading:'Next appearances.',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',limit:6,events:[]};
 const apply=()=>{artist.calendar=calendar;};
 field(target,'Homepage events',calendar.enabled?'Enabled':'Disabled',v=>{apply();calendar.enabled=v==='Enabled';},'select',['Disabled','Enabled']);
 field(target,'Section heading',calendar.heading,v=>{apply();calendar.heading=v;});
 const zones=['UTC',...(Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):['Europe/Amsterdam','Europe/London','America/New_York'])];if(!zones.includes(calendar.timezone))zones.push(calendar.timezone);
 field(target,'Public display timezone',calendar.timezone,v=>{apply();calendar.timezone=v;},'select',zones);
 field(target,'Maximum events shown',String(calendar.limit||6),v=>{apply();calendar.limit=Number(v);},'select',['3','6','9','12']);
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Only upcoming or ongoing, non-cancelled events appear. If disabled or empty, the homepage has no events section. Enter dates in your device timezone: '+Intl.DateTimeFormat().resolvedOptions().timeZone+'.';target.append(hint);
 calendar.events.forEach((event,i)=>{const card=document.createElement('section');card.className='block';const head=document.createElement('div');head.className='block-head';const title=document.createElement('strong');title.textContent=event.title||'New event';head.append(title);button(head,'Remove',()=>{checkpoint();apply();calendar.events.splice(i,1);changed();render();});card.append(head);
  for(const [label,prop,type]of [['Event title','title'],['Start (device timezone)','start','datetime-local'],['End (optional, device timezone)','end','datetime-local'],['Venue','venue'],['City / online location','city'],['Description','description','textarea'],['Event / ticket URL','url'],['Link label','linkLabel']]){
   const value=type==='datetime-local'?localDateTime(event[prop]):event[prop];field(card,label,value,v=>{apply();event[prop]=type==='datetime-local'?(v?new Date(v).toISOString():''):v;},type);
  }
  field(card,'Status',event.cancelled?'Cancelled':'Scheduled',v=>{apply();event.cancelled=v==='Cancelled';},'select',['Scheduled','Cancelled']);target.append(card);
 });
 button(target,'+ Add event',()=>{checkpoint();apply();const start=new Date(Date.now()+86400000);start.setHours(20,0,0,0);calendar.events.push({id:'event-'+(globalThis.crypto?.randomUUID?.()||Date.now()),title:'New appearance',start:start.toISOString(),end:'',venue:'',city:'',description:'',url:'',linkLabel:'Event details',cancelled:false});changed();render();});
}
function localDateTime(value){if(!value)return '';const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function renderSocials(target){
 const socials=artist.socials||{heading:'Available on',links:[]};const apply=()=>{artist.socials=socials;};
 field(target,'Footer heading',socials.heading,v=>{apply();socials.heading=v;});
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Choose a service or Custom link. Only added links appear in the footer, with monochrome icons. Empty lists stay hidden. Use a full HTTPS profile URL; Email uses mailto:you@example.com.';target.append(hint);
 socials.links.forEach((link,i)=>{const card=document.createElement('section');card.className='block';const row=document.createElement('div');row.className='block-head';const title=document.createElement('strong');title.textContent=link.label||platforms[link.platform]||'Link';row.append(title);
  for(const delta of [-1,1])button(row,delta<0?'↑':'↓',()=>{checkpoint();apply();[socials.links[i],socials.links[i+delta]]=[socials.links[i+delta],link];changed();render();}).disabled=i+delta<0||i+delta>=socials.links.length;
  button(row,'Remove',()=>{checkpoint();apply();socials.links.splice(i,1);changed();render();});card.append(row);
  const platformLabel=platforms[link.platform]||'Custom link';field(card,'Platform',platformLabel,v=>{apply();link.platform=Object.keys(platforms).find(key=>platforms[key]===v)||'custom';},'select',[...new Set(Object.values(platforms))].sort((a,b)=>a.localeCompare(b)));
  field(card,'Profile URL',link.url,v=>{apply();link.url=v;});field(card,'Display label (optional except custom)',link.label,v=>{apply();link.label=v;});target.append(card);
 });
 button(target,'+ Add social or music link',()=>{checkpoint();apply();socials.links.push({platform:'website',url:'https://',label:''});changed();render();});
}
$('forget-connection').onclick=()=>{try{forgottenConnection(localStorage);$('token').value='';$('remember').checked=false;notice('Saved connection removed from this device.');}catch{notice('Browser storage is unavailable.',true);}};
try{const saved=document.body.dataset.contentDemo==='true'?null:rememberedConnection(localStorage);if(saved){$('repository').value=saved.repository;$('branch').value=saved.branch;$('token').value=saved.token;$('remember').checked=true;queueMicrotask(()=>$('connect-form').requestSubmit());}}catch{}

async function startContentDemo(){
 repository='demo/content';branch='session';base='demo';
 artist={name:'Your Artist',slug:'your-artist',theme:{bg:'#100d1b',surface:'#1c1429',ink:'#f3ebdd',muted:'#b8abc6',gold:'#eac584',pink:'#f163bd'},hero:{eyebrow:'INDEPENDENT ARTIST',title:'Your music.',accent:'Your world.',description:'Click this introduction to make it your own.',caption:'New sounds, new stories.'},about:{title:'Behind the music',text:'Tell your story directly on the page.'}};
 pages={schemaVersion:1,pages:[{slug:'story',title:'The story so far',label:'My story',description:'',blocks:[{type:'text',heading:'Made to be heard',text:'Select these words and try Bold or Italic. Add another section below.'},{type:'image',src:'https://maxwellpierce.mixunity.com/admin/demo/heavns-moving-out-of-frame/artwork-original.png',alt:'HEAVNS artwork',caption:'Click this caption to edit it.'},{type:'link',text:'Explore the music',href:'index.html#music'}]}]};
 source='<!doctype html><html><head><title>Content demo</title></head><body><header><nav><a href="index.html">Home</a></nav></header><main><section class="section"><p class="eyebrow">{{hero.eyebrow}}</p><h1>{{hero.title}} <em>{{hero.accent}}</em></h1><p>{{hero.description}}</p><p>{{hero.caption}}</p></section><section class="section"><h2>{{about.title}}</h2><p>{{about.text}}</p></section></main></body></html>';
 const real=await fetch('./content-template.txt').then(r=>r.ok?r.text():'').catch(()=>'');if(real){source=real;artist=await fetch('../artist.json').then(r=>r.json());publishedHTML=await fetch('../index.html').then(r=>r.text());tab='home';}baseCSS=await fetch('../style.css').then(r=>r.text());initialTheme=clone(artist.theme);presenceCSS=await fetch('./presence.css').then(r=>r.text());creative={edits:{},projects:{}};
 assetPaths=['https://maxwellpierce.mixunity.com/admin/demo/heavns-moving-out-of-frame/artwork-original.png'];
 $('connection').hidden=true;$('workspace').hidden=false;document.querySelector('.preview-music').hidden=true;for(const id of ['save','publish','disconnect','restore'])$(id).hidden=true;
 document.querySelector('[data-tab="lyrics"]').hidden=true;$('notice').hidden=false;$('notice').textContent='Content editing demo · changes stay in this browser session. No GitHub connection or publishing.';
 tab=publishedHTML?'home':'page';selected=0;render();await preview();
}
if(document.body.dataset.contentDemo==='true')startContentDemo().catch(error=>notice(error.message,true));
