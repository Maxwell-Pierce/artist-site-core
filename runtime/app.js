'use strict';
const artistConfig=JSON.parse(document.getElementById('artist-config')?.textContent||'{}');
const artistName=artistConfig.name||'Artist';
const entranceConfig=artistConfig.entrance||{};
const storagePrefix=artistConfig.storageKey||'artist-site';
const escapeMarkup=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const tracks=JSON.parse(document.getElementById('track-data').textContent);
const $=id=>document.getElementById(id), audio=$('audio');
let viewIds=new Set(tracks.map(t=>t.id)), playbackIds=tracks.map(t=>t.id);
let current=-1,shuffle=false,filter='all',lastVolume=.7,playRequest=0;
audio.volume=lastVolume;
const format=seconds=>{seconds=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
const isCategory=(track,category)=>category==='all'||(category==='chant'?track.tags.some(t=>/chant|tibetan|devotional/i.test(t)):category==='rhythm'?track.tags.some(t=>/percussion|bass|liquid/i.test(t)):track.tags.some(t=>/ambient|piano|ethereal|soft/i.test(t)));
function render(){
 if(!document.querySelector('main #tracks'))return;
 if(!tracks.length){ $('tracks').innerHTML='<div class="catalog-empty"><img src="assets/mark.svg" alt="" width="88" height="88"><p class="eyebrow">THE NEXT CHAPTER</p><h3>Good things take a little rhythm.</h3><p>A new collection is on its way.<br>Until then, make yourself at home.</p></div>'; ['play','shuffle','shuffle-all','next','prev','repeat','quiet-track','seek'].forEach(id=>{if($(id))$(id).disabled=true;}); return; }
 $('tracks').replaceChildren();
 tracks.forEach((track,index)=>{
  if(!viewIds.has(track.id)||!isCategory(track,filter))return;
  const card=document.createElement('article');card.className='track-card';card.dataset.index=index;
  const art=document.createElement('div');art.className='track-art';const img=document.createElement('img');img.src=track.artwork;img.alt=`${track.title} cover artwork`;img.loading='lazy';img.width=400;img.height=400;
  const play=document.createElement('button');play.className='track-play';play.dataset.play=index;play.addEventListener('click',()=>{playbackIds=[...viewIds];select(index);});art.append(img,play);
  const row=document.createElement('div');row.className='track-title-row';const title=document.createElement('h3');title.textContent=track.title;const time=document.createElement('span');time.textContent=format(track.duration);row.append(title,time);
  const meta=document.createElement('div');meta.className='track-meta';const tags=document.createElement('span');tags.textContent=`${track.artist || artistName} · ${track.likes ?? '—'} likes${track.plays != null ? ` · ${track.plays} plays` : ''}`;const link=document.createElement('a');link.href=track.url;link.className='track-treblo-link';link.textContent='Treblo ↗';link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',`Open ${track.title} on Treblo`);meta.append(link,tags);card.append(art,row,meta);$('tracks').append(card);
 });sync();
}
function sync(){
 const playing=!audio.paused&&!audio.ended;
 $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
 document.querySelectorAll('.track-card').forEach(card=>card.classList.toggle('playing',Number(card.dataset.index)===current));
 document.querySelectorAll('[data-play]').forEach(button=>{const i=Number(button.dataset.play),active=i===current&&playing;button.textContent=active?'Ⅱ':'▶';button.setAttribute('aria-label',`${active?'Pause':'Play'} ${tracks[i].title}`);button.setAttribute('aria-pressed',String(active));});
 $('shuffle').setAttribute('aria-pressed',String(shuffle));$('shuffle').setAttribute('aria-label',shuffle?'Disable shuffle':'Enable shuffle');
 if($('shuffle-all'))$('shuffle-all').textContent=shuffle?'⇄  Shuffle on':'⇄  Shuffle the collection';
 if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';
}
async function select(index,force=false){
 if(!tracks.length)return;
 if(index===current&&!force){if(audio.paused)await resume();else audio.pause();return;}
 current=(index+tracks.length)%tracks.length;const track=tracks[current];audio.src=track.audio;$('player-title').textContent=track.title;$('player-subtitle').textContent=`${track.artist || artistName} · Treblo`;$('player-art').src=track.artwork;$('song-link').href=track.url;$('song-link').setAttribute('aria-label',`Open ${track.title} on Treblo`);$('duration').textContent=format(track.duration);$('elapsed').textContent='0:00';$('seek').value=0;
 if('mediaSession' in navigator&&'MediaMetadata' in window){navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist || artistName,album:artistConfig.tagline||artistName,artwork:[{src:track.artwork}]});}
 sync();await resume();
}
async function resume(){const request=++playRequest;$('player-status').textContent='Loading your sound…';try{await audio.play();if(request===playRequest)$('player-status').textContent='';}catch(error){if(request===playRequest&&error.name!=='AbortError')$('player-status').textContent='Playback couldn’t start. Try Play again, or use ↗ to listen on Treblo.';}sync();}
function step(direction){
 const indices=playbackIds.map(id=>tracks.findIndex(t=>t.id===id)).filter(i=>i>=0);
 if(!indices.length)return;
 let position=indices.indexOf(current),next;
 if(shuffle&&indices.length>1){const choices=indices.filter(i=>i!==current);next=choices[Math.floor(Math.random()*choices.length)];}
 else next=indices[(position+direction+indices.length)%indices.length];
 select(next,true);
}
$('play').addEventListener('click',()=>current<0?select(0):select(current));$('next').addEventListener('click',()=>step(1));$('prev').addEventListener('click',()=>audio.currentTime>3?(audio.currentTime=0):step(-1));
$('shuffle').addEventListener('click',()=>{shuffle=!shuffle;sync();});$('repeat').addEventListener('click',()=>{audio.loop=!audio.loop;$('repeat').setAttribute('aria-pressed',String(audio.loop));});
$('seek').addEventListener('input',event=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number(event.target.value)/100*audio.duration;});
function syncVolume(){$('volume').value=audio.muted?0:audio.volume;$('mute').textContent=audio.muted||audio.volume===0?'♪':'♫';$('mute').setAttribute('aria-label',audio.muted||audio.volume===0?'Unmute':'Mute');const output=document.getElementById('volume-level');if(output)output.textContent=Math.round((audio.muted?0:audio.volume)*100)+'%';const trigger=document.getElementById('volume-toggle');if(trigger)trigger.classList.toggle('is-muted',audio.muted||audio.volume===0);}
$('volume').addEventListener('input',event=>{audio.volume=Number(event.target.value);audio.muted=false;if(audio.volume>0)lastVolume=audio.volume;syncVolume();});$('mute').addEventListener('click',()=>{if(audio.volume===0){audio.volume=lastVolume;audio.muted=false;}else audio.muted=!audio.muted;syncVolume();});
audio.addEventListener('timeupdate',()=>{$('elapsed').textContent=format(audio.currentTime);$('seek').value=audio.duration?audio.currentTime/audio.duration*100:0;});audio.addEventListener('loadedmetadata',()=>{$('duration').textContent=format(audio.duration);});audio.addEventListener('play',sync);audio.addEventListener('pause',sync);audio.addEventListener('ended',()=>{if(!audio.loop)step(1);});audio.addEventListener('waiting',()=>{$('player-status').textContent='Loading your sound…';});audio.addEventListener('playing',()=>{$('player-status').textContent='';sync();});audio.addEventListener('error',()=>{$('player-status').textContent='This stream is unavailable. Try another track or open the song on Treblo ↗.';sync();});
if('mediaSession' in navigator){[['play',()=>current<0?select(0):resume()],['pause',()=>audio.pause()],['previoustrack',()=>step(-1)],['nexttrack',()=>step(1)],['seekto',details=>{if(Number.isFinite(details.seekTime))audio.currentTime=details.seekTime;}]].forEach(([action,handler])=>{try{navigator.mediaSession.setActionHandler(action,handler);}catch{}});}
$('year').textContent=new Date().getFullYear();render();


