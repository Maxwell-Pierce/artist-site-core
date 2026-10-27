"""Build an artist-owned site from a pinned shared core, without network or models."""
import argparse,hashlib,html,importlib.util,json,os,re,shutil,sys
from pathlib import Path
CORE=Path(__file__).resolve().parents[1]

def load_config(site):
    config=json.loads((site/'artist.json').read_text())
    if not isinstance(config.get('name'),str) or not config['name'].strip(): raise ValueError('artist.json needs a name')
    if not re.fullmatch(r'[a-z0-9-]+',config.get('slug','')): raise ValueError('slug must contain lowercase letters, numbers or hyphens')
    for color in config.get('theme',{}).values():
        if not re.fullmatch(r'#[0-9a-fA-F]{6}',color):raise ValueError('Theme colors must be six-digit hex values')
    portrait=config.get('entrance',{}).get('portrait','assets/mark.svg')
    if Path(portrait).is_absolute() or '..' in Path(portrait).parts or not portrait.startswith('assets/'):raise ValueError('Portrait must be inside assets/')
    from presence import validate_presence
    validate_presence(config)
    return config

def json_script(value):return json.dumps(value,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
def render(text,config):
    def value(match):
        result=config
        for key in match[1].split('.'):result=result[key]
        return html.escape(str(result),quote=True)
    return re.sub(r'\{\{([a-zA-Z0-9_.]+)\}\}',value,text)

def build(site,dest):
    site=Path(site).resolve();dest=Path(dest).resolve();config=load_config(site)
    if dest==site or site.is_relative_to(dest):raise ValueError('Build destination must not replace source')
    if dest.exists():shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for directory in ['assets','lyrics']:
        if (site/directory).exists():shutil.copytree(site/directory,dest/directory)
        else:(dest/directory).mkdir()
    for name in ['artist.json','playlists.json','tracks.json']:
        if (site/name).exists():shutil.copy2(site/name,dest/name)
        elif name.endswith('.json'):(dest/name).write_text('[]\n')
    for path in site.glob('*.html'):
        (dest/path.name).write_text(render(path.read_text(),config))
    if not (dest/'index.html').exists():
        (dest/'index.html').write_text(render((CORE/'templates/index.html').read_text(),config))
    for name in ['app.js','style.css','sw.js']:
        shutil.copy2(CORE/'runtime'/name,dest/name)
    worker=(dest/'sw.js').read_text().replace('__ARTIST_CACHE__','artist-'+config['slug']+'-shell-')
    (dest/'sw.js').write_text(worker)
    css=(dest/'style.css').read_text()
    palette={'bg':'#100d1b','surface':'#1c1429','ink':'#f3ebdd','muted':'#b8abc6','gold':'#eac584','pink':'#f163bd'}
    for key,old in palette.items():
        new=config.get('theme',{}).get(key,old)
        css=re.sub(re.escape(old)+r'([a-fA-F0-9]{2})?\b',lambda m:new+(m[1] or ''),css,flags=re.I)
    if (site/'custom.css').exists():css+='\n'+(site/'custom.css').read_text()
    (dest/'style.css').write_text(css)
    if (site/'custom.js').exists():
        # Artist extension executes after shared initialization and is never updated by core.
        (dest/'app.js').write_text((dest/'app.js').read_text()+'\n'+(site/'custom.js').read_text())
    public={k:v for k,v in config.items() if k in ['name','nameFirst','nameLast','slug','tagline','storageKey','entrance','captions']}
    marker='<script id="artist-config" type="application/json">'+json_script(public)+'</script>'
    for path in dest.glob('*.html'):
        text=path.read_text();text=re.sub(r'<script id="artist-config".*?</script>','',text,flags=re.S)
        text=text.replace('</head>',marker+'</head>',1)
        path.write_text(text)
    from pages import publish_pages
    publish_pages(site,dest)
    builder_path=site/'builder.json'
    if builder_path.exists() and json.loads(builder_path.read_text()).get('enabled') is True:
        if (site/'admin.html').exists() or (site/'admin').exists():raise ValueError('Editor conflicts with an existing admin page')
        shutil.copytree(CORE/'editor',dest/'admin')
        for studio in (dest/'admin').glob('*.html'):
            studio.write_text(studio.read_text().replace('Core dev','Core '+html.escape((CORE/'VERSION').read_text().strip())))
        for name in ['presence.mjs','presence.css','social-icons.mjs']:shutil.copy2(CORE/'runtime'/name,dest/'admin'/name)
    if (dest/'admin').exists():
        from admin_assets import version_admin
        version_admin(dest/'admin')
    os.environ['ARTIST_SITE_ROOT']=str(dest)
    import refresh_tracks,build_videos
    refresh_tracks.ROOT=dest;build_videos.ROOT=dest
    build_videos.main()
    playlists=json.loads((dest/'playlists.json').read_text())
    for name,content in refresh_tracks.build(playlists).items():
        target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(content)
    # New tracks can display supplied line timings while expensive recognition queues.
    from lyrics_common import clean_lines
    report_path=dest/'lyrics/report.json'
    report=json.loads(report_path.read_text()) if report_path.exists() else []
    known={row['id'] for row in report}
    for track in json.loads((dest/'tracks.json').read_text()):
        sidecar=dest/'lyrics'/(track['id']+'.json')
        if sidecar.exists():continue
        lines=clean_lines(track.get('alignedLyrics'),track['duration'])
        data={'id':track['id'],'source':'treblo','alignment':'line','lines':lines,'timingSource':'supplied-lines-awaiting-analysis'}
        sidecar.write_text(json.dumps(data,ensure_ascii=False))
        if track['id'] not in known:
            report.append({'id':track['id'],'title':track['title'],'status':'awaiting-analysis' if lines else 'no-timed-lines','alignedWords':0,'totalWords':sum(len(line['text'].split()) for line in lines),'lines':len(lines)})
    report_path.write_text(json.dumps(report,indent=2))
    from manual_lyrics import apply_editor_edits
    apply_editor_edits(site,dest)
    from estimate_lyrics import build_estimates
    estimated=build_estimates(dest/'lyrics')
    if not playlists:
        text=(dest/'index.html').read_text().replace('<!-- PLAYLISTS START --><!-- PLAYLISTS END -->','<!-- PLAYLISTS START --><div class="catalog-empty"><p class="eyebrow">THE NEXT CHAPTER</p><h3>The collection is taking shape.</h3><p>New playlists will appear here.</p></div><!-- PLAYLISTS END -->')
        (dest/'index.html').write_text(text)
    manifest={'id':'./','name':config['name'],'short_name':config.get('shortName',config['name']),'description':config.get('description',''),'start_url':'./','scope':'./','display':'standalone','background_color':config.get('theme',{}).get('bg','#100d1b'),'theme_color':config.get('theme',{}).get('bg','#100d1b'),'icons':[{'src':f'assets/icon-{size}.png','sizes':f'{size}x{size}','type':'image/png','purpose':'any maskable'} for size in [192,512]]}
    (dest/'manifest.webmanifest').write_text(json.dumps(manifest,indent=2))
    from icons import ensure_icons
    ensure_icons(dest,config)
    # Icon URL and shell cache versions follow the actual artist artwork.
    icon_version=hashlib.sha256(b''.join((dest/'assets'/f'icon-{size}.png').read_bytes() for size in [180,192,512])).hexdigest()[:12]
    for icon in manifest['icons']:icon['src']+='?v='+icon_version
    (dest/'manifest.webmanifest').write_text(json.dumps(manifest,indent=2))
    worker=(dest/'sw.js').read_text().replace("PREFIX+'v1'","PREFIX+'"+icon_version+"'")
    for size in [180,192,512]:worker=worker.replace(f'assets/icon-{size}.png',f'assets/icon-{size}.png?v='+icon_version)
    (dest/'sw.js').write_text(worker)
    for page in dest.rglob('*.html'):
        page.write_text(page.read_text().replace('assets/icon-180.png','assets/icon-180.png?v='+icon_version))
    if not (dest/'offline.html').exists():(dest/'offline.html').write_text('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><p>You are offline. Reconnect to continue listening.</p>')
    # Optional public features: no extra runtime or markup for consumers that do not use them.
    if config.get('socials',{}).get('links') or config.get('calendar',{}).get('enabled'):
        for name in ['presence.mjs','social-icons.mjs']:shutil.copy2(CORE/'runtime'/name,dest/name)
        (dest/'style.css').write_text((dest/'style.css').read_text()+'\n'+(CORE/'runtime/presence.css').read_text())
        presence={k:config[k] for k in ['name','calendar','socials'] if k in config}
        payload='<script id="presence-config" type="application/json">'+json_script(presence)+'</script><script type="module" src="presence.mjs"></script>'
        for page in dest.rglob('*.html'):
            if 'admin' in page.relative_to(dest).parts:continue
            text=page.read_text().replace('</body>',payload+'</body>',1)
            version=hashlib.sha256((dest/'style.css').read_bytes()).hexdigest()[:12]
            text=re.sub(r'href="style\.css(?:\?v=[^"]*)?"','href="style.css?v='+version+'"',text)
            page.write_text(text)
    (dest/'.nojekyll').touch()
    (dest/'build-info.json').write_text(json.dumps({'coreVersion':(CORE/'VERSION').read_text().strip(),'artist':config['slug'],'estimatedWords':estimated,'coreCommit':os.environ.get('ARTIST_CORE_SHA','local'),'siteCommit':os.environ.get('ARTIST_SITE_SHA',os.environ.get('GITHUB_SHA','local'))}))
    print(f"Built {config['name']}: {len(playlists)} playlists, {estimated} estimated timings; no audio analysis")
    return dest

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--site',default='.');parser.add_argument('--output',default='_site');args=parser.parse_args();build(args.site,args.output)
