export function detailMeta(url,feed={},articles=[],settings={}){
 const u=new URL(url),id=u.searchParams.get('zprava')||u.searchParams.get('prispevek'),slug=u.searchParams.get('clanek');
 let item=slug?articles.find(x=>(x.slug===slug||String(x.id)===slug)&&(!x.status||x.status==='published')):(feed.items||[]).find(x=>String(x.id)===id);
 if(!item)return null;const override=(settings.overrides||[]).find(x=>String(x.target)===String(item.id))?.data;if(override?.hidden)return null;
 if(override)item={...item,...override};const canonical=new URL(slug?'/zpravy/':'/','https://prortyni.cz');canonical.searchParams.set(slug?'clanek':u.searchParams.has('prispevek')?'prispevek':'zprava',slug||id);
 const plain=x=>String(x||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const title=plain(item.title),description=plain(item.summary||item.excerpt||item.payload?.body?.find(x=>typeof x==='string')||title).slice(0,240);
 let image='https://prortyni.cz/assets/rtyne-social-cover.jpg?v=20261109-selected';try{const candidate=new URL(item.payload?.images?.[0]?.url);if(candidate.protocol==='https:'&&!candidate.username&&!candidate.password)image=candidate.href;}catch{}
 return {title:title+' | Pro Rtyni',description,canonical:canonical.href,image};
}
