import {validateVisualizers} from './audio-visualizer.mjs';
export const RATIOS={'1:1':[1080,1080],'3:4':[1080,1440],'4:5':[1080,1350],'16:9':[1920,1080],'9:16':[1080,1920]};
export const clone=value=>JSON.parse(JSON.stringify(value));
export const finite=value=>typeof value==='number'&&Number.isFinite(value);
export const round=value=>Math.round(value*1000)/1000;
export const validID=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,160}$/.test(id);
export function defaultProject(track){return {schemaVersion:1,id:track.id,ratio:'9:16',resolution:720,fps:30,in:0,out:Math.min(30,track.duration||30),effect:'karaoke',font:'sans',fontSize:6,position:65,accent:'#b4f2d4',color:'#ffffff',overlay:48,focalX:50,focalY:50,motion:true,showTitle:true,showProgress:true,uppercase:false,artworkData:'',visualizers:{active:'none',styles:{}}};}
export function validateEdit(edit){
 if(edit.schemaVersion!==1||!validID(edit.id)||!finite(edit.duration)||edit.duration<=0||edit.duration>14400||!Array.isArray(edit.lines)||edit.lines.length>3000)throw Error('Invalid lyric edit document.');
 for(const line of edit.lines){if(typeof line.text!=='string'||!line.text.trim()||line.text.length>2000||!finite(line.start)||!finite(line.end)||line.start<0||line.end<=line.start||line.end>edit.duration+.05)throw Error('Each line needs text and start/end within the track.');
  if(!Array.isArray(line.words))throw Error('Invalid word timings.');for(const word of line.words){if(typeof word.text!=='string')throw Error('Invalid word text.');if(word.start===null&&word.end===null)continue;if(!finite(word.start)||!finite(word.end)||word.start<line.start-.05||word.end<=word.start||word.end>line.end+.05)throw Error('Word timings must fit inside their line.');}
 }
 return edit;
}
export function validateProject(project,duration){if(!validID(project.id)||project.schemaVersion!==1||!RATIOS[project.ratio]||![720,1080].includes(project.resolution)||project.fps!==30||!finite(project.in)||!finite(project.out)||project.in<0||project.out<=project.in||project.out>duration+.05||project.out-project.in>600)throw Error('Choose a valid clip of up to 10 minutes within the track.');
 if(!['karaoke','pop','neon','fade','typewriter'].includes(project.effect)||!['sans','serif','mono'].includes(project.font))throw Error('Invalid video style.');
 for(const [key,min,max]of [['fontSize',3,12],['position',15,85],['overlay',0,85],['focalX',0,100],['focalY',0,100]])if(!finite(project[key])||project[key]<min||project[key]>max)throw Error('Invalid '+key+' setting.');
 for(const color of [project.color,project.accent])if(!/^#[a-f\d]{6}$/i.test(color))throw Error('Video colours must be hex values.');
 if(project.artworkData&&(!/^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(project.artworkData)||project.artworkData.length>900000))throw Error('Uploaded artwork must be an image smaller than 650 KB after compression.');
 validateVisualizers(project.visualizers);
 return project;
}
export function retimeLine(line,start,end,duration){start=Math.max(0,round(start));end=Math.min(duration,round(end));if(end-start<.04)return false;const oldStart=line.start,oldSpan=line.end-line.start,scale=(end-start)/oldSpan;line.start=start;line.end=end;for(const word of line.words||[])if(finite(word.start)&&finite(word.end)){word.start=round(start+(word.start-oldStart)*scale);word.end=round(start+(word.end-oldStart)*scale);word.timingSource=word.estimated?'estimated-editor-retime':'manual';}line.timingSource='manual';return true;}
export function shiftAll(lines,delta,duration){if(!lines.length)return 0;const actual=Math.max(-Math.min(...lines.map(l=>l.start)),Math.min(delta,duration-Math.max(...lines.map(l=>l.end))));for(const line of lines)retimeLine(line,line.start+actual,line.end+actual,duration);return round(actual);}
// Align unchanged tokens first; estimate only the edited neighbourhood.
const wordKey=text=>text.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}']/gu,'');
const speechWeight=text=>Math.max(1,(text.toLowerCase().match(/[aeiouyà-ÿ]+/g)||[]).length,text.replace(/^[.,!?;:]+|[.,!?;:]+$/g,'').length/5);
export function replaceLineText(line,text,baseline=line){
 const previous=clone(baseline.words||[]),tokens=text.trim().split(/\s+/).filter(Boolean),n=previous.length,m=tokens.length;
 line.text=text;if(!m){line.words=[];return;}
 const oldKeys=previous.map(w=>wordKey(w.text)),keys=tokens.map(wordKey),width=m+1,dp=new Uint16Array((n+1)*width);
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i*width+j]=oldKeys[i]===keys[j]?1+dp[(i+1)*width+j+1]:Math.max(dp[(i+1)*width+j],dp[i*width+j+1]);
 const matched=new Map();let i=0,j=0;
 while(i<n&&j<m){if(oldKeys[i]===keys[j]){matched.set(j,previous[i]);i++;j++;}else if(dp[(i+1)*width+j]>dp[i*width+j+1])i++;else j++;}
 const words=tokens.map((text,index)=>matched.has(index)?{...matched.get(index),text}:{text,start:null,end:null});
 // Invalid or overlapping source timings cannot serve as hard anchors.
 let last=line.start;const anchors=[];
 words.forEach((w,k)=>{if(finite(w.start)&&finite(w.end)&&w.start>=last&&w.end>w.start&&w.end<=line.end+.00001){anchors.push(k);last=w.end;}else{w.start=null;w.end=null;}});
 const spans=[];
 for(let k=0;k<=anchors.length;k++){
  const left=k?anchors[k-1]:-1,right=k<anchors.length?anchors[k]:m;
  if(right===left+1)continue;
  let first=left+1,stop=right,a=left>=0?words[left].end:line.start,b=right<m?words[right].start:line.end;
  // When insertion has no silence to occupy, borrow only adjacent word spans.
  if(b-a<(stop-first)*.07){if(left>=0){first=left;a=words[left].start;}if(right<m){stop=right+1;b=words[right].end;}}
  spans.push({first,stop,a,b});
 }
 // Edited blocks can share a borrowed neighbour: distribute their union once.
 const merged=[];for(const span of spans){const tail=merged.at(-1);if(tail&&span.first<tail.stop){tail.stop=Math.max(tail.stop,span.stop);tail.b=Math.max(tail.b,span.b);}else merged.push({...span});}
 for(const {first,stop,a,b}of merged){const weights=words.slice(first,stop).map(w=>speechWeight(w.text)),total=weights.reduce((a,b)=>a+b,0);let cursor=a;
  for(let k=first;k<stop;k++){const end=k===stop-1?b:cursor+(b-a)*weights[k-first]/total;words[k]={...words[k],start:cursor,end,estimated:true,score:0,timingSource:'estimated-text-edit'};cursor=end;}
 }
 line.words=words;
}

