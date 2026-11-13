import {readFile,writeFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {pages,coverURL,pageSchema,jsonLD} from '../assets/seo.js';
for(const [path,p] of Object.entries(pages)){
 const file=path==='/'?'index.html':path.slice(1)+'index.html',html=await readFile(file,'utf8'),{document:d}=parseHTML(html);
 d.title=p.title;
 const meta=(selector,attrs)=>{let n=d.querySelector(selector);if(!n){n=d.createElement('meta');d.head.append(n);}for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);};
 for(const name of ['description'])meta('meta[name="'+name+'"]',{name,content:p.description});
 for(const [property,content]of Object.entries({'og:type':'website','og:locale':'cs_CZ','og:site_name':'Pro Rtyni','og:title':p.title,'og:description':p.description,'og:url':'https://prortyni.cz'+path,'og:image':coverURL(p.cover),'og:image:width':String(p.imageWidth||1200),'og:image:height':String(p.imageHeight||630),'og:image:alt':(path==='/'?'Rtyně na jednom místě':p.label)+' | Informační portál Pro Rtyni'}))meta('meta[property="'+property+'"]',{property,content});
 for(const [name,content]of Object.entries({'twitter:card':'summary_large_image','twitter:title':p.title,'twitter:description':p.description,'twitter:image':coverURL(p.cover),'twitter:image:alt':(path==='/'?'Rtyně na jednom místě':p.label)+' | Informační portál Pro Rtyni'}))meta('meta[name="'+name+'"]',{name,content});
 let canonical=d.querySelector('link[rel="canonical"]');if(!canonical){canonical=d.createElement('link');canonical.rel='canonical';d.head.append(canonical);}canonical.href='https://prortyni.cz'+path;
 let schema=d.getElementById('portal-schema');if(!schema){schema=d.createElement('script');schema.id='portal-schema';schema.type='application/ld+json';d.head.append(schema);}schema.textContent=jsonLD(pageSchema(path));
 let next=d.toString().replaceAll('Rtyně v Podkrkonoší · Náš společný domov','Rtyně v Podkrkonoší · Informační portál');
 next=next.replace(/(\/assets\/(?:app|news)\.js\?v=)[^"']+/g,'$120261113-portal-seo-1');
 await writeFile(file,next);
}
