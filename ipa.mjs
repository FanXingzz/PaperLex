import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
function read(lang){try{return new Map(gunzipSync(readFileSync(new URL('./resources/ipa-'+lang+'.txt.gz',import.meta.url))).toString('utf8').trim().split(/\r?\n/).map(line=>line.split('\t')));}catch{return new Map();}}
const british=read('en_UK'),american=read('en_US');
export function offlineIPA(word){word=word.trim().toLowerCase();const uk=british.get(word),us=american.get(word);return [uk?'英 '+uk:'',us?'美 '+us:''].filter(Boolean).join(' · ');}
