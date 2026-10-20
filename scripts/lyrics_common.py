import os
"""Preserve text; accept individual timestamps, never fabricate missing words."""
import math,re,unicodedata
from difflib import SequenceMatcher

def normalize(text):
 return re.findall(r"[\w']+",unicodedata.normalize('NFKC',text).casefold())
def clean_lines(raw,duration):
 lines=[]
 if not isinstance(raw,list):return lines
 for row in raw:
  if not isinstance(row,dict):continue
  text=re.sub(r'\[[^\]]+\]','',str(row.get('text',''))).strip()
  if not text or re.fullmatch(r'\[[^\]]+\]',text):continue
  start,end=row.get('start'),row.get('end')
  if not all(isinstance(t,(float,int)) and math.isfinite(t) for t in (start,end)):continue
  if not 0<=start<end<=duration+.5 or end-start>35:continue
  lines.append({'text':text,'originalText':text,'start':round(start,3),'end':round(end,3),'words':[]})
 return sorted(lines,key=lambda l:l['start'])
def accepted_words(words,line):
 if len(words)!=len(line['text'].split()):return []
 result=[];previous=line['start']-.05;good=0
 for word in words:
  w=dict(word);start,end=w.get('start'),w.get('end')
  valid=all(isinstance(t,(int,float)) and math.isfinite(t) for t in (start,end))
  valid=valid and line['start']-.05<=start<end<=line['end']+.05 and start>=previous and w.get('score',0)>=.15
  if valid:previous=end;good+=1
  else:w.update(start=None,end=None,score=0)
  result.append(w)
 return result if good else []
def correction_candidate(original,a,b):
 """Independent decoding agreement is evidence, not proof; retain audit history."""
 if not a or not b or normalize(' '.join(w['text'] for w in a))!=normalize(' '.join(w['text'] for w in b)):return None
 text=' '.join(w['text'].strip() for w in a).strip();old,new=normalize(original),normalize(text)
 if old==new or not old or not new:return None
 if min(w.get('score',0) for w in a+b)<.85:return None
 if not .65<=len(new)/len(old)<=1.4:return None
 if SequenceMatcher(None,old,new).ratio()<.65:return None
 if len(a)!=len(b) or max(abs(x['start']-y['start']) for x,y in zip(a,b))>.5:return None
 return text

def alignment_lanes(lines,duration):
 lanes=[]
 for index,line in sorted(enumerate(lines),key=lambda pair:pair[1]['start']):
  segment={'start':max(0,line['start']-.5),'end':min(duration,line['end']+.75),'text':line['text']}
  if segment['end']<=segment['start']:continue
  lane=next((lane for lane in lanes if lane[-1][1]['end']<=segment['start']),None)
  if lane is None:lane=[];lanes.append(lane)
  lane.append((index,segment))
 return lanes

