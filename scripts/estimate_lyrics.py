import os
"""Cheap playback timing fallback; never changes recognized word timestamps."""
import json
import math
import re


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def weight(text):
    # Vowel groups approximate syllables; character length helps unfamiliar words.
    return max(1, len(re.findall(r'[aeiouyà-ÿ]+', text.casefold())), len(text.strip('.,!?;:')) / 5)


def estimate_line(line):
    start, end = line.get('start'), line.get('end')
    tokens = line.get('text', '').split()
    if not tokens or not finite(start) or not finite(end) or not 0 <= start < end or end - start > 35:
        return 0
    words = line.get('words') or [{'text': token, 'start': None, 'end': None, 'score': 0} for token in tokens]
    if len(words) != len(tokens) or any(w.get('text', '').strip() != token for w, token in zip(words, tokens)):
        return 0
    anchors = []
    previous = -1
    for i, word in enumerate(words):
        a, b = word.get('start'), word.get('end')
        if finite(a) and finite(b):
            if not 0 <= a < b or a < previous:
                return 0  # Keep questionable source data untouched.
            anchors.append(i)
            previous = b
    count = 0
    for left, right in zip([-1] + anchors, anchors + [len(words)]):
        first, stop = left + 1, right
        if first == stop:
            continue
        a = words[left]['end'] if left >= 0 else start
        b = words[right]['start'] if right < len(words) else end
        if b - a < (stop - first) * .055:
            continue  # No room: do not compress words or move recognized anchors.
        weights = [weight(tokens[i]) for i in range(first, stop)]
        cursor, total = a, sum(weights)
        for i, share in zip(range(first, stop), weights):
            until = b if i == stop - 1 else cursor + (b - a) * share / total
            words[i] = {**words[i], 'start': cursor, 'end': until, 'score': 0,
                        'estimated': True, 'timingSource': 'estimated-between-anchors' if anchors else 'estimated-line-rhythm'}
            cursor = until
            count += 1
    line['words'] = words
    return count


def build_estimates(root):
    report_path = root / 'report.json'
    report = json.loads(report_path.read_text()) if report_path.exists() else []
    rows = {row['id']: row for row in report}
    estimated_total = 0
    for path in root.glob('*.json'):
        if path.name in ('report.json', 'review.json'):
            continue
        data = json.loads(path.read_text())
        for line in data.get('lines', []):
            estimate_line(line)
        words = [w for line in data.get('lines', []) for w in line.get('words', [])]
        recognized = sum(finite(w.get('start')) and finite(w.get('end')) and not w.get('estimated', False) for w in words)
        estimated = sum(bool(w.get('estimated')) for w in words)
        total = sum(len(line.get('text', '').split()) for line in data.get('lines', []))
        data['estimatedWords'] = estimated
        data['recognizedWords'] = recognized
        if recognized + estimated:
            data['alignment'] = 'word'
        path.write_text(json.dumps(data, ensure_ascii=False))
        if data.get('id') in rows:
            rows[data['id']].update(estimatedWords=estimated, recognizedWords=recognized,
                                  playbackCoverage=round((recognized + estimated) / max(total, 1), 3))
        estimated_total += estimated
    report_path.write_text(json.dumps(report, indent=2))
    return estimated_total

