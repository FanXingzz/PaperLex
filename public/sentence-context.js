export function sentenceContext(text,term,offset=-1){
 let at=offset;
 if(at<0||text.slice(at,at+term.length).toLowerCase()!==term.toLowerCase()){
  const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[\s\u00ad-]/g,'');let flat='';const map=[];
  for(let i=0;i<text.length;i++)for(const c of normalize(text[i])){flat+=c;map.push(i);}
  const found=flat.indexOf(normalize(term));at=found<0?-1:map[found];
 }
 if(at<0)return '';
 const end=at+term.length;
 return [...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].filter(s=>s.index<end&&s.index+s.segment.length>at).map(s=>s.segment.trim()).join(' ').replace(/\s+/g,' ').trim();
}
