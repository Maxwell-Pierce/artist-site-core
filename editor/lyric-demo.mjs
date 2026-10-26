import {mountLyricStudio} from './lyric-studio.mjs';
function generatedExample(){
const sampleRate=48000,seconds=16,n=sampleRate*seconds,buffer=new ArrayBuffer(44+n*4),view=new DataView(buffer);const text=(offset,value)=>[...value].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));text(0,'RIFF');view.setUint32(4,36+n*4,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,n*4,true);for(let i=0;i<n;i++){const envelope=Math.min(1,i/2000,(n-i)/2000),beat=Math.sin(Math.PI*(i/sampleRate*2%1))**6,value=Math.sin(i/sampleRate*Math.PI*2*220)*.12*envelope*(.3+.7*beat);view.setInt16(44+i*4,value*32767,true);view.setInt16(46+i*4,value*.85*32767,true);}const audio=URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));
const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(300,230,10,500,500,900);gradient.addColorStop(0,'#4678d4');gradient.addColorStop(.45,'#192443');gradient.addColorStop(1,'#05060e');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1080);for(let i=0;i<10;i++){ctx.strokeStyle=`rgba(180,242,212,${.03+i*.015})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(540,570,170+i*25,170+i*25,0,0,Math.PI*2);ctx.stroke();}const artwork=canvas.toDataURL('image/png');
const track={id:'demo-tone',title:'Find your frequency',artist:'Artist Studio demo',duration:seconds,audio,artwork};const edit={id:track.id,lines:[{text:'Find your frequency',start:.2,end:1.8,words:[{text:'Find',start:.2,end:.65},{text:'your',start:.65,end:1.05},{text:'frequency',start:1.05,end:1.8}]},{text:'Make it your own',start:2,end:3.8,words:[{text:'Make',start:2,end:2.4},{text:'it',start:2.4,end:2.7},{text:'your',start:2.7,end:3.1},{text:'own',start:3.1,end:3.8}]},{text:'Keep the rhythm moving',start:8,end:10,words:[{text:'Keep',start:8,end:8.5},{text:'the',start:8.5,end:8.8},{text:'rhythm',start:8.8,end:9.4},{text:'moving',start:9.4,end:10}]}]};
return {track,edit};
}
async function startDemo(){
 const base=new URL('./demo/heavns-moving-out-of-frame/',import.meta.url);
 const readJSON=async name=>{const response=await fetch(new URL(name,base));if(!response.ok)throw Error('Demo asset could not be loaded: '+name);return response.json();};
 const [metadata,edit]=await Promise.all([readJSON('track.json'),readJSON('lyrics.json')]);
 const track={...metadata,audio:new URL(metadata.audio,base).href,artwork:new URL(metadata.artwork,base).href};
 const tone=generatedExample(),examples=[{track,edit},tone],state={edits:{},projects:{}};
 const notice=document.getElementById('notice');
 const dispose=mountLyricStudio(document.getElementById('lyric-demo-root'),{
  repo:{read:async path=>{const example=examples.find(({track})=>path==='lyrics/'+track.id+'.json');return example?JSON.stringify(example.edit):null;}},getBase:()=>'',tracks:examples.map(e=>e.track),lyricIDs:examples.map(e=>e.track.id),getState:()=>state,
  onChange:()=>{notice.textContent='Demo edits stay in this tab. Download your MP4, subtitles or project to keep them. No artist website or repository is changed.';}
 });
 // Load the bundled music and waveform; playback still starts only when requested.
 const select=document.getElementById('lv-track');select.value=track.id;select.dispatchEvent(new Event('change'));
 window.addEventListener('pagehide',()=>{dispose();URL.revokeObjectURL(tone.track.audio);},{once:true});
}
startDemo().catch(error=>{document.getElementById('notice').hidden=false;document.getElementById('notice').textContent='Could not load the bundled demo. '+error.message;});
