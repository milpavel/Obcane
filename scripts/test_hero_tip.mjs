import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFileSync} from 'node:fs';
import {tipClock,tipCandidates,selectHeroTip,renderHeroTip,resultScore,selectHeroSlides,createHeroSlider,latestMainTip} from '../assets/hero-tip.js';
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
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),dom=parseHTML(html).document;assert.match(dom.querySelector('#o-nas').textContent,/Na Rtyni mi záleží/);assert.doesNotMatch(dom.querySelector('.intro-banner').textContent,/Nejen před volbami/);
console.log('PASS: Prague/DST clock, three-hour diverse rotation, current notices, expired/cancelled/unknown/failed exclusion, original articles, local detail links, safe fallback and moved introduction');

assert.equal(resultScore({title:'Baník zvítězil 3:1',payload:{body:[]}}),'3:1');
assert.equal(resultScore({title:'Zápas skončil v 19:00',payload:{body:[]}}),null);
assert.equal(resultScore({title:'Výsledkový servis',payload:{body:['Muži porazili soupeře 8:2.']}}),'8:2');
const result={...news(50,'banik'),title:'Baník vyhrál 3:1',payload:{body:['Baník vyhrál 3:1.']}};
assert.equal(tipCandidates({items:[result]},[],now).length,0,'Sports results are excluded');
for(const h of [0,3,6,9,12,15,18,21])assert.ok(selectHeroSlides({items:[...feed.items,result]},[],new Date(`2026-11-11T${String(h).padStart(2,'0')}:00:00Z`)).every(x=>x.type!=='result'&&x.item.id!==50));
const result1={...result,published_at:'2026-11-10T09:00:00Z'},result2={...result1,id:51,title:'Baník vyhrál 2:0'};
renderHeroTip(root,{item:{...result,payload:{body:['Baník porazil soupeře 3:1.']}},type:'result',tag:'Výsledky sportu',result:'3:1',href:'/?zprava=50'});assert.match(root.textContent,/Výsledek 3:1/);assert.match(root.textContent,/Baník porazil soupeře 3:1/);

const triple=selectHeroSlides({items:[...feed.items,result,result2]},[],now);assert.equal(triple.length,5);assert.equal(new Set(triple.map(x=>x.href)).size,5);assert.ok(triple.every(x=>x.type!=='result'));assert.deepEqual(triple.slice(3).map(x=>x.href),['/inzerce/','/novinky/']);assert.ok(triple.some(x=>x.type==='event'));assert.ok(triple.some(x=>x.type==='news'));
assert.equal(selectHeroSlides({items:[]},[],now).length,5);
const sliderRoot=document.createElement('div');document.body.append(sliderRoot);const slider=createHeroSlider(sliderRoot,{reducedMotion:true});slider.setTips(triple);assert.equal(slider.getState().count,5);assert.equal(sliderRoot.querySelectorAll('h1').length,1);assert.equal(sliderRoot.querySelectorAll('.hero-slide:not([hidden])').length,1);sliderRoot.querySelector('.hero-slider-arrow[aria-label="Další upoutávka"]').onclick();assert.equal(slider.getState().active,1);sliderRoot.querySelectorAll('.hero-slider-dot')[2].onclick();assert.equal(slider.getState().active,2);assert.equal(sliderRoot.querySelector('.hero-slider-dot[aria-current="true"]').textContent,'3');
slider.setTips([]);assert.equal(slider.getState().count,1);assert.ok(sliderRoot.querySelector('.hero-slider-controls').hidden);assert.ok(sliderRoot.querySelector('a[href="/#akce"]'));
const emptyRoot=document.createElement('div'),emptySlider=createHeroSlider(emptyRoot,{reducedMotion:true});emptySlider.setTips([]);assert.ok(emptyRoot.querySelector('.hero-slide'),'Initial empty feed must render fallback');
console.log('PASS: five unique slides, classifieds and newsletter promotions, no results, manual arrows and dots, single active slide, reduced-motion pause and empty-feed fallback');

assert.equal(sliderRoot.querySelector('.hero-slider-pause'),null,'Pause button removed from the page');

