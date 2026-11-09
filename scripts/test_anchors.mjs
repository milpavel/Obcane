import assert from 'node:assert/strict';
import {preserveInitialAnchor} from '../assets/anchors.js';
function fixture(hash='#doprava'){
 const win=new EventTarget(),doc=new EventTarget(),frames=[],calls=[];
 win.location=new URL('https://prortyni.cz/'+hash);win.requestAnimationFrame=f=>frames.push(f);
 doc.getElementById=id=>({closest:()=>null,scrollIntoView:options=>calls.push({id,options})});
 preserveInitialAnchor(win,doc);
 return {win,doc,calls,ready(){doc.dispatchEvent(new Event('rtyne:content-ready'));while(frames.length)frames.shift()();}};
}
const direct=fixture();direct.ready();assert.equal(direct.calls[0].id,'doprava');assert.equal(direct.calls[0].options.behavior,'instant');direct.ready();assert.equal(direct.calls.length,1);
for(const event of ['wheel','touchstart','keydown']){const manual=fixture();manual.win.dispatchEvent(new Event(event));manual.ready();assert.equal(manual.calls.length,0,'Do not override manual navigation: '+event);}
const pointer=fixture();pointer.doc.dispatchEvent(new Event('pointerdown'));pointer.ready();assert.equal(pointer.calls.length,0);
const changed=fixture();changed.win.location.hash='#servis';changed.win.dispatchEvent(new Event('hashchange'));changed.ready();assert.equal(changed.calls[0].id,'servis');
const none=fixture('');none.ready();assert.equal(none.calls.length,0);
const malformed=fixture('#%E0%A4%A');malformed.ready();assert.equal(malformed.calls.length,0);
console.log('PASS: restore deep link after asynchronous feed rendering; preserve manual scroll, new hash, no hash and malformed hash');
