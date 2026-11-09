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
