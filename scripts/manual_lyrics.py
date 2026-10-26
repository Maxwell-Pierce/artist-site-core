"""Apply separately stored Studio edits after analysis; never rewrite artist source."""
import json,math,re
from pathlib import Path

def finite(value):return isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)
def validate_edit(edit,ident,duration):
    if edit.get('schemaVersion')!=1 or edit.get('id')!=ident or not re.fullmatch(r'[a-zA-Z0-9_-]{1,160}',ident):raise ValueError('Invalid manual lyric identity')
    if not finite(edit.get('duration')) or abs(edit['duration']-duration)>.75:raise ValueError('Manual lyric duration no longer matches track '+ident)
    lines=edit.get('lines')
    if not isinstance(lines,list) or len(lines)>3000:raise ValueError('Invalid manual lyric lines')
    for line in lines:
        if not isinstance(line.get('text'),str) or not line['text'].strip() or len(line['text'])>2000:raise ValueError('Manual lyric line needs text')
        start,end=line.get('start'),line.get('end')
        if not finite(start) or not finite(end) or not 0<=start<end<=duration+.05:raise ValueError('Manual lyric line outside track')
        if not isinstance(line.get('words'),list):raise ValueError('Invalid manual word list')
        for word in line['words']:
            if not isinstance(word.get('text'),str):raise ValueError('Manual word needs text')
            a,b=word.get('start'),word.get('end')
            if a is None and b is None:continue
            if not finite(a) or not finite(b) or not start-.05<=a<b<=end+.05:raise ValueError('Manual word outside lyric line')
    return edit

def apply_editor_edits(site,dest):
    tracks={track['id']:track for track in json.loads((dest/'tracks.json').read_text())}
    for path in (site/'lyric-edits').glob('*.json'):
        if path.stem not in tracks:continue
        edit=validate_edit(json.loads(path.read_text()),path.stem,tracks[path.stem]['duration'])
        target=dest/'lyrics'/path.name
        original=json.loads(target.read_text()) if target.exists() else {'id':path.stem,'source':'artist-studio'}
        original.update(lines=edit['lines'],timingSource='manual-editor',manualEditedAt=edit.get('manualEditedAt'),alignment='word' if any(w.get('start') is not None for line in edit['lines'] for w in line['words']) else 'line')
        target.write_text(json.dumps(original,ensure_ascii=False))
