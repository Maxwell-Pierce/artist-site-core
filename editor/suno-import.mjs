const API_ROOT='https://www.suno-api.io/api';

export function sunoSongID(value){
 let url;try{url=new URL(value);}catch{throw Error('Paste a valid Suno song URL.');}
 if(!['suno.com','www.suno.com'].includes(url.hostname.toLowerCase()))throw Error('Use a link from suno.com.');
 const parts=url.pathname.split('/').filter(Boolean),kind=parts.findIndex(part=>part==='song'||part==='s');
 const id=kind>=0?parts[kind+1]:'';
 if(!id||!/^[a-z\d-]{8,160}$/i.test(id))throw Error('The Suno link does not contain a song ID.');
 return id;
}

async function post(endpoint,songID,apiKey,fetchImpl,kind='song'){
 const response=await fetchImpl(`${API_ROOT}/${endpoint}`,{
  method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
  body:JSON.stringify(endpoint==='lyrics/timeline'?{model:'suno-v6',song_id:songID}:{song_id:songID,kind})
 });
 let payload;try{payload=await response.json();}catch{throw Error(`Suno API returned an unreadable response (${response.status}).`);}
 if(!response.ok||payload?.code&&Number(payload.code)!==200)throw Error(payload?.message||payload?.error?.message||`Suno API request failed (${response.status}).`);
 return payload;
}

function mediaURL(payload){
 const value=payload?.data?.url||payload?.data?.audio_url||payload?.audio_url||payload?.url;
 if(typeof value!=='string')return '';
 try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}
}

function marker(text){return /^\s*(?:\[[^\]]*\]|instrumental\s*:)/i.test(text.trim());}

export function normalizeSunoTimeline(songID,segments){
 if(!Array.isArray(segments)||!segments.length)throw Error('No timed lyrics were returned for this Suno song.');
 const lines=[];let words=[],lastEnd=0;
 const flush=()=>{
  const kept=words.filter(word=>word.text.trim());
  if(kept.length){const text=kept.map(word=>word.text).join(' ').replace(/\s+([,.;!?])/g,'$1');const start=kept[0].start,end=kept.at(-1).end;if(text.trim()&&end>start)lines.push({text,start,end,words:kept,timingSource:'suno-api'});}
  words=[];
 };
 for(const segment of segments){
  if(!segment||segment.success===false||typeof segment.word!=='string')continue;
  const start=Number(segment.start_s),end=Number(segment.end_s);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)continue;lastEnd=Math.max(lastEnd,end);
  const value=segment.word;const split=value.split(/(\n+)/);
  for(const part of split){
   if(!part)continue;
   if(/^\n+$/.test(part)){flush();continue;}
   const text=part.trim();if(!text)continue;
   if(marker(text)){flush();continue;}
   const tokens=text.split(/\s+/).filter(Boolean),weight=tokens.map(token=>Math.max(1,token.length)),total=weight.reduce((a,b)=>a+b,0);let cursor=start;
   tokens.forEach((token,index)=>{const until=index===tokens.length-1?end:cursor+(end-start)*weight[index]/total;words.push({text:token,start:cursor,end:until,score:Number.isFinite(Number(segment.p_align))?Number(segment.p_align):null,timingSource:tokens.length>1?'estimated-suno-segment':'suno-api',...(tokens.length>1?{estimated:true}:{})});cursor=until;});
  }
 }
 flush();
 if(!lines.length)throw Error('No usable lyric lines were found. Instrumental and section markers are excluded.');
 const duration=Math.max(lastEnd,lines.at(-1).end);
 return {schemaVersion:1,id:songID,duration,lines,source:'suno-api'};
}

export async function importSunoSong({url,apiKey,fetchImpl=fetch}){
 const songID=sunoSongID(url);if(!apiKey?.trim())throw Error('Enter your Suno API provider key to import this song.');
 const results=await Promise.allSettled([
  post('lyrics/timeline',songID,apiKey.trim(),fetchImpl),
  post('music/download-url',songID,apiKey.trim(),fetchImpl),
  post('music/download-url',songID,apiKey.trim(),fetchImpl,'cover')
 ]);
 const [timelineResult,audioResult,coverResult]=results;
 if(timelineResult.status==='rejected'){const error=timelineResult.reason;if(error instanceof TypeError)throw Error('The API could not be reached from this browser. Its provider may block cross-origin requests; use a CORS-enabled endpoint or a secure proxy.');throw error;}
 const timelinePayload=timelineResult.value?.data&&Array.isArray(timelineResult.value.data)?timelineResult.value.data:timelineResult.value;
 const edit=normalizeSunoTimeline(songID,timelinePayload),audio=audioResult.status==='fulfilled'?mediaURL(audioResult.value):'',artwork=coverResult.status==='fulfilled'?mediaURL(coverResult.value):'';
 return {songID,edit,audio,artwork};
}
