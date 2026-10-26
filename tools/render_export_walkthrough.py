"""Render a captioned walkthrough from actual Studio browser captures.

Usage: python tools/render_export_walkthrough.py /path/to/manifest.json
Manifest: {"crop": [x,y,width,height], "scenes": [{"image": "/path/capture.jpg",
"title": "...", "caption": "...", "focus": [x,y,width,height]}]}
Focus coordinates are in the original screenshot. This is an edited sequence of
real UI states with pulsing callouts, not a continuous real-time recording.
Requires Pillow and ffmpeg. No artist data or browser credentials are needed.
"""
import json,math,subprocess,sys,tempfile
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
spec=json.loads(Path(sys.argv[1]).read_text());dest=Path(__file__).resolve().parents[1]/'editor/help/media'
W,H,FPS,SECONDS=1364,spec.get('outputHeight',570),12,3
fontroot=Path('/usr/share/fonts/truetype/dejavu')
font=lambda size,bold=False:ImageFont.truetype(str(fontroot/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)
scenes=spec['scenes'];cx,cy,cw,ch=spec['crop'];scale=min(W/cw,(H-112)/ch);sw,sh=round(cw*scale),round(ch*scale);ox=(W-sw)//2;oy=112
with tempfile.TemporaryDirectory() as tmp:
 for index,scene in enumerate(scenes):
  capture=Image.open(scene['image']).convert('RGB').crop((cx,cy,cx+cw,cy+ch)).resize((sw,sh),Image.Resampling.LANCZOS)
  for frame in range(FPS*SECONDS):
   image=Image.new('RGB',(W,H),'#0b1018');image.paste(capture,(ox,oy));draw=ImageDraw.Draw(image)
   draw.text((25,13),'ARTIST STUDIO  /  WAVEFORM EXPORT',font=font(14,True),fill='#93dff5')
   draw.text((25,37),scene['title'],font=font(25,True),fill='#f0f7fa')
   draw.text((25,76),scene['caption'],font=font(17),fill='#b6c6d5')
   draw.text((W-110,17),f'{index+1} / {len(scenes)}',font=font(15),fill='#f3d28c')
   if scene.get('focus'):
    x,y,w,h=scene['focus'];x=ox+(x-cx)*scale;y=oy+(y-cy)*scale
    pulse=3+3*(1+math.sin(frame/FPS*math.tau))/2
    draw.rounded_rectangle((x-pulse,y-pulse,x+w*scale+pulse,y+h*scale+pulse),radius=6,outline='#f7cf75',width=3)
   progress=(index+(frame+1)/(FPS*SECONDS))/len(scenes)
   draw.rectangle((0,H-4,W*progress,H),fill='#80dfff')
   image.save(Path(tmp)/f'{index*FPS*SECONDS+frame:05}.png')
   if index==2 and frame==12:image.save(dest/'export-range.jpg',quality=90)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate',str(FPS),'-i',str(Path(tmp)/'%05d.png'),'-c:v','libx264','-preset','slow','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(dest/'export-range.mp4')],check=True)
print(f'{len(scenes)*SECONDS}s, {W}x{H}, {FPS}fps: {dest}/export-range.mp4')
