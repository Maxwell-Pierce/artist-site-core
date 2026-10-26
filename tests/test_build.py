import importlib.util,json,sys,tempfile,unittest
from pathlib import Path
CORE=Path(__file__).parents[1];sys.path.insert(0,str(CORE/'scripts'))
from build import build,load_config,json_script

def config(name='Sample Artist'):
 return {'name':name,'nameFirst':'Sample ','nameLast':'Artist','slug':'sample-artist','initials':'AS','tagline':'Own sound','description':'A & B','theme':{'bg':'#101820','gold':'#d0ad70'},'entrance':{'portrait':'assets/mark.svg','effect':'fade'},'hero':{'eyebrow':'LISTEN','title':'Sound','accent':'In motion','description':'A new world','caption':'Tune in'},'about':{'title':'About','text':'Artist-owned copy'}}
class BuildTests(unittest.TestCase):
 def test_build_without_audio_deps_preserves_source_and_isolates_brand(self):
  with tempfile.TemporaryDirectory() as tmp:
   site=Path(tmp)/'site';site.mkdir();(site/'artist.json').write_text(json.dumps(config('A < B')));(site/'playlists.json').write_text('[]');(site/'lyrics').mkdir()
   original={'id':'sample','lines':[{'text':'hello world','start':1,'end':3,'words':[]}]}
   (site/'lyrics/sample.json').write_text(json.dumps(original));(site/'lyrics/report.json').write_text('[]');(site/'builder.json').write_text('{"enabled":true}')
   dest=build(site,Path(tmp)/'out');page=(dest/'index.html').read_text()
   self.assertIn('Core '+(CORE/'VERSION').read_text().strip(),(dest/'admin/index.html').read_text())
   self.assertIn('A &lt; B',page);self.assertIn('id="artist-config"',page);self.assertNotIn('DiscoPrincess',page);self.assertNotIn('discoprincess-avatar',(dest/'app.js').read_text())
   self.assertEqual(json.loads((site/'lyrics/sample.json').read_text()),original)
   self.assertEqual(json.loads((dest/'lyrics/sample.json').read_text())['estimatedWords'],2)
   self.assertEqual(json.loads((dest/'manifest.webmanifest').read_text())['name'],'A < B')
   self.assertTrue((dest/'assets/icon-192.png').read_bytes().startswith(b'\x89PNG'))
 def test_icons_version_shell_and_preserve_artist_artwork(self):
  with tempfile.TemporaryDirectory() as tmp:
   site=Path(tmp)/'site';site.mkdir();(site/'artist.json').write_text(json.dumps(config()));(site/'assets').mkdir()
   for size in [180,192,512]:(site/f'assets/icon-{size}.png').write_bytes(b'artist-icon-one')
   out=build(site,Path(tmp)/'out');first=json.loads((out/'manifest.webmanifest').read_text())['icons'][0]['src'];worker=(out/'sw.js').read_text()
   self.assertIn('?v=',first);self.assertIn(first,worker);self.assertEqual((out/'assets/icon-192.png').read_bytes(),b'artist-icon-one')
   (site/'assets/icon-192.png').write_bytes(b'artist-icon-two')
   out=build(site,Path(tmp)/'out');second=json.loads((out/'manifest.webmanifest').read_text())['icons'][0]['src']
   self.assertNotEqual(first,second);self.assertNotEqual(worker,(out/'sw.js').read_text())
 def test_config_validation(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp)
   for update in [{'slug':'../bad'},{'theme':{'bg':'url(evil)'}},{'entrance':{'portrait':'../secret'}}]:
    (root/'artist.json').write_text(json.dumps({**config(),**update}))
    with self.assertRaises(ValueError):load_config(root)
 def test_script_json_cannot_break_out(self):
  encoded=json_script({'name':'</script><script>alert(1)</script>'})
  self.assertNotIn('<',encoded);self.assertEqual(json.loads(encoded)['name'],'</script><script>alert(1)</script>')
if __name__=='__main__':unittest.main()