// Keep the brand generous at the top, then make room for the content.
const siteHeader=document.querySelector('header');
if(siteHeader){
 const updateHeader=()=>siteHeader.classList.toggle('is-scrolled',window.scrollY>36);
 window.addEventListener('scroll',updateHeader,{passive:true});
 window.addEventListener('pageshow',updateHeader);
 updateHeader();
}

// First-visit entrance: load essentials without trapping slow connections.
let siteEntered=!document.getElementById('hero-video');
// A fresh document needs an entrance click to unlock browser audio.
// Internal navigation swaps content and never reinitializes this entrance.
let entranceReady=()=>{};
if(!siteEntered){
 const gate=document.createElement('section');gate.className='entrance';gate.setAttribute('aria-label','Enter '+artistName);
 gate.innerHTML='<div class="entrance-inner"><p class="eyebrow">'+escapeMarkup(entranceConfig.eyebrow||'YOUR LISTENING ROOM')+'</p><div class="entrance-portrait"><img src="'+escapeMarkup(entranceConfig.portrait||'assets/mark.svg')+'" alt="'+escapeMarkup(entranceConfig.portraitAlt||artistName)+'" width="1254" height="1254"><span class="entry-eye entry-eye-left"></span><span class="entry-eye entry-eye-right"></span></div><h1>'+escapeMarkup(artistConfig.nameFirst||artistName)+'<em>'+escapeMarkup(artistConfig.nameLast||'')+'</em></h1><p class="entrance-tagline">'+escapeMarkup(entranceConfig.tagline||artistConfig.tagline||'Make yourself at home.')+'</p><div class="entrance-wave" aria-hidden="true">'+Array.from({length:17},(_,i)=>`<i style="--n:${i}"></i>`).join('')+'</div><p id="entrance-status" role="status" aria-live="polite">Tuning your frequency…</p><button id="enter-site" disabled>Preparing your world…</button><button id="skip-entrance" class="entrance-skip">Continue without waiting</button></div>';
 document.body.append(gate);document.body.classList.add('entrance-locked');
 const button=gate.querySelector('#enter-site'),status=gate.querySelector('#entrance-status');
 let ready=false;
 entranceReady=(fallback=false)=>{if(ready)return;ready=true;button.disabled=false;button.textContent=entranceConfig.button||'Enter the listening room ↗';status.textContent=fallback?'Your world is ready. Video will continue loading.':'Your frequency is ready.';gate.classList.add('is-ready');};
 const enter=()=>{if(siteEntered)return;siteEntered=true;try{sessionStorage.setItem(storagePrefix+'-entered','1');}catch{}if(tracks.length){shuffle=true;if(current<0)select(Math.floor(Math.random()*tracks.length));else if(audio.paused)resume();sync();}animateEntryPortrait(gate);document.body.classList.remove('entrance-locked');gate.classList.add('is-leaving');window.dispatchEvent(new Event('site-entered'));setTimeout(()=>{gate.remove();document.querySelector('header .brand')?.focus({preventScroll:true});},650);};
 button.addEventListener('click',enter);gate.querySelector('#skip-entrance').addEventListener('click',enter);
 setTimeout(()=>entranceReady(true),12000);
 Promise.allSettled([document.fonts.ready,new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=entranceConfig.portrait||'assets/mark.svg';})]).then(()=>{window.dispatchEvent(new Event('entrance-assets-ready'));});
}

