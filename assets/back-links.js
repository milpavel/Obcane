const browseKey='rtyne-browse-v1';
export function returnTarget(fallback){try{const s=JSON.parse(sessionStorage.getItem(browseKey)||'null');if(s?.returning&&Date.now()-s.at<1800000&&['/','/zpravy/','/inzerce/'].includes(s.path)&&(!s.hash||/^#[a-z][a-z0-9-]*$/.test(s.hash)))return s.path+(s.hash||'');}catch{}return fallback;}
export function backLink(text,fallback){const a=document.createElement('a');a.className='detail-back-button';a.href=returnTarget(fallback);a.textContent=text;return a;}
