import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'scripts'))
from lyrics_common import clean_lines,accepted_words,correction_candidate,alignment_lanes
class LyricsTests(unittest.TestCase):
 def test_invalid_and_section_labels_removed(self):
  lines=clean_lines([{'text':'[Verse]','start':0,'end':1},{'text':'hello world','start':1,'end':3},{'text':'bad','start':4,'end':2},{'text':'outside','start':30,'end':32}],10)
  self.assertEqual(len(lines),1);self.assertEqual(lines[0]['originalText'],'hello world')
 def test_keep_good_words_and_all_text(self):
  line={'text':'hello world','start':1,'end':3};words=[{'text':'hello','start':1,'end':1.5,'score':.8},{'text':'world','start':2,'end':2.5,'score':.01}]
  kept=accepted_words(words,line);self.assertEqual(len(kept),2);self.assertEqual(kept[0]['start'],1);self.assertIsNone(kept[1]['start']);self.assertEqual(kept[1]['text'],'world')
 def test_bad_order_not_animated(self):
  line={'text':'hello world','start':1,'end':3};words=[{'text':'hello','start':2,'end':2.5,'score':.8},{'text':'world','start':1,'end':1.5,'score':.8}]
  self.assertIsNone(accepted_words(words,line)[1]['start'])
 def test_correction_requires_independent_agreement(self):
  a=[{'text':w,'start':i,'end':i+.4,'score':.95} for i,w in enumerate('turn on the light'.split())]
  self.assertEqual(correction_candidate('turn on a light',a,a),'turn on the light')
  b=[dict(w) for w in a];b[2]['text']='your';self.assertIsNone(correction_candidate('turn on a light',a,b))
  b=[dict(w) for w in a];b[2]['score']=.4;self.assertIsNone(correction_candidate('turn on a light',a,b))
 def test_overlapping_vocals_split_into_safe_lanes(self):
  lines=[{'text':'lead','start':2,'end':6},{'text':'backing','start':3,'end':4},{'text':'next','start':7,'end':8}]
  lanes=alignment_lanes(lines,10);self.assertEqual(sum(len(lane) for lane in lanes),3)
  for lane in lanes:
   for a,b in zip(lane,lane[1:]):self.assertLessEqual(a[1]['end'],b[1]['start'])
 def test_embedded_section_labels_removed(self):
  lines=clean_lines([{'text':'[Hook]\nHello world','start':1,'end':3}],10);self.assertEqual(lines[0]['text'],'Hello world')
 def test_radical_rewrite_rejected(self):
  a=[{'text':w,'start':i,'end':i+.4,'score':.99} for i,w in enumerate('thank you for watching'.split())]
  self.assertIsNone(correction_candidate('we dance in moonlight',a,a))
if __name__=='__main__':unittest.main()