// Decorative video is always silent, independent of music-player volume.
const heroVideo=document.getElementById('hero-video');
const heroVideoData=document.getElementById('hero-video-data');
if(heroVideo&&heroVideoData){
 const sources=heroVideo.getAttribute('src')?[heroVideo.getAttribute('src')]:JSON.parse(heroVideoData.textContent);
 let queue=[],last=null,failed=new Set();
 function refill(){
  queue=sources.filter(src=>!failed.has(src));
  for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
  if(queue.length>1&&queue[0]===last)[queue[0],queue[1]]=[queue[1],queue[0]];
 }
 function playHero(){
  heroVideo.muted=true;heroVideo.defaultMuted=true;heroVideo.volume=0;
  if(!siteEntered)return;
  const promise=heroVideo.play();
  if(promise)promise.catch(()=>{heroVideo.classList.remove('is-playing');});
 }
 function nextHero(){
  if(!queue.length)refill();
  if(!queue.length){heroVideo.classList.remove('is-playing');entranceReady(true);return;}
  last=queue.shift();heroVideo.src=last;heroVideo.load();playHero();useCachedVideo(last);
 }
 heroVideo.addEventListener('volumechange',()=>{if(!heroVideo.muted||heroVideo.volume!==0){heroVideo.muted=true;heroVideo.volume=0;}});
 heroVideo.addEventListener('playing',()=>heroVideo.classList.add('is-playing'));
 heroVideo.addEventListener('ended',nextHero);
 heroVideo.addEventListener('error',()=>{failed.add(last);queue=queue.filter(src=>!failed.has(src));nextHero();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)heroVideo.pause();else if(last)playHero();});
 window.addEventListener('site-entered',()=>{playHero();warmVideos();},{once:true});
 heroVideo.addEventListener('canplay',()=>entranceReady(),{once:true});
 window.addEventListener('entrance-assets-ready',()=>{if(heroVideo.readyState>=3||!sources.length)entranceReady();},{once:true});
 heroVideo.preload='auto';
 // Persistent best-effort cache, one download at a time; respect data saver.
 const cacheName='discoprincess-videos-v1';
 async function warmVideos(){
  if(!('caches' in window)||navigator.connection?.saveData)return;
  try{
   const cache=await caches.open(cacheName);
   const urls=sources.map(src=>new URL(src,document.baseURI).href);
   for(const request of await cache.keys())if(!urls.includes(request.url))await cache.delete(request);
   for(const url of urls){
    if(await cache.match(url))continue;
    const response=await fetch(url,{cache:'force-cache'});
    if(response.ok&&response.status===200)await cache.put(url,response);
   }
  }catch{/* Streaming remains available if storage or network is limited. */}
 }
 let videoBlobUrl=null;
 async function useCachedVideo(src){
  try{if(!('caches' in window))return;const cache=await caches.open(cacheName);const response=await cache.match(new URL(src,document.baseURI).href);
   if(response&&last===src&&heroVideo.readyState<2){const blob=await response.blob();if(last!==src)return;if(videoBlobUrl)URL.revokeObjectURL(videoBlobUrl);videoBlobUrl=URL.createObjectURL(blob);heroVideo.src=videoBlobUrl;heroVideo.load();playHero();}
  }catch{}
 }
 if(sources.length)nextHero();else entranceReady(true);
}


