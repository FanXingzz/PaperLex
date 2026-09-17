import {createHash} from 'node:crypto';
import {matches,sentences} from './core.mjs';
import {reconstructPage} from './pdf-text.mjs';
const PMC='https://www.ebi.ac.uk/europepmc/webservices/rest/';
export function xmlBody(xml){
 const body=xml.match(/<body(?:\s[^>]*)?>([\s\S]*?)<\/body>/i)?.[1]||'';
 const decode=s=>s.replace(/<[^>]+>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):' ';}).replace(/&(?:amp|lt|gt|quot|apos);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[s])).replace(/\s+/g,' ').trim();
 let section='正文';const parts=[];for(const m of body.matchAll(/<(title|p)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)){const text=decode(m[2]);if(m[1].toLowerCase()==='title')section=text;else if(text)parts.push({section,text});}return parts;
}
export function fulltextLocation(p){
 if(/^PMC\d+$/.test(p.pmcid||''))return {type:'xml',url:PMC+p.pmcid+'/fullTextXML'};
 const m=String(p.pdf||p.url||'').match(/^https?:\/\/(?:export\.)?arxiv\.org\/(?:pdf|abs)\/((?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?)(?:\.pdf)?$/i);
 return m?{type:'pdf',url:'https://arxiv.org/pdf/'+m[1]}:null;
}
async function boundedDownload(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error'});if(!r.ok)throw Error('全文服务返回 '+r.status);if(Number(r.headers.get('content-length'))>20*1024*1024)throw Error('开放全文超过 20 MB，请下载后导入本地库');const parts=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>20*1024*1024){await r.body.cancel().catch(()=>{});throw Error('全文超过 20 MB');}parts.push(chunk);}return Buffer.concat(parts);}
export function makeCorpus({fetchJSON,settings,put,get,download=boundedDownload}){
 const pending=new Map(),cache=new Map();
 const remember=p=>{const id='paper:'+createHash('sha256').update(p.engine+':'+p.url).digest('hex');const item={...p,id,fulltextAvailable:!!fulltextLocation(p)};put('paper',item);return item;};
 async function search(b){
  if(!settings().online)throw Error('请先在设置开启联网服务');const q=String(b.q||'').trim();if(!q||q.length>300)throw Error('查询词长度应为 1–300 字符');const engine=b.engine||'europepmc';if(!['europepmc','openalex','semantic'].includes(engine))throw Error('请选择有效引擎');
  const project=b.projectId?get('project',b.projectId):null,query=[q,b.useTopic===false?'':project?.topic||''].filter(Boolean).join(' '),key=engine+query;const old=cache.get(key);if(old&&Date.now()-old.time<300000)return old.value;let results=[];
  if(engine==='europepmc'){const r=await fetchJSON(PMC+'search?'+new URLSearchParams({query:query+' OPEN_ACCESS:Y',format:'json',resultType:'core',pageSize:'10'}),{},12000);results=(r.resultList?.result||[]).map(w=>({engine:'Europe PMC',title:w.title,year:w.pubYear,doi:w.doi,pmcid:w.pmcid,url:w.pmcid?'https://europepmc.org/articles/'+w.pmcid:'https://europepmc.org/article/'+w.source+'/'+w.id,abstract:(w.abstractText||'').replace(/<[^>]+>/g,' ')}));}
  if(engine==='openalex'){const params=new URLSearchParams({search:query,'per-page':'10'});if(settings().openalexKey)params.set('api_key',settings().openalexKey);const r=await fetchJSON('https://api.openalex.org/works?'+params,{},12000);results=(r.results||[]).map(w=>{const words=[];for(const [word,positions] of Object.entries(w.abstract_inverted_index||{}))for(const i of positions)words[i]=word;const locations=[w.best_oa_location,...(w.locations||[])].filter(Boolean);const pmc=locations.map(l=>l.landing_page_url||'').join(' ').match(/PMC\d+/);const pdf=locations.map(l=>l.pdf_url).find(u=>/arxiv\.org/.test(u||''))||locations.find(l=>l.pdf_url)?.pdf_url||'';return {engine:'OpenAlex',title:w.display_name,year:w.publication_year,doi:w.doi,url:w.doi||w.id,pmcid:pmc?.[0],pdf,abstract:words.join(' ')};});}
  if(engine==='semantic'){const r=await fetchJSON('https://api.semanticscholar.org/graph/v1/paper/search?'+new URLSearchParams({query,limit:'10',fields:'title,year,abstract,url,openAccessPdf,externalIds'}),{},12000);results=(r.data||[]).map(w=>({engine:'Semantic Scholar',title:w.title,year:w.year,url:w.url,doi:w.externalIds?.DOI,pmcid:w.externalIds?.PubMedCentral?'PMC'+String(w.externalIds.PubMedCentral).replace(/^PMC/,''):null,pdf:w.externalIds?.ArXiv?'https://arxiv.org/pdf/'+w.externalIds.ArXiv:w.openAccessPdf?.url,abstract:w.abstract||''}));}
  const value={query,engine,results:results.map(p=>remember({...p,sentences:sentences(p.abstract).filter(s=>matches(s,q)).slice(0,4)}))};if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{time:Date.now(),value});return value;
 }
 async function fulltext({id,q}){
  q=String(q||'').trim();if(!q||q.length>300)throw Error('请输入有效查询词');const p=get('paper',id),location=fulltextLocation(p);if(!location)throw Error('此来源暂不支持自动抓取正文。可打开原文，下载开放 PDF 后导入本地库检索。');
  let cached;try{cached=get('fulltext','fulltext:'+id);}catch{}
  if(!cached){if(!settings().online)throw Error('此正文尚未缓存，请开启联网服务');if(!pending.has(id))pending.set(id,(async()=>{const bytes=await download(location.url);let parts=[];if(location.type==='xml')parts=xmlBody(bytes.toString('utf8'));else{const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:true});try{const pdf=await task.promise;if(pdf.numPages>300)throw Error('论文超过 300 页，请下载后导入本地库');for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);parts.push({section:'第 '+i+' 页',page:i,text:reconstructPage((await page.getTextContent()).items,page.getViewport({scale:1}).width).text});}}finally{await task.destroy();}}if(!parts.length)throw Error('未获取到可提取正文（可能需要 OCR 或全文权限）');return put('fulltext',{id:'fulltext:'+id,url:location.url,parts,created:Date.now()});})().finally(()=>pending.delete(id)));cached=await pending.get(id);}
  return {source:p.engine,title:p.title,url:p.url,cachedAt:cached.created,scope:'论文正文',results:cached.parts.flatMap(part=>sentences(part.text).filter(s=>matches(s,q)).map(text=>({text,section:part.section,page:part.page}))).slice(0,30)};
 }
 return {search,fulltext};
}
