"""Exact typography in the portal palette. The supplied home cover is preserved.
Usage: python scripts/build-social-covers.py; requires Pillow and DejaVu Sans.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path('assets/social');out.mkdir(exist_ok=True)
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
W,H=1200,630
bg=Image.new('RGB',(W,H));pixels=bg.load()
for y in range(H):
 for x in range(W):
  t=.70*x/(W-1)+.30*y/(H-1)
  start=(57,17,139);end=(0,141,154)
  pixels[x,y]=tuple(round(start[c]+(end[c]-start[c])*t) for c in range(3))
covers={
'zpravy':('Zprávy ze Rtyně.','Místní dění · Vlastní články · Souvislosti'),
'inzerce':('Místní inzerce.','Nabídněte · Darujte · Poptejte'),
'bydleni':('Bydlení ve Rtyni.','Městské byty · Pronájmy · Soukromé nabídky'),
'novinky':('Novinky e-mailem.','Vybraná témata · Denně nebo týdně · Podle vás'),
'odjezdy':('Odjezdy ze Rtyně.','Vlaky · Autobusy · Zastávky · Zpoždění'),
'jidelnicky':('Jídelníčky ZŠ a MŠ.','Co se vaří ve škole a školce ve Rtyni'),
'finance':('Veřejné finance města.','Rozpočet · Investice · Veřejné dokumenty'),
'akce':('Kam vyrazit ve Rtyni.','Kultura · Sport · Akce pro celou rodinu'),
'prakticke':('Praktické informace.','Kontakty · Úřad · Školy · Lékaři · Služby'),
'spolky':('Spolky, kultura a sport.','Místní organizace · Oddíly · Volný čas'),
'rozhlas':('Městský rozhlas.','Písemné záznamy a přepisy hlášení ze Rtyně')}
for key,(title,desc) in covers.items():
 im=bg.copy();d=ImageDraw.Draw(im)
 def text(text,y,size,font=bold):
  while d.textlength(text,font=ImageFont.truetype(font,size))>1090:size-=1
  f=ImageFont.truetype(font,size);d.text(((W-d.textlength(text,font=f))/2,y),text,font=f,fill='white')
 text('INFORMAČNÍ PORTÁL PRO RTYNI',92,32)
 text(title,232,74)
 text(desc,369,32)
 text('prortyni.cz',490,48)
 im.save(out/(key+'.jpg'),quality=92,optimize=True,progressive=True)
print('Created',len(covers),'section covers at 1200 × 630; home cover is user-supplied.')
