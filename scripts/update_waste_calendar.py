#!/usr/bin/env python3
"""Refresh exact highlighted dates from the municipality's published calendar.
Fail closed when its layout changes. No dates are extrapolated into a new year.
"""
import datetime as dt, hashlib, json, pathlib, re, urllib.request
import fitz
MONTHS=['LEDEN','ÚNOR','BŘEZEN','DUBEN','KVĚTEN','ČERVEN','ČERVENEC','SRPEN','ZÁŘÍ','ŘÍJEN','LISTOPAD','PROSINEC']
DAYS={'po':0,'út':1,'st':2,'čt':3,'pá':4,'so':5,'ne':6}

def parse_calendar(pdf,year):
 doc=fitz.open(stream=pdf,filetype='pdf');text=' '.join(p.get_text() for p in doc)
 if not re.search(r'ROCE\s+'+str(year),text,re.I) or not all(x in text for x in ['BIO','SVOZOVÝ']):raise ValueError('Unknown calendar/year')
 bio,communal=set(),set()
 for p in doc:
  words=p.get_text('words');months=[w for w in words if w[4] in MONTHS]
  if len(months)<12:continue
  highlights=[]
  for drawing in p.get_drawings():
   c=drawing.get('fill');r=drawing['rect']
   if not c or len(c)!=3:continue
   kind='bio' if c[0]<.25 and .45<c[1]<.9 and c[2]<.5 else 'communal' if c[0]>.9 and c[1]>.9 and c[2]<.2 else None
   if kind:highlights.append((r,kind))
  for header in (w for w in words if w[4] in DAYS):
   x=(header[0]+header[2])/2
   left=[w for w in months if w[2]<x]
   if not left:continue
   column=max(w[0] for w in left);labels=sorted([w for w in months if abs(w[0]-column)<2],key=lambda w:w[1])
   month=MONTHS.index(labels[0][4])+1;last=0
   dates=sorted([w for w in words if w[4].isdigit() and 1<=int(w[4])<=31 and abs((w[0]+w[2])/2-x)<8 and w[1]>header[3]],key=lambda w:w[1])
   for word in dates:
    day=int(word[4])
    if day<last:month+=1
    last=day
    date=dt.date(year,month,day)
    if date.weekday()!=DAYS[header[4]]:raise ValueError('Calendar cell alignment changed')
    centre=fitz.Point((word[0]+word[2])/2,(word[1]+word[3])/2)
    for rect,kind in highlights:
     if rect.contains(centre):
      if kind=='bio':bio.add(date.isoformat())
      else:communal.add(date.isoformat())
  break
 if not 8<=len(bio)<=35 or not 30<=len(communal)<=106:raise ValueError('Incomplete highlighted calendar')
 if any(dt.date.fromisoformat(d).weekday()!=1 for d in bio):raise ValueError('BIO weekday differs from legend')
 if any(dt.date.fromisoformat(d).weekday() not in [3,4] for d in communal):raise ValueError('Communal weekday differs from legend')
 if 'sudé týdny' in text and any(dt.date.fromisoformat(d).isocalendar().week%2 for d in communal):raise ValueError('Communal week differs from legend')
 return {'bio':sorted(bio),'communal':sorted(communal)}

def read_url(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Obcane-pro-Rtyni-calendar/1.0'}),timeout=30) as response:
  data=response.read(4_000_001)
 if len(data)>4_000_000:raise ValueError('Oversized calendar')
 return data

def refresh():
 path=pathlib.Path('data/waste-calendar.json');old=json.loads(path.read_text()) if path.exists() else {'calendars':[]}
 calendars={c['year']:c for c in old['calendars']};today=dt.datetime.now(dt.timezone.utc).date()
 for year in range(today.year,today.year+2 if today.month>=10 else today.year+1):
  source=f'https://www.rtyne.cz/svozovy-kalendar-{year}'
  try:
   html=read_url(source).decode('utf-8');match=re.search(r'href="(/file/\d+)"[^>]*class="global-attachment__link"[^>]*data-attachment-type="pdf"',html)
   if not match:raise ValueError('No published PDF calendar')
   pdf_url='https://www.rtyne.cz'+match[1];pdf=read_url(pdf_url);dates=parse_calendar(pdf,year)
   calendars[year]={'year':year,'valid_until':f'{year}-12-31','source_url':source,'pdf_url':pdf_url,'sha256':hashlib.sha256(pdf).hexdigest(),**dates}
   print(year,len(dates['bio']),'BIO dates;',len(dates['communal']),'communal dates')
  except Exception as exc:print('Calendar',year,'preserved:',str(exc))
 if not calendars:raise RuntimeError('No verified calendar available')
 result={'city':'Rtyně v Podkrkonoší','calendars':[c for y,c in sorted(calendars.items()) if y>=today.year-1],'paper_plastic':{'status':'unconfirmed','note':'Přesný termín svozu kontejnerů na papír a plast zatím nemáme ověřený.'}}
 path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':refresh()
