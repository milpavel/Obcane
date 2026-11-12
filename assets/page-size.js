// Use the same viewport boundary for every card overview.
export function pageSize(desktop=6){return typeof window!=='undefined'&&window.matchMedia?.('(max-width:700px)').matches?3:desktop;}
export function restoreLimit(value,storedSize,desktop=6){const size=pageSize(desktop);return storedSize===size&&Number.isSafeInteger(value)&&value>=size?value:size;}
export function onPageSizeChange(callback){if(typeof window==='undefined'||!window.matchMedia)return;window.matchMedia('(max-width:700px)').addEventListener('change',callback);}
