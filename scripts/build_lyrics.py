import os
"""Incremental multi-engine lyric processing with source/audit preservation."""
import json,hashlib,subprocess,sys,os,re
from pathlib import Path
from lyrics_common import clean_lines
ROOT=Path(os.environ.get('ARTIST_SITE_ROOT',Path(__file__).resolve().parents[1]))
VERSION=4

def main():
 config=json.loads((ROOT/'lyric-config.json').read_text());overrides=json.loads((ROOT/'lyric-overrides.json').read_text())
 playlists=json.loads((ROOT/'playlists.json').read_text());tracks={t['id']:t for p in playlists for t in p['tracks']}
 cache=ROOT/'.cache/lyrics-v3';cache.mkdir(parents=True,exist_ok=True);out=ROOT/'lyrics';out.mkdir(exist_ok=True)
 report=[];review=[];processed=0;budget=int(os.environ.get('LYRIC_MAX_NEW_TRACKS',config['maxNewTracksPerRun']))
 for track in tracks.values():
  lines=clean_lines(track.get('alignedLyrics'),track['duration']);untimed=[]
  for raw in track.get('alignedLyrics',[]) if isinstance(track.get('alignedLyrics'),list) else []:
   text=re.sub(r'\[[^\]]+\]','',raw.get('text','')).strip() if isinstance(raw,dict) else ''
   if text and not re.fullmatch(r'\[[^\]]+\]',text):untimed.append(text)
  raw=track.get('lyrics','')
  if isinstance(raw,str) and not raw.startswith('$'):
   untimed.extend(s.strip() for s in raw.splitlines() if s.strip() and not re.fullmatch(r'\[[^\]]+\]',s.strip()))
  untimed=list(dict.fromkeys(untimed))
  data={'id':track['id'],'audio':track['audio'],'language':config.get('language','auto'),'source':'treblo','alignment':'line','lines':lines,'untimed':untimed,'overrides':overrides.get(track['id'],{}),'autoCorrect':config['autoCorrect'],'pipelineVersion':VERSION}
  fingerprint=hashlib.sha256(json.dumps({'version':VERSION,'audio':track['audio'],'lines':lines,'untimed':untimed,'config':config,'overrides':data['overrides']},sort_keys=True).encode()).hexdigest();stored=cache/(fingerprint+'.json')
  if stored.exists():data=json.loads(stored.read_text());status='cached'
  elif (lines or untimed) and processed<budget:
   processed+=1;source=cache/(fingerprint+'.input.json');result=cache/(fingerprint+'.result.json');source.write_text(json.dumps(data));status='processed'
   try:
    if lines:
     subprocess.run([sys.executable,str(Path(__file__).with_name('align_words.py')),str(source),str(result)],check=True,timeout=600)
     data=json.loads(result.read_text());data['baselineWords']=sum(sum(w.get('start') is not None for w in l.get('words',[])) for l in data['lines']);source.write_text(json.dumps(data))
    subprocess.run([sys.executable,str(Path(__file__).with_name('enhance_lyrics.py')),str(source),str(result)],check=True,timeout=1800)
    data=json.loads(result.read_text());stored.write_text(json.dumps(data))
   except (subprocess.SubprocessError,OSError,ValueError) as e:
    if result.exists():
     try:data=json.loads(result.read_text())
     except ValueError:pass
    data.setdefault('warnings',[]).append(str(e));status='retry-needed';print(f'Partial fallback for {track["id"]}: {e}',flush=True)
   finally:source.unlink(missing_ok=True);result.unlink(missing_ok=True)
  else:status='queued' if lines or untimed else 'no-lyrics'
  timed=sum(sum(w.get('start') is not None for w in l.get('words',[])) for l in data['lines']);total=sum(len(l['text'].split()) for l in data['lines'])
  data['alignment']='word' if timed else 'line'
  public={k:v for k,v in data.items() if k not in ('audio','overrides','autoCorrect')}
  (out/(track['id']+'.json')).write_text(json.dumps(public,ensure_ascii=False))
  row={'id':track['id'],'title':track['title'],'status':status,'lines':len(data['lines']),'alignedWords':timed,'totalWords':total,'baselineWords':data.get('baselineWords',0),'coverage':round(timed/max(total,1),3),'mode':data['alignment'],'corrections':len(data.get('corrections',[])),'reviewSuggestions':len(data.get('review',[])),'warnings':data.get('warnings',[])};report.append(row)
  review.append({'id':track['id'],'title':track['title'],'corrections':data.get('corrections',[]),'suggestions':data.get('review',[])})
  print(f'{track["title"]}: {timed}/{total} words; {status}',flush=True)
 (out/'report.json').write_text(json.dumps(report,indent=2));(out/'review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2))
 if os.environ.get('GITHUB_STEP_SUMMARY'):
  with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write('## Multi-engine lyric coverage\n\n'+ '\n'.join(f'- {r["title"]}: {r["alignedWords"]}/{r["totalWords"]} words, {r["corrections"]} corrections, {r["status"]}' for r in report))
if __name__=='__main__':main()