// Same-document navigation preserves the audio element, playback queue and entrance state.
let displayedPath=location.pathname;
const pageMains=new Map([[location.pathname,document.querySelector('main')]]);
let navigationRequest=0;
function mainPlay(shuffled=false){
 playbackIds=[...viewIds];if(!playbackIds.length)return;
 if(shuffled)shuffle=true;
 const id=shuffle?playbackIds[Math.floor(Math.random()*playbackIds.length)]:playbackIds[0];
 select(tracks.findIndex(t=>t.id===id),true);sync();
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.id==='begin'||button.id==='quiet-track')mainPlay();
 if(button.id==='shuffle-all')mainPlay(true);
 if(button.dataset.filter){filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();}
});
async function navigateSite(url,push=true){
 closeNavigation();
 const request=++navigationRequest;
 try{
  const response=await fetch(url.href);if(!response.ok)throw new Error('Page unavailable');
  const page=new DOMParser().parseFromString(await response.text(),'text/html');
  const incoming=page.querySelector('main');if(!incoming)throw new Error('Missing content');
  const data=JSON.parse(page.getElementById('track-data')?.textContent||'[]');
  if(request!==navigationRequest)return;
  for(const track of data)if(!tracks.some(t=>t.id===track.id))tracks.push(track);
  viewIds=new Set(data.map(t=>t.id));filter='all';
  // Preserve the home video element and its attached shuffle handlers while off-page.
  const old=document.querySelector('main');pageMains.set(displayedPath,old);
  const next=pageMains.get(url.pathname)||incoming;
  // Generated playlist documents use a base URL; normalize links before inserting them.
  const base=new URL(page.querySelector('base')?.getAttribute('href')||url.href,url);
  if(next===incoming)for(const el of next.querySelectorAll('[href],[src]'))for(const attr of ['href','src'])if(el.hasAttribute(attr))el.setAttribute(attr,new URL(el.getAttribute(attr),base).href);
  old.replaceWith(next);displayedPath=url.pathname;
  const currentHeader=document.querySelector('header');const newHeader=page.querySelector('header');
  if(newHeader){for(const el of newHeader.querySelectorAll('[href],[src]'))for(const attr of ['href','src'])if(el.hasAttribute(attr))el.setAttribute(attr,new URL(el.getAttribute(attr),base).href);currentHeader.innerHTML=newHeader.innerHTML;}
  document.title=page.title;
  for(const id of ['begin','shuffle-all','tracks'])for(const el of document.querySelectorAll('#'+id))if(!el.closest('main'))el.remove();
  if(push)history.pushState({},'',url);
  render();sync();
  if(heroVideo&&next.contains(heroVideo)){if(siteEntered)heroVideo.play().catch(()=>{});}else heroVideo?.pause();
  const target=url.hash?document.getElementById(decodeURIComponent(url.hash.slice(1))):null;
  if(target)target.scrollIntoView();else window.scrollTo(0,0);
  window.dispatchEvent(new Event('scroll'));
 }catch(error){$('player-status').textContent='This page could not load. Please try again. Your music is still playing.';}
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank'||link.hasAttribute('download'))return;
 const url=new URL(link.href);if(url.origin!==location.origin||!url.pathname.startsWith(new URL('.',location.href).pathname.split('/playlists/')[0]))return;
 if(!(/\.html$/.test(url.pathname)||url.pathname.endsWith('/')))return;
 if(url.pathname===location.pathname)return;
 event.preventDefault();navigateSite(url);
});
window.addEventListener('popstate',()=>navigateSite(new URL(location.href),false));


