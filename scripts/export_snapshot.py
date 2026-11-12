#!/usr/bin/env python3
"""Read-only public snapshot: Supabase remains the authoritative importer."""
import json,pathlib,urllib.request
url='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api'
with urllib.request.urlopen(url,timeout=45) as r:data=json.load(r)
if not isinstance(data.get('items'),list) or not data['items']:raise RuntimeError('Empty public feed; preserving previous snapshot')
p=pathlib.Path('data/public-feed.json');p.parent.mkdir(exist_ok=True)
tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');tmp.replace(p)
print('Public snapshot:',len(data['items']),'items')

# Public editorial settings only; no credentials, private notes or citizen data.
try:
    with urllib.request.urlopen('https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-admin?action=public',timeout=15) as r: settings=json.load(r)
    if not isinstance(settings.get('overrides'),list) or not isinstance(settings.get('sections'),list): raise ValueError('Invalid public settings')
    pathlib.Path('data/public-content.json').write_text(json.dumps({k:settings[k] for k in ['overrides','sections']},ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
except Exception:
    print('Public settings unavailable; preserving deployed settings')
