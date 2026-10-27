"""Optional structured pages. Existing HTML templates remain the default."""
import html,json,re
from html.parser import HTMLParser
from pathlib import Path

def esc(value):return html.escape(str(value or ''),quote=True)
def safe_url(value,image=False):
    if not isinstance(value,str) or re.search(r'[\\\s\x00-\x1f]',value) or '..' in value:return False
    return bool(re.match(r'https://[^/]+',value,re.I) or re.fullmatch(r'assets/[a-z\d_./-]+' if image else r'(?:#[a-z\d_-]+|[a-z\d_/-]+\.html(?:#[a-z\d_-]+)?)',value,re.I))
def load_pages(site):
    path=site/'pages.json'
    if not path.exists():return []
    data=json.loads(path.read_text())
    if data.get('schemaVersion')!=1 or not isinstance(data.get('pages'),list):raise ValueError('Unsupported pages.json format')
    if 'navigation' in data:
        if not isinstance(data['navigation'],list):raise ValueError('Invalid navigation')
        for link in data['navigation']:
            if not isinstance(link.get('label'),str) or not link['label'].strip() or not safe_url(link.get('href')):raise ValueError('Invalid menu link')
    seen={'index','admin','offline'}
    existing={p.stem for p in site.glob('*.html')}
    for page in data['pages']:
        slug=page.get('slug','')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',slug) or slug in seen or slug in existing:raise ValueError('Page address is invalid, duplicated or conflicts with an existing HTML page: '+slug)
        seen.add(slug)
        if not isinstance(page.get('title'),str) or not page['title'].strip():raise ValueError('Page needs a title')
        if not isinstance(page.get('blocks'),list):raise ValueError('Page needs sections')
        for block in page['blocks']:
            kind=block.get('type')
            if kind not in ['text','image','link']:raise ValueError('Unknown page section')
            if kind=='image' and not safe_url(block.get('src'),True):raise ValueError('Invalid image URL')
            if kind=='link' and not safe_url(block.get('href')):raise ValueError('Invalid link URL')
    if 'home' in data:
        if not isinstance(data['home'],dict) or not isinstance(data['home'].get('blocks'),list):raise ValueError('Invalid home sections')
        for block in data['home']['blocks']:
            if block.get('type') not in ['text','image','link']:raise ValueError('Unknown home section')
            if block['type']=='image' and not safe_url(block.get('src'),True):raise ValueError('Invalid image URL')
            if block['type']=='link' and not safe_url(block.get('href')):raise ValueError('Invalid link URL')
    return data['pages']
class RichContent(HTMLParser):
    allowed={'strong','b','em','i','u','br','p','div','ul','ol','li'}
    def __init__(self):super().__init__(convert_charrefs=True);self.parts=[]
    def handle_starttag(self,tag,attrs):
        if tag in self.allowed:self.parts.append('<'+tag+'>')
    def handle_endtag(self,tag):
        if tag in self.allowed:self.parts.append('</'+tag+'>')
    def handle_data(self,data):self.parts.append(esc(data))
def rich_html(value):
    parser=RichContent();parser.feed(str(value or ''));return ''.join(parser.parts)
def section_html(b):
    if b['type']=='image':return '<figure><img style="max-width:100%;border-radius:16px" src="'+esc(b['src'])+'" alt="'+esc(b.get('alt'))+'"><figcaption>'+esc(b.get('caption'))+'</figcaption></figure>'
    if b['type']=='link':return '<p><a class="text-link" href="'+esc(b['href'])+'">'+esc(b.get('text'))+' ↗</a></p>'
    return ('<h2>'+esc(b['heading'])+'</h2>' if b.get('heading') else '')+('<div style="white-space:pre-wrap">'+rich_html(b['richText'])+'</div>' if 'richText' in b else '<p style="white-space:pre-wrap">'+esc(b.get('text'))+'</p>')
def blocks_html(page):
    return '<section class="section"><p class="eyebrow">'+esc(page.get('label') or page['title'])+'</p><h1>'+esc(page['title'])+'</h1>'+''.join(section_html(b) for b in page['blocks'])+'</section>'
def publish_pages(site,dest):
    pages=load_pages(site)
    home_path=site/'pages.json'
    home=json.loads(home_path.read_text()).get('home',{}) if home_path.exists() else {}
    index=dest/'index.html'
    if home.get('blocks'):
        text=index.read_text();text=re.sub(r'</main>',lambda _: '<section class="section">'+''.join(section_html(b) for b in home['blocks'])+'</section></main>',text,count=1);index.write_text(text)
    shell=index.read_text()
    if pages and not re.search(r'<main\b[^>]*>.*?</main>',shell,re.S):raise ValueError('Page editor needs a main element in index.html')
    for page in pages:
        text=re.sub(r'<main\b[^>]*>.*?</main>',lambda _: '<main>'+blocks_html(page)+'</main>',shell,count=1,flags=re.S)
        text=re.sub(r'<title>.*?</title>',lambda _:'<title>'+esc(page['title'])+'</title>',text,count=1,flags=re.S)
        text=re.sub(r'<meta\s+(?:name="description"|property="og:description")\s+content="[^"]*"\s*/?>',lambda m:m[0].split('content=')[0]+'content="'+esc(page.get('description'))+'">',text)
        text=re.sub(r'(<meta property="og:title" content=")[^"]*(")',lambda m:m[1]+esc(page['title'])+m[2],text)
        # Home anchors resolve to the homepage when viewed from a generated page.
        text=re.sub(r'href="#([^"]*)"',r'href="index.html#\1"',text)
        (dest/(page['slug']+'.html')).write_text(text)
    data=json.loads((site/'pages.json').read_text()) if (site/'pages.json').exists() else {}
    menu=data.get('navigation')
    base_links=''.join('<a href="'+esc(item['href'])+'">'+esc(item['label'])+'</a>' for item in menu) if menu is not None else None
    links=''.join('<a href="'+p['slug']+'.html">'+esc(p.get('label') or p['title'])+'</a>' for p in pages if p.get('nav',True))
    if links or base_links is not None:
        for path in dest.glob('*.html'):
            text=path.read_text()
            menu_links=base_links
            if menu_links is not None and path.name!='index.html':menu_links=re.sub(r'href="#([^"]*)"',r'href="index.html#\1"',menu_links)
            text=re.sub(r'(<header\b.*?<nav\b[^>]*>)(.*?)(</nav>)',lambda m:m[1]+(m[2] if menu_links is None else menu_links)+links+m[3],text,count=1,flags=re.S)
            path.write_text(text)
