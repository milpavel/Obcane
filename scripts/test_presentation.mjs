import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{parseHTML}from'linkedom';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');const[html,css,app]=await Promise.all(['index.html','assets/style.css','assets/app.js'].map(read));const{document:d}=parseHTML(html);
for(const email of['pavlova.mila@seznam.cz','mil.pavel@icloud.com'])assert.ok(d.querySelector('address a[href="mailto:'+email+'"]'),'Missing person contact: '+email);
assert.match(css,/\.daily-grid>div\{text-align:center/);assert.ok(!app.includes('Původní zdroj'),'Removed article footer returned');assert.ok(!app.includes('Zobrazit informace přímo tady'));
assert.equal(d.querySelector('.intro-button.secondary').getAttribute('href'),'#podnety');assert.ok(d.querySelector('#suggestion-form'));for(const h of d.querySelectorAll('main h2'))for(const node of h.childNodes)if(node.nodeType===3)assert.ok(!node.textContent.includes('.'),'Unstyled heading dot: '+h.textContent);
console.log('PASS: contacts, centered daily overview, source footer removal, suggestion CTA and pink heading punctuation');
