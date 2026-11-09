import assert from 'node:assert/strict';
import {uniqueEvents} from '../assets/events.js';
const event=(title,source_key='library',event_date='2026-11-10',time=null)=>({title,source_key,event_date,payload:{time}});
assert.equal(uniqueEvents([event('Pozvánka na deskovou hru Hra o trůny'),event('Hra o trůny – přijďte si zahrát!','calendar')]).length,1);
assert.equal(uniqueEvents([event('Cestopisná přednáška „Putování po Špicberkách“'),event('Cestopisná přednáška po Špicberkách','calendar')])[0].source_key,'library');
assert.equal(uniqueEvents([event('Adventní koncert dětí'),event('Adventní koncert dospělých')]).length,2);
assert.equal(uniqueEvents([event('Adventní koncerty','koletovka','2026-11-27'),event('Adventní koncerty','koletovka','2026-11-28')]).length,2);
assert.equal(uniqueEvents([event('Hra o trůny','library','2026-11-10','10:00'),event('Hra o trůny','calendar','2026-11-10','17:00')]).length,2);
console.log('PASS: cross-source event duplicates, source priority, distinct days, times and topics');

const conflict=uniqueEvents([event('Cestopisná přednáška po Špicberkách','calendar','2026-11-11'),event('Putování po Špicberkách','library','2026-11-12')]);assert.equal(conflict.length,1);assert.equal(conflict[0].event_date,'2026-11-12');assert.equal(conflict[0].payload.date_conflict,true);assert.equal(conflict[0].payload.event_alternatives[0].date,'2026-11-11');

const concert={...event('Adventní koncerty','koletovka','2026-11-27','19:00'),id:703,payload:{time:'19:00',location:'Hala Orlovna, Rtyně v Podkrkonoší (od 19:00)'}};
const ticket={...event('Adventní koncert Koletovy hornické hudby','sms_orlovna','2026-11-27','19:00'),id:2000,external_url:'https://www.smsticket.cz/vstupenky/76597-koncert',payload:{time:'19:00',location:'Sportovní hala Orlovna, Rtyně v Podkrkonoší',event_sources:[{title:'Vstupenky na SMS ticketu',url:'https://www.smsticket.cz/vstupenky/76597-koncert'}]}};
const merged=uniqueEvents([ticket,concert]);assert.equal(merged.length,1);assert.equal(merged[0].source_key,'koletovka');assert.equal(merged[0].payload.event_alternatives[0].source_key,'sms_orlovna');assert.equal(merged[0].payload.event_sources[0].url,ticket.external_url);
assert.equal(uniqueEvents([concert,{...ticket,event_date:'2026-11-28'}]).length,2);
assert.equal(uniqueEvents([concert,{...ticket,payload:{...ticket.payload,time:'18:00'}}]).length,2);
assert.equal(uniqueEvents([concert,{...ticket,payload:{...ticket.payload,location:'Přírodní areál'}}]).length,2);
console.log('PASS: SMS ticket is merged with the organizer only for matching concert, venue, date and time; ticket link survives the merge');
