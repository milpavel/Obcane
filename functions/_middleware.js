import {detailMeta} from '../assets/detail-meta.js';
import {coverURL,plain,detailSchema,detailHTML,jsonLD} from '../assets/seo.js';
// No privileged bindings: snapshots and the existing public classifieds API only.
export async function onRequest(context){
 const url=new URL(context.request.url),response=await context.next();
 if(!['GET','HEAD'].includes(context.request.method)||!response.ok||!response.headers.get('content-type')?.includes('text/html'))return response;
 let result=response;
 try{
  let meta;
  if(['/','/zpravy/'].includes(url.pathname)&&['zprava','prispevek','clanek'].some(x=>url.searchParams.has(x))){
   const read=async path=>{const r=await context.env.ASSETS.fetch(new URL(path,url));return r.ok?r.json():{};};
   const [feed,editorial,settings]=await Promise.all([read('/data/seo-feed.json'),read('/data/editorial-news.json'),read('/data/public-content.json')]);
   meta=detailMeta(url.href,feed,editorial.articles||[],settings);
  }else if(url.pathname==='/inzerce/'&&/^[a-f0-9-]{36}$/i.test(url.searchParams.get('inzerat')||'')){
   const id=url.searchParams.get('inzerat'),r=await fetch('https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-market?action=detail&id='+encodeURIComponent(id),{signal:AbortSignal.timeout(3000)});
   if(r.ok){const {item}=await r.json();if(item){const title=plain(item.title),cover=item.category==='bydleni'?'bydleni':'inzerce';meta={title:title+' | Inzerce Pro Rtyni',description:plain(item.description).slice(0,170),canonical:'https://prortyni.cz/inzerce/?inzerat='+encodeURIComponent(id),image:coverURL(cover),imageAlt:title+' | Pro Rtyni',imageWidth:1200,imageHeight:630,item:{...item,summary:item.description,payload:{body:[item.description]}},market:true};}}
  }
  if(meta){
   const attr=value=>({element(e){e.setAttribute('content',String(value));}});
   let rewriter=new HTMLRewriter().on('title',{element(e){e.setInnerContent(meta.title);}})
    .on('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]',attr(meta.description))
    .on('meta[property="og:title"],meta[name="twitter:title"]',attr(meta.title))
    .on('meta[property="og:url"]',attr(meta.canonical)).on('meta[property="og:image"],meta[name="twitter:image"]',attr(meta.image))
    .on('meta[property="og:image:alt"],meta[name="twitter:image:alt"]',attr(meta.imageAlt))
    .on('meta[property="og:type"]',attr(meta.editorial?'article':'website'))
    .on('meta[property="og:image:width"]',{element(e){if(meta.imageWidth)e.setAttribute('content',String(meta.imageWidth));else e.remove();}})
    .on('meta[property="og:image:height"]',{element(e){if(meta.imageHeight)e.setAttribute('content',String(meta.imageHeight));else e.remove();}})
    .on('link[rel="canonical"]',{element(e){e.setAttribute('href',meta.canonical);}})
    .on('#portal-schema',{element(e){e.setInnerContent(jsonLD(detailSchema(meta,meta.item,meta.editorial)),{html:true});}});
   if(!meta.market){const target=meta.editorial?'#news-detail':'#article',list=meta.editorial?'#news-list':'#home';rewriter=rewriter.on(list,{element(e){e.setAttribute('hidden','');}}).on(target,{element(e){e.removeAttribute('hidden');e.setInnerContent(detailHTML(meta,meta.item,meta.editorial),{html:true});}});}
   result=rewriter.transform(response);
  }
 }catch{console.log(JSON.stringify({event:'public-seo-fallback',path:url.pathname}));}
 if(url.hostname.endsWith('.pages.dev')){const headers=new Headers(result.headers);headers.set('X-Robots-Tag','noindex, nofollow');return new Response(result.body,{status:result.status,headers});}
 return result;
}
