"""Small dependency-free fallback icons; artist-provided icons always take precedence."""
import binascii,html,struct,zlib
FONT={'A':['01110','10001','10001','11111','10001','10001','10001'],'S':['01111','10000','10000','01110','00001','00001','11110'],'M':['10001','11011','10101','10101','10001','10001','10001'],'P':['11110','10001','10001','11110','10000','10000','10000']}
def ensure_icons(root,config):
    assets=root/'assets';assets.mkdir(exist_ok=True)
    initials=config.get('initials','AS')[:2].upper();color=config.get('theme',{}).get('gold','#eac584');background=config.get('theme',{}).get('bg','#100d1b')
    if not (assets/'mark.svg').exists():
        (assets/'mark.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="32" fill="{background}"/><circle cx="64" cy="64" r="53" fill="none" stroke="{color}"/><text x="64" y="80" text-anchor="middle" font-family="Georgia,serif" font-size="44" fill="{color}">{html.escape(initials)}</text></svg>')
    fg=tuple(bytes.fromhex(color[1:]));bg=tuple(bytes.fromhex(background[1:]));glyphs=[FONT.get(c,FONT['A']) for c in initials]
    for size in [180,192,512]:
        path=assets/f'icon-{size}.png'
        if path.exists():continue
        cell=size//20;left=(size-(len(glyphs)*6-1)*cell)//2;top=(size-7*cell)//2
        pixels=bytearray(bg*(size*size))
        for index,glyph in enumerate(glyphs):
            for y,row in enumerate(glyph):
                for x,on in enumerate(row):
                    if on=='1':
                        for yy in range(top+y*cell,top+(y+1)*cell):
                            for xx in range(left+(index*6+x)*cell,left+(index*6+x+1)*cell):
                                offset=(yy*size+xx)*3;pixels[offset:offset+3]=bytes(fg)
        raw=b''.join(b'\0'+pixels[y*size*3:(y+1)*size*3] for y in range(size))
        def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',binascii.crc32(kind+data)&0xffffffff)
        path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
