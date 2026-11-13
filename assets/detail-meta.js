import {applyContent} from './content-management.js';
import {coverURL,plain,safeImage} from './seo.js';
export function detailMeta(url,feed={},articles=[],settings={}){
 const u=new URL(url),id=u.searchParams.get('zprava')||u.searchParams.get('prispevek'),slug=u.searchParams.get('clanek');
 const editorial=u.searchParams.has('prispevek');
 let item=slug?articles.find(x=>(x.slug===slug||String(x.id)===slug)&&(!x.status||x.status==='published')):applyContent(feed,settings).items.find(x=>String(x.id)===id&&(editorial?x.source_key==='editorial':x.source_key!=='editorial'));
 if(!item)return null;const canonical=new URL(slug?'/zpravy/':'/','https://prortyni.cz');canonical.searchParams.set(slug?'clanek':u.searchParams.has('prispevek')?'prispevek':'zprava',slug||id);
 const title=plain(item.title),description=plain(item.summary||item.excerpt||item.payload?.body?.find(x=>typeof x==='string')||title).slice(0,170);
 const kind=item.payload?.kind,cover=slug?'zpravy':({event:'akce',service:'prakticke',club:'spolky',radio:'rozhlas'})[kind]||'zpravy';
 const own=safeImage(item.payload?.images?.[0]?.url),image=own||coverURL(cover);
 return {title:title+' | Pro Rtyni',description,canonical:canonical.href,image,imageAlt:own?title:({akce:'Kam vyrazit ve Rtyni',prakticke:'Praktické informace a kontakty',spolky:'Spolky, kultura a sport',rozhlas:'Městský rozhlas',zpravy:'Zprávy ze Rtyně'})[cover]+' | Pro Rtyni',imageWidth:own?null:1200,imageHeight:own?null:630,item,editorial:!!slug};
}
