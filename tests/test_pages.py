import json,tempfile,unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'scripts'))
from build import build
from pages import load_pages
from test_build import config
class EditorTests(unittest.TestCase):
 def site(self,root):
  site=root/'site';site.mkdir();(site/'artist.json').write_text(json.dumps(config()));return site
 def test_opt_in_and_legacy_html_preserved(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=self.site(root);(site/'story.html').write_text('<html><head></head><main>Handcrafted story</main></html>')
   out=build(site,root/'out');self.assertFalse((out/'admin').exists());self.assertIn('Handcrafted story',(out/'story.html').read_text())
   (site/'builder.json').write_text('{"enabled":true}');out=build(site,root/'out');self.assertTrue((out/'admin/studio.mjs').exists())
 def test_safe_structured_page_and_navigation(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=self.site(root)
   (site/'pages.json').write_text(json.dumps({'schemaVersion':1,'pages':[{'slug':'story','title':'<Story>','description':'A "story"','blocks':[{'type':'text','heading':'<script>','text':'<img onerror=alert(1)>'},{'type':'link','href':'https://example.com','text':'Visit'}]}]}))
   out=build(site,root/'out');text=(out/'story.html').read_text();self.assertIn('&lt;Story&gt;',text);self.assertIn('&lt;img onerror',text);self.assertIn('href="index.html#music"',text);self.assertIn('href="story.html"',(out/'index.html').read_text());self.assertNotIn('<img onerror',text)
 def test_invalid_pages_never_overwrite_source(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=self.site(root);(site/'story.html').write_text('owned')
   for slug,blocks in [('story',[]),('../escape',[]),('admin',[]),('valid',[{'type':'link','href':'javascript:alert(1)'}]),('valid',[{'type':'image','src':'//evil.test/x'}])]:
    (site/'pages.json').write_text(json.dumps({'schemaVersion':1,'pages':[{'slug':slug,'title':'Title','blocks':blocks}]}))
    with self.assertRaises(ValueError):load_pages(site)
   self.assertEqual((site/'story.html').read_text(),'owned')
if __name__=='__main__':unittest.main()

class AdminAssetVersionTests(unittest.TestCase):
 def test_versions_html_static_and_dynamic_imports_with_one_graph_hash(self):
  from admin_assets import version_admin
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'index.html').write_text('<script type="module" src="studio.mjs"></script><link href="style.css">');(root/'studio.mjs').write_text("import {x} from './model.mjs'; const lazy=()=>import('./media.mjs');");(root/'model.mjs').write_text('export const x=1;');(root/'media.mjs').write_text('export const y=2;')
   version=version_admin(root)
   self.assertIn('studio.mjs?v='+version,(root/'index.html').read_text());self.assertIn('./model.mjs?v='+version,(root/'studio.mjs').read_text());self.assertIn('./media.mjs?v='+version,(root/'studio.mjs').read_text())

class VisualContentTests(unittest.TestCase):
 def test_home_and_page_sections_publish_without_mutating_templates(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=root/'site';site.mkdir();(site/'artist.json').write_text(json.dumps(config()))
   blocks=[{'type':'text','heading':'A story','text':'legacy fallback','richText':'<b onclick="bad()">Bold &amp; safe</b><img src=x onerror=bad()><ul><li>One</li></ul>'},{'type':'image','src':'assets/mark.svg','alt':'Artwork','caption':'Caption'},{'type':'link','href':'https://example.com','text':'Listen'}]
   data={'schemaVersion':1,'pages':[{'slug':'story','title':'Story','blocks':blocks}], 'home':{'blocks':blocks}}
   (site/'pages.json').write_text(json.dumps(data));out=build(site,root/'out')
   for name in ['index.html','story.html']:
    text=(out/name).read_text();self.assertIn('<b>Bold &amp; safe</b>',text);self.assertIn('<ul><li>One</li></ul>',text);self.assertIn('alt="Artwork"',text);self.assertIn('>Listen ↗',text);self.assertNotIn('onclick="bad()',text);self.assertNotIn('onerror=bad()',text)
    self.assertEqual(text.count('<b>Bold &amp; safe</b>'),1)
   self.assertEqual(json.loads((site/'pages.json').read_text()),data)
 def test_invalid_home_sections_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   site=Path(tmp)
   for home in [{}, {'blocks':[{'type':'image','src':'javascript:x'}]}, {'blocks':[{'type':'link','href':'//bad.test'}]}, {'blocks':[{'type':'unknown'}]}]:
    (site/'pages.json').write_text(json.dumps({'schemaVersion':1,'pages':[],'home':home}))
    with self.assertRaises(ValueError):load_pages(site)
