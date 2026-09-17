import {createHash} from 'node:crypto';
export function makeDeepL({fetchJSON,settings,all,put}) {
 const pending=new Map();
 return async function translate(text,context='') {
  const s=settings();
  if(!s.online)throw Error('DeepL 需要开启联网服务');
  if(!s.deeplKey)throw Error('请先在设置中填写 DeepL API 密钥');
  const id='deepl:'+createHash('sha256').update(JSON.stringify([text,context,'ZH'])).digest('hex');
  const cached=all('deeplTranslation').find(x=>x.id===id);if(cached)return cached.text;
  if(pending.has(id))return pending.get(id);
  const task=(async()=>{try{
   const host=s.deeplPlan==='pro'?'https://api.deepl.com':'https://api-free.deepl.com';
   const r=await fetchJSON(host+'/v2/translate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'DeepL-Auth-Key '+s.deeplKey},body:JSON.stringify({text:[text],source_lang:'EN',target_lang:'ZH',...(context?{context}:{})})},90000);
   const out=r.translations?.[0]?.text;if(typeof out!=='string'||!out.trim())throw Error('DeepL 未返回译文');
   put('deeplTranslation',{id,text:out,updated:Date.now()});return out;
  }catch(e){if(e.status===456)e.message='DeepL 额度耗尽，请检查 API 套餐与用量后继续';if([401,403].includes(e.status))e.message='DeepL 鉴权失败，请核对 API 密钥及 Free / Pro 套餐';if(e.status===429)e.message='DeepL 暂时限流，请降低同时翻译数量后重试';throw e;}})();
  pending.set(id,task);try{return await task;}finally{pending.delete(id);}
 };
}
