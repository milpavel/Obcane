import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFileSync} from 'node:fs';
import {tipClock,tipCandidates,selectHeroTip,renderHeroTip,resultScore,selectHeroSlides,createHeroSlider} from '../assets/hero-tip.js';
const now=new Date('2026-11-11T11:00:00Z');
const event=(id,source='school',date='2026-11-12')=>({id,source_key:source,title:'Koncert '+id,event_date:date,summary:'Pozvánka na koncert',payload:{kind:'event',time:'18:00',body:[]}});
const news=(id,source='city',published='2026-11-11T09:00:00Z')=>({id,source_key:source,title:'Novinky '+id,summary:'Čerstvá zpráva',published_at:published,payload:{body:[]}});
const feed={items:[event(1),event(2,'florbal'),event(3,'florbal'),news(4),news(5,'preschool')]};
assert.deepEqual(tipClock(now),{day:'2026-11-11',time:'12:00',slot:Math.floor(Date.parse('2026-11-11')/86400000)*8+4});
assert.equal(tipClock(new Date('2026-11-11T23:15:00Z')).day,'2026-11-12');
assert.equal(tipClock(new Date('2026-07-11T22:15:00Z')).day,'2026-07-12');
assert.equal(selectHeroTip(feed,[],now).item.id,selectHeroTip({...feed,items:[...feed.items].reverse()},[],now).item.id);
const seen=new Set([12,15,18,21].map(h=>selectHeroTip(feed,[],new Date(`2026-11-11T${String(h).padStart(2,'0')}:00:00Z`)).item.id));assert.ok(seen.size>=2,'Three-hour rotation must include different sources and topics');
const invalid={items:[event(1,'school','2026-11-10'),event(2,'school','2026-99-99'),{...event(3),payload:{kind:'event',cancelled:true}},news(4,'city','2025-11-11T09:00:00Z'),news(5,'city','2026-11-12T09:00:00Z'),{...news(6),payload:{kind:'club'}},{...event(7),payload:{kind:'event',in_latest:false}}]};assert.equal(selectHeroTip(invalid,[],now),null);
assert.equal(selectHeroTip({items:[event(1,'school','2026-11-11')]},[],new Date('2026-11-11T17:01:00Z')),null,'Passed start must not be promoted');
assert.ok(selectHeroTip({items:[{...event(1,'school','2026-11-11'),payload:{kind:'event',time:'18:00',end_time:'20:00'}}]},[],new Date('2026-11-11T18:01:00Z')),'Confirmed ongoing event remains eligible');
const notice={id:8,source_key:'water',title:'Přerušení dodávky vody 11. listopadu 2026',summary:'Dnes bude přerušena dodávka vody.',payload:{body:[]}};assert.equal(selectHeroTip({items:[...feed.items,notice]},[],now).item.id,8,'Active restriction takes priority');
assert.equal(selectHeroTip({items:[{...event(1),payload:{kind:'event',detail_error:'failed'}}]},[],now),null);
const articles=[{id:'a',slug:'vlastni-clanek',title:'Naše zpráva',category:'original',excerpt:'Zpráva od redakce',published_at:'2026-11-11T08:00:00Z'}];assert.equal(selectHeroTip({items:[]},articles,now).href,'/zpravy/?clanek=vlastni-clanek');
const {document}=parseHTML('<html><body><div id="hero-tip"></div></body></html>');global.document=document;const root=document.querySelector('#hero-tip');renderHeroTip(root,selectHeroTip(feed,[],now));assert.ok(root.querySelector('h1#intro-title'));assert.ok(root.querySelector('a').href.startsWith('/?zprava='));renderHeroTip(root,null);assert.equal(root.querySelector('a').href,'/#akce');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),dom=parseHTML(html).document;assert.match(dom.querySelector('#o-nas').textContent,/Na Rtyni nám záleží/);assert.doesNotMatch(dom.querySelector('.intro-banner').textContent,/Nejen před volbami/);
console.log('PASS: Prague/DST clock, three-hour diverse rotation, current notices, expired/cancelled/unknown/failed exclusion, original articles, local detail links, safe fallback and moved introduction');

assert.equal(resultScore({title:'Baník zvítězil 3:1',payload:{body:[]}}),'3:1');
assert.equal(resultScore({title:'Zápas skončil v 19:00',payload:{body:[]}}),null);
assert.equal(resultScore({title:'Výsledkový servis',payload:{body:['Muži porazili soupeře 8:2.']}}),'8:2');
const result={...news(50,'banik'),title:'Baník vyhrál 3:1',payload:{body:['Baník vyhrál 3:1.']}};
assert.ok(tipCandidates({items:[result]},[],now).some(x=>x.type==='result'&&x.result==='3:1'));
assert.ok([0,3,6,9,12,15,18,21].some(h=>selectHeroTip({items:[...feed.items,result]},[],new Date(`2026-11-11T${String(h).padStart(2,'0')}:00:00Z`))?.type==='result'),'Results get a dedicated rotation slot');

const result1={...result,published_at:'2026-11-10T09:00:00Z'},result2={...result1,id:51,title:'Baník vyhrál 2:0'};assert.notEqual(selectHeroTip({items:[result1,result2]},[],new Date('2026-11-11T02:00:00Z')).item.id,selectHeroTip({items:[result1,result2]},[],new Date('2026-11-11T14:00:00Z')).item.id,'Reports from one source also rotate');

renderHeroTip(root,{item:{...result,payload:{body:['Baník porazil soupeře 3:1.']}},type:'result',tag:'Výsledky sportu',result:'3:1',href:'/?zprava=50'});assert.match(root.textContent,/Výsledek 3:1/);assert.match(root.textContent,/Baník porazil soupeře 3:1/);

const triple=selectHeroSlides({items:[...feed.items,result,result2]},[],now);assert.equal(triple.length,3);assert.equal(new Set(triple.map(x=>x.href)).size,3);assert.ok(triple.some(x=>x.type==='result'));assert.ok(triple.some(x=>x.type==='event'));assert.ok(triple.some(x=>x.type==='news'));
assert.equal(selectHeroSlides({items:[]},[],now).length,0);
const sliderRoot=document.createElement('div');document.body.append(sliderRoot);const slider=createHeroSlider(sliderRoot,{reducedMotion:true});slider.setTips(triple);assert.equal(slider.getState().count,3);assert.equal(sliderRoot.querySelectorAll('h1').length,1);assert.equal(sliderRoot.querySelectorAll('.hero-slide:not([hidden])').length,1);sliderRoot.querySelector('.hero-slider-arrow[aria-label="Další upoutávka"]').onclick();assert.equal(slider.getState().active,1);sliderRoot.querySelectorAll('.hero-slider-dot')[2].onclick();assert.equal(slider.getState().active,2);assert.equal(sliderRoot.querySelector('.hero-slider-dot[aria-current="true"]').textContent,'3');
slider.setTips([]);assert.equal(slider.getState().count,1);assert.ok(sliderRoot.querySelector('.hero-slider-controls').hidden);assert.ok(sliderRoot.querySelector('a[href="/#akce"]'));
const emptyRoot=document.createElement('div'),emptySlider=createHeroSlider(emptyRoot,{reducedMotion:true});emptySlider.setTips([]);assert.ok(emptyRoot.querySelector('.hero-slide'),'Initial empty feed must render fallback');
console.log('PASS: three unique mixed slides, manual arrows and dots, single active slide, reduced-motion pause and empty-feed fallback');
