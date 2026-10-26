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
