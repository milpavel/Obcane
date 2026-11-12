import {detailMeta} from '../assets/detail-meta.js';
// Only public detail documents are enriched. No database, account or secret binding.
export async function onRequest(context){
 const url=new URL(context.request.url);
 if(!['/','/zpravy/'].includes(url.pathname)||!['zprava','prispevek','clanek'].some(x=>url.searchParams.has(x))||!['GET','HEAD'].includes(context.request.method))return context.next();
 const response=await context.next();if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return response;
 try{
  const read=async path=>{const r=await context.env.ASSETS.fetch(new URL(path,url));return r.ok?r.json():{};};
  const [feed,editorial,settings]=await Promise.all([read('/data/home-feed.json'),read('/data/editorial-news.json'),read('/data/public-content.json')]);
  const meta=detailMeta(url.href,feed,editorial.articles||[],settings);if(!meta)return response;
  const attr=value=>({element(e){e.setAttribute('content',value);}});
  return new HTMLRewriter().on('title',{element(e){e.setInnerContent(meta.title);}})
   .on('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]',attr(meta.description))
   .on('meta[property="og:title"],meta[name="twitter:title"]',attr(meta.title))
   .on('meta[property="og:url"]',attr(meta.canonical)).on('meta[property="og:image"],meta[name="twitter:image"]',attr(meta.image))
   .on('link[rel="canonical"]',{element(e){e.setAttribute('href',meta.canonical);}}).transform(response);
 }catch(error){console.log(JSON.stringify({event:'detail-meta-unavailable',path:url.pathname}));return response;}
}