// Install only when offered by the browser; keep it out of standalone mode.
let installPrompt=null;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const ios=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
function mountInstall(){
 const nav=document.querySelector('header nav');if(!nav||standalone()||nav.querySelector('.install-app')||(!installPrompt&&!ios()))return;
 const button=document.createElement('button');button.className='install-app';button.type='button';button.title='Install '+artistName;button.setAttribute('aria-label','Install '+artistName+' app');
 button.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg><span>Install</span>';nav.append(button);
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;mountInstall();});
window.addEventListener('appinstalled',()=>{installPrompt=null;document.querySelector('.install-app')?.remove();});
document.addEventListener('click',async event=>{
 if(!event.target.closest('.install-app'))return;
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;document.querySelector('.install-app')?.remove();}
 else if(ios()){
  const dialog=document.createElement('dialog');dialog.className='install-guide';dialog.innerHTML='<img src="assets/icon-180.png" width="72" height="72" alt=""><h2>Take the glow with you.</h2><p>In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> and <strong>Add</strong>.</p><button type="button">Got it</button>';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
 }
});
new MutationObserver(mountInstall).observe(document.querySelector('header'),{childList:true,subtree:true});
mountInstall();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(new URL('sw.js',document.baseURI)).catch(()=>{}));


// Lyric-video typography follows the audio clock, never the decorative video.
let lyricTrack=null,lyricLines=[],lyricRequest=0,lyricEnabled=true,lyricLine=null;
async function loadTrackLyrics(){
 const track=tracks[current];if(!track||track.id===lyricTrack)return;
 lyricTrack=track.id;lyricLines=[];lyricLine=null;const request=++lyricRequest;
 try{const response=await fetch(new URL(`lyrics/${track.id}.json`,document.baseURI));if(!response.ok)return;const data=await response.json();if(request===lyricRequest)lyricLines=data.lines||[];}catch{}
}
audio.addEventListener('loadstart',loadTrackLyrics);
// This caption surface lives beside the persistent player, outside page content.
const captionDock=document.createElement('aside');
captionDock.className='caption-dock';captionDock.hidden=true;
captionDock.setAttribute('aria-label','Current song lyrics');
const captionOverlay=document.createElement('div');captionOverlay.className='lyric-stage';
captionDock.append(captionOverlay);document.body.append(captionDock);
function animateLyrics(){
 const overlay=captionOverlay;
 {  overlay.dataset.style=lyricAppearance.style;overlay.style.setProperty('--lyric-scale',lyricAppearance.scale);
  const time=audio.currentTime;
  const active=lyricEnabled?lyricLines.filter(l=>l.start<=time&&time<l.end).at(-1):null;
  captionDock.hidden=!active;
  if(overlay._line!==active){
   overlay._line=active;overlay.replaceChildren();
   if(active){
    const timed=active.words?.length>0;overlay.classList.toggle('line-only',!timed);
    for(const word of timed?active.words:active.text.split(/\s+/).map(text=>({text}))){const span=document.createElement('span');span.textContent=word.text;span._word=word;overlay.append(span,document.createTextNode(' '));}
   }
  }
  if(active?.words?.length)for(const span of overlay.querySelectorAll('span')){const word=span._word;const timed=Number.isFinite(word.start)&&Number.isFinite(word.end)&&word.end>word.start;const progress=timed?Math.max(0,Math.min(1,(time-word.start)/(word.end-word.start))):0;span.style.setProperty('--word-fill',`${progress*100}%`);span.classList.toggle('is-current',timed&&time>=word.start&&time<word.end);span.classList.toggle('is-sung',timed&&time>=word.end);}
 }
 requestAnimationFrame(animateLyrics);
}
requestAnimationFrame(animateLyrics);