export function distributeWords(line){const words=line.text.trim().split(/\s+/),total=words.reduce((n,w)=>n+Math.max(1,w.length),0);let cursor=line.start;line.words=words.map((text,i)=>{const end=i===words.length-1?line.end:cursor+(line.end-line.start)*Math.max(1,text.length)/total;const word={text,start:round(cursor),end:round(end),estimated:true,score:0,timingSource:'estimated-editor-distribution'};cursor=end;return word;});}
export function splitLine(lines,index,time){const line=lines[index];if(!line||time<=line.start+.05||time>=line.end-.05)return false;const words=line.words?.length?line.words:line.text.split(/\s+/).map(text=>({text,start:null,end:null}));let split=words.findIndex(w=>finite(w.start)&&w.start>=time);if(split<=0)split=Math.max(1,Math.min(words.length-1,Math.round(words.length*(time-line.start)/(line.end-line.start))));if(words.length<2)return false;
 const first=clone(line),last=clone(line);first.end=round(time);last.start=round(time);first.words=clone(words.slice(0,split));last.words=clone(words.slice(split));first.text=first.words.map(w=>w.text).join(' ');last.text=last.words.map(w=>w.text).join(' ');for(const l of [first,last]){l.timingSource='manual';for(const w of l.words)if(finite(w.start)&&finite(w.end)){w.start=Math.max(l.start,w.start);w.end=Math.min(l.end,w.end);if(w.end<=w.start){w.start=null;w.end=null;}}}lines.splice(index,1,first,last);return true;
}
export function mergeLine(lines,index){if(!lines[index+1])return false;const a=lines[index],b=lines[index+1];a.text+=' '+b.text;a.start=Math.min(a.start,b.start);a.end=Math.max(a.end,b.end);a.words=[...(a.words||[]),...(b.words||[])];a.timingSource='manual';lines.splice(index+1,1);return true;}
export function activeLine(lines,time){return lines.filter(line=>line.start<=time&&time<line.end).sort((a,b)=>b.start-a.start)[0]||null;}
export function timingStats(lines){const words=lines.flatMap(l=>l.words||[]);return {lines:lines.length,words:words.length,timed:words.filter(w=>finite(w.start)&&finite(w.end)).length,estimated:words.filter(w=>w.estimated).length};}
const stamp=(seconds,separator=',')=>{const ms=Math.max(0,Math.round(seconds*1000));return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}${separator}${String(ms%1000).padStart(3,'0')}`;};
export function subtitles(lines,format='srt'){return (format==='vtt'?'WEBVTT\n\n':'')+lines.map((l,i)=>`${format==='srt'?i+1+'\n':''}${stamp(l.start,format==='vtt'?'.':',')} --> ${stamp(l.end,format==='vtt'?'.':',')}\n${l.text}`).join('\n\n')+'\n';}
export function creativeFiles(state){const files={};for(const [id,edit]of Object.entries(state.edits||{})){if(id!==edit.id)throw Error('Lyric identifier mismatch.');validateEdit(edit);files['lyric-edits/'+id+'.json']=JSON.stringify(edit,null,2)+'\n';}for(const [id,project]of Object.entries(state.projects||{})){if(id!==project.id)throw Error('Video identifier mismatch.');validateProject(project,state.edits[id]?.duration||project.trackDuration);files['video-projects/'+id+'.json']=JSON.stringify(project,null,2)+'\n';}return files;}

// Match the static build's gap filling without moving recognized/manual anchors.
export function estimateMissingWords(line){
 const tokens=line.text?.trim().split(/\s+/).filter(Boolean)||[],{start,end}=line;
 if(!tokens.length||!finite(start)||!finite(end)||start<0||end<=start||end-start>35)return 0;
 const words=line.words?.length?line.words:tokens.map(text=>({text,start:null,end:null,score:0}));
 if(words.length!==tokens.length||words.some((w,i)=>w.text?.trim()!==tokens[i]))return 0;
 const anchors=[];let previous=-1;
 for(const [i,w]of words.entries())if(finite(w.start)&&finite(w.end)){if(w.start<0||w.end<=w.start||w.start<previous)return 0;anchors.push(i);previous=w.end;}
 let count=0;
 for(let gap=0;gap<=anchors.length;gap++){
  const left=gap?anchors[gap-1]:-1,right=gap<anchors.length?anchors[gap]:words.length,first=left+1;
  if(first===right)continue;
  const a=left>=0?words[left].end:start,b=right<words.length?words[right].start:end;
  if(b-a<(right-first)*.055)continue;
  const weights=tokens.slice(first,right).map(text=>Math.max(1,(text.toLowerCase().match(/[aeiouyà-ÿ]+/g)||[]).length,text.replace(/^[.,!?;:]+|[.,!?;:]+$/g,'').length/5)),total=weights.reduce((a,b)=>a+b,0);let cursor=a;
  for(let i=first;i<right;i++){const until=i===right-1?b:cursor+(b-a)*weights[i-first]/total;words[i]={...words[i],start:cursor,end:until,score:0,estimated:true,timingSource:anchors.length?'estimated-between-anchors':'estimated-line-rhythm'};cursor=until;count++;}
 }
 line.words=words;return count;
}

export function practiceBounds(line,duration,padding=.5){if(!line)return null;return {start:round(Math.max(0,line.start-padding)),end:round(Math.min(duration,line.end+padding))};}
const sourceReference=text=>/^\$(?:[a-f\d]+|undefined)$/i.test(text);
export function originalTranscript(track,source={}){
 const raw=typeof track.lyrics==='string'?track.lyrics.trim():'';
 if(raw&&!sourceReference(raw))return {lines:raw.split(/\r?\n/).map(text=>text.trim()).filter(Boolean),source:'lyrics'};
 const readable=value=>typeof value==='string'?value.trim():'';
 const lineText=line=>typeof line==='string'?line:line?.originalText||line?.text;
 let lines=[...(source.lines||[]).map(lineText),...(source.untimed||[]).map(lineText)].map(readable).filter(text=>text&&!sourceReference(text));
 if(!lines.length)lines=(track.alignedLyrics||[]).map(lineText).map(readable).filter(text=>text&&!sourceReference(text));
 return {lines,source:lines.length?'alignment':'unavailable'};
}
export function originalSentences(track,source){return originalTranscript(track,source).lines;}
export function insertSentence(lines,text,start,end,duration){
 text=text.trim();if(!text||!finite(start)||!finite(end)||start<0||end<=start||end>duration)return -1;
 const line={text,start:round(start),end:round(end),words:[],timingSource:'manual'};estimateMissingWords(line);lines.push(line);lines.sort((a,b)=>a.start-b.start);return lines.indexOf(line);
}

export function retimeWord(line,index,start,end){const word=line?.words?.[index];if(!word||!finite(start)||!finite(end)||end<=start)return false;const span=Math.min(line.end-line.start,Math.max(.04,end-start));word.start=round(Math.max(line.start,Math.min(line.end-span,start)));word.end=round(Math.min(line.end,word.start+span));word.timingSource='manual';delete word.estimated;return true;}
