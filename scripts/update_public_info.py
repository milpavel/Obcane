#!/usr/bin/env python3
"""Public-source monitor. Writes only verified extracted summaries, never inferred statuses."""
import json,re,datetime,pathlib,requests
from bs4 import BeautifulSoup
from zoneinfo import ZoneInfo
NOW=datetime.datetime.now(ZoneInfo("Europe/Prague"))
BASE=pathlib.Path("data");BASE.mkdir(exist_ok=True)
HEAD={"User-Agent":"ObcaneProRtyni/1.0 (+https://obcane-pro-rtyni.pages.dev; public information monitor)"}
def get(url):
 r=requests.get(url,headers=HEAD,timeout=22);r.raise_for_status()
 if not r.encoding or r.encoding.lower()=="iso-8859-1":r.encoding=r.apparent_encoding or "utf-8"
 return BeautifulSoup(r.text,"html.parser")
def clean(s):return re.sub(r"\s+"," ",s or "").strip()
def save(name,data):
 (BASE/name).write_text(json.dumps({"checked_at":NOW.isoformat(),**data},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def menu():
 root="https://www.zsrtyne.cz"
 soup=get(root+"/pro-verejnost/aktuality")
 links=[]
 for a in soup.select("a[href]"):
  title=clean(a.get_text(" ",strip=True));href=a.get("href","")
  if re.search(r"jídelníček na ",title,re.I):
   from urllib.parse import urljoin
   links.append((title,urljoin(root,href)))
 # Search main page too; choose newest URL by month/year if available
 soup2=get(root)
 for a in soup2.select("a[href]"):
  title=clean(a.get_text(" ",strip=True));href=a.get("href","")
  if re.search(r"jídelníček na ",title,re.I):
   from urllib.parse import urljoin
   links.append((title,urljoin(root,href)))
 monthnames={"led":1,"únor":2,"bre":3,"bře":3,"dub":4,"kvě":5,"červ":6,"červenec":7,"srp":8,"zář":9,"říj":10,"list":11,"pros":12}
 def priority(pair):
  m=re.search(r"(20\d\d)",pair[0]+" "+pair[1]);y=int(m.group(1)) if m else 0
  mn=next((v for k,v in monthnames.items() if k in pair[0].lower()),0)
  return y*100+mn
 links=list({url:(name,url) for name,url in links}.values())
 links.sort(key=priority,reverse=True)
 for name,url in links[:5]:
  page=get(url)
  main=page.select_one("article") or page.select_one(".entry-content") or page.select_one("main") or page
  text=main.get_text("\n",strip=True)
  pattern=r"(?im)^\s*(Pondělí|Úterý|Středa|Čtvrtek|Pátek)\s+(\d{1,2}\.\s*\d{1,2}\.\s*20\d{2})\s*$"
  matches=list(re.finditer(pattern,text))
  if len(matches)<3:continue
  days=[]
  for i,m in enumerate(matches):
   raw=text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)]
   lines=[clean(x) for x in raw.splitlines() if clean(x)]
   lines=[x for x in lines if len(x)<160 and not re.search(r"čtěte více|všechny aktuality|volná pracovní místa|kontakty",x,re.I)]
   soup_line=next((x for x in lines if x.lower().startswith("polévka")),None)
   food=[x for x in lines if x!=soup_line][:2]
   try:dt=datetime.datetime.strptime(re.sub(r"\s+","",m.group(2)),"%d.%m.%Y").date().isoformat()
   except ValueError:continue
   days.append({"date":dt,"soup":soup_line or "Polévka neuvedena","meals":food})
  if len(days)>=3 and max(x["date"] for x in days)>=NOW.date().isoformat():
   save("school-menu.json",{"source_url":url,"days":days,"source_name":"ZŠ a ZUŠ Rtyně"})
   return
 raise ValueError("No trustworthy school menu structure found")
def school_news():
 from urllib.parse import urljoin,urlparse
 soup=get("https://www.zsrtyne.cz/pro-verejnost/aktuality")
 out=[]
 for h in soup.select("h1,h2,h3,h4"):
  a=h.find("a",href=True) or h.find_parent("a",href=True)
  if not a:continue
  title=clean(a.get_text(" ",strip=True))
  if not 12<=len(title)<=125 or title.lower() in ("aktuality","školní jídelna"):continue
  url=urljoin("https://www.zsrtyne.cz",a["href"])
  if urlparse(url).hostname not in ("zsrtyne.cz","www.zsrtyne.cz"):continue
  if url not in [x["url"] for x in out]:out.append({"title":title,"url":url})
  if len(out)>=10:break
 if not out:raise ValueError("No school news found")
 save("school-news.json",{"items":out,"source_url":"https://www.zsrtyne.cz/pro-verejnost/aktuality"})
