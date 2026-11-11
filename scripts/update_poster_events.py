#!/usr/bin/env python3
"""Read public school posters locally with OCR; publish only corroborated event metadata."""
import csv,datetime,hashlib,io,json,pathlib,re,subprocess,tempfile,unicodedata,urllib.request,urllib.parse
API='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api'
HOSTS={'www.zsrtyne.cz','www.msrtyne.cz'}
OUT=pathlib.Path('data/poster-events.json')
def normal(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if not unicodedata.combining(c))
def dates(s):
 out=[]
 for m in re.finditer(r'\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})\b',s):
  try:out.append(datetime.date(int(m[3]),int(m[2]),int(m[1])).isoformat())
  except ValueError:pass
 return sorted(set(out))
def parse_event(words,title,image):
 if not re.search(r'koncert|vystoupeni|predstaveni|pozvanka|jarmark|vernisaz|den otevrenych',normal(title)):return None
 text=' '.join(w['text'] for w in words if float(w.get('conf',0))>=20);found=dates(text)
 if len(found)!=1:return None
 date=found[0];filename=dates(urllib.parse.unquote(urllib.parse.urlsplit(image).path))
 if filename and filename!=found:return None
 confident=any(date in dates(w['text']) and float(w.get('conf',0))>=85 for w in words)
 if not filename and not confident:return None
 n=normal(text);m=re.search(r'\bod\s+(\d{1,2})(?:[:.](\d{2}))?\s*hod',n);time=None
 if m and int(m[1])<24 and int(m[2] or 0)<60:time=f'{int(m[1]):02}:{int(m[2] or 0):02}'
 place=None
 for word in words:
  if float(word.get('conf',0))<65:continue
  w=normal(word['text'])
  if 'makus' in w:place='MAKUS, Rtyně v Podkrkonoší'
  elif 'orlovn' in w:place='Orlovna, Rtyně v Podkrkonoší'
 return {'date':date,'time':time,'location':place,'method':'ocr','date_evidence':'OCR plakátu a shodný název obrázku' if filename else 'Jednoznačné datum v OCR plakátu'}
def fetch(url):
 request=urllib.request.Request(url,headers={'User-Agent':'ProRtyni/1.0 (+https://prortyni.cz)'})
 return urllib.request.urlopen(request,timeout=25)
def main():
 now=datetime.datetime.now(datetime.timezone.utc).isoformat();feed=json.load(fetch(API));old=json.loads(OUT.read_text()) if OUT.exists() else {'events':[]};records=[];failures=[];count=0
 languages=subprocess.run(['tesseract','--list-langs'],capture_output=True,text=True,check=True).stdout;language='ces+eng' if '\nces\n' in languages else 'eng'
 for item in feed['items']:
  if item['source_key'] not in ['school','preschool'] or item['payload'].get('in_latest') is False:continue
  if not re.search(r'koncert|vystoupeni|predstaveni|pozvanka|jarmark|vernisaz|den otevrenych',normal(item['title'])):continue
  for image in item['payload'].get('images',[])[:2]:
   url=image['url'];host=urllib.parse.urlsplit(url).hostname
   if host not in HOSTS or urllib.parse.urlsplit(url).scheme!='https' or count>=8:continue
   count+=1
   try:
    with fetch(url) as response:
     if urllib.parse.urlsplit(response.geturl()).hostname not in HOSTS or not response.headers.get('Content-Type','').startswith('image/'):raise ValueError('Unexpected poster response')
     raw=response.read(8_000_001)
    if len(raw)>8_000_000:raise ValueError('Poster too large')
    with tempfile.TemporaryDirectory() as tmp:
     path=pathlib.Path(tmp)/'poster';path.write_bytes(raw)
     run=subprocess.run(['tesseract',str(path),'stdout','-l',language,'--psm','11','tsv'],capture_output=True,text=True,check=True,timeout=25)
     words=[w for w in csv.DictReader(io.StringIO(run.stdout),delimiter='\t') if w.get('text','').strip()]
    event=parse_event(words,item['title'],url)
    if event:records.append({**event,'id':str(item['id']),'source_url':item['external_url'],'image_url':url,'sha256':hashlib.sha256(raw).hexdigest(),'checked_at':now})
   except Exception as exc:
    failures.append({'id':str(item['id']),'reason':type(exc).__name__})
    records.extend(e for e in old.get('events',[]) if e['image_url']==url and e['source_url']==item['external_url'])
 data={'generated_at':now,'events':records,'failures':failures};OUT.parent.mkdir(exist_ok=True);OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(f'Posters: {count} checked, {len(records)} dated events, {len(failures)} failed')
if __name__=='__main__':main()
