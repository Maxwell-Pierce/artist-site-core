import {GitHubRepository} from './github.mjs';
import {clone,escapeHTML as esc,validate,blocksHTML} from './model.mjs';
const $=id=>document.getElementById(id);
let repo,artist,pages,source,base,branch,repository,tab='home',selected=0,dirty=false,busy=false,history=[],previewTimer,draftBranch,draftHead,existingPages=[],assetPaths=[],previewGeneration=0,baseCSS='';
const notice=(message,error=false)=>{$('notice').textContent=message;$('notice').classList.toggle('error',error);};
const key=()=>`artist-studio:${repository}:${branch}`;
function snapshot(){return {artist:clone(artist),pages:clone(pages)};}
function checkpoint(){history.push(snapshot());if(history.length>50)history.shift();$('undo').disabled=false;}
function changed(){dirty=true;$('dirty').textContent='Unpublished changes';try{localStorage.setItem(key(),JSON.stringify({...snapshot(),base,savedAt:new Date().toISOString()}));}catch{notice('Changes are in memory; browser storage is unavailable. Export a backup before closing.');}clearTimeout(previewTimer);previewTimer=setTimeout(preview,150);}
function field(parent,label,value,update,type='text',options){
 const wrap=document.createElement('label');wrap.textContent=label;
 const input=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');
 if(type==='select')for(const option of options){const el=document.createElement('option');el.value=option;el.textContent=option;input.append(el);}else if(type!=='textarea')input.type=type;
 input.value=value??'';input.addEventListener('focus',()=>checkpoint(),{once:true});
 input.addEventListener(type==='select'?'change':'input',()=>{update(input.value);changed();});wrap.append(input);parent.append(wrap);if(label==='Portrait asset path'||label==='Image asset path or HTTPS URL'){const select=document.createElement('select');select.setAttribute('aria-label','Choose an existing image');const empty=document.createElement('option');empty.value='';empty.textContent='Choose an existing image…';select.append(empty);for(const path of assetPaths){const option=document.createElement('option');option.value=path;option.textContent=path;select.append(option);}select.onchange=()=>{if(!select.value)return;checkpoint();input.value=select.value;update(select.value);changed();};wrap.append(select);}return input;
}
function configField(parent,label,path,type,options){const keys=path.split('.');let obj=artist;for(const k of keys.slice(0,-1))obj=obj[k]??=( {} );const prop=keys.at(-1);field(parent,label,obj[prop],v=>obj[prop]=v,type,options);}
function button(parent,text,fn,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.onclick=fn;parent.append(b);return b;}
function render(){
 const target=$('fields');target.replaceChildren();
 const titles={home:'Home page',pages:'Pages & navigation',identity:'Identity & entrance',theme:'Colours & appearance'};
 $('panel-title').textContent=tab==='page'?(pages.pages[selected]?.title||'New page'):titles[tab];
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));
 const list=$('page-list');list.replaceChildren();pages.pages.forEach((p,i)=>button(list,`${p.nav===false?'○':'▤'} ${p.label||p.title}`,()=>{tab='page';selected=i;render();preview();}));
 if(tab==='home'){
  for(const [label,path,type] of [['Eyebrow','hero.eyebrow'],['Headline','hero.title'],['Accent line','hero.accent'],['Introduction','hero.description','textarea'],['Image caption','hero.caption'],['About heading','about.title'],['About text','about.text','textarea']])configField(target,label,path,type);
  const p=document.createElement('p');p.className='hint';p.textContent='Edits apply to configuration placeholders in your home template. Custom HTML remains owned by your site.';target.append(p);
 }else if(tab==='identity'){
  for(const [label,path,type] of [['Artist name','name'],['First part of name','nameFirst'],['Second part of name','nameLast'],['Tagline','tagline'],['Search description','description','textarea'],['Entrance eyebrow','entrance.eyebrow'],['Portrait asset path','entrance.portrait'],['Portrait description','entrance.portraitAlt'],['Entrance message','entrance.tagline'],['Enter button','entrance.button']])configField(target,label,path,type);
  configField(target,'Portrait effect','entrance.effect','select',['fade','eyes']);
 }else if(tab==='theme'){
  for(const [prop,label] of Object.entries({bg:'Background',surface:'Panels',ink:'Primary text',muted:'Secondary text',gold:'Primary accent',pink:'Secondary accent'}))configField(target,label,'theme.'+prop,'color');
 }else if(tab==='pages'){
  const p=document.createElement('p');p.className='hint';p.textContent='Pages are added alongside existing HTML pages. Existing handcrafted pages are preserved. Use the arrows to set menu order.';target.append(p);
  const menuHead=document.createElement('h3');menuHead.textContent='Main menu';target.append(menuHead);
  if(!pages.navigation){button(target,'Customise existing menu',()=>{checkpoint();const doc=new DOMParser().parseFromString(source,'text/html');pages.navigation=[...doc.querySelectorAll('header nav a')].map(a=>({label:a.textContent.trim(),href:a.getAttribute('href')}));changed();render();});}else{pages.navigation.forEach((item,i)=>{const card=document.createElement('div');card.className='block';field(card,'Menu label',item.label,v=>item.label=v);field(card,'Destination',item.href,v=>item.href=v);const row=document.createElement('div');row.className='row';for(const delta of [-1,1])button(row,delta<0?'↑':'↓',()=>{checkpoint();[pages.navigation[i],pages.navigation[i+delta]]=[pages.navigation[i+delta],item];changed();render();}).disabled=i+delta<0||i+delta>=pages.navigation.length;button(row,'Remove',()=>{checkpoint();pages.navigation.splice(i,1);changed();render();});card.append(row);target.append(card);});button(target,'+ Menu link',()=>{checkpoint();pages.navigation.push({label:'Music',href:'index.html#music'});changed();render();});button(target,'Restore template menu',()=>{checkpoint();delete pages.navigation;changed();render();});}
  pages.pages.forEach((page,i)=>{const card=document.createElement('div');card.className='block';const row=document.createElement('div');row.className='block-head';const title=document.createElement('strong');title.textContent=page.title;row.append(title);button(row,'↑',()=>movePage(i,-1)).disabled=i===0;button(row,'↓',()=>movePage(i,1)).disabled=i===pages.pages.length-1;button(row,'Edit',()=>{tab='page';selected=i;render();preview();});card.append(row);target.append(card);});
 }else{
  const page=pages.pages[selected];if(!page){tab='pages';return render();}
  field(target,'Page title',page.title,v=>{page.title=v;});field(target,'Menu label',page.label,v=>page.label=v);field(target,'Page address (.html is added)',page.slug,v=>page.slug=v);field(target,'Search description',page.description,v=>page.description=v,'textarea');
  field(target,'Show in navigation',page.nav===false?'Hidden':'Visible',v=>page.nav=v==='Visible','select',['Visible','Hidden']);
  page.blocks.forEach((block,i)=>{const card=document.createElement('section');card.className='block';const head=document.createElement('div');head.className='block-head';const strong=document.createElement('strong');strong.textContent=block.type+' section';head.append(strong);button(head,'↑',()=>moveBlock(i,-1)).disabled=i===0;button(head,'↓',()=>moveBlock(i,1)).disabled=i===page.blocks.length-1;button(head,'Remove',()=>{checkpoint();page.blocks.splice(i,1);changed();render();});card.append(head);
   const fields=block.type==='text'?[['Heading','heading'],['Text','text','textarea']]:block.type==='image'?[['Image asset path or HTTPS URL','src'],['Alternative text','alt'],['Caption','caption']]:[['Button label','text'],['Destination','href']];
   for(const [label,prop,type]of fields)field(card,label,block[prop],v=>block[prop]=v,type);target.append(card);
  });const row=document.createElement('div');row.className='row';for(const type of ['text','image','link'])button(row,'+ '+type,()=>{checkpoint();page.blocks.push(type==='text'?{type,heading:'New section',text:'Tell your story.'}:type==='image'?{type,src:'assets/mark.svg',alt:'',caption:''}:{type,text:'Explore',href:'index.html#music'});changed();render();});target.append(row);
  button(target,'Delete page',()=>{if(!confirm('Remove this page on the next publish?'))return;checkpoint();pages.pages.splice(selected,1);tab='pages';changed();render();},'danger');
 }
}
function movePage(i,d){checkpoint();[pages.pages[i],pages.pages[i+d]]=[pages.pages[i+d],pages.pages[i]];changed();render();}
function moveBlock(i,d){checkpoint();const b=pages.pages[selected].blocks;[b[i],b[i+d]]=[b[i+d],b[i]];changed();render();}
async function preview(){
 if(!source)return;
 const generation=++previewGeneration;
 let text=source.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g,(_,path)=>esc(path.split('.').reduce((o,k)=>o?.[k],artist)??''));
 const doc=new DOMParser().parseFromString(text,'text/html');doc.querySelectorAll('script,iframe,object,embed,base').forEach(el=>el.remove());doc.querySelectorAll('*').forEach(el=>{for(const a of [...el.attributes])if(a.name.startsWith('on'))el.removeAttribute(a.name);});
 const baseEl=doc.createElement('base');baseEl.href=new URL('../',location.href).href;doc.head.prepend(baseEl);
 if(tab==='page'&&pages.pages[selected])doc.querySelector('main').innerHTML=blocksHTML(pages.pages[selected]);
 const nav=doc.querySelector('header nav');if(nav&&pages.navigation){nav.replaceChildren();for(const item of pages.navigation){const a=doc.createElement('a');a.textContent=item.label;a.href=item.href;nav.append(a);}}if(nav)for(const p of pages.pages.filter(p=>p.nav!==false)){const a=doc.createElement('a');a.textContent=p.label||p.title;a.href=p.slug+'.html';nav.append(a);}
 const palette={bg:'#100d1b',surface:'#1c1429',ink:'#f3ebdd',muted:'#b8abc6',gold:'#eac584',pink:'#f163bd'};
 // The base stylesheet is generated from this artist's colours. Replace those for the preview only.
 let css=baseCSS;
 for(const [k,old]of Object.entries(initialTheme||palette))if(artist.theme?.[k])css=css.replace(new RegExp(old.replace('#','\\#')+'([a-f0-9]{2})?\\b','gi'),(_,alpha)=>artist.theme[k]+(alpha||''));
 const style=doc.createElement('style');style.textContent=css+'\nbody{overflow:auto!important} .entrance{display:none!important}';doc.head.append(style);
 doc.querySelectorAll('link[rel=stylesheet]').forEach(el=>el.remove());if(generation===previewGeneration)$('preview').srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
}
let initialTheme;
$('connect-form').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;try{
 const nextRepo=new GitHubRepository($('repository').value.trim(),$('token').value.trim());const nextBranch=$('branch').value.trim();notice('Loading your site…');
 const nextBase=await nextRepo.head(nextBranch);const [a,p,s,b]=await Promise.all(['artist.json','pages.json','index.html','builder.json'].map(path=>nextRepo.read(path,nextBase)));
 if(!a||!s)throw Error('This repository needs artist.json and index.html.');if(!b||JSON.parse(b).enabled!==true)throw Error('Enable the editor with builder.json before connecting.');
 repo=nextRepo;repository=$('repository').value.trim();branch=nextBranch;base=nextBase;artist=JSON.parse(a);pages=p?JSON.parse(p):{schemaVersion:1,pages:[]};validate(artist,pages);const tree=await nextRepo.api('/git/trees/'+nextBase+'?recursive=1');existingPages=tree.tree.filter(x=>/^[^/]+\.html$/.test(x.path)).map(x=>x.path.slice(0,-5));assetPaths=tree.tree.filter(x=>x.type==='blob'&&/^assets\/.*\.(png|jpe?g|webp|gif|svg|avif)$/i.test(x.path)).map(x=>x.path);baseCSS=await fetch('../style.css').then(r=>r.text());source=s;initialTheme=clone(artist.theme);history=[];draftBranch=null;draftHead=null;dirty=false;$('token').value='';$('connection').hidden=true;$('workspace').hidden=false;$('save').disabled=false;$('publish').disabled=false;render();await preview();notice('Connected. Edits preview immediately. Recover a local draft if you have unfinished changes.');
 }catch(error){notice(error.message,true);}finally{busy=false;}};
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{tab=b.dataset.tab;render();preview();};
$('add-page').onclick=()=>{checkpoint();let n=1;while(pages.pages.some(p=>p.slug==='new-page-'+n))n++;pages.pages.push({slug:'new-page-'+n,title:'New page '+n,label:'New page '+n,description:'',nav:true,blocks:[{type:'text',heading:'Your next chapter',text:'Tell your story.'}]});selected=pages.pages.length-1;tab='page';changed();render();};
$('undo').onclick=()=>{const state=history.pop();if(!state)return;({artist,pages}=state);$('undo').disabled=!history.length;changed();render();};
$('restore').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem(key()));if(!saved)throw Error('No local draft found for this repository and branch.');validate(saved.artist,saved.pages);if(saved.base!==base)throw Error('The repository changed since this draft. Export your draft before reconnecting and reconcile it with the newer content.');checkpoint();artist=saved.artist;pages=saved.pages;changed();render();notice(saved.base!==base?'Draft recovered onto a newer repository version. Review all fields before publishing.':'Local draft recovered.');}catch(e){notice(e.message,true);}};
$('export').onclick=()=>{if(!artist)return notice('Connect a repository first.');const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='artist-studio-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('disconnect').onclick=()=>{polling++;repo.token='';repo=null;artist=null;pages=null;source=null;history=[];$('workspace').hidden=true;$('connection').hidden=false;$('save').disabled=$('publish').disabled=$('undo').disabled=true;$('preview').srcdoc='';notice('Disconnected. The access token has been discarded.');};
for(const mode of ['desktop','mobile'])$(mode).onclick=()=>{$('preview').style.maxWidth=mode==='mobile'?'390px':'100%';$('desktop').setAttribute('aria-pressed',mode==='desktop');$('mobile').setAttribute('aria-pressed',mode==='mobile');};
function files(){validate(artist,pages);for(const page of pages.pages)if(existingPages.includes(page.slug))throw Error('Page address conflicts with existing HTML: '+page.slug);return {'artist.json':JSON.stringify(artist,null,2)+'\n','pages.json':JSON.stringify(pages,null,2)+'\n'};}
async function save(publish){if(busy)return;busy=true;$('workspace').inert=true;$('undo').disabled=true;$('save').disabled=$('publish').disabled=true;try{
 const content=files();if(publish){notice('Publishing content…');base=await repo.commit(branch,base,content,'Publish website content');dirty=false;$('dirty').textContent='Publishing';try{localStorage.removeItem(key());}catch{}notice('Committed. GitHub Pages is publishing; you can continue editing.');monitor(base);
 }else{if(!draftBranch){draftBranch='studio/draft-'+Date.now();await repo.branch(draftBranch,base);draftHead=base;}draftHead=await repo.commit(draftBranch,draftHead,content,'Save website draft');notice('Draft saved to a separate GitHub branch. The live website has not changed.');}
 }catch(e){notice(e.message,true);}finally{busy=false;$('workspace').inert=false;$('undo').disabled=!history.length;$('save').disabled=$('publish').disabled=false;}}
$('save').onclick=()=>save(false);$('publish').onclick=()=>save(true);
let polling=0;
async function monitor(sha){const generation=++polling;for(let i=0;i<80&&generation===polling;i++){await new Promise(resolve=>setTimeout(resolve,15000));try{const response=await fetch('../build-info.json?studio='+Date.now(),{cache:'no-store'});const info=await response.json();if(info.siteCommit===sha){if(!dirty)$('dirty').textContent='Live';notice(dirty?'Previous publication is live. You have new unpublished changes.':'Your changes are live.');return;}}catch{}}if(generation===polling)notice('Publication is taking longer than expected. Check the Pages workflow in GitHub.');}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
