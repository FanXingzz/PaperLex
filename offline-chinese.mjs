import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
let words,forms;
export function offlineChinese(query){
 if(!words){const rows=JSON.parse(gunzipSync(readFileSync(new URL('./resources/ecdict.json.gz',import.meta.url))));words=new Map(rows.map(r=>[r[0].toLowerCase(),r]));forms=new Map();for(const r of rows)for(const item of r[4].split('/')){const [type,form]=item.split(':');if(form&&type!=='0'&&type!=='1'&&!forms.has(form))forms.set(form,r[0].toLowerCase());}}
 const q=query.trim().toLowerCase(),r=words.get(q)||words.get(forms.get(q));if(!r)return null;
 return {word:r[0],meaning:r[1].replace(/\\n/g,'\n'),definition:r[2].replace(/\\n/g,'\n'),phonetic:r[3],source:'本地 ECDICT 英汉词典'};
}
