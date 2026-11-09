import {execFileSync} from 'node:child_process';
const sha=process.env.CF_PAGES_COMMIT_SHA,branch=process.env.CF_PAGES_BRANCH;
if(!sha||!branch)throw Error('Cloudflare build metadata is missing.');
if(branch==='main'){
 const output=execFileSync('git',['ls-remote','https://github.com/milpavel/Obcane.git','refs/heads/main'],{encoding:'utf8',timeout:30000}).trim();
 const head=output.split(/\s+/)[0];
 if(!/^[a-f0-9]{40}$/.test(head)||sha!==head)throw Error('Outdated deployment stopped: this commit is no longer main HEAD.');
}
console.log('Deployment commit verified: '+sha);
