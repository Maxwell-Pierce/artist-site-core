// Crop and envelope copies only; decoded source channels and lyric timing stay intact.
export function audioFadeGain(time,duration,fadeIn=0,fadeOut=0){
 const incoming=fadeIn>0?Math.min(1,Math.max(0,time/fadeIn)):1;
 const outgoing=fadeOut>0?Math.min(1,Math.max(0,(duration-time)/fadeOut)):1;
 return Math.min(incoming,outgoing);
}
export function croppedAudio(buffer,start,end,fadeIn=0,fadeOut=0){
 const first=Math.round(start*buffer.sampleRate),length=Math.max(1,Math.min(buffer.length-first,Math.round((end-start)*buffer.sampleRate))),channels=Math.min(2,buffer.numberOfChannels);
 const result=new AudioBuffer({length,numberOfChannels:channels,sampleRate:buffer.sampleRate});
 const duration=(length-1)/buffer.sampleRate;
 for(let c=0;c<channels;c++){
  result.copyToChannel(buffer.getChannelData(c).subarray(first,first+length),c);
  const data=result.getChannelData(c);
  for(let i=0;i<length;i++)data[i]*=audioFadeGain(i/buffer.sampleRate,duration,fadeIn,fadeOut);
 }
 return result;
}
