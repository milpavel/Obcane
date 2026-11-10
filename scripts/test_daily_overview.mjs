import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {easterSunday,publicHolidays,nextPublicHoliday,renderPublicHoliday} from '../assets/public-holidays.js';
import {renderTopbar} from '../assets/topbar.js';
assert.equal(publicHolidays(2026).length,13);assert.equal(publicHolidays(2026).filter(x=>x.state).length,7);
assert.equal(easterSunday(2026).toISOString().slice(0,10),'2026-04-05');assert.equal(easterSunday(2027).toISOString().slice(0,10),'2027-03-28');
assert.ok(publicHolidays(2026).some(h=>h.date==='2026-04-03'&&h.name==='Velký pátek'));assert.ok(publicHolidays(2027).some(h=>h.date==='2027-03-29'&&h.name==='Velikonoční pondělí'));
assert.equal(nextPublicHoliday('2026-11-09').date,'2026-11-17');assert.equal(nextPublicHoliday('2026-11-17').date,'2026-11-17');assert.equal(nextPublicHoliday('2026-11-18').date,'2026-12-24');assert.equal(nextPublicHoliday('2026-12-27').date,'2027-01-01');assert.equal(nextPublicHoliday('2026-04-04').date,'2026-04-06');assert.equal(nextPublicHoliday('bad-date'),null);
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),{document}=parseHTML(html),before=globalThis.document;globalThis.document=document;
try{assert.ok(document.getElementById('daily-nameday').closest('.topline'));assert.equal(document.querySelectorAll('#daily-nameday').length,1);assert.deepEqual([...document.querySelector('.daily-overview').children].map(n=>n.className),['weather-band','daily-transport','daily-grid']);assert.ok(!document.querySelector('.daily-grid #daily-nameday'));assert.equal(document.querySelectorAll('.daily-transport .departure-summary').length,2);
 renderPublicHoliday('2026-11-09');assert.ok(document.getElementById('public-holiday-label').textContent.includes('STÁTNÍ'));assert.ok(document.getElementById('next-public-holiday').textContent.includes('17. listopadu'));renderPublicHoliday('2026-11-18');assert.equal(document.getElementById('public-holiday-label').textContent,'NEJBLIŽŠÍ SVÁTEK');assert.ok(document.getElementById('next-public-holiday').textContent.includes('Štědrý den'));
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'});renderTopbar('Bohdan',today);assert.equal(document.getElementById('daily-nameday').textContent,'Svátek má Bohdan');renderTopbar('Včerejší jméno','2000-01-01');assert.equal(document.getElementById('daily-nameday').textContent,'');renderTopbar('',today);assert.equal(document.getElementById('daily-nameday').textContent,'');
}finally{if(before)globalThis.document=before;else delete globalThis.document;}
console.log('PASS: state/public holiday distinction, Easter dates, Christmas and year rollover, today inclusivity, nameday freshness and shared overview wrapper');
