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
