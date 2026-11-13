import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import{parseHTML}from'linkedom';
import{pages,coverURL,pageSchema,detailHTML,jsonLD,safeImage}from'../assets/seo.js';
import{detailMeta}from'../assets/detail-meta.js';
import{onRequest}from'../functions/_middleware.js';
const descriptions=new Set(),images=new Set();
for(const [path,p]of Object.entries(pages)){
 const html=await readFile(new URL('../'+(path==='/'?'index.html':path.slice(1)+'index.html'),import.meta.url),'utf8'),d=parseHTML(html).document;
 assert.equal(d.title,p.title);assert.ok(!d.title.includes('Občané'));
 assert.equal(d.querySelectorAll('meta[name="description"]').length,1);const desc=d.querySelector('meta[name="description"]').content;assert.equal(desc,p.description);assert.ok(desc.length>=80&&desc.length<=180);descriptions.add(desc);
 assert.equal(d.querySelector('link[rel="canonical"]').href,'https://prortyni.cz'+path);
 for(const selector of ['meta[property="og:title"]','meta[name="twitter:title"]'])assert.equal(d.querySelector(selector).content,p.title);
 assert.equal(d.querySelector('meta[property="og:site_name"]').content,'Pro Rtyni');assert.equal(d.querySelector('meta[property="og:image"]').content,coverURL(p.cover));images.add(coverURL(p.cover));
 assert.deepEqual(JSON.parse(d.getElementById('portal-schema').textContent),pageSchema(path));
 const file=new URL('../assets/social/'+p.cover+'.jpg',import.meta.url);assert.ok((await readFile(file)).length>10000);
 assert.ok(!html.includes('Náš společný domov'));
}
assert.equal(descriptions.size,8);assert.equal(images.size,8);
assert.equal(safeImage(undefined),null);assert.equal(safeImage('javascript:alert(1)'),null);assert.equal(safeImage('https://user:secret@example.com/photo.jpg'),null);
const item={id:255,title:'Strašidla <b>ve Rtyni</b>',summary:'Pozvánka na odpoledne',payload:{kind:'event',body:['Veřejný text události.'],images:[]}};
const m=detailMeta('https://prortyni.cz/?zprava=255&fbclid=secret',{items:[item]});assert.equal(m.image,coverURL('akce'));assert.equal(m.canonical,'https://prortyni.cz/?zprava=255');assert.equal(m.title,'Strašidla ve Rtyni | Pro Rtyni');
const own=detailMeta('https://prortyni.cz/?zprava=255',{items:[{...item,payload:{...item.payload,images:[{url:'https://example.com/poster.jpg'}]}}]});assert.equal(own.image,'https://example.com/poster.jpg');assert.equal(own.imageWidth,null);
assert.equal(detailMeta('https://prortyni.cz/?zprava=255',{items:[item]},[],{overrides:[{target:'255',data:{hidden:true}}]}),null);
const edited=detailMeta('https://prortyni.cz/?zprava=255',{items:[{...item,payload:{...item.payload,blocks:[{type:'paragraph',text:'Původní text'}],sections:[{title:'Původní sekce',blocks:[]}]}}]},[],{overrides:[{target:'255',data:{title:'Oprava',summary:'Opravené sdělení',body:'Nový schválený text'}}]});
assert.ok(detailHTML(edited,edited.item).includes('Nový schválený text'));assert.ok(!detailHTML(edited,edited.item).includes('Původní text'));assert.ok(!detailHTML(edited,edited.item).includes('Původní sekce'));
const hostile=detailHTML(m,{...item,title:'<img src=x onerror=alert(1)>',payload:{body:['<script>alert(1)</script>']}});assert.ok(!hostile.includes('<script>'));assert.ok(!hostile.includes('<img'));
assert.ok(!jsonLD({x:'</script><script>alert(1)</script>'}).includes('</script>'));
class Rewriter{
 handlers=[];on(selector,handler){this.handlers.push([selector,handler]);return this;}
 transform(response){const {document:d}=parseHTML(response.testHTML);for(const[selector,handler]of this.handlers)for(const n of d.querySelectorAll(selector))handler.element({setAttribute:(k,v)=>n.setAttribute(k,v),removeAttribute:k=>n.removeAttribute(k),remove:()=>n.remove(),setInnerContent:(v,opts)=>{if(opts?.html)n.innerHTML=v;else n.textContent=v;}});return new Response(d.toString(),{status:response.status,headers:response.headers});}
}
globalThis.HTMLRewriter=Rewriter;
const home=await readFile(new URL('../index.html',import.meta.url),'utf8');
const response=()=>{const r=new Response(home,{headers:{'Content-Type':'text/html'}});r.testHTML=home;return r;};
const context=url=>({request:new Request(url),next:async()=>response(),env:{ASSETS:{fetch:async input=>Response.json(new URL(input).pathname.endsWith('seo-feed.json')?{items:[item]}:{articles:[],overrides:[]})}}});
const result=await onRequest(context('https://prortyni.cz/?zprava=255'));const server=parseHTML(await result.text()).document;
assert.equal(server.title,m.title);assert.ok(server.querySelector('#home').hasAttribute('hidden'));assert.ok(!server.querySelector('#article').hasAttribute('hidden'));assert.ok(server.querySelector('#article').textContent.includes('Veřejný text události.'));assert.equal(server.querySelector('meta[property="og:image"]').content,coverURL('akce'));assert.equal(JSON.parse(server.getElementById('portal-schema').textContent)['@graph'][0].url,m.canonical);
const preview=await onRequest(context('https://preview.prortyni.pages.dev/'));assert.equal(preview.headers.get('X-Robots-Tag'),'noindex, nofollow');
const sitemap=await readFile(new URL('../sitemap.xml',import.meta.url),'utf8');assert.ok(!sitemap.includes('/admin/'));assert.ok(sitemap.includes('/zpravy/?clanek='));assert.ok(!sitemap.includes('token_hash'));
delete globalThis.HTMLRewriter;
console.log('PASS: eight unique portal identities and covers, safe detail previews, canonical URLs, server-rendered public detail, JSON-LD escaping, preview noindex and public sitemap');
