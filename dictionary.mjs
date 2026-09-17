import {curatedEntry} from './research.mjs';
import {offlineIPA} from './ipa.mjs';
import {wordnetEntries} from './wordnet.mjs';
export function makeDictionary(fetchJSON){
 const cache=new Map(),pending=new Map();
 async function entries(q,force=false){
  q=q.toLowerCase();if(force&&cache.get(q)?.rows.length===0)cache.delete(q);if(cache.get(q)?.until>Date.now())return cache.get(q).rows;
  if(pending.has(q))return pending.get(q);
  const promise=(async()=>{try{const rows=await fetchJSON('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(q),{},3000);if(!Array.isArray(rows)||!rows.length)throw Error('词典未收录');cache.set(q,{rows,until:Date.now()+86400000});return rows;}catch{const rows=wordnetEntries(q);cache.set(q,{rows,until:Date.now()+300000});return rows;}finally{pending.delete(q);if(cache.size>500)cache.delete(cache.keys().next().value);}})();pending.set(q,promise);return promise;
 }
 async function pronunciation(q,online){const phonetic=curatedEntry(q,'')?.phonetic||offlineIPA(q);if(phonetic)return {phonetic,audio:[],status:'local',source:'本地音标库'};if(!online||!/^[a-z-]+$/i.test(q))return {phonetic:'',audio:[],status:'unavailable'};const rows=await entries(q),p=rows.flatMap(r=>r.phonetics||[]);return {phonetic:p.find(x=>x.text)?.text||rows[0]?.phonetic||'',audio:p.filter(x=>/^https:\/\//.test(x.audio||'')).map(x=>({url:x.audio})).slice(0,2),status:rows.length?'ready':'unavailable'};}
 return {entries,pronunciation};
}
