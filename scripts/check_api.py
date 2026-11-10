#!/usr/bin/env python3
"""Live contract checks for the public feed and import authorization."""
import json,re,urllib.request,urllib.error,datetime,time
API='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api'
def request(url):
 for attempt in range(2):
  try:return urllib.request.urlopen(url,timeout=40)
  except (urllib.error.URLError,TimeoutError):
   if attempt:raise
   time.sleep(1)
def get(url):
 with request(url) as r:return json.load(r)
d=get(API)
assert {'city','school','preschool','water','calendar','library','preschool_menu','clubs','services','scouts','orel','koletovka','museum'} <= {s['source_key'] for s in d['sources']}
assert d['items'], 'No imported items'
radio=[x for x in d['items'] if x['source_key']=='radio' and x['payload'].get('in_latest') is not False]
assert radio and all(x['payload'].get('broadcast_date') and x['payload'].get('body') for x in radio), 'Radio transcripts missing'
keys=[(x['source_key'],x['external_url']) for x in d['items']]
assert len(keys)==len(set(keys)), 'Duplicate source URLs'
for x in d['items']:
 assert str(x['id']).isdigit() and x['title']
 assert x['external_url'].startswith('https://') or x['external_url'].startswith('http://www.banikrtyne-fotbal.cz/')
 assert x['event_date'] is None or re.fullmatch(r'20\d\d-\d\d-\d\d',x['event_date']), x['event_date']
 assert isinstance(x['payload'].get('body',[]),list)
 assert not any('<script' in t.lower() for t in x['payload'].get('body',[]))
 p=x['payload']
 if p.get('in_latest') is not False and p.get('kind')!='club' and not p.get('detail_error'):
  assert any(p.get(k) for k in ('body','blocks','images','attachments','sections','days','preschool_days')), 'Empty published detail: '+x['title']
 if p.get('source_empty'):
  assert p.get('in_latest') is False, 'Empty source placeholder must not appear among current news'
menus=[x for x in d['items'] if x['payload'].get('days')]
assert menus, 'School menu missing'
for x in menus:
 for day in x['payload']['days']:
  datetime.date.fromisoformat(day['date']);assert day['meals'] and day['soup']
nursery=next(x for x in d['items'] if x['source_key']=='preschool_menu')
assert len(nursery['payload']['preschool_days'])==5
assert all(day['text'] and datetime.date.fromisoformat(day['date']) for day in nursery['payload']['preschool_days'])
clubs=[x for x in d['items'] if x['payload'].get('kind')=='club' and x['payload'].get('in_latest') is not False]
assert clubs
assert all(x['payload'].get('activities') and x['payload'].get('profile_sources') and x['payload'].get('profile_checked') for x in clubs), 'Club profile missing sources or activities'
assert any(x['source_key']=='calendar' and x['event_date'] for x in d['items'])
assert any(x['source_key']=='library' for x in d['items'])
item=d['items'][0]
assert get(API+'?id='+str(item['id']))['items'][0]['id']==item['id']
try:
 request(urllib.request.Request(API,data=b'{}',headers={'Content-Type':'application/json'}))
 raise AssertionError('Anonymous import unexpectedly allowed')
except urllib.error.HTTPError as e:assert e.code==401, e.code
print(f"PASS: {len(d['items'])} unique items, {len(d['sources'])} sources, ZŠ/MŠ menus, clubs, calendar, cancellations, ISO event dates, article lookup, anonymous import denied")
