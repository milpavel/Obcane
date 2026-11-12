import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFile,stat} from 'node:fs/promises';
import {parseSchoolHolidays,safeSource,blocksFrom} from './update_practical_info.mjs';
import {linkedText} from '../assets/details.js';
import {nextHoliday,mergePracticalInfo} from '../assets/practical-info.js';
import {buildSearchIndex,searchIndex} from '../assets/site-search.js';
const {document}=parseHTML('<div><p>Podzimní prázdniny 29. října a 30. října 2026.</p><p>Vánoční prázdniny od 23. prosince 2026 do 3. ledna 2027.</p><p>Jednodenní pololetní prázdniny 29. ledna 2027.</p><p>Jarní prázdniny okres Trutnov 15. 2. – 21. 2. 2027.</p><p>Velikonoční prázdniny 25. března 2027.</p><p>Hlavní prázdniny 1. července 2027 až 31. srpna 2027.</p></div>');
const holidays=parseSchoolHolidays(document.querySelector('div'));
assert.equal(nextHoliday(holidays,'2026-11-09').start,'2026-12-23');assert.equal(nextHoliday(holidays,'2026-12-23').name,'Vánoční prázdniny');assert.equal(nextHoliday(holidays,'2027-01-03').name,'Vánoční prázdniny');assert.equal(nextHoliday(holidays,'2027-01-04').name,'Pololetní prázdniny');assert.equal(nextHoliday(holidays,'2027-02-15').end,'2027-02-21');assert.equal(nextHoliday(holidays,'2027-09-01'),null);assert.throws(()=>parseSchoolHolidays(parseHTML('<p>Jarní prázdniny brzy.</p>').document));
assert.equal(safeSource('https://evil.test/a.pdf'),null);assert.equal(safeSource('https://www.msrtyne.cz@evil.test/a.pdf'),null);assert.equal(safeSource('/x.pdf','https://www.zsrtyne.cz'),'https://www.zsrtyne.cz/x.pdf');
const local=JSON.parse(await readFile(new URL('../data/practical-info.json',import.meta.url))),merged=mergePracticalInfo({items:[{id:'existing'},local.items[0]]},local);assert.equal(merged.items.length,local.items.length+1);assert.equal(local.items.length,7);
const rows=buildSearchIndex(merged);assert.equal(searchIndex(rows,'druzina')[0].href,'/?zprava=info-druzina');assert.ok(searchIndex(rows,'prazdniny').some(r=>r.href==='/?zprava=info-skolni-rok'));assert.ok(searchIndex(rows,'608503876').some(r=>r.href==='/?zprava=info-jidelna-ms'));
for(const item of local.items){assert.ok(item.payload.source_urls.every(u=>safeSource(u)));for(const a of item.payload.attachments||[]){assert.ok(a.url.startsWith('/documents/'));assert.ok((await stat(new URL('..'+a.url,import.meta.url))).size>100);}}
const home=parseHTML(await readFile(new URL('../index.html',import.meta.url),'utf8')).document;assert.ok(!home.getElementById('prakticke').contains(home.getElementById('aktuality-lekaru')));assert.ok(home.getElementById('next-school-holiday'));assert.ok(home.querySelector('#omezeni h2'));
console.log('PASS: school holiday rollover, Czech dates, local document downloads, separate doctor section, seven indexed practical cards and source allowlist');

const was=globalThis.document;globalThis.document=document;const linked=linkedText(document.createElement('p'),'Účet 104047567/0300, telefon 499 888 137.');assert.equal(linked.querySelectorAll('a').length,1);assert.equal(linked.querySelector('a').href,'tel:499888137');if(was)globalThis.document=was;else delete globalThis.document;

const localServices=JSON.parse(await readFile(new URL('../data/local-services.json',import.meta.url),'utf8'));const withServices=mergePracticalInfo(merged,{items:[...local.items,...localServices.items]});assert.equal(withServices.items.at(-1).id,'info-vycistime-to-za-vas');assert.equal(withServices.items.filter(x=>x.id==='info-zs').length,1);assert.ok(searchIndex(buildSearchIndex(withServices),'vycistime').some(x=>x.href==='/?zprava=info-vycistime-to-za-vas'));assert.ok(searchIndex(buildSearchIndex(withServices),'731850260').some(x=>x.href==='/?zprava=info-vycistime-to-za-vas'));
