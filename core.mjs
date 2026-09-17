export const glossary = {
  plasma: '等离子体；生物医学语境中也可指血浆。应结合课题与例句判别。',
  'electric field': '电场：单位正电荷所受电力对应的矢量场。',
  transient: '瞬态的；暂态的。描述系统随时间快速变化、尚未达到稳态的过程。',
  discharge: '放电；在医学中也可表示排出、出院。',
  'dielectric barrier discharge': '介质阻挡放电（DBD）。',
  'electron density': '电子密度：单位体积内的电子数。',
  'non-equilibrium': '非平衡的；不同粒子或自由度未处于热力学平衡。',
  quenching: '淬灭；猝灭。具体可指激发态的非辐射失活或材料快速冷却。',
  spectroscopy: '光谱学；利用光谱研究物质性质的方法。',
  'machine learning': '机器学习。',
  'statistical significance': '统计显著性；并不等同于实际效应的重要程度。',
  uncertainty: '不确定度；不确定性。',
  hypothesis: '假设；有待通过证据检验的解释。',
  methodology: '方法学；研究所采用的方法体系。',
  mechanism: '机理；机制。',
  diffusion: '扩散。',
  kinetics: '动力学；过程速率及其影响因素的研究。',
  resolution: '分辨率；在不同语境下也可指解析、解决。',
  'in situ': '原位的；在原始位置或实际反应条件下进行。',
  'in vitro': '体外的。',
  'in vivo': '体内的。',
  enhancement: '增强；提升。',
  attenuation: '衰减；减弱。',
  'electron temperature': '电子温度。',
  'atmospheric pressure': '大气压；常压。',
  'reactive species': '活性物种。',
  'boundary condition': '边界条件。',
  'finite element': '有限元。',
  'cross section': '截面；碰撞语境下为碰撞截面。',
  'rate coefficient': '速率系数。'
};
const stop = new Set('the a an and or of to in for with from by is are was were this that these those as at on we our it be been can may using used study results show paper research also their they its into has have not'.split(' '));
export const tokens = s => s.toLowerCase().match(/[a-z]+(?:[-'][a-z]+)*/g) || [];
export function lemma(s) {
  const irregular = {analyses:'analysis', phenomena:'phenomenon', indices:'index', mice:'mouse', children:'child', were:'be', was:'be'};
  if (irregular[s]) return irregular[s];
  if (s.endsWith('ies') && s.length>4) return s.slice(0,-3)+'y';
  if (s.endsWith('ing') && s.length>5) {let x=s.slice(0,-3); if (/(.)\1$/.test(x)) x=x.slice(0,-1); return x.replace(/e$/,'');}
  if (s.endsWith('ed') && s.length>4) return s.slice(0,-2).replace(/(.)\1$/,'$1').replace(/e$/,'');
  return s.replace(/s$/,'').replace(/e$/,'');
}
export function matches(sentence, query, mode='smart') {
  let a=tokens(sentence), b=tokens(query); if(!b.length) return false;
  if(mode==='smart') {a=a.map(lemma); b=b.map(lemma);}
  return a.some((_,i)=>b.every((v,j)=>a[i+j]===v));
}
export function sentences(text) {
  return [...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].map(x=>x.segment.trim()).filter(Boolean);
}
export function keywords(text, n=6) {
  const counts=new Map(); for(const t of tokens(text)) if(t.length>3&&!stop.has(t)) counts.set(t,(counts.get(t)||0)+1);
  return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0]);
}
export function extractSummary(pages) {
  const all=pages.map(p=>p.text).join('\n');
  const abstract=all.match(/\babstract\b[:\s—-]*([\s\S]{100,2500}?)(?=\b(?:keywords|index terms|introduction)\b|$)/i);
  const source=abstract?abstract[1]:all.slice(0,18000);
  const list=sentences(source).filter(x=>x.length>45&&x.length<900);
  const key=keywords(all,8);
  const scored=list.map((s,i)=>({s,i,score:key.filter(k=>tokens(s).includes(k)).length+(/result|conclud|demonstrat|propos|investigat|measur|method/i.test(s)?2:0)}));
  const en=scored.sort((a,b)=>b.score-a.score).slice(0,4).sort((a,b)=>a.i-b.i).map(x=>x.s).join(' ')||source.slice(0,800);
  return {en,zh:'',keywords:key,method:abstract?'摘要段落摘录':'正文关键句摘录',status:'offline',error:''};
}
export {schedule} from './memory.mjs';
