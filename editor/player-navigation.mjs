// Return source indexes in chronological playback order, without sorting lyrics in place.
export function adjacentSentence(lines,time,direction){
 const rows=lines.map((line,index)=>({index,start:line.start})).filter(row=>Number.isFinite(row.start)).sort((a,b)=>a.start-b.start||a.index-b.index);
 if(!rows.length)return null;
 let current=-1;for(let i=0;i<rows.length;i++){if(rows[i].start<=time+.001)current=i;else break;}
 const next=direction>0?current+1:current-1;
 return rows[Math.max(0,Math.min(rows.length-1,next))].index;
}
