import {activeLine,RATIOS,finite} from './lyric-model.mjs';
export function dimensions(project){const base=RATIOS[project.ratio]||RATIOS['9:16'];return base.map(n=>Math.round(n*project.resolution/1080/2)*2);}
export function drawLyricFrame(canvas,image,project,lines,time,track,{guides=false}={}){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,s=Math.min(w,h),relative=Math.max(0,time-project.in),length=project.out-project.in;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b101a';ctx.fillRect(0,0,w,h);
 if(image){const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;const zoom=project.motion?1+Math.min(.10,relative/Math.max(1,length)*.1):1,scale=Math.max(w/iw,h/ih)*zoom,dx=(w-iw*scale)*project.focalX/100,dy=(h-ih*scale)*project.focalY/100;ctx.drawImage(image,dx,dy,iw*scale,ih*scale);}
 ctx.fillStyle=`rgba(0,0,0,${project.overlay/100})`;ctx.fillRect(0,0,w,h);const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#0008');gradient.addColorStop(.45,'#0000');gradient.addColorStop(1,'#000b');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 const family=project.font==='serif'?'Georgia,serif':project.font==='mono'?'ui-monospace,monospace':'Arial,sans-serif';
 if(project.showTitle){ctx.fillStyle=project.color;ctx.globalAlpha=.86;ctx.font=`600 ${s*.022}px ${family}`;ctx.textAlign='left';ctx.fillText((track.artist||'ARTIST').toUpperCase(),w*.09,h*.08,w*.82);ctx.font=`400 ${s*.019}px ${family}`;ctx.fillText(track.title||'',w*.09,h*.08+s*.035,w*.82);ctx.globalAlpha=1;}
 const line=activeLine(lines,time);
 if(line){let size=s*project.fontSize/100;const content=project.uppercase?line.text.toUpperCase():line.text;const tokens=content.split(/\s+/);let rows=[];let all=[];
  function wrap(){ctx.font=`800 ${size}px ${family}`;rows=[];all=[];let row=[],width=0;tokens.forEach((text,i)=>{const measure=ctx.measureText(text+' ').width;if(width+measure>w*.82&&row.length){rows.push(row);row=[];width=0;}const word={text,index:i,width:measure};row.push(word);all.push(word);width+=measure;});if(row.length)rows.push(row);}
  ctx.font=`800 ${size}px ${family}`;const longest=Math.max(...tokens.map(text=>ctx.measureText(text+' ').width));if(longest>w*.82)size*=w*.82/longest;
  wrap();while(rows.length*size*1.3>h*.48&&size>s*.025){size*=.9;wrap();}
  const y=h*project.position/100-(rows.length-1)*size*.65,enter=Math.min(1,Math.max(0,(time-line.start)/.18)),leave=Math.min(1,Math.max(0,(line.end-time)/.15));ctx.textBaseline='middle';ctx.textAlign='left';ctx.lineJoin='round';ctx.globalAlpha=project.effect==='fade'?Math.min(enter,leave):1;
  const chars=Math.floor(content.length*(time-line.start)/Math.max(.05,line.end-line.start));let seen=0;
  rows.forEach((row,r)=>{let x=(w-row.reduce((n,word)=>n+word.width,0))/2;row.forEach(word=>{const timing=line.words?.[word.index],timed=timing&&finite(timing.start)&&finite(timing.end),active=timed&&time>=timing.start&&time<timing.end,past=timed&&time>=timing.end;let value=word.text;if(project.effect==='typewriter'){value=value.slice(0,Math.max(0,chars-seen));seen+=word.text.length+1;}
    ctx.save();const cy=y+r*size*1.3;const pop=project.effect==='pop'&&active?1.1:1;ctx.translate(x+word.width/2,cy);ctx.scale(pop,pop);ctx.font=`800 ${size}px ${family}`;ctx.shadowColor=project.effect==='neon'?project.accent:'#000';ctx.shadowBlur=project.effect==='neon'?size*.35:size*.12;ctx.strokeStyle='#0008';ctx.lineWidth=size*.07;ctx.strokeText(value,-word.width/2,0,w*.82);ctx.fillStyle=(project.effect==='karaoke'&&(active||past)||project.effect==='pop'&&active)?project.accent:project.color;ctx.fillText(value,-word.width/2,0,w*.82);ctx.restore();x+=word.width;});});ctx.globalAlpha=1;
 }
 if(project.showProgress){ctx.fillStyle='#ffffff35';ctx.fillRect(w*.09,h*.94,w*.82,Math.max(2,s*.003));ctx.fillStyle=project.accent;ctx.fillRect(w*.09,h*.94,w*.82*Math.max(0,Math.min(1,relative/length)),Math.max(2,s*.003));}
 if(guides){ctx.save();ctx.strokeStyle='#ffffff70';ctx.lineWidth=1;ctx.setLineDash([7,7]);ctx.strokeRect(w*.09,h*.1,w*.82,h*.8);ctx.restore();}
}
