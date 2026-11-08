#!/usr/bin/env python3
"""Read-only public snapshot: Supabase remains the authoritative importer."""
import json,pathlib,urllib.request
url='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api'
with urllib.request.urlopen(url,timeout=45) as r:data=json.load(r)
if not isinstance(data.get('items'),list) or not data['items']:raise RuntimeError('Empty public feed; preserving previous snapshot')
p=pathlib.Path('data/public-feed.json');p.parent.mkdir(exist_ok=True)
tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');tmp.replace(p)
print('Public snapshot:',len(data['items']),'items')
