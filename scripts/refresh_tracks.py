import os
"""Sync public Treblo playlists, preserving source order and failing before writes."""
import json,re,urllib.request,html,os,tempfile,hashlib
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(os.environ.get('ARTIST_SITE_ROOT',Path(__file__).resolve().parents[1]))
UUID=re.compile(r'^[0-9a-f-]{36}$')
def objects(page):
    decoder=json.JSONDecoder()
    text=''.join(json.loads(x) for x in re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)',page))
    for m in re.finditer(r'\{',text):
        try: obj,_=decoder.raw_decode(text[m.start():])
        except ValueError: continue
        if isinstance(obj,dict): yield obj

def image(value):
    if not value or value=='$undefined':return 'assets/mark.svg'
    return value if value.startswith('https://') else 'https://scdn.treblo.com/images/'+value

def extract_playlist(page,pid):
    objs=list(objects(page))
    source=next((d for d in objs if d.get('id')==pid and d.get('type')=='playlist' and isinstance(d.get('songs'),list)),None)
    if source is None or source.get('visibility')!='public':raise ValueError('Public playlist payload missing: '+pid)
    details={d['id']:d for d in objs if d.get('songPath') and 'tags' in d}
    songs=[];seen=set()
    for raw in source['songs']:
        if raw.get('visibility')!='public':continue
        d={**raw,**details.get(raw['id'],{})}
        if d['id'] in seen:continue
        seen.add(d['id'])
        if not d.get('songPath','').startswith('https://cdn.treblo.com/'):raise ValueError('Missing playable stream: '+d['id'])
        songs.append(dict(id=d['id'],title=d['title'],artist=d.get('artistUsername','Unknown artist'),audio=d['songPath'],artwork=image(d.get('artwork')),duration=d.get('duration',0),tags=d.get('tags',[]),alignedLyrics=d.get('alignedLyrics',[]),lyrics=d.get('lyrics',''),likes=d.get('likes'),plays=d.get('playCount'),comments=d.get('commentsCount'),url='https://treblo.com/song/'+d['id']))
    # Explicitly check count fields when supplied: never silently publish a partial page.
    count=source.get('songCount',source.get('songsCount'))
    if isinstance(count,int) and count!=len(source['songs']):raise ValueError('Incomplete playlist payload')
    return dict(id=pid,title=source['title'],description=source.get('description',''),artwork=image(source.get('artwork')),url='https://treblo.com/playlist/'+pid,likes=source.get('likes'),comments=source.get('commentsCount'),tracks=songs,trackCount=len(songs),duration=sum(t['duration'] for t in songs),trackLikes=sum(t['likes'] or 0 for t in songs),plays=sum(t['plays'] or 0 for t in songs) if all(t['plays'] is not None for t in songs) else None,artists=len(set(t['artist'] for t in songs)))
def esc(x):return html.escape(str(x),quote=True)
def duration(s):
    h,m=divmod(round(s/60),60)
    return f'{h} hr {m:02d} min' if h else f'{m} min'
def stats(p):
    icons={
      'tracks':'M9 18V5l11-2v13M9 8l11-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
      'listening':'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      'playlist likes':'M20 5c-3-3-7-1-8 1C9 1 2 3 3 9c1 5 9 11 9 11s8-6 9-11c0-2 0-3-1-4Z',
      'track likes':'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
      'track plays':'m9 5 11 7-11 7ZM4 5v14',
      'artists':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9M15 3.1a4 4 0 0 1 0 7.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
      'playlist comments':'M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4ZM7 8h10M7 12h7'}
    pairs=[(p['trackCount'],'tracks'),(duration(p['duration']),'listening'),(p['likes'],'playlist likes'),(p['trackLikes'],'track likes'),(p['plays'],'track plays'),(p['artists'],'artists'),(p['comments'],'playlist comments')]
    tiles=[]
    for value,label in pairs:
        if value is None: continue
        display=f'{value:,}' if isinstance(value,int) else value
        icon=f'<i class="stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="{icons[label]}"/></svg></i>'
        tiles.append(f'<div class="stat-tile">{icon}<strong>{esc(display)}</strong><span>{label}</span></div>')
    return '<div class="playlist-stats">'+''.join(tiles)+'</div>'
def embed(h,tracks):
    data=json.dumps(tracks,ensure_ascii=False).replace('</','<\\/')
    h,n=re.subn(r'<script id="track-data" type="application/json">.*?</script>',lambda _:f'<script id="track-data" type="application/json">{data}</script>',h,flags=re.S)
    if n!=1:raise ValueError('Catalog marker missing')
    return h