def water():
 from urllib.parse import urljoin
 soup=get("https://www.vakrtyne.cz/havarie-a-odstavky")
 items=[]
 today=NOW.date()
 for a in soup.select("a[href]"):
  title=clean(a.get_text(" ",strip=True))
  if not re.search(r"odstáv|přerušení dodávky|havári|odkalování",title,re.I):continue
  match=re.search(r"(\d{1,2})\.(\d{1,2})\.(20\d{2})",title)
  if not match:continue
  try:date=datetime.date(int(match.group(3)),int(match.group(2)),int(match.group(1)))
  except ValueError:continue
  if date<today or date>today+datetime.timedelta(days=90):continue
  if re.search("zrušeno|zrušena|odvoláno",title,re.I):continue
  url=urljoin("https://www.vakrtyne.cz",a["href"])
  if not url.startswith("https://www.vakrtyne.cz/"):continue
  if url in [x["url"] for x in items]:continue
  items.append({"title":title,"date":date.isoformat(),"url":url})
 items.sort(key=lambda x:x["date"])
 save("water-news.json",{"items":items[:12],"source_url":"https://www.vakrtyne.cz/havarie-a-odstavky","verified_active":False,"note":"Only dated upcoming notices; ongoing incidents and cancellations must be verified with VAK"})
def preschool():
 soup=get("https://www.msrtyne.cz/")
 text=soup.get_text(" ",strip=True)
 if "Mateřská škola" not in text:raise ValueError("Unexpected preschool page")
 out=[]
 from urllib.parse import urljoin
 for h in soup.select("h2,h3,h4"):
  title=clean(h.get_text(" ",strip=True))
  if len(title)<12 or len(title)>120:continue
  if title.lower() in ("kontakt","aktuální jídelníček na celý týden"):continue
  if title not in [x["title"] for x in out]:out.append({"title":title,"url":"https://www.msrtyne.cz/"})
  if len(out)==6:break
 save("preschool-news.json",{"items":out,"source_url":"https://www.msrtyne.cz/"})

def city_news():
 from urllib.parse import urljoin,urlparse
 soup=get("https://www.rtyne.cz/")
 out=[]
 # City publishes actual announcements as linked article titles.
 for a in soup.select("a[href]"):
  title=clean(a.get_text(" ",strip=True))
  href=urljoin("https://www.rtyne.cz/",a["href"])
  if not 18<=len(title)<=145 or urlparse(href).hostname not in ("www.rtyne.cz","rtyne.cz"):continue
  if any(x in title.lower() for x in ("rozpočtové opatření","přerušení dodávky","uzavření skládky","frézování komunikace","závěrečný účet","veřejná vyhláška","kulturní a sportovní akce","aktuální informace")):
   if href not in [x["url"] for x in out]:out.append({"title":title,"url":href})
  if len(out)>=12:break
 if not out:raise ValueError("No city announcements matched")
 save("city-news.json",{"items":out,"source_url":"https://www.rtyne.cz/"})


def city_events():
 from urllib.parse import urljoin,urlparse
 soup=get("https://www.rtyne.cz/")
 today=NOW.date()
 events=[]
 # Extract only cards with a clearly stated date and an official detail link.
 for a in soup.select("a[href]"):
  title=clean(a.get_text(" ",strip=True))
  href=urljoin("https://www.rtyne.cz/",a.get("href",""))
  if urlparse(href).hostname not in ("rtyne.cz","www.rtyne.cz"):continue
  card=a.find_parent(["article","li","div"])
  context=clean(card.get_text(" ",strip=True))[:450] if card else title
  matches=re.findall(r"(?<!\\d)(\\d{1,2})\\.\\s*(\\d{1,2})\\.\\s*(20\\d{2})(?!\\d)",context)
  for day,month,year in matches[:2]:
   try:dt=datetime.date(int(year),int(month),int(day))
   except ValueError:continue
   if dt<today or dt>today+datetime.timedelta(days=180):continue
   if len(title)<8 or len(title)>130 or title.lower() in ("všechny události","kalendář událostí"):continue
   if href not in [x["url"] for x in events]:events.append({"date":dt.isoformat(),"title":title,"url":href})
 events.sort(key=lambda x:(x["date"],x["title"]))
 if not events:raise ValueError("No unambiguously dated city events; preserving prior verified data")
 save("city-events.json",{"items":events[:18],"source_url":"https://www.rtyne.cz/","note":"Dates parsed from official linked event cards; confirm changes with organizer"})

def city_newsletter():
 from urllib.parse import urljoin,urlparse
 soup=get("https://www.rtyne.cz/")
 candidates=[]
 for a in soup.select("a[href]"):
  title=clean(a.get_text(" ",strip=True))
  href=urljoin("https://www.rtyne.cz/",a["href"])
  if urlparse(href).hostname not in ("www.rtyne.cz","rtyne.cz"):continue
  if re.search(r"zpravodaj",title+" "+href,re.I):
   m=re.search(r"(20\\d{2})",title+" "+href)
   if m:candidates.append((int(m.group(1)),title or "Městský zpravodaj",href))
 if not candidates:raise ValueError("No newsletter reference")
 candidates.sort(reverse=True)
 year,title,url=candidates[0]
 save("city-newsletter.json",{"title":title,"url":url,"source_url":"https://www.rtyne.cz/","year":year,"note":"Link to official issue; editorial extraction requires separate PDF validation"})

failures=[]
for label,fn in [("city-events.json",city_events),("city-newsletter.json",city_newsletter),("city-news.json",city_news),("school-menu.json",menu),("school-news.json",school_news),("water-news.json",water),("preschool-news.json",preschool)]:
 try:fn();print("OK",label)
 except Exception as e:
  print("FAILED",label,str(e))
  # Never overwrite previously verified data on a failed fetch; UI checks freshness.
  failures.append({"source":label,"error":str(e)[:180]})

save("source-health.json",{"failed":failures,"ok":len(failures)==0})
