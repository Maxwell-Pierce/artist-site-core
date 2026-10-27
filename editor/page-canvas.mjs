import {escapeHTML as esc, richHTML} from './model.mjs';
export const sectionTypes=['text','image','link'];
export function newSection(type){
 if(type==='text')return {type,heading:'New section',text:'Tell your story.'};
 if(type==='image')return {type,src:'assets/mark.svg',alt:'',caption:'Image caption'};
 if(type==='link')return {type,text:'Explore',href:'index.html#music'};
 throw Error('Unsupported section type');
}
// Mark only text-node placeholders. Attribute placeholders remain ordinary configuration.
export function markHome(doc){
 const walker=doc.createTreeWalker(doc.querySelector('main'),4);const nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  if(node.parentElement.closest('script,style'))continue;
  const pattern=/\{\{((?:hero|about)\.[a-zA-Z0-9_]+)\}\}/g;let match,last=0;const fragment=doc.createDocumentFragment();
  while((match=pattern.exec(node.textContent))){fragment.append(doc.createTextNode(node.textContent.slice(last,match.index)));const span=doc.createElement('span');span.dataset.config=match[1];span.textContent=match[0];fragment.append(span);last=pattern.lastIndex;}
  if(last){fragment.append(doc.createTextNode(node.textContent.slice(last)));node.replaceWith(fragment);}
 }
}
export function mountPageCanvas(doc,{page,artist,home,checkpoint,onChange,onStructure,onSelect}){
 if(!doc?.querySelector('main'))return;
 const style=doc.createElement('style');style.textContent=`
 .eyebrow [data-config]{display:inline!important;width:auto!important;height:auto!important;background:none!important;border:0!important;border-radius:0!important}
 [contenteditable]{cursor:text;outline:1px dashed transparent;outline-offset:5px;min-height:1.2em;white-space:pre-wrap}
 [contenteditable]:hover{outline-color:#80caba99}[contenteditable]:focus{outline:2px solid #80caba}
 [contenteditable]:empty:before{content:attr(data-placeholder);opacity:.4;pointer-events:none}
 .studio-section{position:relative;border:1px dashed #80caba55;padding:20px;margin:16px 0;min-height:90px}
 .studio-section:focus-within,.studio-section:hover{border-color:#80caba}
 .studio-tools{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:0 0 16px;font:13px/1.4 system-ui!important;color:#e9edf5!important;letter-spacing:normal;text-transform:none}
 .studio-tools button,.studio-tools select{font:inherit!important;background:#18232c!important;color:#e9edf5!important;border:1px solid #78949b88!important;border-radius:6px;padding:6px 9px!important;cursor:pointer;box-shadow:none!important;width:auto}
 .studio-tools button:focus-visible,.studio-tools select:focus-visible{outline:2px solid #b4f2d4}
 .studio-tools button:disabled{opacity:.3;cursor:default}.studio-tools strong{margin-right:auto}
 .studio-format{position:sticky;top:0;z-index:50;padding:8px;background:#101923;box-shadow:0 2px 8px #0008;margin:0}
 .studio-section figure{margin:0}.studio-section img{max-height:420px;object-fit:contain}.studio-add{justify-content:center;padding:4px;border:1px dashed #80caba66}
 `;doc.head.append(style);
 doc.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();});
 doc.addEventListener('submit',e=>e.preventDefault());
 function button(row,label,fn){const b=doc.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;row.append(b);return b;}
 let richTarget=null;
 const format=doc.createElement('div');format.className='studio-tools studio-format';format.setAttribute('role','toolbar');format.setAttribute('aria-label','Inline text formatting');
 const hint=doc.createElement('strong');hint.textContent='Click text to edit';format.append(hint);
 for(const [name,cmd]of [['Bold','bold'],['Italic','italic'],['Underline','underline'],['Bullets','insertUnorderedList'],['Numbered list','insertOrderedList'],['Clear formatting','removeFormat']]){
  const b=button(format,name,()=>{if(!richTarget)return;checkpoint();doc.execCommand(cmd,false,null);richTarget.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));});b.onmousedown=e=>e.preventDefault();b.disabled=true;
 }
 doc.body.prepend(format);
 function editable(el,label,get,set,rich=false){
  el.contentEditable='true';el.setAttribute('role','textbox');el.setAttribute('aria-label',label);el.dataset.placeholder=label;el.spellcheck=true;
  if(rich)el.innerHTML=richHTML(get());else el.textContent=get()??'';
  el.addEventListener('focus',()=>{checkpoint();richTarget=rich?el:null;hint.textContent=label;format.querySelectorAll('button').forEach(b=>b.disabled=!rich);});
  el.addEventListener('input',()=>{set(rich?richHTML(el.innerHTML):el.innerText.replace(/\n$/,''),el.innerText);onChange();});
  el.addEventListener('paste',e=>{e.preventDefault();doc.execCommand('insertText',false,e.clipboardData.getData('text/plain'));});
  el.addEventListener('drop',e=>e.preventDefault());
 }
 if(home){for(const el of doc.querySelectorAll('[data-config]')){const [group,key]=el.dataset.config.split('.');editable(el,el.dataset.config,()=>artist[group]?.[key]||'',v=>{(artist[group]??={})[key]=v;});}}
 else{const main=doc.querySelector('main');main.replaceChildren();const section=doc.createElement('section');section.className='section';main.append(section);const label=doc.createElement('p');label.className='eyebrow';section.append(label);editable(label,'Page menu label',()=>page.label||page.title,v=>page.label=v);const title=doc.createElement('h1');section.append(title);editable(title,'Page title',()=>page.title,v=>page.title=v);}
 const main=doc.querySelector('main');const container=home?doc.createElement('section'):main.querySelector('.section');if(home){container.className='section';main.append(container);}
 function insertRow(index){const row=doc.createElement('div');row.className='studio-tools studio-add';const select=doc.createElement('select');select.setAttribute('aria-label','Section type');for(const type of sectionTypes){const option=doc.createElement('option');option.value=type;option.textContent=type[0].toUpperCase()+type.slice(1)+' section';select.append(option);}row.append(select);button(row,'+ Add section here',()=>{checkpoint();page.blocks.splice(index,0,newSection(select.value));onStructure();});return row;}
 page.blocks.forEach((block,index)=>{
  container.append(insertRow(index));const section=doc.createElement('section');section.className='studio-section';section.dataset.block=index;
  const tools=doc.createElement('div');tools.className='studio-tools';const label=doc.createElement('strong');label.textContent=`${index+1} · ${block.type}`;tools.append(label);
  for(const [label,delta]of [['↑',-1],['↓',1]]){const b=button(tools,label,()=>{checkpoint();[page.blocks[index],page.blocks[index+delta]]=[page.blocks[index+delta],block];onStructure();});b.setAttribute('aria-label',`Move section ${index+1} ${delta<0?'up':'down'}`);b.disabled=index+delta<0||index+delta>=page.blocks.length;}
  button(tools,'Settings',()=>onSelect(block,index));button(tools,'Duplicate',()=>{checkpoint();page.blocks.splice(index+1,0,structuredClone(block));onStructure();});button(tools,'Remove',()=>{checkpoint();page.blocks.splice(index,1);onStructure();});section.append(tools);
  if(block.type==='text'){const heading=doc.createElement('h2');section.append(heading);editable(heading,`Section ${index+1} heading`,()=>block.heading,v=>block.heading=v);const text=doc.createElement('div');section.append(text);editable(text,`Section ${index+1} text`,()=>block.richText??esc(block.text), (v,plain)=>{block.richText=v;block.text=plain;},true);}
  if(block.type==='image'){const figure=doc.createElement('figure'),img=doc.createElement('img'),caption=doc.createElement('figcaption');img.src=block.src;img.alt=block.alt||'';img.onclick=()=>onSelect(block,index);figure.append(img,caption);section.append(figure);editable(caption,`Section ${index+1} caption`,()=>block.caption,v=>block.caption=v);}
  if(block.type==='link'){const link=doc.createElement('a');link.className='text-link';link.href=block.href;section.append(link);editable(link,`Section ${index+1} link label`,()=>block.text,v=>block.text=v);}
  section.addEventListener('focusin',()=>onSelect(block,index));container.append(section);
 });container.append(insertRow(page.blocks.length));
}
