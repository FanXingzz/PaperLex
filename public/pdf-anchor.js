// Persist page-relative rectangles: PDF text extraction order need not match selection order.
export function mergeRects(rects){
 const input=rects.filter(r=>r.width>0&&r.height>0),edges=[...new Set(input.flatMap(r=>[r.y,r.y+r.height]))].sort((a,b)=>a-b),out=[];
 for(let i=0;i<edges.length-1;i++){const top=edges[i],bottom=edges[i+1],mid=(top+bottom)/2,spans=input.filter(r=>r.y<=mid&&r.y+r.height>=mid).map(r=>[r.x,r.x+r.width]).sort((a,b)=>a[0]-b[0]),merged=[];
  for(const span of spans){const last=merged.at(-1);if(last&&span[0]<=last[1]+.00001)last[1]=Math.max(last[1],span[1]);else merged.push([...span]);}
  for(const [x,end] of merged){const previous=out.find(r=>Math.abs(r.x-x)<.00001&&Math.abs(r.width-(end-x))<.00001&&Math.abs(r.y+r.height-top)<.00001);if(previous)previous.height=bottom-previous.y;else out.push({x,y:top,width:end-x,height:bottom-top});}
 }return out;
}
export function captureAnchor(range, box) {
 const bounds=box.getBoundingClientRect(),rects=[];
 const walker=document.createTreeWalker(box.querySelector('.textLayer')||box,NodeFilter.SHOW_TEXT);let node;const selections=[];
 while((node=walker.nextNode())){if(!range.intersectsNode(node))continue;const part=document.createRange();part.setStart(node,node===range.startContainer?range.startOffset:0);part.setEnd(node,node===range.endContainer?range.endOffset:node.textContent.length);selections.push(...part.getClientRects());}
 for(const r of selections){
  if(r.width<1||r.height<1)continue;
  const x=Math.max(0,(r.left-bounds.left)/bounds.width),y=Math.max(0,(r.top-bounds.top)/bounds.height);
  const value={x,y,width:Math.min(1-x,r.width/bounds.width),height:Math.min(1-y,r.height/bounds.height)};
  if(value.width>0&&value.height>0&&!rects.some(a=>Math.abs(a.x-x)<.0001&&Math.abs(a.y-y)<.0001&&Math.abs(a.width-value.width)<.0001))rects.push(value);
 }
 return {rects:mergeRects(rects).slice(0,300)};
}
export function underlineRects(rects){
 if(!rects.length)return [];const heights=rects.map(r=>r.height).sort((a,b)=>a-b),median=heights[Math.floor(heights.length/2)],rows=[];
 for(const r of [...rects].filter(r=>r.height<=median*1.7).sort((a,b)=>a.y-b.y||a.x-b.x)){const cy=r.y+r.height/2;let row=rows.find(a=>Math.abs(a.cy-cy)<Math.min(a.h,r.height)*.6);if(!row){row={cy,h:r.height,top:r.y,bottom:r.y+r.height,spans:[]};rows.push(row);}row.top=Math.min(row.top,r.y);row.bottom=Math.max(row.bottom,r.y+r.height);row.spans.push([r.x,r.x+r.width]);}
 return rows.flatMap(row=>{const spans=[];for(const s of row.spans.sort((a,b)=>a[0]-b[0])){const last=spans.at(-1);if(last&&s[0]<=last[1]+.008)last[1]=Math.max(last[1],s[1]);else spans.push([...s]);}return spans.map(([x,end])=>({x,y:row.top,width:end-x,height:row.bottom-row.top}));});
}
export function paintAnchor(box,anchor,className,id=''){
 const rects=className==='pdf-note-rect'?underlineRects(anchor?.rects||[]):mergeRects(anchor?.rects||[]);
 const marks=[];for(const r of rects){const mark=document.createElement('div');mark.className=className;mark.dataset.noteId=id;Object.assign(mark.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.width*100+'%',height:r.height*100+'%'});box.append(mark);marks.push(mark);}return marks;
}
export function findTextRange(root,quote){
 const norm=s=>s.normalize('NFKC').toLowerCase().replace(/[\s\u00ad-]/g,'');
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),map=[];let node,text='';
 while((node=walker.nextNode()))for(let i=0;i<node.textContent.length;i++){const c=norm(node.textContent[i]);for(const ch of c){text+=ch;map.push({node,index:i});}}
 const q=norm(quote||''),at=q?text.indexOf(q):-1;if(at<0)return null;
 const start=map[at],end=map[at+q.length-1],range=document.createRange();range.setStart(start.node,start.index);range.setEnd(end.node,end.index+1);return range;
}
