import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {stripTypeScriptTypes,createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {parseHTML} from 'linkedom';
const require=createRequire(import.meta.url),tmp=await mkdtemp(new URL('../.source-test-',import.meta.url));
try{
 let source=await readFile(new URL('../supabase/functions/obcane-api/extra-sources.ts',import.meta.url),'utf8');
 source=source.replaceAll('npm:word-extractor@1.0.4',pathToFileURL(require.resolve('word-extractor')).href).replaceAll('npm:linkedom@0.18.12',pathToFileURL(require.resolve('linkedom')).href);
 const path=tmp+'/extra.mjs';await writeFile(path,stripTypeScriptTypes(source));const {parsePreschoolMenu,extractExtra,extraSources,richText}=await import(pathToFileURL(path));
 const czDate=s=>{const m=s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})/);if(!m)return null;const iso=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return iso;};
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim(),text=n=>clean(n?.textContent);
 const raw='Jídelní lístek od: 09. 11. do: 13. 11. 2026\n'+['Pondělí','Úterý','Středa','Čtvrtek','Pátek'].map(d=>d+': přesnídávka: pečivo A1-pšenice, A7 oběd: polévka, rýže A3 svačina: ovoce A7').join('\n')+'\nZměna jídelníčku vyhrazena.';
 const menu=parsePreschoolMenu(raw,'https://www.msrtyne.cz/menu.doc',czDate);
 assert.equal(menu.extra.preschool_days.length,5);assert.equal(menu.extra.preschool_days[0].date,'2026-11-09');assert.equal(menu.extra.preschool_days.at(-1).date,'2026-11-13');assert.ok(menu.extra.preschool_days[0].text.includes('A1-pšenice, A7'));assert.ok(menu.extra.menu_note.includes('Změna'));
 const crossover=parsePreschoolMenu(raw.replace('09. 11. do: 13. 11. 2026','28. 12. do: 01. 01. 2027'),'https://www.msrtyne.cz/x.doc',czDate);assert.equal(crossover.extra.preschool_days[0].date,'2026-12-28');assert.equal(crossover.extra.preschool_days.at(-1).date,'2027-01-01');
 assert.throws(()=>parsePreschoolMenu('Bez dat a bez dnů','https://www.msrtyne.cz/x.doc',czDate));
 assert.throws(()=>parsePreschoolMenu(raw.replace('Pátek:','Pátek '),'https://www.msrtyne.cz/x.doc',czDate));
 const html='<article><div class="news-item"><h2>Setkání klubíku Šikulové se nekoná</h2><div class="news-item-content"><p>Zrušeno 9. 11. 2026.</p></div></div><div class="news-item"><h2>Listopadové setkání klubíku Šikulové</h2><div class="news-item-content"><p>Pozvánka 9. 11. 2026.</p></div></div><div class="news-item"><h2>Klubík Kulihrášci</h2><div class="news-item-content"><p>Setkání 9. 11. 2026.</p></div></div></article>';
 const rows=await extractExtra(extraSources.find(x=>x.key==='library'),{page:async()=>parseHTML(html).document,text,clean,czDate,eventDate:czDate});
 assert.equal(rows[0].extra.cancelled,true);assert.equal(rows[1].extra.cancelled,true);assert.equal(rows[2].extra.cancelled,false);
 const table=parseHTML('<article><table><tr><td>Po</td><td>8:00–17:00</td></tr></table></article>').document;assert.deepEqual(richText(table.querySelector('article'),clean),['Po · 8:00–17:00']);
 console.log('PASS: MŠ dates, five days, allergens, malformed documents, cancellation propagation, opening-hours tables');
}finally{await rm(tmp,{recursive:true,force:true});}
