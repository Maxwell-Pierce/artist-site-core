"""Apply narrowly scoped text/media edits to the artist's original template.
Original-value guards prevent an edit silently moving to a different element after
an artist changes their HTML. All untouched bytes and scripts are preserved.
"""
import html,re
from html.parser import HTMLParser
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class TemplateContent(HTMLParser):
 def __init__(self,source,edits):
  super().__init__(convert_charrefs=True);self.source=source;self.edits=edits;self.stack=[];self.text_index=0;self.asset_index=0;self.patches=[];self.matched=set();self.lines=[0]
  self.lines.extend(m.end() for m in re.finditer('\n',source))
 def absolute_position(self):
  line,col=self.getpos();return self.lines[line-1]+col
 def handle_starttag(self,tag,attrs):
  in_body='body' in self.stack or tag=='body'
  if in_body and tag in {'a','img','video'}:
   key='a:'+str(self.asset_index);self.asset_index+=1;item=self.edits.get(key)
   if item:
    values=dict(attrs);original=values.get('href' if tag=='a' else 'src','') or ''
    if item['original']!=original:raise ValueError('Template media changed; reconnect and review '+key)
    raw=self.get_starttag_text()
    for name,value in item['attrs'].items():
     attr=name+'="'+html.escape(value,quote=True)+'"'
     pattern=r'\s'+name+r'\s*=\s*(?:"[^"]*"|\x27[^\x27]*\x27|[^\s>]+)'
     if re.search(pattern,raw,re.I):raw=re.sub(pattern,lambda _: ' '+attr,raw,count=1,flags=re.I)
     else:
      pos=len(raw)-(2 if raw.endswith('/>') else 1);raw=raw[:pos]+' '+attr+raw[pos:]
    start=self.absolute_position();self.patches.append((start,start+len(self.get_starttag_text()),raw));self.matched.add(key)
  if tag not in VOID:self.stack.append(tag)
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
  if tag not in VOID:self.handle_endtag(tag)
 def handle_endtag(self,tag):
  if tag in self.stack:self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]
 def handle_data(self,data):
  if 'body' not in self.stack or any(tag in self.stack for tag in ['script','style','noscript','template']) or not data.strip():return
  key='t:'+str(self.text_index);self.text_index+=1;item=self.edits.get(key)
  if item:
   if item['original']!=data:raise ValueError('Template text changed; reconnect and review '+key)
   from pages import rich_html
   value=rich_html(item['html']);value=re.sub(r'</?(?:ul|ol|li|div|p)>',lambda m:'<br>' if m[0].startswith('</') else '',value);value=re.sub(r'(?:<br>)+$','',value)
   start=self.absolute_position();end=self.source.find('<',start);end=len(self.source) if end<0 else end
   self.patches.append((start,end,value.replace('{','&#123;')));self.matched.add(key)
def apply_template_content(source,edits):
 if not edits:return source
 validate_overrides(edits)
 parser=TemplateContent(source,edits);parser.feed(source)
 if set(edits)-parser.matched:raise ValueError('Template edits no longer match the source; reconnect and review your content')
 for start,end,value in sorted(parser.patches,reverse=True):source=source[:start]+value+source[end:]
 return source

def validate_overrides(edits):
 if not isinstance(edits,dict):raise ValueError('Invalid template edits')
 from pages import safe_url
 for key,item in edits.items():
  if not re.fullmatch(r'[ta]:\d+',key) or not isinstance(item,dict) or not isinstance(item.get('original'),str):raise ValueError('Invalid template edit')
  if key[0]=='t':
   if not isinstance(item.get('html'),str):raise ValueError('Invalid template text')
  else:
   if not isinstance(item.get('attrs'),dict):raise ValueError('Invalid media edits')
   for name,value in item['attrs'].items():
    if name not in {'src','href','poster','alt'} or not isinstance(value,str) or (name!='alt' and not (name=='poster' and value=='') and not safe_url(value,name!='href')):raise ValueError('Invalid media or link destination')