// Playback appearance settings never replace or restart the audio player.
const lyricStyleOptions=[
 ['karaoke','Karaoke','Gold-to-pink word sweep'],
 ['pop','Pop','Words spring up as they land'],
 ['punch','Punch','Bold caption blocks and bright hits'],
 ['neon','Neon','Glowing words with a soft pulse'],
 ['subtitle','Cinema','Clean, quiet subtitles']
];
let lyricAppearance={style:artistConfig.captions?.style||'neon',scale:1};
try{const saved=JSON.parse(localStorage.getItem(storagePrefix+'-lyric-appearance')||'null');if(saved&&lyricStyleOptions.some(([id])=>id===saved.style))lyricAppearance={style:saved.style,scale:Math.max(.75,Math.min(1.35,Number(saved.scale)||1))};}catch{}
function saveLyricAppearance(){try{localStorage.setItem(storagePrefix+'-lyric-appearance',JSON.stringify(lyricAppearance));}catch{}}
const playbackSettings=document.createElement('button');playbackSettings.id='playback-settings';playbackSettings.type='button';playbackSettings.setAttribute('aria-label','Playback and lyric appearance settings');playbackSettings.setAttribute('aria-haspopup','dialog');playbackSettings.title='Lyric styles';
playbackSettings.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m10 3-.7 2.1-2 .9-2-.5-2 3.5 1.5 1.6v2.3L3.3 15l2 3.5 2-.5 2 .9.7 2.1h4l.7-2.1 2-.9 2 .5 2-3.5-1.5-1.6v-2.3l1.5-1.6-2-3.5-2 .5-2-.9L14 3Z"/><circle cx="12" cy="12" r="3"/></svg>';
document.querySelector('.player-end')?.append(playbackSettings);
playbackSettings.addEventListener('click',()=>{
 const dialog=document.createElement('dialog');dialog.className='lyric-settings';dialog.setAttribute('aria-labelledby','lyric-settings-title');
 dialog.innerHTML='<div class="lyric-settings-heading"><div><p>MAKE IT YOUR FREQUENCY</p><h2 id="lyric-settings-title">Lyric styles</h2></div><button type="button" class="settings-close" aria-label="Close lyric settings">×</button></div><div class="lyric-style-grid"></div><label class="lyric-size-label">Caption size <input id="lyric-size" type="range" min=".75" max="1.35" step=".05" value="'+lyricAppearance.scale+'"><output id="lyric-size-value">'+Math.round(lyricAppearance.scale*100)+'%</output></label><label class="lyric-show-label"><input id="show-lyrics" type="checkbox" '+(lyricEnabled?'checked':'')+'> Show lyrics over the video</label><p class="lyric-settings-note">Changes apply as you listen. Word effects follow available timing; other words stay readable.</p>';
 const grid=dialog.querySelector('.lyric-style-grid');
 for(const [id,label,description] of lyricStyleOptions){
  const button=document.createElement('button');button.type='button';button.className='lyric-style-option';button.dataset.style=id;button.setAttribute('aria-pressed',String(lyricAppearance.style===id));
  button.innerHTML='<span class="style-preview"><span>Feel</span> <b>the</b> <span>music.</span></span><strong>'+label+'</strong><small>'+description+'</small>';
  button.addEventListener('click',()=>{lyricAppearance.style=id;saveLyricAppearance();for(const option of grid.children)option.setAttribute('aria-pressed',String(option===button));});grid.append(button);
 }
 dialog.querySelector('#lyric-size').addEventListener('input',event=>{lyricAppearance.scale=Number(event.target.value);dialog.querySelector('#lyric-size-value').textContent=Math.round(lyricAppearance.scale*100)+'%';saveLyricAppearance();});
 dialog.querySelector('#show-lyrics').addEventListener('change',event=>{lyricEnabled=event.target.checked;document.querySelectorAll('.lyric-toggle').forEach(button=>button.setAttribute('aria-pressed',String(lyricEnabled)));});
 dialog.querySelector('.settings-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{dialog.remove();playbackSettings.focus();});
 document.body.append(dialog);dialog.showModal();
});


// Keep the opening screen above the actual player, including device safe areas.
const viewportRoot=document.documentElement;
function measurePlayer(){
 const player=document.querySelector('.player');
 if(player)viewportRoot.style.setProperty('--player-height',`${Math.ceil(player.getBoundingClientRect().height)}px`);
}
if('ResizeObserver' in window)new ResizeObserver(measurePlayer).observe(document.querySelector('.player'));
window.addEventListener('resize',measurePlayer,{passive:true});
measurePlayer();

// Delegated controls survive navigation, which replaces the header's contents.
function mountNavigation(){
 const header=document.querySelector('header'),nav=header?.querySelector('nav');
 if(!nav)return;
 nav.id='main-navigation';
 if(!header.querySelector('.menu-toggle')){
  const button=document.createElement('button');button.type='button';button.className='menu-toggle';
  button.setAttribute('aria-label','Open navigation');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',nav.id);
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  header.insertBefore(button,nav);
 }
}
function closeNavigation(restoreFocus=false){
 const header=document.querySelector('header'),button=header?.querySelector('.menu-toggle');
 header?.classList.remove('menu-open');
 button?.setAttribute('aria-expanded','false');button?.setAttribute('aria-label','Open navigation');
 if(restoreFocus)button?.focus();
}
new MutationObserver(mountNavigation).observe(document.querySelector('header'),{childList:true});
mountNavigation();
document.addEventListener('click',event=>{
 const button=event.target.closest('.menu-toggle');
 if(button){
  const open=button.closest('header').classList.toggle('menu-open');
  button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Close navigation':'Open navigation');
 }else if(event.target.closest('header nav a')||!event.target.closest('header'))closeNavigation();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('header.menu-open'))closeNavigation(true);});