def build(playlists):
    artist=json.loads((ROOT/'artist.json').read_text()) if (ROOT/'artist.json').exists() else {'name':'Artist'}
    name=artist['name'];name_upper=name.upper()
    home=(ROOT/'index.html').read_text()
    version=hashlib.sha256((ROOT/'style.css').read_bytes()).hexdigest()[:12]
    script_version=hashlib.sha256((ROOT/'app.js').read_bytes()).hexdigest()[:12]
    home=re.sub(r'src="app\.js(?:\?v=[^"]*)?"',f'src="app.js?v={script_version}"',home)
    home=re.sub(r'href="style\.css(?:\?v=[^"]*)?"',f'href="style.css?v={version}"',home)
    cards=''
    for i,p in enumerate(playlists):
        href='playlists/'+p['id']+'.html'
        cards+=f'<article class="playlist-feature" id="collection-{esc(p["id"])}"><a class="playlist-cover" href="{href}"><img src="{esc(p["artwork"])}" alt="{esc(p["title"])} artwork" loading="lazy" width="600" height="600"><span>Explore playlist ↗</span></a><div class="playlist-feature-copy"><p class="eyebrow">COLLECTION {i+1:02d} / CURATED BY {esc(name_upper)}</p><h3><a href="{href}">{esc(p["title"])}</a></h3>'+(f'<p>{esc(p["description"])}</p>' if p['description'] else '')+stats(p)+f'<a class="button primary" href="{href}">Enter the playlist <span>↗</span></a></div></article>'
    home,n=re.subn(r'<!-- PLAYLISTS START -->.*?<!-- PLAYLISTS END -->',lambda _: '<!-- PLAYLISTS START -->'+cards+'<!-- PLAYLISTS END -->',home,flags=re.S)
    if n!=1:raise ValueError('Playlist section marker missing')
    unique={}
    for p in playlists:
        for t in p['tracks']:unique.setdefault(t['id'],t)
    home=embed(home,playlists[0]['tracks'] if playlists else [])
    outputs={'index.html':home,'tracks.json':json.dumps(list(unique.values()),ensure_ascii=False,indent=2)+'\n','playlists.json':json.dumps(playlists,ensure_ascii=False,indent=2)+'\n'}
    manifesto=ROOT/'manifesto.html'
    if manifesto.exists():
        outputs['manifesto.html']=re.sub(r'href="style\.css(?:\?v=[^"]*)?"',f'href="style.css?v={version}"',re.sub(r'src="app\.js(?:\?v=[^"]*)?"',f'src="app.js?v={script_version}"',manifesto.read_text()))
    for p in playlists:
        page=home.replace('<head>','<head>\n<base href="../">',1)
        page=re.sub(r'<title>.*?</title>',lambda _: '<title>'+esc(p['title'])+' | '+esc(name)+'</title>',page)
        page=re.sub(r'<meta name="description"[^>]*>',lambda _:f'<meta name="description" content="{esc(p["title"])} — {p["trackCount"]} tracks, curated by {esc(name)}.">',page)
        page=page.replace('href="#home"','href="index.html#home"').replace('href="#about"','href="index.html#about"').replace('href="#community"','href="index.html#community"')
        main=f'''<main class="playlist-page"><section class="section playlist-intro"><a class="back-link" href="index.html#music">← All collections</a><div class="playlist-feature"><div class="playlist-cover"><img src="{esc(p['artwork'])}" alt="{esc(p['title'])} artwork" width="600" height="600"></div><div class="playlist-feature-copy"><p class="eyebrow">THE {esc(name_upper)} COLLECTION</p><h1>{esc(p['title'])}</h1>{stats(p)}<button class="button primary" id="begin">▶ Play playlist</button> <a class="text-link" href="{esc(p['url'])}" target="_blank" rel="noopener">View on Treblo ↗</a></div></div></section><section class="section playlist-tracks" id="music"><div class="section-heading"><div><p class="eyebrow">THE FULL SELECTION</p><h2>Follow the <em>feeling.</em></h2></div><button class="shuffle" id="shuffle-all">⇄ Shuffle the collection</button></div><div class="track-grid" id="tracks"></div><p class="music-note">Likes and plays are public Treblo counts from the latest refresh. Track totals combine the songs in this playlist.</p></section></main>'''
        page=re.sub(r'<main>.*?</main>',lambda _:main,page,flags=re.S)
        page=embed(page,p['tracks'])
        page=page.replace('content="'+esc(name+' — '+artist.get('tagline',''))+'"',f'content="{esc(p["title"])} | {esc(name)}"')
        outputs['playlists/'+p['id']+'.html']=page
    return outputs

def main():
    config=json.loads((ROOT/'catalog-source.json').read_text());playlists=[]
    ids=[item['id'] for item in config['playlists']]
    if len(set(ids))!=len(ids) or any(not UUID.fullmatch(pid) for pid in ids):raise ValueError('Invalid/duplicate playlist IDs')
    for pid in ids:
        req=urllib.request.Request('https://treblo.com/playlist/'+pid,headers={'User-Agent':'ArtistSiteCore/1.0'})
        with urllib.request.urlopen(req,timeout=60) as response:page=response.read().decode()
        playlists.append(extract_playlist(page,pid))
    unique={t['id']:t for p in playlists for t in p['tracks']}
    outputs={'playlists.json':json.dumps(playlists,ensure_ascii=False,indent=2)+'\n','tracks.json':json.dumps(list(unique.values()),ensure_ascii=False,indent=2)+'\n'}
    for name,content in outputs.items():
        target=ROOT/name;temp=target.with_suffix(target.suffix+'.tmp');temp.write_text(content);os.replace(temp,target)
    print('Synced:',', '.join(f"{p['title']} ({p['trackCount']} tracks)" for p in playlists))
if __name__=='__main__':main()


