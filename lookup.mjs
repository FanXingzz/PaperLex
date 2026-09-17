import {offlineChinese} from './offline-chinese.mjs';
import {glossary} from './core.mjs';
import {curatedEntry,classifyQuery,terminologyFor,correctTranslatedTerms,parseModelLookup} from './research.mjs';
export async function researchLookup({q,kind='auto',topic='',context='',local=[],terms=[],skipDictionary=false},{settings,ai,translate,fetchJSON}){
 kind=classifyQuery(q,kind);const s=settings(),ctx=[kind==='sentence'?q:context||q,topic].filter(Boolean).join('\n');const entry=curatedEntry(q,ctx),preferred=terms.find(t=>t.term.toLowerCase()===q.toLowerCase());
 const result={q,kind,meaning:preferred?.translation||entry?.senses[0].zh||glossary[q.toLowerCase()]||'',source:entry||glossary[q.toLowerCase()]?'内置科研术语库':'',error:'',local,phonetic:entry?.phonetic||'',audio:[],senses:entry?.senses||[],contextNote:entry?.contextNote||'',translation:'',technicalTerms:terminologyFor(q,ctx,terms)};
 let localWord;if(kind==='word'&&!result.meaning){localWord=offlineChinese(q);if(localWord){result.meaning=localWord.meaning;result.source=localWord.source;result.phonetic=result.phonetic||localWord.phonetic;result.senses=[{zh:localWord.meaning,en:localWord.definition,partOfSpeech:'',domain:'通用词典',source:localWord.source,sourceUrl:'https://github.com/skywind3000/ECDICT'}];}}
 if(preferred){result.source='项目专用术语';result.contextNote=`项目指定译法：${preferred.translation}。`+result.contextNote;}
 if(!skipDictionary&&s.online&&kind==='word'){
   try{const rows=await fetchJSON('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(q),{},8000);const phonetics=rows.flatMap(r=>r.phonetics||[]);result.phonetic=phonetics.find(p=>p.text)?.text||result.phonetic;result.audio=phonetics.filter(p=>/^https:\/\//.test(p.audio||'')).map(p=>({url:p.audio,license:p.license?.name||'',sourceUrl:p.sourceUrl||''})).slice(0,2);
     if(!rows.length)throw Error('词典未返回义项，可能网络不可达或未收录；请稍后重试。');
     if(!skipDictionary){
       const defs=rows.flatMap(r=>(r.meanings||[]).flatMap(m=>(m.definitions||[]).slice(0,2).map(d=>({...d,partOfSpeech:m.partOfSpeech,sourceUrl:r.sourceUrls?.[0]||'',license:r.license?.name||'',dictionarySource:r.dictionarySource||'Free Dictionary API'})))).slice(0,4);
       result.senses=await Promise.all(defs.map(async d=>{let zh='',exampleZh='';try{[zh,exampleZh]=await Promise.all([translate(d.definition,{basic:true}),d.example?translate(d.example,{basic:true}):Promise.resolve('')]);}catch(e){result.error=e.message;}return {en:d.definition,zh,exampleEn:d.example||'',exampleZh,partOfSpeech:d.partOfSpeech,domain:'通用词典义项',source:`${d.dictionarySource} / ${d.license}；中文为机器翻译`,sourceUrl:d.sourceUrl};}));
       result.source=(rows[0]?.dictionarySource||'Free Dictionary API')+' + MyMemory';result.meaning=result.senses.filter(x=>x.zh).map(x=>x.zh).join('；')||result.meaning;return result;
     }
   }catch(e){result.error='补充词典失败：'+e.message;return result;}
 }
 if(s.aiEnabled){
   try{const instruction=kind==='sentence'?'你是科研论文翻译编辑。返回严格 JSON {"translation":"完整中文译文","contextNote":"术语选择及歧义的简短说明"}。必须翻译整个选中句子，保留否定、条件、因果、单位、数学符号和不确定性，不把相关性改为因果。遵循项目术语表；不要把上下文翻进选中句子。':'你是科研双语词典编辑。返回严格 JSON {"contextNote":"结合原句及研究方向判别当前含义，语境不足时说明","senses":[{"domain":"领域","partOfSpeech":"词性","zh":"中文释义","en":"English definition","exampleEn":"完整英文教学例句","exampleZh":"该例句中文翻译"}]}。列出主要不同义项，最符合当前科研语境的义项排第一；每个义项提供双语解释和成对例句。无合理第二义项时不要编造。例句均为教学示例，不可假装论文引文。不要生成音标。';
     const answer=parseModelLookup(await ai(instruction,JSON.stringify({selected:q,researchTopic:topic,context,projectTerms:terms.map(t=>({en:t.term,zh:t.translation})),terminology:result.technicalTerms,localEvidence:local.slice(0,3)})),kind);Object.assign(result,answer);result.source='模型语境解释';result.meaning=kind==='sentence'?answer.translation:(preferred?.translation||answer.senses.map(x=>`${x.domain}：${x.zh}`).join('\n'));result.error='';return result;
   }catch(e){result.error=`模型增强失败，已尝试基础词典／翻译：${e.message}`;}
 }
 if(kind==='sentence'){
   if(s.online){try{const translated=await translate(q,{basic:true}),aliases={};await Promise.all(result.technicalTerms.filter(t=>!curatedEntry(t.en,ctx)).slice(0,4).map(async t=>{try{aliases[t.en]=[await translate(t.en,{basic:true})];}catch{}}));result.translation=correctTranslatedTerms(translated,result.technicalTerms,ctx,aliases);result.meaning=result.translation;result.source=result.technicalTerms.length?'科研术语校正 + MyMemory 全句翻译':'MyMemory 全句翻译';result.contextNote=result.technicalTerms.length?'先翻译完整英文句子，再将可识别译词校正为当前项目的专业译法。下方列出术语建议；复杂句法仍建议配置模型增强。':'通用机器翻译；复杂科研句法建议启用模型增强。';}catch(e){result.error=e.message;}}
   else if(!result.translation)result.error=result.error||'离线无模型时不能生成全句译文。可开启联网或连接本地模型。';
 }else if(!result.meaning&&s.online){try{result.meaning=await translate(q,{basic:true});result.source='MyMemory 词语翻译';}catch(e){result.error=(localWord?'已保留本地英汉释义；':'')+e.message;}}
 if(!result.meaning&&!result.error)result.error='离线词库未收录。请启用联网／本地模型，或手动补充释义。';
 if(kind==='word'&&preferred)result.meaning=preferred.translation;
 return result;
}