window.matchMedia('(max-width:1100px)').addEventListener('change',()=>closeNavigation());

// Compact volume control: reuse the existing slider and audio listeners.
const volumeControl=document.createElement('div');volumeControl.className='volume-control';
const volumeToggle=document.createElement('button');volumeToggle.id='volume-toggle';volumeToggle.type='button';volumeToggle.title='Volume';
volumeToggle.setAttribute('aria-label','Open volume control');volumeToggle.setAttribute('aria-expanded','false');volumeToggle.setAttribute('aria-controls','volume-popover');
volumeToggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path class="volume-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="volume-cross" d="m16 10 4 4m0-4-4 4"/></svg>';
const volumePopover=document.createElement('div');volumePopover.id='volume-popover';volumePopover.className='volume-popover';volumePopover.hidden=true;volumePopover.setAttribute('role','group');volumePopover.setAttribute('aria-label','Volume control');
const volumeLevel=document.createElement('output');volumeLevel.id='volume-level';volumeLevel.setAttribute('for','volume');
volumePopover.append(volumeLevel,$('volume'),$('mute'));volumeControl.append(volumeToggle,volumePopover);
document.querySelector('.player-end').prepend(volumeControl);
function closeVolume(restoreFocus=false){volumePopover.hidden=true;volumeToggle.setAttribute('aria-expanded','false');volumeToggle.setAttribute('aria-label','Open volume control');if(restoreFocus)volumeToggle.focus();}
volumeToggle.addEventListener('click',()=>{const open=volumePopover.hidden;volumePopover.hidden=!open;volumeToggle.setAttribute('aria-expanded',String(open));volumeToggle.setAttribute('aria-label',open?'Close volume control':'Open volume control');if(open)$('volume').focus();});
document.addEventListener('click',event=>{if(!volumeControl.contains(event.target))closeVolume();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!volumePopover.hidden){event.stopPropagation();closeVolume(true);}});
volumeControl.addEventListener('focusout',event=>{if(event.relatedTarget&&!volumeControl.contains(event.relatedTarget))closeVolume();});
audio.addEventListener('volumechange',syncVolume);syncVolume();

