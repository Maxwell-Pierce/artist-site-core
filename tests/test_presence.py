import json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'scripts'))
from presence import validate_presence
from build import build
from test_build import config
class PresenceTests(unittest.TestCase):
 def test_optional_and_validation(self):
  validate_presence(config())
  for extra in [{'socials':{'links':[{'platform':'x','url':'javascript:alert(1)'}]}},{'calendar':{'enabled':True,'events':[{'id':'gig','title':'Gig','start':'2030-02-31T12:00:00Z'}]}},{'calendar':{'enabled':True,'timezone':'Made/Up','events':[]}}]:
   with self.assertRaises(ValueError):validate_presence({**config(),**extra})
 def test_public_features_and_studio_assets_are_packaged(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=root/'site';site.mkdir();c={**config(),'socials':{'heading':'Available on','links':[{'platform':'bandcamp','url':'https://example.bandcamp.com'}]},'calendar':{'enabled':True,'timezone':'Europe/Amsterdam','events':[{'id':'gig','title':'Set </script>','start':'2030-06-01T20:00:00+02:00'}]}}
   (site/'artist.json').write_text(json.dumps(c));(site/'builder.json').write_text('{"enabled":true}')
   out=build(site,root/'out');self.assertTrue((out/'presence.mjs').exists());self.assertTrue((out/'admin/presence.mjs').exists());self.assertTrue((out/'admin/connection.mjs').exists());page=(out/'index.html').read_text();self.assertIn('id="presence-config"',page);self.assertNotIn('Set </script>',page);self.assertNotIn('id="presence-config"',(out/'admin/help/index.html').read_text());self.assertIn('.social-links',(out/'style.css').read_text())
 def test_legacy_sites_do_not_load_presence(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);site=root/'site';site.mkdir();(site/'artist.json').write_text(json.dumps(config()));out=build(site,root/'out');self.assertFalse((out/'presence.mjs').exists());self.assertNotIn('presence-config',(out/'index.html').read_text())
