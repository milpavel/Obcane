import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {stripTypeScriptTypes,createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {parseHTML} from 'linkedom';
import {renderBlocks,renderAttachments,organizeDetail,cleanDetailText,fallbackBlocks} from '../assets/details.js';
const require=createRequire(import.meta.url),tmp=await mkdtemp(new URL('../.details-test-',import.meta.url));
try{
 let source=await readFile(new URL('../supabase/functions/obcane-api/extra-sources.ts',import.meta.url),'utf8');
 source=source.replaceAll('npm:word-extractor@1.0.4',pathToFileURL(require.resolve('word-extractor')).href).replaceAll('npm:linkedom@0.18.12',pathToFileURL(require.resolve('linkedom')).href);
 for(const name of ['club-profiles','community-sources']){await writeFile(tmp+'/'+name+'.mjs',stripTypeScriptTypes(await readFile(new URL('../supabase/functions/obcane-api/'+name+'.ts',import.meta.url),'utf8')));source=source.replace('./'+name+'.ts','./'+name+'.mjs');}
 await writeFile(tmp+'/extra.mjs',stripTypeScriptTypes(source));const {contentBlocks,serviceDetail}=await import(pathToFileURL(tmp+'/extra.mjs'));
 const d=parseHTML('<html><body><article class="article"><div class="article__body"><h2 class="element-type-heading">Text stránky</h2><p>MUDr. Test</p><p>Ordinační hodiny</p><table><tr><td>Po</td><td>8:00 – 12:00</td><td>13:00 – 17:00</td></tr></table><ul><li>telefon: 499 888 105</li></ul><p>Po-St 7:30 – 1213-15</p><nav><p>Menu</p></nav><p>MUDr. Druhý</p><p>e-mail: test@example.cz</p><a href="javascript:alert(1)">x</a></div><nav><a class="tile__link" href="/info">Základní informace</a></nav></article></body></html>').document;
 const blocks=contentBlocks(d.querySelector('.article__body'),'https://www.rtyne.cz/test');assert.ok(!JSON.stringify(blocks).includes('Text stránky'));assert.ok(!JSON.stringify(blocks).includes('1213-15'));assert.equal(blocks.find(x=>x.type==='table').rows[0].length,3);assert.equal(blocks.filter(x=>x.type==='heading'&&x.level===2).length,2);
 const details=await serviceDetail(d,'https://www.rtyne.cz/test',async()=>parseHTML('<article class="article"><div class="article__body"><p>Telefon: 720 512 632</p></div><a class="global-attachment__link" href="/file/123" data-attachment-type="pdf">Ceník.pdf</a></article>').document,s=>s.trim());assert.equal(details.sections.length,1);assert.equal(details.sections[0].attachments.length,1);
 globalThis.document=parseHTML('<html><body><div id="body"></div></body></html>').document;
 const body=document.getElementById('body');renderBlocks(body,blocks);renderAttachments(body,[{title:'Ceník.pdf pdf 12 kB',url:'https://www.rtyne.cz/file/123',type:'pdf'},{title:'Bad',url:'javascript:alert(1)'}]);organizeDetail(body);
 assert.equal(body.querySelectorAll('.detail-section').length,2);assert.equal(body.querySelectorAll('.detail-contents a').length,2);assert.equal(body.querySelector('table tr').children.length,3);assert.ok(body.querySelector('a[href="tel:499888105"]'));assert.ok(body.querySelector('a[href="mailto:test@example.cz"]'));assert.ok(!body.querySelector('iframe'));assert.ok(body.querySelector('details summary'));assert.ok(!body.textContent.includes('Bad'));assert.ok(!body.querySelector('script'));
 assert.equal(cleanDetailText('Text složky Skutečný obsah'),'Skutečný obsah');assert.equal(fallbackBlocks(['Dlaždice','Text stránky','Adresa']).length,1);
 const unsafe=document.createElement('div');renderBlocks(unsafe,[{type:'paragraph',text:'<img src=x onerror=alert(1)>',links:[{text:'x',url:'javascript:alert(1)'}]}]);assert.ok(!unsafe.querySelector('img,a'));
 const times=document.createElement('div');renderBlocks(times,[{type:'paragraph',text:'Úterý – pátek 7.30 – 12 30 13 - 16'},{type:'paragraph',text:'Čt, Pá – 7:30 – 12:30'}]);assert.equal(times.querySelector('th').textContent,'Úterý – pátek');assert.ok(times.textContent.includes('7:30 – 12:30 13:00 – 16:00'));assert.equal(times.querySelectorAll('tr').length,2);
 console.log('PASS: semantic import, directory children, exact table cells, ambiguous hours, safe contacts, shared sections and lazy document previews');
}finally{await rm(tmp,{recursive:true,force:true});}