// Recover Android/PWA layouts restored with a wide, zoomed-out viewport.
const standardViewport='width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover';
function needsViewportRecovery(layoutWidth,screenWidth,scale,phone){
 return phone&&Number.isFinite(screenWidth)&&screenWidth>=240&&
  (layoutWidth>screenWidth*1.25||(Number.isFinite(scale)&&scale<.95));
}
function recoverAppViewport(useExplicitWidth=false){
 if(document.hidden)return;
 const phone=window.matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<=700;
 const width=screen.width,scale=window.visualViewport?.scale;
 if(needsViewportRecovery(document.documentElement.clientWidth,width,scale,phone)){
  const meta=document.querySelector('meta[name="viewport"]');
  if(meta)meta.setAttribute('content',useExplicitWidth?
   'width='+Math.round(width)+',initial-scale=1,minimum-scale=1,viewport-fit=cover':standardViewport);
 }
 // Resume events can fire before Android has finished restoring the surface.
 measurePlayer();
}
let viewportRecoveryTimer,viewportRetryTimer;
function scheduleViewportRecovery(){
 clearTimeout(viewportRecoveryTimer);clearTimeout(viewportRetryTimer);
 viewportRecoveryTimer=setTimeout(()=>recoverAppViewport(false),100);
 viewportRetryTimer=setTimeout(()=>recoverAppViewport(true),450);
}
window.addEventListener('pageshow',scheduleViewportRecovery);
window.addEventListener('focus',scheduleViewportRecovery);
window.addEventListener('resize',scheduleViewportRecovery,{passive:true});
window.visualViewport?.addEventListener('resize',scheduleViewportRecovery,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleViewportRecovery();});
window.addEventListener('orientationchange',()=>{
 const meta=document.querySelector('meta[name="viewport"]');if(meta)meta.setAttribute('content',standardViewport);
 scheduleViewportRecovery();
});
scheduleViewportRecovery();

// Let the loader portrait survive the gate fade, then dissolve over the video.
function animateEntryPortrait(gate){
 const portrait=gate.querySelector('.entrance-portrait');if(!portrait)return;
 const reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches||entranceConfig.effect!=='eye-glow';
 const rect=portrait.getBoundingClientRect(),character=portrait.cloneNode(true);
 character.className='entry-character';character.setAttribute('aria-hidden','true');
 character.style.left=rect.left+'px';character.style.top=rect.top+'px';character.style.width=rect.width+'px';
 character.style.setProperty('--entry-dx',(innerWidth/2-rect.left-rect.width/2)+'px');
 character.style.setProperty('--entry-dy',(innerHeight*.44-rect.top-rect.height/2)+'px');
 if(!reduced)for(let i=0;i<14;i++){
  const spark=document.createElement('i');spark.className='entry-spark';
  spark.style.setProperty('--angle',(i*360/14)+'deg');spark.style.setProperty('--travel',(65+(i%4)*15)+'px');
  spark.style.setProperty('--delay',(i%3)*.07+'s');character.append(spark);
 }
 document.body.append(character);portrait.style.visibility='hidden';
 character.addEventListener('animationend',event=>{if(event.target===character)character.remove();});
 setTimeout(()=>character.remove(),reduced?700:2900);
}

