#!/usr/bin/env python3
"""Live contract checks for the public feed and import authorization."""
import json,re,urllib.request,urllib.error,datetime
API='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api'
def get(url):
 with urllib.request.urlopen(url,timeout=35) as r:return json.load(r)
d=get(API)
assert {s['source_key'] for s in d['sources']}=={'city','school','preschool','water'}
assert d['items'], 'No imported items'
keys=[(x['source_key'],x['external_url']) for x in d['items']]
assert len(keys)==len(set(keys)), 'Duplicate source URLs'
for x in d['items']:
 assert str(x['id']).isdigit() and x['title']
 assert x['external_url'].startswith('https://')
 assert x['event_date'] is None or re.fullmatch(r'20\d\d-\d\d-\d\d',x['event_date']), x['event_date']
 assert isinstance(x['payload'].get('body',[]),list)
 assert not any('<script' in t.lower() for t in x['payload'].get('body',[]))
menus=[x for x in d['items'] if x['payload'].get('days')]
assert menus, 'School menu missing'
for x in menus:
 for day in x['payload']['days']:
  datetime.date.fromisoformat(day['date']);assert day['meals'] and day['soup']
item=d['items'][0]
assert get(API+'?id='+str(item['id']))['items'][0]['id']==item['id']
try:
 urllib.request.urlopen(urllib.request.Request(API,data=b'{}',headers={'Content-Type':'application/json'}),timeout=20)
 raise AssertionError('Anonymous import unexpectedly allowed')
except urllib.error.HTTPError as e:assert e.code==401, e.code
print(f"PASS: {len(d['items'])} unique items, 4 sources, menu, ISO event dates, article lookup, anonymous import denied")
