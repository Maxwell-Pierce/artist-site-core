import {clone,distributeWords,estimateMissingWords,replaceLineText,finite,round} from './lyric-model.mjs';
const key=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const weight=text=>Math.max(1,(text.match(/[aeiouyà-ÿ]+/gi)||[]).length,text.length/5);
export function insertionTexts(text){return String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!/^\[[^\]]+\]$/.test(s));}
function activity(buffer,start,end){
 if(!buffer||!buffer.sampleRate||!buffer.length)return null;
 const channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,i)=>buffer.getChannelData(i)),step=.02,bins=[];
 for(let t=start;t<end;t+=step){const a=Math.floor(t*buffer.sampleRate),b=Math.min(buffer.length,Math.floor((t+step)*buffer.sampleRate));let sum=0,n=0;
  for(const data of channels)for(let j=a;j<b;j+=16){const value=data[j]||0;sum+=value*value;n++;}
  bins.push({time:t,rms:Math.sqrt(sum/Math.max(1,n))});
 }
 let max=0;for(const bin of bins)max=Math.max(max,bin.rms);return max>.003?{bins,max}:null;
}
function audioBounds(audio,start,end,minSpan){const envelope=activity(audio,start,end);if(!envelope)return {start,end,audioUsed:false};const active=envelope.bins.filter(b=>b.rms>Math.max(.003,envelope.max*.12));if(!active.length)return {start,end,audioUsed:false};const a=Math.max(start,active[0].time-.06),b=Math.min(end,active.at(-1).time+.08);return b-a>=minSpan?{start:a,end:b,audioUsed:true}:{start,end,audioUsed:false};}
export function suggestSentenceInsertion({lines=[],index=0,position='after',text='',duration,sourceLines=[],audioBuffer=null,playhead=0,loop=null,useAudio=true}){
 const texts=insertionTexts(text),warnings=[];const result={lines:[],warnings,overlap:false,ready:false,start:0,end:0};
 if(!texts.length)return {...result,error:'Paste a sentence or several lines to see suggested timing.'};
 if(texts.length>100||texts.some(t=>t.length>2000)||texts.length+lines.length>3000)return {...result,error:'Insert up to 100 sentences at once, with at most 2,000 characters per sentence.'};
 if(!finite(duration)||duration<=0)return {...result,error:'Load a track before inserting sentences.'};
 index=Math.max(0,Math.min(lines.length-1,index));let start=0,end=duration;
 if(position==='loop'){
  if(!loop||!finite(loop.start)||!finite(loop.end)||loop.start<0||loop.end<=loop.start||loop.end>duration)return {...result,error:'Choose a valid loop range on the timeline first.'};
  ({start,end}=loop);
 }else if(position==='playhead'){
  start=Math.max(0,Math.min(duration,playhead));end=lines.find(l=>l.start>=start)?.start??duration;
  if(lines.some(l=>l.start<=start&&l.end>start))return {...result,error:'The playhead is inside an existing sentence. Choose a gap or use the loop range.'};
 }else if(lines.length){
  if(position==='before'){start=index?Math.max(...lines.slice(0,index).map(l=>l.end)):0;end=lines[index].start;}
  else{start=lines[index].end;end=lines[index+1]?.start??duration;}
 }
 start=Math.max(0,start);end=Math.min(duration,end);result.start=start;result.end=end;
 const minimum=texts.reduce((n,t)=>n+Math.max(.12,t.split(/\s+/).length*.06),0);
 if(end-start<minimum)return {...result,error:'Not enough free space here. Choose another gap or use a loop range. Existing sentences will stay in place.'};
 const anchors=new Map();let cursor=start;
 texts.forEach((text,i)=>{
  const found=sourceLines.filter(l=>key(l.originalText||l.text)===key(text)&&finite(l.start)&&finite(l.end)&&l.start>=cursor&&l.end<=end&&l.end>l.start).sort((a,b)=>a.start-b.start)[0];
  if(found){anchors.set(i,found);cursor=found.end;}
 });
 // Drop anchors that leave too little space for the unanchored text before them.
 let previous=-1,previousEnd=start;
 for(const [i,line]of [...anchors]){const needed=texts.slice(previous+1,i).reduce((n,t)=>n+Math.max(.12,t.split(/\s+/).length*.06),0);if(line.start-previousEnd<needed){anchors.delete(i);continue;}previous=i;previousEnd=line.end;}
 const tailMinimum=texts.slice(previous+1).reduce((n,t)=>n+Math.max(.12,t.split(/\s+/).length*.06),0);
 if(end-previousEnd<tailMinimum&&previous>=0)anchors.delete(previous);
 if(!anchors.size&&position!=='loop'){const natural=Math.max(1.2,texts.reduce((n,t)=>n+t.split(/\s+/).length/2.2+.4,0));if(end-start>Math.max(8,natural*2)){if(position==='before')start=end-natural;else end=start+natural;}}
 const added=new Array(texts.length),anchorIndexes=[...anchors.keys()];
 for(const [i,source]of anchors){const row=clone(source);row.text=source.originalText||source.text;row.words??=[];replaceLineText(row,texts[i]);estimateMissingWords(row);row.timingSource='source-restored';row.reviewRequired=false;added[i]=row;}
 for(let group=0;group<=anchorIndexes.length;group++){
  const left=group?anchorIndexes[group-1]:-1,right=group<anchorIndexes.length?anchorIndexes[group]:texts.length;if(right===left+1)continue;
  const a=left>=0?anchors.get(left).end:start,b=right<texts.length?anchors.get(right).start:end;
  const count=texts.slice(left+1,right).reduce((n,t)=>n+t.split(/\s+/).length,0),bounds=useAudio?audioBounds(audioBuffer,a,b,count*.06):{start:a,end:b,audioUsed:false};
  const weights=texts.slice(left+1,right).map(weight),total=weights.reduce((a,b)=>a+b,0);let at=bounds.start;
  for(let i=left+1;i<right;i++){const until=i===right-1?bounds.end:at+(bounds.end-bounds.start)*weights[i-left-1]/total;
   const row={text:texts[i],start:round(at),end:round(until),words:[],timingSource:bounds.audioUsed?'estimated-insert-audio':'estimated-insert-gap',reviewRequired:true};distributeWords(row);added[i]=row;at=until;
  }
 }
 if(added.some(row=>!row||row.end<=row.start))return {...result,error:'These source timings leave too little room. Choose a wider loop range.'};
 result.lines=added;result.start=added[0].start;result.end=added.at(-1).end;
 result.overlap=added.some(row=>lines.some(l=>row.start<l.end-.001&&row.end>l.start+.001));
 if(result.overlap)warnings.push('This range overlaps existing sentences. Their timings will not move.');
 if(added.some(row=>row.timingSource==='estimated-insert-audio'))warnings.push('Audio activity helps place boundaries. These are estimates, not speech recognition.');
 if(added.some(row=>row.timingSource==='estimated-insert-gap'))warnings.push('Timing is estimated from the available gap and text length. Listen and adjust the word regions.');
 if(added.some(row=>row.text.split(/\s+/).length/(row.end-row.start)>6))warnings.push('Some sentences are tightly packed. Check their timing carefully.');
 result.ready=true;return result;
}
export function applySentenceInsertion(lines,plan,{allowOverlap=false}={}){
 if(!plan?.ready||!plan.lines?.length)throw Error('Choose valid text and timing before inserting.');
 if(!allowOverlap&&plan.lines.some(row=>lines.some(l=>row.start<l.end-.001&&row.end>l.start+.001)))throw Error('This insertion overlaps existing lyrics. Choose a free range or explicitly allow overlap.');
 const inserted=clone(plan.lines);lines.push(...inserted);lines.sort((a,b)=>a.start-b.start);return {index:lines.indexOf(inserted[0]),inserted};
}
