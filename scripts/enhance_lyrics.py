import os
"""Vocal separation + two unprompted recognition passes + known-text alignment."""
import json,sys,hashlib,urllib.request,tempfile,re
from pathlib import Path
from difflib import SequenceMatcher
import torch,torchaudio,soundfile
from lyrics_common import normalize,correction_candidate,accepted_words,alignment_lanes

def write(path,data):Path(path).write_text(json.dumps(data,ensure_ascii=False))
def flatten(result):
 return [{'text':w['word'].strip(),'start':w['start'],'end':w['end'],'score':(w.get('probability') or 0),'engine':'whisper'} for s in result.to_dict()['segments'] for w in s.get('words',[]) if w.get('start') is not None and w.get('end',0)>w['start']]
def near(words,line):return [w for w in words if line['start']<= (w['start']+w['end'])/2<=line['end']]
def run(source,destination):
 import stable_whisper
 from demucs.pretrained import get_model
 from demucs.apply import apply_model
 data=json.loads(Path(source).read_text());torch.set_num_threads(2);warnings=data.setdefault('warnings',[])
 data.setdefault('corrections',[]);data.setdefault('review',[])
 cache=Path(os.environ.get('ARTIST_SITE_ROOT',Path(__file__).resolve().parents[1]))/'.cache/lyric-audio-v2';cache.mkdir(parents=True,exist_ok=True)
 stem=cache/(hashlib.sha256(data['audio'].encode()).hexdigest()+'.pt')
 if stem.exists():signals=torch.load(stem,weights_only=True)
 else:
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'source.ogg'
   with urllib.request.urlopen(urllib.request.Request(data['audio'],headers={'User-Agent':'ArtistSiteCore/2.0'}),timeout=90) as response:path.write_bytes(response.read())
   samples,sr=soundfile.read(str(path),dtype='float32',always_2d=True)
   stereo=torch.from_numpy(samples.T.copy());stereo=stereo.repeat(2,1) if stereo.shape[0]==1 else stereo[:2]
   separator=get_model('htdemucs').cpu().eval()
   mix=torchaudio.functional.resample(stereo,sr,separator.samplerate)
   with torch.inference_mode():separated=apply_model(separator,mix[None],device='cpu',shifts=0,split=True,overlap=.1,progress=False)[0]
   vocal=separated[separator.sources.index('vocals')].mean(0)
   signals={'mix':torchaudio.functional.resample(stereo.mean(0),sr,16000),'vocals':torchaudio.functional.resample(vocal,separator.samplerate,16000)}
   torch.save(signals,stem);del separator,separated
 # Two decoding models, with no lyric prompt, to avoid simply echoing source errors.
 base=stable_whisper.load_model('base',device='cpu',dq=True)
 original=base.transcribe(signals['mix'].numpy(),fp16=False,verbose=None,regroup=False,condition_on_previous_text=False,suppress_silence=False)
 language=original.language;data['language']=language
 mix_words=flatten(original)
 small=stable_whisper.load_model('small',device='cpu',dq=True)
 recognized=small.transcribe(signals['vocals'].numpy(),language=language,fp16=False,verbose=None,regroup=False,condition_on_previous_text=False,suppress_silence=False)
 vocal_words=flatten(recognized)
 del base
 # Recover lines lost to absent/invalid Treblo timing by matching actual audio text.
 known={tuple(normalize(l['originalText'])) for l in data['lines']}
 for text in data.get('untimed',[]):
  tokens=normalize(text)
  if len(tokens)<3 or tuple(tokens) in known:continue
  best=None
  for width in range(max(1,len(tokens)-2),len(tokens)+3):
   for i in range(max(0,len(vocal_words)-width+1)):
    candidate=vocal_words[i:i+width];score=SequenceMatcher(None,tokens,normalize(' '.join(w['text'] for w in candidate))).ratio()
    if score>=.8 and (best is None or score>best[0]):best=(score,candidate)
  if best:
   words=best[1];data['lines'].append({'text':text,'originalText':text,'start':words[0]['start'],'end':words[-1]['end'],'words':[],'timingSource':'recognition-recovery'});known.add(tuple(tokens))
 overrides=data.get('overrides',{})
 for line in data['lines']:
  original_text=line.get('originalText',line['text']);a=near(mix_words,line);b=near(vocal_words,line)
  candidate=correction_candidate(original_text,a,b)
  if original_text in overrides:
   line['text']=overrides[original_text];line['words']=[];data['corrections'].append({'original':original_text,'replacement':line['text'],'source':'manual'})
  elif candidate and data.get('autoCorrect',True):
   line['text']=candidate;data['corrections'].append({'original':original_text,'replacement':candidate,'source':'two-model-agreement','start':line['start']});line['words']=[]
  elif b and normalize(original_text)!=normalize(' '.join(w['text'] for w in b)):
   data['review'].append({'original':original_text,'suggestion':' '.join(w['text'] for w in b),'start':line['start'],'reason':'recognition-disagreement'})
 write(destination,data) # Keep stage results if later alignment fails.
 duration=len(signals['vocals'])/16000
 aligned={}
 for lane in alignment_lanes(data['lines'],duration):
  result=small.align_words(signals['vocals'].numpy(),[segment for _,segment in lane],language=language,regroup=False,verbose=None,suppress_silence=False)
  for (index,_),segment in zip(lane,result.to_dict()['segments']):aligned[index]=segment
 for index,line in enumerate(data['lines']):
  segment=aligned.get(index,{})
  raw=segment.get('words',[]);candidate=[];cursor=0
  # Preserve all original whitespace tokens even when the second aligner splits punctuation differently.
  for text in line['text'].split():
   group=[];target=''.join(normalize(text))
   while cursor<len(raw) and len(''.join(normalize(' '.join(w['word'] for w in group))))<len(target):group.append(raw[cursor]);cursor+=1
   if group and ''.join(normalize(' '.join(w['word'] for w in group)))==target:
    candidate.append({'text':text,'start':group[0].get('start'),'end':group[-1].get('end'),'score':min((w.get('probability') or 0) for w in group),'engine':'whisper-vocals'})
   else:candidate.append({'text':text,'start':None,'end':None,'score':0})
  bounds={**line,'start':max(0,line['start']-.5),'end':min(duration,line['end']+.75)}
  candidate=accepted_words(candidate,bounds)
  old=line.get('words',[])
  if candidate:
   if len(old)==len(candidate):
    candidate=[a if a.get('score',0)>=b.get('score',0) else b for a,b in zip(old,candidate)]
    candidate=accepted_words(candidate,bounds)
   if candidate and sum(w['start'] is not None for w in candidate)>=sum(w.get('start') is not None for w in old):
    line['words']=candidate;valid=[w for w in candidate if w['start'] is not None];line['start']=min(line['start'],valid[0]['start']);line['end']=max(line['end'],valid[-1]['end'])
 data['lines'].sort(key=lambda l:l['start']);data['engines']=['wav2vec2-mix','demucs-htdemucs','whisper-base-mix','whisper-small-vocals']
 write(destination,data)
if __name__=='__main__':run(*sys.argv[1:])

