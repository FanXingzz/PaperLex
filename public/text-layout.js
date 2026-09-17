const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Every source character remains a text node, including separators, so annotation offsets stay valid.
export function renderAcademicText(text,annotations=[],firstPage=false){
 const ranges=[];const re=/.*(?:\r?\n|$)/g;let m;while((m=re.exec(text))&&m[0])ranges.push({start:m.index,end:m.index+m[0].length,text:m[0]});
 const groups=[];let current=null;
 const heading=s=>/^(?:#{1,6}\s|abstract\b|摘要|keywords\b|index terms\b|(?:\d+(?:\.\d+)*\.?\s+)?(?:introduction|background|methods?|materials(?: and methods)?|experimental(?: setup)?|results?(?: and discussion)?|discussion|conclusions?|references|acknowledg(?:e)?ments?|appendix)\b)/i.test(s.trim())&&s.trim().length<120;
 for(let i=0;i<ranges.length;i++){const r=ranges[i],trim=r.text.trim();const title=firstPage&&i===0&&trim.length<180&&!/[.!?]$/.test(trim);const isHeading=heading(trim),ref=/^\[\d+\]\s/.test(trim);const br=!trim;
   if(!current||title||isHeading||ref||br||current.type!=='paragraph'||(current.end-current.start>1000&&/[.!?]\s*$/.test(text.slice(current.start,current.end)))){current={start:r.start,end:r.end,type:title?'title':isHeading?'heading':br?'separator':ref?'reference':'paragraph'};groups.push(current);}else current.end=r.end;
 }
 if(!groups.length&&text)groups.push({start:0,end:text.length,type:'paragraph'});
 const marks=annotations.slice().sort((a,b)=>a.index-b.index);
 function content(start,end){let cursor=start,out='';for(const a of marks){const lo=Math.max(start,a.index),hi=Math.min(end,a.index+a.quote.length);if(hi<=lo||lo<cursor)continue;out+=esc(text.slice(cursor,lo))+`<mark data-note-id="${esc(a.id||'')}" class="annotation-mark ${esc(a.color)}" title="${esc(a.note)}">${esc(text.slice(lo,hi))}</mark>`;cursor=hi;}return out+esc(text.slice(cursor,end));}
 return groups.map(g=>`<div class="academic-${g.type}">${content(g.start,g.end)}</div>`).join('');
}
