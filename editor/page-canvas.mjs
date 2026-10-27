import {escapeHTML as esc,richHTML,sectionHTML} from './model.mjs';
import {inlineHTML} from './template-content.mjs';
export const sectionTypes=['text','image','link'];
export function newSection(type){
 if(type==='text')return {type,heading:'New section',text:'Tell your story.'};
 if(type==='image')return {type,src:'assets/mark.svg',alt:'',caption:'Image caption'};
 if(type==='link')return {type,text:'Explore',href:'index.html#music'};
 throw Error('Unsupported section type');
}
export function mountPageCanvas(doc,{page,artist,home,templateEdits={},collections={},navigation,checkpoint,onChange,onStructure,onSelect}){
 if(!doc?.querySelector('main'))return;
 const style=doc.createElement('style');style.textContent=`
 [data-studio-fragment]{display:inline!important;width:auto!important;height:auto!important;background:none!important;border:0!important;border-radius:0!important;font:inherit!important;letter-spacing:inherit!important;color:inherit!important}
 [contenteditable]{cursor:text;outline:1px dashed transparent;outline-offset:3px}
 [contenteditable]:hover{outline-color:#80caba88}[contenteditable]:focus{outline:2px solid #80caba}
 [contenteditable]:empty:before{content:attr(data-placeholder);opacity:.4;pointer-events:none}
 .studio-section{position:relative;display:flow-root}
 .studio-section:hover,.studio-section:focus-within{outline:1px dashed #80caba66;outline-offset:4px}
 .studio-tools{font:13px/1.35 system-ui!important;color:#edf6f3!important;letter-spacing:normal;text-transform:none;display:flex;align-items:center;gap:3px;flex-wrap:wrap}
 .studio-tools button,.studio-tools select{font:inherit!important;color:inherit!important;background:#15252c!important;border:1px solid #698b9480!important;border-radius:6px;padding:5px 8px!important;cursor:pointer;width:auto;min-height:30px;box-shadow:none!important}
 .studio-tools button:hover,.studio-tools [aria-pressed=true]{background:#305246!important}.studio-tools button:focus-visible{outline:2px solid #b4f2d4}
 .studio-tools button:disabled{opacity:.3;cursor:default}
 .studio-format{position:fixed;z-index:2147483647;padding:5px;background:#101c25;border:1px solid #729f9d;border-radius:9px;box-shadow:0 5px 20px #0008;max-width:calc(100vw - 16px)}
 .studio-format[hidden]{display:none!important}
 .studio-preview-only .studio-tools,.studio-preview-only .studio-insert{display:none!important}.studio-preview-only [contenteditable]{outline:0!important}.studio-preview-only .studio-section{outline:0!important}
 .studio-section-tools{position:absolute;right:0;top:0;transform:translateY(-100%);z-index:40;opacity:0;pointer-events:none;background:#101c25;border-radius:7px;padding:4px}
 .studio-section:hover>.studio-section-tools,.studio-section:focus-within>.studio-section-tools,.studio-section-tools:focus-within{opacity:1;pointer-events:auto}
 .studio-insert{position:relative;height:0;z-index:30}.studio-insert>.studio-tools{position:absolute;left:50%;top:0;transform:translate(-50%,-50%);background:#101c25;padding:3px;border-radius:8px;opacity:.2;white-space:nowrap;flex-wrap:nowrap}
 .studio-insert:hover>.studio-tools,.studio-insert:focus-within>.studio-tools{opacity:1}
 `;doc.head.append(style);
 doc.addEventListener('click',e=>{const a=e.target.closest('a');if(a){e.preventDefault();const href=a.getAttribute('href');if(href?.startsWith('#')&&!a.isContentEditable)doc.getElementById(href.slice(1))?.scrollIntoView({behavior:'smooth'});}});
 doc.addEventListener('submit',e=>e.preventDefault());
 function button(row,label,fn){const b=doc.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;row.append(b);return b;}
 let richTarget=null,richInline=false,savedRange=null;
 const format=doc.createElement('div');format.className='studio-tools studio-format';format.hidden=true;format.setAttribute('role','toolbar');format.setAttribute('aria-label','Inline text formatting');
 const commands=[['Bold','B','bold'],['Italic','I','italic'],['Underline','U','underline'],['Bullets','• List','insertUnorderedList'],['Numbered list','1. List','insertOrderedList'],['Clear formatting','Clear','removeFormat']];
 const commandButtons=[];
 function positionMenu(){
  if(!richTarget||!richTarget.isConnected||doc.activeElement!==richTarget){if(!format.contains(doc.activeElement))format.hidden=true;return;}
  const selection=doc.getSelection();let rect=richTarget.getBoundingClientRect();
  if(selection?.rangeCount&&richTarget.contains(selection.anchorNode)&&richTarget.contains(selection.focusNode)){savedRange=selection.getRangeAt(0).cloneRange();const selected=savedRange.getBoundingClientRect();if(selected.width||selected.height)rect=selected;}
  if(rect.bottom<0||rect.top>doc.defaultView.innerHeight){format.hidden=true;return;}
  format.hidden=false;const menu=format.getBoundingClientRect();const left=Math.max(8,Math.min(rect.left,doc.defaultView.innerWidth-menu.width-8));let top=rect.top-menu.height-8;if(top<8)top=rect.bottom+8;
  format.style.left=left+'px';format.style.top=Math.max(8,Math.min(top,doc.defaultView.innerHeight-menu.height-8))+'px';
  for(const {button,command}of commandButtons){button.hidden=richInline&&command.startsWith('insert');button.setAttribute('aria-pressed',String(doc.queryCommandState(command)));}
 }
 for(const [name,label,command]of commands){
  const b=button(format,label,()=>{if(!richTarget)return;checkpoint();richTarget.focus({preventScroll:true});if(savedRange){const selection=doc.getSelection();selection.removeAllRanges();selection.addRange(savedRange);}doc.execCommand(command,false,null);richTarget.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));positionMenu();});b.setAttribute('aria-label',name);b.title=name;b.onmousedown=e=>e.preventDefault();commandButtons.push({button:b,command});
 }
 doc.body.append(format);
 doc.addEventListener('selectionchange',positionMenu);doc.addEventListener('scroll',positionMenu,true);doc.defaultView.addEventListener('resize',positionMenu);
 doc.addEventListener('pointerdown',e=>{if(!format.contains(e.target)&&!e.target.closest('[contenteditable]')){format.hidden=true;richTarget=null;}});
 doc.addEventListener('keydown',e=>{if(e.key==='Escape'){format.hidden=true;richTarget=null;}});
 function editable(el,label,get,set,{rich=false,inline=false}={}){
  el.contentEditable='true';el.setAttribute('role','textbox');el.setAttribute('aria-label',label);el.dataset.placeholder=label;el.spellcheck=true;
  if(rich)el.innerHTML=(inline?inlineHTML:richHTML)(get());else el.textContent=get()??'';
  el.addEventListener('focus',()=>{checkpoint();richTarget=rich?el:null;richInline=inline;savedRange=null;positionMenu();});
  el.addEventListener('keyup',positionMenu);el.addEventListener('mouseup',positionMenu);
  el.addEventListener('input',()=>{set(rich?(inline?inlineHTML:richHTML)(el.innerHTML):el.innerText.replace(/\n$/,''),el.innerText);onChange();positionMenu();});
  el.addEventListener('paste',e=>{e.preventDefault();doc.execCommand('insertText',false,e.clipboardData.getData('text/plain'));});el.addEventListener('drop',e=>e.preventDefault());
  el.addEventListener('keydown',e=>{if(e.key==='Enter'&&inline){e.preventDefault();doc.execCommand('insertLineBreak');}});
 }
 for(const el of doc.querySelectorAll('[data-studio-text]')){
  const key=el.dataset.studioText,original=el.dataset.studioOriginal,path=el.dataset.config;
  editable(el,path||'Page text '+key,()=>el.innerHTML,(html,plain)=>{
   if(path){const parts=path.split('.');let obj=artist;for(const part of parts.slice(0,-1))obj=obj[part]??={};obj[parts.at(-1)]=plain;}
   templateEdits[key]={original,html};
  },{rich:true,inline:true});
 }
 for(const el of doc.querySelectorAll('[data-studio-navigation]')){const i=Number(el.dataset.studioNavigation);editable(el,'Menu link '+(i+1),()=>navigation[i].label,v=>navigation[i].label=v);}
 for(const el of doc.querySelectorAll('[data-studio-asset]')){
  el.addEventListener('click',e=>{if(el.tagName==='A'&&el.querySelector('[contenteditable]'))return;e.preventDefault();onSelect({type:'template',element:el,key:el.dataset.studioAsset,original:el.dataset.studioAssetOriginal,edits:templateEdits},0);});
  if(el.tagName==='IMG'||el.tagName==='VIDEO'){el.tabIndex=0;el.setAttribute('aria-label',el.tagName==='VIDEO'?'Edit video media':(el.alt||'Edit image'));el.addEventListener('keydown',e=>{if(e.key==='Enter')el.click();});}
 }
 // Generated components keep their rendered markup while binding to their owning data.
 const socialHeading=doc.querySelector('.social-heading');if(socialHeading&&artist.socials)editable(socialHeading,'Social links heading',()=>socialHeading.textContent,v=>artist.socials.heading=v);
 [...doc.querySelectorAll('.social-links>a')].forEach((a,i)=>{const link=artist.socials?.links[i],label=a.querySelector('span');if(link&&label){editable(label,'Social link '+(i+1),()=>label.textContent,v=>link.label=v);a.addEventListener('dblclick',()=>onSelect({type:'social',link},i));}});
 const calendarHeading=doc.querySelector('#upcoming-events h2');if(calendarHeading&&artist.calendar)editable(calendarHeading,'Calendar heading',()=>calendarHeading.textContent,v=>artist.calendar.heading=v);
 for(const card of doc.querySelectorAll('.event-card')){const id=card.querySelector('[data-calendar-event]')?.dataset.calendarEvent,event=artist.calendar?.events.find(e=>e.id===id);if(!event)continue;const title=card.querySelector('h3');if(title)editable(title,'Event title',()=>event.title,v=>event.title=v);const description=card.querySelector('p:not(.event-date):not(.event-place)');if(description)editable(description,'Event description',()=>event.description,v=>event.description=v);card.querySelector('.event-place')?.addEventListener('click',()=>onSelect({type:'event',event},0));}
 for(const card of doc.querySelectorAll('.playlist-feature[id^="collection-"]')){
  const id=card.id.slice('collection-'.length);const saved=collections[id]||{};const title=card.querySelector('h3>a'),description=card.querySelector('.playlist-feature-copy>p:not(.eyebrow)'),image=card.querySelector('.playlist-cover img');
  if(title)editable(title,'Collection title',()=>saved.title??title.textContent,v=>(collections[id]??={}).title=v);
  if(description)editable(description,'Collection description',()=>saved.description??description.textContent,v=>(collections[id]??={}).description=v);
  if(image){if(saved.artwork)image.src=saved.artwork;image.tabIndex=0;image.onclick=e=>{e.preventDefault();onSelect({type:'collection',id,collections,title:title?.textContent,description:description?.textContent,artwork:image.getAttribute('src')},0);};}
 }
 if(!home){const main=doc.querySelector('main');main.replaceChildren();const section=doc.createElement('section');section.className='section';main.append(section);const label=doc.createElement('p');label.className='eyebrow';section.append(label);editable(label,'Page menu label',()=>page.label||page.title,v=>page.label=v);const title=doc.createElement('h1');section.append(title);editable(title,'Page title',()=>page.title,v=>page.title=v);}
 const main=doc.querySelector('main'),container=home?doc.createElement('section'):main.querySelector('.section');if(home){container.className='section';container.dataset.studioExtra='';if(!page.blocks.length)container.style.cssText='padding:0;min-height:0;position:relative';main.append(container);}
 function insertRow(index){const wrap=doc.createElement('div');wrap.className='studio-insert';const row=doc.createElement('div');row.className='studio-tools';const select=doc.createElement('select');select.setAttribute('aria-label','Section type');for(const type of sectionTypes){const option=doc.createElement('option');option.value=type;option.textContent=type[0].toUpperCase()+type.slice(1)+' section';select.append(option);}row.append(select);button(row,'+ Add section here',()=>{checkpoint();page.blocks.splice(index,0,newSection(select.value));onStructure();});wrap.append(row);return wrap;}
 page.blocks.forEach((block,index)=>{
  container.append(insertRow(index));const section=doc.createElement('div');section.className='studio-section';section.dataset.block=index;section.innerHTML=sectionHTML(block);
  const tools=doc.createElement('div');tools.className='studio-tools studio-section-tools';tools.contentEditable='false';
  for(const [label,delta]of [['↑',-1],['↓',1]]){const b=button(tools,label,()=>{checkpoint();[page.blocks[index],page.blocks[index+delta]]=[page.blocks[index+delta],block];onStructure();});b.setAttribute('aria-label',`Move section ${index+1} ${delta<0?'up':'down'}`);b.disabled=index+delta<0||index+delta>=page.blocks.length;}
  button(tools,'Settings',()=>onSelect(block,index));button(tools,'Duplicate',()=>{checkpoint();page.blocks.splice(index+1,0,structuredClone(block));onStructure();});button(tools,'Remove',()=>{checkpoint();page.blocks.splice(index,1);onStructure();});section.append(tools);
  if(block.type==='text'){const heading=section.querySelector('h2');if(heading)editable(heading,`Section ${index+1} heading`,()=>block.heading,v=>block.heading=v);const text=section.querySelector('p,div:not(.studio-tools)');editable(text,`Section ${index+1} text`,()=>block.richText??esc(block.text),(v,plain)=>{block.richText=v;block.text=plain;},{rich:true});}
  if(block.type==='image'){section.querySelector('img').onclick=()=>onSelect(block,index);editable(section.querySelector('figcaption'),`Section ${index+1} caption`,()=>block.caption,v=>block.caption=v);}
  if(block.type==='link')editable(section.querySelector('a'),`Section ${index+1} link label`,()=>block.text,v=>block.text=v);
  section.addEventListener('focusin',()=>onSelect(block,index));container.append(section);
 });container.append(insertRow(page.blocks.length));
}