const mainOld={id:90,slug:'starsiahlavni',title:'Poslední hlavní zpráva',category:'media',published_at:'2026-10-01T10:00:00Z',source_date:'2026-10-01',excerpt:'Hlavní zpráva i po sedmi dnech.'};
for(const h of [0,3,6,9,12,15,18,21]){const slides=selectHeroSlides({...feed,posts:[mainOld]},[],new Date(`2026-11-11T${String(h).padStart(2,'0')}:00:00Z`));assert.equal(slides.length,5);assert.equal(slides.filter(x=>x.href==='/zpravy/?clanek=starsiahlavni').length,1,'Latest main article is always included once');assert.equal(slides[2].tag,'Hlavní zprávy');}
const newer={...mainOld,id:91,slug:'nova-hlavni',title:'Nová hlavní zpráva',category:'original',published_at:'2026-11-10T10:00:00Z',source_date:null};
assert.equal(latestMainTip({posts:[mainOld,newer]},[mainOld],now).item.id,91);
assert.equal(latestMainTip({posts:[{...newer,status:'draft'},{...mainOld,published_at:'2027-01-01T10:00:00Z'}]},[],now),null);
assert.equal(selectHeroSlides({items:[],posts:[mainOld]},[],now)[2].item.id,90);
const urgentSlides=selectHeroSlides({items:[notice,...feed.items],posts:[newer]},[],now);assert.ok(urgentSlides.some(x=>x.type==='notice'));assert.equal(urgentSlides[1].item.id,91);assert.equal(new Set(urgentSlides.map(x=>x.href)).size,5);
console.log('PASS: latest published main-news article retained across every time slot, media/original, older than seven days, live overrides, no duplicates, urgent notices and empty general feed');

const todayMain={...newer,id:100,slug:'dnes',published_at:'2026-11-11T08:00:00Z'},longerFeed={items:[event(20,'school','2026-11-18'),news(21),news(22,'preschool')]};
for(const [date,position] of [['2026-11-11',0],['2026-11-12',1],['2026-11-13',2]]){const slides=selectHeroSlides(longerFeed,[todayMain],new Date(date+'T11:00:00Z'));assert.equal(slides[position].item.id,100,'Main article position follows its portal publication age');}
const nearSlides=selectHeroSlides({items:[event(30,'school','2026-11-12')]},[todayMain],now);assert.equal(nearSlides[0].item.id,30);assert.equal(nearSlides[1].item.id,100);
assert.equal(latestMainTip({posts:[todayMain,{...todayMain,id:101,slug:'old-source',source_date:'2020-01-01',published_at:'2026-11-11T10:00:00Z'}]},[],now).item.id,101,'Newest portal publication wins, even with an older source date');
assert.equal(latestMainTip({posts:[{...todayMain,title:'Baník vyhrál zápas 3:1'},newer]},[],now).item.id,newer.id,'Main-news sports results are excluded too');
const changes=new Set([0,3,6,9,12,15,18,21].map(h=>selectHeroSlides(feed,[],new Date(`2026-11-11T${String(h).padStart(2,'0')}:00:00Z`)).map(x=>x.href).join('|')));assert.ok(changes.size>=3,'Content changes in three-hour slots');
slider.setTips(triple);sliderRoot.querySelectorAll('.hero-slider-dot')[4].onclick();assert.equal(slider.getState().active,4);sliderRoot.dispatchEvent(new document.defaultView.Event('pointerenter'));slider.setTips(triple.map(x=>({...x,cycle:x.cycle+1})));assert.equal(slider.getState().active,0,'New time slot starts at first slide even when hovered');
const changed=triple.map(x=>({...x,item:{...x.item,title:x.item.title+' updated'}}));slider.setTips(changed);assert.match(sliderRoot.textContent,/updated/,'Changes to same-link content refresh');
for(const file of ['index.html','inzerce/index.html','bydleni/index.html','zpravy/index.html','novinky/index.html']){const d=parseHTML(readFileSync(new URL('../'+file,import.meta.url),'utf8')).document;assert.ok(d.querySelector('footer .footer-newsletter[href="/novinky/"]'));assert.doesNotMatch(d.querySelector('footer').textContent,/Pro naši Rtyni\. Rukama i srdcem/);}
console.log('PASS: main article age positions, imminent event first, publication-time ordering, no sports results, direct three-hour rotation, hover-safe content update, five controls, newsletter footers');
