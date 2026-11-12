import assert from 'node:assert/strict';
import {pageSize,restoreLimit,onPageSizeChange} from '../assets/page-size.js';
const original=globalThis.window;let listener;const media={matches:true,addEventListener(type,f){assert.equal(type,'change');listener=f;}};
globalThis.window={matchMedia:query=>{assert.equal(query,'(max-width:700px)');return media;}};
assert.equal(pageSize(),3);assert.equal(pageSize(9),3);assert.equal(restoreLimit(6,6),3,'Old desktop state must not show six on a phone');assert.equal(restoreLimit(9,3),9,'Keep intentional mobile expansion when returning from a detail');
media.matches=false;assert.equal(pageSize(),6);assert.equal(pageSize(9),9);assert.equal(restoreLimit(3,3),6);let called=0;onPageSizeChange(()=>called++);listener();assert.equal(called,1);
if(original)globalThis.window=original;else delete globalThis.window;
console.log('PASS: mobile batches of three, desktop counts, viewport changes and safe restoration after switching devices');
