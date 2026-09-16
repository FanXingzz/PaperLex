import {glossary,matches} from './core.mjs';
const sense=(domain,zh,en,exampleEn,exampleZh,cues)=>({domain,zh,en,exampleEn,exampleZh,cues,partOfSpeech:'noun',source:'内置科研词条 · 教学例句（非论文引文）'});
export const researchLexicon={
 plasma:{phonetic:'/ˈplæzmə/',senses:[sense('等离子体物理','等离子体','An ionized gas containing free electrons and ions.','The plasma contains electrons, ions, and neutral species.','等离子体包含电子、离子和中性物种。','electron ion discharge electric spectroscopy'),sense('生物医学','血浆','The liquid component of blood in which blood cells are suspended.','The concentration was measured in blood plasma.','该浓度在血浆中测定。','blood patient protein clinical serum')]},
 discharge:{phonetic:'/dɪsˈtʃɑːrdʒ/',senses:[sense('电学 / 等离子体','放电','The flow of electric charge through a medium.','The discharge was driven by a pulsed voltage.','该放电由脉冲电压驱动。','plasma electron voltage electric dielectric'),sense('流体与环境','排放；流量','The release or flow of fluid from a source.','The river discharge increased after the rainfall.','降雨后河流流量增大。','river water flow wastewater fluid'),sense('医学','出院；分泌物排出','Release from hospital care, or the release of bodily fluid.','The patient was assessed before discharge.','患者在出院前接受了评估。','patient hospital clinical blood')]},
 quenching:{phonetic:'/ˈkwentʃɪŋ/',senses:[sense('光谱与光物理','猝灭','A process that reduces emission from an excited species.','Collisional quenching reduces the fluorescence intensity.','碰撞猝灭降低了荧光强度。','fluorescence excited spectroscopy emission collision plasma'),sense('材料与热处理','淬火；快速冷却','Rapid cooling of a heated material.','Water quenching changed the microstructure of the alloy.','水淬改变了合金的微观结构。','alloy steel heat material cooling microstructure')]},
 resolution:{phonetic:'/ˌrezəˈluːʃən/',senses:[sense('测量 / 成像','分辨率；分辨能力','The ability to distinguish closely spaced features or events.','The temporal resolution is limited by the detector response.','时间分辨率受探测器响应的限制。','temporal spatial imaging detector spectroscopy measurement'),sense('问题求解','解决；求解','The process of resolving a problem or uncertainty.','The resolution of this discrepancy requires additional data.','解决这一差异需要更多数据。','discrepancy conflict problem uncertainty')]},
 current:{phonetic:'/ˈkɜːrənt/',senses:[sense('电学','电流','The rate of flow of electric charge.','The current increases during the voltage pulse.','在电压脉冲期间，电流增大。','voltage electric circuit discharge ampere'),{...sense('时间限定','当前的；现有的','Belonging to the present time.','The current model does not include surface reactions.','当前模型未包含表面反应。','model study present work'),partOfSpeech:'adjective'},sense('流体','流；流动','A directed flow of fluid.','The ocean current transports heat.','洋流输运热量。','ocean fluid water wind')]},
 field:{phonetic:'/fiːld/',senses:[sense('物理','场','A physical quantity assigned to positions in space and time.','The electric field varies across the gap.','电场随间隙中的位置变化。','electric magnetic plasma intensity'),sense('研究领域','领域','An area of study or activity.','This method is widely used in the field of spectroscopy.','该方法广泛用于光谱学领域。','research area study spectroscopy'),sense('数据结构','字段','A named item within a data record.','The database stores the value in a separate field.','数据库将该值存储在单独的字段中。','database record data column')]},
 significant:{phonetic:'/sɪɡˈnɪfɪkənt/',senses:[{...sense('统计学','统计显著的','Meeting a specified statistical criterion under a statistical model.','The difference was statistically significant.','该差异具有统计显著性。','statistical statistically p-value hypothesis test'),partOfSpeech:'adjective'},{...sense('一般学术','显著的；重要的','Large or important enough to merit attention.','The interface has a significant effect on transport.','界面对输运有重要影响。','effect influence impact'),partOfSpeech:'adjective'}]},
 transient:{phonetic:'/ˈtrænziənt/',senses:[{...sense('时间响应','瞬态的；暂态的','Lasting for a limited time during a changing process.','The transient electric field was measured after the pulse.','脉冲后测量了瞬态电场。','pulse electric temporal plasma response'),partOfSpeech:'adjective'}]},
 'electric field':{phonetic:'/ɪˈlektrɪk fiːld/',senses:[sense('电磁学','电场','The electric force per unit positive test charge.','The electric field accelerates charged particles.','电场加速带电粒子。','plasma voltage charge electron')]},
 'electron density':{phonetic:'/ɪˈlektrɒn ˈdensəti/',senses:[sense('等离子体物理','电子密度','The number of electrons per unit volume.','The electron density changes during the discharge.','电子密度在放电过程中变化。','plasma discharge spectroscopy')]},
 spectroscopy:{phonetic:'/spekˈtrɒskəpi/',senses:[sense('实验方法','光谱学；光谱分析','The study of the interaction between matter and electromagnetic radiation as a function of wavelength or frequency.','Optical spectroscopy was used to characterize the discharge.','采用光学光谱分析对放电进行表征。','optical spectrum emission plasma')]},
 'cross section':{phonetic:'/krɒs ˈsekʃən/',senses:[sense('碰撞物理','碰撞截面','An effective area used to quantify the probability of a scattering or reaction process.','The collision cross section depends on electron energy.','碰撞截面取决于电子能量。','collision scattering electron reaction'),sense('几何 / 结构','横截面','The shape exposed by a cut through an object.','The cross section reveals the internal structure.','横截面揭示了内部结构。','geometry material cut structure')]}
};
export function classifyQuery(q,requested='auto'){
 if(['word','sentence'].includes(requested))return requested;
 if(researchLexicon[q.toLowerCase()]||glossary[q.toLowerCase()])return 'word';
 return /[.!?;。！？]/.test(q)||q.trim().split(/\s+/).length>7||/^(?:it|we|they|he|she|this|these|the\s+\w+)\s+(?:is|are|was|were|has|have|can|may|shows?|works?|increases?|decreases?)\b/i.test(q)?'sentence':'word';
}
export function curatedEntry(q,context){
 const entry=researchLexicon[q.toLowerCase()];if(!entry)return null;
 const [sentence,...topic]=context.split('\n');const score=s=>s.cues.split(' ').reduce((sum,c)=>sum+(matches(sentence,c)?3:0)+(matches(topic.join(' '),c)?1:0),0)+(q.toLowerCase()==='current'&&s.partOfSpeech==='adjective'&&/\bcurrent (?:model|study|work|method|approach|research)\b/i.test(context)?20:0);
 const senses=entry.senses.map(s=>({...s,score:score(s)})).sort((a,b)=>b.score-a.score);
 return {...entry,senses,contextNote:senses[0].score?`依据课题或原句中的线索，优先考虑“${senses[0].domain}”：${senses[0].zh}。其他含义列在下方。`:'语境线索不足，以下义项供对照；请根据论文领域确认。'};
}
export function terminologyFor(text,context,terms=[]){
 const result=terms.filter(t=>matches(text,t.term,'exact')).map(t=>({en:t.term,zh:t.translation,source:'项目专用术语'}));
 for(const q of Object.keys(researchLexicon).sort((a,b)=>b.length-a.length)){
   if(!matches(text,q,'exact')||result.some(t=>t.en.toLowerCase()===q))continue;
   const e=curatedEntry(q,context);if(e.senses.length===1||e.senses[0].score>0)result.push({en:q,zh:e.senses[0].zh.split('；')[0],source:'内置语境术语'});
 }
 return result.sort((a,b)=>b.en.length-a.en.length);
}
export function constrainTerms(text,terms){
 if(!terms.length)return text;const escaped=terms.map(t=>t.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 return text.replace(new RegExp(`\\b(?:${escaped.join('|')})\\b`,'gi'),word=>terms.find(t=>t.en.toLowerCase()===word.toLowerCase())?.zh||word);
}
export function correctTranslatedTerms(translated,terms,context,extraAliases={}){
 let result=translated;
 for(const t of terms){
   if(result.includes(t.zh))continue;
   const aliases=[...(curatedEntry(t.en,context)?.senses||[]).flatMap(s=>s.zh.split('；')),...(extraAliases[t.en]||[])].filter(x=>x.length>=2&&x!==t.zh).sort((a,b)=>b.length-a.length);
   for(const alias of aliases){if(result.includes(alias)){result=result.split(alias).join(t.zh);break;}}
 }
 return result;
}
export function parseModelLookup(raw,kind){
 const d=JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,''));
 if(kind==='sentence'){if(typeof d.translation!=='string'||!d.translation.trim())throw Error('模型未返回全句译文');return {translation:d.translation,contextNote:String(d.contextNote||''),senses:[]};}
 if(!Array.isArray(d.senses)||!d.senses.length)throw Error('模型未返回结构化义项');
 const senses=d.senses.slice(0,6).map(s=>{for(const k of ['zh','en','exampleEn','exampleZh'])if(typeof s[k]!=='string'||!s[k].trim())throw Error('模型义项缺少双语释义或例句');return {zh:s.zh,en:s.en,exampleEn:s.exampleEn,exampleZh:s.exampleZh,domain:String(s.domain||'科研语境'),partOfSpeech:String(s.partOfSpeech||''),source:'模型生成释义与教学例句（非论文引文）'};});
 return {senses,contextNote:String(d.contextNote||''),translation:''};
}
