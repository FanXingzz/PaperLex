import {randomUUID} from 'node:crypto';
import {terminologyFor,correctTranslatedTerms} from './research.mjs';
import {pageBlocks} from './pdf-paragraphs.mjs';
export {pageBlocks} from './pdf-paragraphs.mjs';
export function makeTranslationService({get,put,all,settings,readFile,translate,ai,deepl}){
 const active=new Set(),preparing=new Map();
 const draftFor=id=>all('translation').find(t=>t.documentId===id);
 async function prepare(id){
  const existing=draftFor(id);if(existing&&(existing.layoutVersion===2||existing.ext!=='.pdf'||active.has(id)))return existing;if(preparing.has(id))return preparing.get(id);const promise=build(id).finally(()=>preparing.delete(id));preparing.set(id,promise);return promise;
 }
 async function build(id){
  const existing=draftFor(id);const doc=get('document',id);let pages=[];
  if(doc.ext==='.pdf'){const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(readFile(doc)),isEvalSupported:false,useSystemFonts:true});try{const pdf=await task.promise;for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),v=p.getViewport({scale:1});pages.push({number:i,width:v.width,height:v.height,ordered:true,blocks:pageBlocks((await p.getTextContent()).items,v)});}}finally{await task.destroy();}}
  else{const chunks=doc.pages.flatMap(p=>p.text.split(/\n\s*\n/)).filter(Boolean);let page={number:1,width:595,height:842,blocks:[]},y=50;for(const text of chunks){const h=Math.min(650,Math.max(45,Math.ceil(text.length/70)*20));if(y+h>790){pages.push(page);page={number:pages.length+1,width:595,height:842,blocks:[]};y=50;}page.blocks.push({id:randomUUID(),source:text,text:'',x:45,y,width:505,height:h,fontSize:12,status:'pending',revision:0,keepOriginal:false,error:''});y+=h+15;}pages.push(page);}
  const unmatched=[...(existing?.unmatchedTranslations||[])];if(existing){const norm=s=>s.normalize('NFKC').replace(/\s+/g,'').replace(/-/g,'');for(const page of pages){const old=existing.pages.find(p=>p.number===page.number)?.blocks||[],used=new Set();for(const block of page.blocks){const match=old.find(b=>!used.has(b.id)&&norm(b.source)===norm(block.source));if(match){used.add(match.id);Object.assign(block,{text:match.text,status:match.status,keepOriginal:match.keepOriginal,revision:match.revision});}}for(const b of old)if(!used.has(b.id)&&(b.text||b.keepOriginal))unmatched.push({page:page.number,source:b.source,text:b.text,keepOriginal:b.keepOriginal});}}
  return put('translation',{layoutVersion:2,unmatchedTranslations:unmatched,id:'translation:'+id,documentId:id,title:doc.title,ext:doc.ext,projectId:doc.projectId,pages,status:'idle',created:Date.now(),updated:Date.now()});
 }
 const save=d=>put('translation',{...d,updated:Date.now()});
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function run(id){
  if(active.has(id))return;active.add(id);const claimed=new Set(),memo=new Map();
  async function worker(){while(true){let d=draftFor(id);if(d.status!=='running')return;const b=d.pages.flatMap(p=>p.blocks).find(b=>b.status==='pending'&&!b.keepOriginal&&!claimed.has(b.id)&&(!d.retryBlockId||b.id===d.retryBlockId));if(!b)return;claimed.add(b.id);const revision=b.revision;
   try{const projectTerms=all('term').filter(t=>t.projectId===d.projectId),terms=projectTerms.map(t=>t.term+': '+t.translation).join('\n'),project=get('project',d.projectId);let text;
    for(let attempt=0;attempt<3;attempt++){if(draftFor(id).status!=='running')return;try{if(!memo.has(b.source))memo.set(b.source,(async()=>d.provider==='deepl'?deepl(b.source,project.topic+'; '+d.title):(d.provider==='online'?false:d.provider==='model'?true:settings().aiEnabled)?ai('将该论文原文段落完整翻译成中文。保留公式、引用编号、数值、单位及学术限定语。仅返回译文。研究方向：'+project.topic+'；文献标题：'+d.title+'。项目术语：'+terms,b.source,{timeout:90000}):correctTranslatedTerms(await translate(b.source,{basic:true}),terminologyFor(b.source,project.topic,projectTerms),project.topic))());text=await memo.get(b.source);if(typeof text!=='string'||!text.trim())throw Error('翻译结果为空');break;}catch(e){memo.delete(b.source);if(e.code==='ECONNREFUSED'||[400,401,403,456].includes(e.status)||/额度耗尽|今日额度已用完/.test(e.message)||attempt===2)throw e;d=draftFor(id);d.lastError='临时故障，正在重试（'+(attempt+1)+'/2）：'+e.message;save(d);await wait(e.status===429?5000*(attempt+1):1000*(attempt+1));}}
    d=draftFor(id);const current=d.pages.flatMap(p=>p.blocks).find(x=>x.id===b.id);if(current?.revision===revision&&!current.keepOriginal){current.text=text;current.status='translated';current.error='';current.revision++;}d.lastError='';save(d);
   }catch(e){d=draftFor(id);const current=d.pages.flatMap(p=>p.blocks).find(x=>x.id===b.id);if(current?.revision===revision){current.status='error';current.error=e.message;current.revision++;}d.lastError=e.message;if(e.code==='ECONNREFUSED'||[401,403,429,456].includes(e.status)||/额度耗尽|今日额度已用完/.test(e.message))d.status='paused';save(d);}
  }}
  try{await Promise.all(Array.from({length:Math.max(1,Math.min(2,draftFor(id).concurrency||2))},worker));const d=draftFor(id);if(d.status==='running'){d.status=d.pages.some(p=>p.blocks.some(b=>b.status==='pending'))?'paused':d.pages.some(p=>p.blocks.some(b=>b.status==='error'))?'partial':'complete';save(d);}}finally{active.delete(id);}
 }
 async function handle(path,b,url){
  if(path==='/api/translation'){const id=url.searchParams.get('id');get('document',id);return prepare(id);}
  if(path==='/api/translation/start'){let d=await prepare(b.id);if(active.has(b.id))throw Error('当前任务仍在处理，请暂停并等待当前段落完成后再切换翻译来源');const provider=b.provider||d.provider||'auto';if(!['auto','online','model','deepl'].includes(provider))throw Error('翻译来源无效');if(provider==='online'&&!settings().online)throw Error('请在设置与数据中开启联网服务，再使用 MyMemory 联网翻译');if(provider==='deepl'&&(!settings().online||!settings().deeplKey))throw Error('请先开启联网并填写 DeepL API 密钥');if(provider==='model'&&!settings().aiEnabled)throw Error('请先在设置中启用并配置本地或远程模型');if(provider==='auto'&&!settings().online&&!settings().aiEnabled)throw Error('请开启联网服务或配置模型');d.provider=provider;if(!d.pages.some(p=>p.blocks.length))throw Error('未提取到可翻译文本，请先 OCR；仍可导出原版页面。');for(const p of d.pages)for(const block of p.blocks)if(block.status==='error'&&(!b.blockId||block.id===b.blockId))block.status='pending';d.concurrency=Number(b.concurrency)===1?1:2;d.lastError='';d.retryBlockId=b.blockId||'';d.status='running';save(d);void run(b.id).catch(()=>{const latest=draftFor(b.id);if(latest)save({...latest,status:'paused'});});return d;}
  if(path==='/api/translation/pause'){const d=await prepare(b.id);d.status='paused';return save(d);}
  if(path==='/api/translation/edit'){
   const d=await prepare(b.id),p=d.pages.find(p=>p.blocks.some(x=>x.id===b.blockId)),block=p?.blocks.find(x=>x.id===b.blockId);if(!block)throw Error('译文块不存在');if(b.revision!==block.revision)throw Object.assign(Error('译文已更新，请重新选择此段后编辑'),{status:409});
   if(typeof b.text!=='string'||b.text.length>20000)throw Error('译文长度无效');Object.assign(block,{text:b.text,keepOriginal:!!b.keepOriginal,status:'edited',revision:block.revision+1,error:''});
   for(const key of ['x','y','width','height','fontSize']){const n=Number(b[key]);if(!Number.isFinite(n))continue;const max=key==='x'?p.width-8:key==='y'?p.height-8:key==='width'?p.width:key==='fontSize'?36:p.height;block[key]=Math.max(key==='fontSize'?6:key==='width'||key==='height'?8:0,Math.min(max,n));}block.width=Math.min(block.width,p.width-block.x);block.height=Math.min(block.height,p.height-block.y);save(d);return block;
  }
 }
 // A stopped process cannot keep a job running. Resume is explicit, avoiding duplicate requests after restart.
 for(const d of all('translation'))if(d.status==='running')save({...d,status:'paused'});
 return {handle,prepare,active};
}
