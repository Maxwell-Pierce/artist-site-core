import sys,json,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'scripts'))
from manual_lyrics import validate_edit,apply_editor_edits
from estimate_lyrics import build_estimates
class ManualLyricTests(unittest.TestCase):
 def edit(self):return {'schemaVersion':1,'id':'track','duration':10,'lines':[{'text':'My line','start':1,'end':3,'words':[{'text':'My','start':1,'end':2,'timingSource':'manual'},{'text':'line','start':2,'end':3,'timingSource':'manual'}]}]}
 def test_bounds_and_identity(self):
  e=self.edit();validate_edit(e,'track',10)
  for change in [{'id':'../bad'},{'duration':12},{'lines':[{'text':'line','start':0,'end':11,'words':[]}]}]:
   with self.assertRaises(ValueError):validate_edit({**e,**change},'track',10)
 def test_analysis_results_never_overwrite_separate_editor_source(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=root/'site';dest=root/'out';(site/'lyric-edits').mkdir(parents=True);(dest/'lyrics').mkdir(parents=True)
   (site/'lyric-edits/track.json').write_text(json.dumps(self.edit()));(dest/'tracks.json').write_text('[{"id":"track","duration":10}]');(dest/'lyrics/track.json').write_text('{"id":"track","language":"en","lines":[]}');(dest/'lyrics/report.json').write_text('[{"id":"track"}]')
   original=(site/'lyric-edits/track.json').read_text();apply_editor_edits(site,dest);build_estimates(dest/'lyrics');data=json.loads((dest/'lyrics/track.json').read_text());self.assertEqual(data['lines'][0]['text'],'My line');self.assertEqual(data['manualWords'],2);self.assertEqual(data['recognizedWords'],0);self.assertEqual(data['language'],'en');self.assertEqual((site/'lyric-edits/track.json').read_text(),original)
