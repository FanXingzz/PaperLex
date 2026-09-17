import {createHash} from 'node:crypto';
export function makeOnlineTranslation({fetchJSON,settings,all,put,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 const cache=new Map(all('basicTranslation').map(r=>[r.id,r.text]));let queue=Promise.resolve(),blockedUntil=0,blockReason='';
 const limited=(reason,ms)=>{blockReason=reason;blockedUntil=Date.now()+ms;return Object.assign(Error(reason),{status:429});};
 async function chunk(text){const id='basic:'+createHash('sha256').update(text).digest('hex');if(cache.has(id))return cache.get(id);
  const work=queue.then(async()=>{if(cache.has(id))return cache.get(id);if(Date.now()<blockedUntil)throw Object.assign(Error(blockReason),{status:429});const query={q:text,langpair:'en|zh-CN'};if(settings().myMemoryEmail)query.de=settings().myMemoryEmail;let r;
   try{r=await fetchJSON('https://api.mymemory.translated.net/get?'+new URLSearchParams(query),{},15000);}catch(e){if(e.status===429)throw limited('MyMemory 返回请求限流或额度不足；已暂停发送。稍后继续，或配置模型服务。',Math.max(60000,(e.retryAfter||60)*1000));throw e;}
   const details=String(r.responseDetails||'').slice(0,400),value=r.responseData?.translatedText;
   if(r.quotaFinished||/used all available|quota|daily limit|next available/i.test(details+' '+value))throw limited('MyMemory 今日额度已用完（匿名通常 5,000 字符/日）。可在设置填写真实联系邮箱申请服务方较高额度，或改用模型。'+details,15*60*1000);
   if(Number(r.responseStatus)===429)throw limited('MyMemory 请求过快，已暂停发送，请稍后继续。'+details,60000);
   if(Number(r.responseStatus)!==200||!value)throw Error('MyMemory 翻译失败：'+(details||r.responseStatus));
   cache.set(id,value);put('basicTranslation',{id,text:value,created:Date.now()});await wait(350);return value;
  });queue=work.catch(()=>{});return work;
 }
 return async text=>{const chunks=[];let part='';for(const c of text){if(Buffer.byteLength(part+c,'utf8')>450){chunks.push(part);part='';}part+=c;}if(part)chunks.push(part);const result=[];for(const p of chunks)result.push(await chunk(p));return result.join('');};
}
