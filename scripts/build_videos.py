import os
"""Discover hero videos on every deployment; no manual playlist required."""
import json,re
from pathlib import Path
from urllib.parse import quote
ROOT=Path(os.environ.get('ARTIST_SITE_ROOT',Path(__file__).resolve().parents[1]))
def main():
    videos=[quote(p.relative_to(ROOT).as_posix(),safe='/') for p in sorted((ROOT/'assets').rglob('*')) if p.is_file() and p.suffix.lower() in {'.mp4','.webm','.m4v','.mov'}]
    page=ROOT/'index.html'
    data=json.dumps(videos).replace('</','<\\/')
    updated,n=re.subn(r'<script id="hero-video-data" type="application/json">.*?</script>',lambda _:f'<script id="hero-video-data" type="application/json">{data}</script>',page.read_text(),flags=re.S)
    if n!=1:raise ValueError('Hero video marker missing')
    page.write_text(updated)
    print(f'Discovered {len(videos)} hero videos')
if __name__=='__main__':main()

