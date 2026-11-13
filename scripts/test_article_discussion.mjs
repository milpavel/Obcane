import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {detailHTML} from '../assets/seo.js';
const {document,window}=parseHTML('<html><body><article id="article-under-test"></article></body></html>');
globalThis.document=document;globalThis.MutationObserver=window.MutationObserver;
globalThis.location={pathname:'/zpravy/',search:'?clanek=vizmburk-se-zazimoval-brany-zustavaji-otevrene-bludicky',hash:''};
globalThis.localStorage={getItem:()=>null};
let lookups=0;
globalThis.fetch=async raw=>{const url=new URL(raw);if(url.pathname.includes('/rest/')){lookups++;assert.equal(url.searchParams.get('status'),'eq.published');assert.equal(url.searchParams.get('slug'),'eq.vizmburk-se-zazimoval-brany-zustavaji-otevrene-bludicky');return {ok:true,json:async()=>[{id:6}]};}return {ok:true,json:async()=>({topic:{title:'Vízmburk',kind:'post',source_url:'/zpravy/',locked:false},comments:[],more:false})};};
const root=document.getElementById('article-under-test');
const oldArticle=()=>root.innerHTML='<div class="article-body"><p>Článek z dříve načteného skriptu</p></div><a class="detail-back-bottom" href="/zpravy/">Zpět</a>';
oldArticle();let importFails=true;
const {watchArticleDiscussion}=await import('../assets/article-discussion.js');
const state=watchArticleDiscussion(root,{loadModule:async()=>{if(importFails)throw Error('Mobile module request failed');return import('../assets/community.js');}});
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));await settle();
assert.equal(root.querySelectorAll('#diskuze').length,1);
assert.ok(root.querySelector('[data-article-discussion-fallback] h2'));
assert.equal(root.querySelector('[data-article-discussion-fallback] a').getAttribute('href'),'/komunita/?tema=post%3A6');
assert.ok(root.querySelector('.community-status').textContent.includes('nepodařilo'));
assert.ok(root.querySelector('[data-article-discussion-fallback]').nextElementSibling.classList.contains('detail-back-bottom'));
// No UUID helper is available: reading a thread must still work.
const realCrypto=globalThis.crypto;Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});
importFails=false;await state.reconcile();await settle();
assert.equal(root.querySelectorAll('#diskuze').length,1);assert.equal(root.querySelectorAll('[data-article-discussion-fallback]').length,0);
assert.ok(root.querySelector('.community').textContent.includes('Napsat svůj názor'));
// A cached renderer or a late feed response rebuilds the article without a widget.
oldArticle();await settle();await settle();
assert.equal(root.querySelectorAll('#diskuze').length,1);assert.ok(root.querySelector('.community').textContent.includes('Napsat svůj názor'));
assert.ok(root.querySelector('.community').nextElementSibling.classList.contains('detail-back-bottom'));
Object.defineProperty(globalThis,'crypto',{configurable:true,value:realCrypto});
const {clientId}=await import('../assets/community.js');
const legacyCrypto={getRandomValues:bytes=>realCrypto.getRandomValues(bytes)};
const uuid=clientId(legacyCrypto);assert.match(uuid,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);assert.notEqual(uuid,clientId(legacyCrypto));
assert.equal(watchArticleDiscussion(root),state);assert.ok(lookups>=1);state.disconnect();
// Even a browser that never starts the news module gets a usable server fallback.
const markup=detailHTML({}, {id:6,title:'Vízmburk',body:'Text'},true);
assert.ok(markup.includes('data-article-discussion-fallback'));assert.ok(markup.includes('/komunita/?tema=post%3A6'));
console.log('PASS: visible discussion and direct thread link survive failed mobile imports, cached article renderers and server-only rendering without duplicates');
