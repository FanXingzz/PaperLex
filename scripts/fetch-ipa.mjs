import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const base='https://raw.githubusercontent.com/open-dict-data/ipa-dict/';
const r=await fetch('https://api.github.com/repos/open-dict-data/ipa-dict/commits/master',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('IPA source '+r.status);const {sha}=await r.json();mkdirSync('resources',{recursive:true});
for(const name of ['en_US','en_UK']){const res=await fetch(base+sha+'/data/'+name+'.txt',{signal:AbortSignal.timeout(30000)});if(!res.ok)throw Error('IPA download '+res.status);const text=await res.text();if(!text.includes('measurement\t'))throw Error('Invalid dictionary');writeFileSync('resources/ipa-'+name+'.txt.gz',gzipSync(text));console.log(name+': '+text.trim().split('\n').length+' entries');}
const license=await fetch(base+sha+'/LICENSE');if(!license.ok)throw Error('Missing license');writeFileSync('resources/IPA-LICENSE.txt',await license.text());writeFileSync('resources/IPA-SOURCE.json',JSON.stringify({repository:'https://github.com/open-dict-data/ipa-dict',commit:sha,files:['data/en_US.txt','data/en_UK.txt'],format:'Original UTF-8 tab-separated data, gzip compressed'},null,2));
