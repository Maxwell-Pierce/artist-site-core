import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts'))
from estimate_lyrics import estimate_line

class EstimateTests(unittest.TestCase):
    def test_preserves_anchors_and_fills_gap(self):
        anchor = {'text': 'hello', 'start': 1, 'end': 2, 'score': .9}
        tail = {'text': 'again', 'start': 4, 'end': 5, 'score': .8}
        line = {'text': 'hello beautiful world again', 'start': 1, 'end': 5,
                'words': [anchor.copy(), {'text': 'beautiful'}, {'text': 'world'}, tail.copy()]}
        self.assertEqual(estimate_line(line), 2)
        self.assertEqual(line['words'][0], anchor)
        self.assertEqual(line['words'][-1], tail)
        self.assertEqual(line['words'][1]['start'], 2)
        self.assertEqual(line['words'][2]['end'], 4)
        self.assertGreater(line['words'][1]['end']-2, 4-line['words'][2]['start'])
        self.assertEqual(estimate_line(line), 0)
    def test_whole_line_and_edge_gaps(self):
        line = {'text': 'we dance tonight', 'start': 2, 'end': 5}
        self.assertEqual(estimate_line(line), 3)
        self.assertTrue(all(w['estimated'] and w['score'] == 0 for w in line['words']))
        self.assertEqual(line['words'][0]['start'], 2)
        self.assertEqual(line['words'][-1]['end'], 5)
        line = {'text': 'we dance tonight', 'start': 0, 'end': 6,
                'words': [{'text': 'we'}, {'text': 'dance', 'start': 2, 'end': 3}, {'text': 'tonight'}]}
        self.assertEqual(estimate_line(line), 2)
        self.assertEqual(line['words'][0]['end'], 2)
        self.assertEqual(line['words'][-1]['start'], 3)
    def test_no_room_or_invalid_bounds(self):
        line = {'text': 'a b c', 'start': 0, 'end': 2,
                'words': [{'text': 'a', 'start': 0, 'end': 1}, {'text': 'b'}, {'text': 'c', 'start': 1.01, 'end': 2}]}
        self.assertEqual(estimate_line(line), 0)
        for end in (float('nan'), -1, 50):
            self.assertEqual(estimate_line({'text': 'hello', 'start': 0, 'end': end}), 0)
    def test_overlapping_anchors_untouched(self):
        line = {'text': 'a b c', 'start': 0, 'end': 4, 'words': [
            {'text': 'a', 'start': 1, 'end': 3}, {'text': 'b'}, {'text': 'c', 'start': 2, 'end': 4}]}
        self.assertEqual(estimate_line(line), 0)
        self.assertNotIn('start', line['words'][1])

if __name__ == '__main__': unittest.main()

