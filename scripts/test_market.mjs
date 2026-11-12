import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {validateAd,decodePhotos,hash,sign,issueToken,verifyToken,publicAd} from '../supabase/functions/obcane-market/rules.mjs';
import {isHousingNotice,deadlineFromText,deadlineAtFromText,collectMunicipal} from '../supabase/functions/obcane-market/municipal.mjs';
import {parseHTML} from 'linkedom';
const ad={category:'bydleni',kind:'nabizim',title:'Pronájem bytu 2+1',description:'Byt ve Rtyni k dlouhodobému pronájmu, více po domluvě.',location:'Rtyně v Podkrkonoší',contact_name:'Test',contact_email:'test@example.com',price_mode:'castka',price:'10000',price_note:'+ služby',housing_type:'pronajem',consent:true};
assert.equal(validateAd(ad).price,10000);
for(const patch of [{consent:false},{category:'inherited'},{category:'constructor'},{price:-1},{price:1.5},{price:''},{contact_email:'test@example.com\nBcc:bad@example.com'},{description:'short'},{housing_type:'bad'},{website:'bot'},{title:'x'.repeat(111)},{available_from:'2026-02-31'}])assert.throws(()=>validateAd({...ad,...patch}));
assert.equal(validateAd({...ad,kind:'daruji'}).price_mode,'zdarma');
assert.equal(validateAd({...ad,category:'deti',housing_type:'nonsense'}).housing_type,null);
for(const photos of [["data:image/svg+xml;base64,AA=="],Array(4).fill(''),['data:image/jpeg;base64,'+'a'.repeat(420000)],['data:image/jpeg;base64,AAAA']])assert.throws(()=>decodePhotos(photos));
assert.deepEqual(decodePhotos([]),[]);
const now=Date.now(),origin='https://prortyni.cz',token=await issueToken('test-key-only',origin,now);
assert.ok(await verifyToken('test-key-only',token,origin,now+2100));
for(const [t,o,n]of [[token,origin,now+100],[token,origin,now+1900000],[token,origin,now-500],[token+'x',origin,now+3000],[token,'https://evil.example',now+3000]])assert.equal(await verifyToken('test-key-only',t,o,n),null);
assert.notEqual(await sign('test-key-only','manage:one'),await sign('test-key-only','manage:two'));
assert.ok(!JSON.stringify(publicAd({...ad,manage_hash:'secret',client_hash:'ip',moderation_note:'private',request_key:'private'})).includes('secret'));
assert.equal((await hash('key')).length,64);
assert.ok(isHousingNotice('Město Rtyně pronajme bytovou jednotku'));
assert.ok(!isHousingNotice('Pronájem nebytových prostor'));
assert.ok(!isHousingNotice('Pronájem garáže'));
assert.equal(deadlineFromText('Uzávěrka žádostí – 12.05.2025 v 17:00 hod.'),'2025-05-12');
assert.equal(deadlineFromText('Nastěhování 1. 6. 2027'),null);
assert.equal(deadlineAtFromText('Uzávěrka žádostí – 12.05.2027 v 17:00 hod.'),'2027-05-12T15:00:00.000Z');
assert.equal(deadlineAtFromText('Uzávěrka žádostí – 12.11.2026 v 17:00 hod.'),'2026-11-12T16:00:00.000Z');
const pages={
 'https://www.rtyne.cz/':'<a href="/stary-byt">Pronájem bytu</a><a href="/novy-byt">Město pronajme byt</a><a href="/nejasny-byt">Volný byt k pronájmu</a><a href="/garaz">Pronájem garáže</a><a href="https://evil.example/byt">Pronájem bytu</a>',
 'https://www.rtyne.cz/uredni-deska':'',
 'https://www.rtyne.cz/stary-byt':'<main>Uzávěrka žádostí 1. 2. 2025</main>',
 'https://www.rtyne.cz/novy-byt':'<main>Uzávěrka žádostí 1. 2. 2027</main>',
 'https://www.rtyne.cz/nejasny-byt':'<main>Datum žádostí najdete v příloze.</main>'
};
const result=await collectMunicipal({parseHTML,today:'2026-11-12',page:async u=>{assert.ok(u in pages);return pages[u];}});
assert.equal(result.offers.length,1);assert.equal(result.offers[0].deadline,'2027-02-01');assert.equal(result.unverified.length,1);
const backend=await readFile(new URL('../supabase/functions/obcane-market/index.ts',import.meta.url),'utf8');assert.doesNotThrow(()=>stripTypeScriptTypes(backend,{mode:'transform'}));
assert.match(backend,/status='published' and expires_at>now\(\)/);
assert.match(backend,/status='pending'/);
const {document}=parseHTML(await readFile(new URL('../inzerce/index.html',import.meta.url),'utf8'));
for(const label of document.querySelectorAll('label[for]'))assert.ok(document.getElementById(label.getAttribute('for')),label.outerHTML);
for(const id of ['market-grid','ad-form','ad-photos','ad-success','owner-withdraw','market-detail'])assert.ok(document.getElementById(id));
console.log('PASS: listing validation, public/private projection, signed form scope/expiry/tampering, photo limits, current municipal deadlines, source allowlist, frontend field labels and backend syntax');
