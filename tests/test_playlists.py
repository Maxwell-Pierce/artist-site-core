import importlib.util,json,unittest,tempfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('refresh',Path(__file__).parents[1]/'scripts/refresh_tracks.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
PID='fc9c7ed2-6dad-46bc-946e-d6cd061907c8'
def page(obj,extras=[]):
    payload='1:'+json.dumps(obj)+'\n2:'+json.dumps(extras)
    return '<script>self.__next_f.push([1,'+json.dumps(payload)+'])</script>'
def song(i,artist='someone'):
    return dict(id=i,title=i,artistUsername=artist,songPath='https://cdn.treblo.com/'+i+'.ogg',visibility='public',duration=100,likes=3)
def playlist(songs):return dict(id=PID,type='playlist',visibility='public',title='Bass',likes=4,songs=songs)
class ParserTests(unittest.TestCase):
    def test_scoped_order_credits_enrichment_and_deduplication(self):
        a,b=song('a'),song('b','other');extra={**a,'tags':['bass'],'playCount':23}
        p=m.extract_playlist(page(playlist([b,a,b]),[extra,song('unrelated')]),PID)
        self.assertEqual([t['id'] for t in p['tracks']],['b','a']);self.assertEqual(p['artists'],2)
        self.assertEqual(p['tracks'][1]['plays'],23);self.assertIsNone(p['plays']);self.assertEqual(p['trackLikes'],6)
    def test_removals_are_reflected(self):
        self.assertEqual(m.extract_playlist(page(playlist([song('a')])),PID)['trackCount'],1)
    def test_malformed_or_partial_payload_rejected(self):
        for obj in [{}, {**playlist([]),'songCount':2},playlist([{**song('a'),'songPath':'javascript:bad'}])]:
            with self.assertRaises(ValueError):m.extract_playlist(page(obj),PID)
    def test_valid_empty_playlist(self):self.assertEqual(m.extract_playlist(page(playlist([])),PID)['trackCount'],0)
    def test_failed_fetch_does_not_write(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'catalog-source.json').write_text(json.dumps({'playlists':[{'id':PID}]}));(root/'tracks.json').write_text('SENTINEL')
            with patch.object(m,'ROOT',root),patch.object(m.urllib.request,'urlopen',side_effect=OSError('source down')):
                with self.assertRaises(OSError):m.main()
            self.assertEqual((root/'tracks.json').read_text(),'SENTINEL')
if __name__=='__main__':unittest.main()

