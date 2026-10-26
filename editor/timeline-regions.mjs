export function timelineRegions(lines,view,selected){
 if(view==='lines')return lines.map((row,lineIndex)=>({id:'l-'+lineIndex,row,lineIndex,kind:'line'}));
 const indexes=view==='sentence'?[selected]:lines.map((_,i)=>i);
 const entries=[];
 if(view==='sentence'&&lines[selected])entries.push({id:'s-'+selected,row:lines[selected],lineIndex:selected,kind:'sentence'});
 for(const lineIndex of indexes)for(const [wordIndex,row]of (lines[lineIndex]?.words||[]).entries())entries.push({id:`w-${lineIndex}-${wordIndex}`,row,lineIndex,wordIndex,kind:'word'});
 return entries;
}
export function regionTarget(id){const match=/^([lsw])-(\d+)(?:-(\d+))?$/.exec(id);return match?{kind:match[1]==='w'?'word':'line',lineIndex:Number(match[2]),wordIndex:match[3]===undefined?null:Number(match[3])}:null;}
export function timingChanged(region,row){return !!row&&(Math.abs(region.start-row.start)>1e-6||Math.abs(region.end-row.end)>1e-6);}

// Remove only the selected item. Remaining timestamps and source data stay put.
export function deleteTimelineItem(lines,{kind,lineIndex,wordIndex=-1}){
 if(!Number.isInteger(lineIndex)||!lines[lineIndex]||!['word','sentence'].includes(kind))return null;
 const line=lines[lineIndex];let removedSentence=kind==='sentence';
 if(kind==='word'){
  if(!Number.isInteger(wordIndex)||!line.words?.[wordIndex])return null;
  removedSentence=line.words.length===1;
  if(!removedSentence){line.words.splice(wordIndex,1);line.text=line.words.map(w=>w.text).join(' ');line.timingSource='manual-editor';return {removedSentence:false,lineIndex,wordIndex:Math.min(wordIndex,line.words.length-1),kind:'word'};}
 }
 lines.splice(lineIndex,1);
 return {removedSentence,lineIndex:Math.max(0,Math.min(lineIndex,lines.length-1)),wordIndex:-1,kind:lines.length?'sentence':null};
}
