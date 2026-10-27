import unittest,sys,tempfile,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'scripts'))
from template_content import apply_template_content
from build import build
from test_build import config
class TemplateContentTests(unittest.TestCase):
 def test_static_copy_rich_text_and_media_keep_all_other_bytes(self):
  source='<!doctype html><html><head><style>body{color:red}</style></head><body><header><a href="#music">Music &amp; more</a></header><main><h1>{{hero.title}}</h1><p>A <em>story</em>.</p><img src="assets/old.png"/><video id="hero-video"></video></main><script>const x="Leave this alone";</script></body></html>'
  edits={'t:0':{'original':'Music & more','html':'Listen &amp; explore'},'t:1':{'original':'{{hero.title}}','html':'A <b onclick="evil()">new</b> world'},'a:1':{'original':'assets/old.png','attrs':{'src':'assets/new.png','alt':'Cover "art"'}},'a:2':{'original':'','attrs':{'src':'assets/hero.mp4'}}}
  result=apply_template_content(source,edits)
  self.assertIn('<a href="#music">Listen &amp; explore</a>',result);self.assertIn('<h1>A <b>new</b> world</h1>',result);self.assertIn('<p>A <em>story</em>.</p>',result);self.assertIn('const x="Leave this alone";',result);self.assertIn('src="assets/new.png" alt="Cover &quot;art&quot;"/>',result);self.assertIn('id="hero-video" src="assets/hero.mp4"',result);self.assertNotIn('onclick',result)
 def test_stale_template_or_unsafe_urls_never_silently_apply(self):
  source='<html><body><p>Original</p><img src="assets/old.png"></body></html>'
  for edits in [{'t:0':{'original':'Something else','html':'Wrong'}},{'t:8':{'original':'Original','html':'Wrong'}},{'a:0':{'original':'assets/old.png','attrs':{'src':'javascript:bad()'}}},{'a:0':{'original':'assets/old.png','attrs':{'onerror':'bad()'}}}]:
   with self.assertRaises(ValueError):apply_template_content(source,edits)
 def test_template_edits_are_published_without_touching_source(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=root/'site';site.mkdir();(site/'artist.json').write_text(json.dumps(config()));(site/'builder.json').write_text('{"enabled":true}')
   template=(Path(__file__).parents[1]/'templates/index.html').read_text();(site/'index.html').write_text(template)
   # The first body text is the template's Skip to music link.
   (site/'pages.json').write_text(json.dumps({'schemaVersion':1,'pages':[],'home':{'blocks':[],'overrides':{'t:0':{'original':'Skip to music','html':'Skip to the <b>collection</b>'}}}}))
   out=build(site,root/'out');self.assertIn('Skip to the <b>collection</b>',(out/'index.html').read_text());self.assertEqual((site/'index.html').read_text(),template);self.assertEqual((out/'admin/content-template.txt').read_text(),template)
 def test_collection_fields_survive_generation_on_home_and_detail_pages(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=root/'site';site.mkdir();(site/'artist.json').write_text(json.dumps(config()))
   collection=dict(id='collection-1',title='Original title',description='Original description',artwork='https://example.com/old.png',url='https://example.com/playlist',tracks=[],trackCount=0,duration=0,likes=0,comments=0,trackLikes=0,plays=0,artists=0)
   (site/'playlists.json').write_text(json.dumps([collection]));(site/'pages.json').write_text(json.dumps({'schemaVersion':1,'pages':[],'home':{'blocks':[],'collections':{'collection-1':{'title':'Edited title','description':'New description','artwork':'assets/new.png'}}}}))
   out=build(site,root/'out');home=(out/'index.html').read_text();detail=(out/'playlists/collection-1.html').read_text()
   self.assertIn('Edited title',home);self.assertIn('New description',home);self.assertIn('src="assets/new.png"',home);self.assertIn('Edited title',detail);self.assertEqual(json.loads((site/'playlists.json').read_text())[0]['title'],'Original title')
