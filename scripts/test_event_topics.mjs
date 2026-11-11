import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{parseHTML}from'linkedom';import{eventTags,matchesEventTopic,eventTopics}from'../assets/event-topics.js';
const event=(title,source_key='calendar',summary='')=>({title,source_key,summary,payload:{body:[]}});
assert.deepEqual(eventTags(event('Florbal – starší žákyně','florbal')),['sport']);
assert.ok(matchesEventTopic(event('Žákovské vystoupení hudebního oboru ZUŠ'),'culture'));
assert.ok(matchesEventTopic(event('Svátek strašidel – odpoledne pro děti'),'family'));
assert.ok(matchesEventTopic(event('Cestopisná přednáška o Špicberkách','library'),'culture'));
assert.ok(matchesEventTopic(event('Cestopisná přednáška o Špicberkách','library'),'learning'));
assert.ok(matchesEventTopic(event('Skautský ples','scouts'),'community'));
assert.ok(!matchesEventTopic(event('Koncert v Orlovně','orel'),'sport'),'Orel also organizes cultural events');
assert.ok(matchesEventTopic(event('Turnaj Rtyně Cup','banik'),'sport'));
assert.deepEqual(eventTags(event('Sběr použitých olejů')),['other']);assert.ok(matchesEventTopic(event('Neznámá akce'),'all'));
assert.equal(new Set(eventTopics.map(x=>x[0])).size,eventTopics.length);
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),d=parseHTML(html).document;
assert.equal(d.querySelectorAll('[data-event-topic]').length,eventTopics.length);assert.equal(d.querySelectorAll('[data-event-topic][aria-pressed="true"]').length,1);assert.ok(d.querySelector('.event-topics.news-filter-menu'));assert.ok(d.querySelector('.event-periods.news-filter-menu'));
assert.match(d.querySelector('#o-nas').textContent,/Projekt Pavla Míla/);assert.match(d.querySelector('#o-nas .large').textContent,/Informační portál pro Rtyni\. Na Rtyni mě záleží\. Nejen před volbami\./);assert.equal(d.querySelector('#o-nas .about-promise'),null);assert.ok(d.querySelector('#o-nas .portal-author').textContent.includes('Pavel Míl'));assert.equal(d.querySelector('#site-menu a[href="/?zprava=info-skolni-rok"]'),null);assert.ok(d.querySelector('.daily-strip a[href="/?zprava=info-skolni-rok"]'));
console.log('PASS: culture, sport, family, learning, community, multi-topic events, unknown fallback, filter controls, portal ownership and menu-only holiday removal');

assert.ok(!matchesEventTopic(event('Kino zve na rodinný film', 'calendar','Přijďte na filmový příběh plný dobrodružství.'),'sport'),'A story is not a running event');
