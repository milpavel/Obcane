#!/usr/bin/env python3
"""Validate published data without requiring network access."""
import datetime,json,pathlib,re,sys
from urllib.parse import urlparse
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
FILES={"school-menu.json","school-news.json","water-news.json","preschool-news.json","city-news.json","city-events.json","city-newsletter.json","source-health.json","preschool-menu.json","newsletter-highlights.json"}
HOSTS={"rtyne.cz","www.rtyne.cz","zsrtyne.cz","www.zsrtyne.cz","msrtyne.cz","www.msrtyne.cz","vakrtyne.cz","www.vakrtyne.cz"}
def url(value):
 u=urlparse(value)
 assert u.scheme=="https" and u.hostname in HOSTS, "Untrusted source URL"
def validate(name,d):
 assert isinstance(d,dict) and isinstance(d.get("checked_at"),str)
 datetime.datetime.fromisoformat(d["checked_at"])
 if "source_url" in d:url(d["source_url"])
 if "items" in d:
  assert isinstance(d["items"],list) and len(d["items"])<=30
  for item in d["items"]:
   assert isinstance(item.get("title"),str) and 2<=len(item["title"])<=200
   url(item["url"])
   if "date" in item:datetime.date.fromisoformat(item["date"])
 if "days" in d:
  assert isinstance(d["days"],list) and len(d["days"])<=35
  for day in d["days"]:
   datetime.date.fromisoformat(day["date"])
   assert isinstance(day.get("meals"),list) and len(day["meals"])<=3
   assert isinstance(day.get("soup"),str)
 if name=="source-health.json":
  assert isinstance(d.get("failed"),list) and isinstance(d.get("ok"),bool)
  assert d["ok"] == (len(d["failed"])==0)
  assert d.get("total",0)>=len(d["failed"])
 if name=="city-newsletter.json":url(d["url"])
for name in sorted(FILES):
 p=DATA/name
 if not p.exists():
  if name=="source-health.json":raise AssertionError("Missing mandatory source-health.json")
  print("PENDING (source not yet verified)",name)
  continue
 validate(name,json.loads(p.read_text(encoding="utf-8")))
 print("VALID",name)
print("Data validation completed")
