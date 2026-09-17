import {randomUUID} from 'node:crypto';
export function pageBlocks(items,viewport){
 const runs=items.filter(i=>i.str?.trim()).map(i=>{const [x,y]=viewport.convertToViewportPoint(i.transform[4],i.transform[5]),h=Math.max(5,Math.hypot(i.transform[2],i.transform[3])||i.height||10);return {text:i.str,x:Math.max(0,x-1),y:Math.max(0,y-h*.9),w:Math.min(viewport.width-x,(i.width||i.str.length*h*.5)+2),h:h*1.1,font:h};}).sort((a,b)=>a.y-b.y||a.x-b.x);
 // Detect the gutter before joining fragments: narrow IEEE column gaps can be smaller than a word-space heuristic.
 const candidates=runs.filter(r=>r.w>viewport.width*.08&&r.w<viewport.width*.7);let earlyGutter=null,earlyScore=-Infinity;
 for(let x=viewport.width*.25;x<viewport.width*.75;x+=1){const left=candidates.filter(r=>r.x+r.w<=x-1),right=candidates.filter(r=>r.x>=x+1),cross=candidates.length-left.length-right.length;if(left.length<2||right.length<2||cross>candidates.length*.18)continue;const score=Math.min(left.length,right.length)*3-cross*10-Math.abs(x-viewport.width/2)*.01;if(score>earlyScore){earlyScore=score;earlyGutter=x;}}
 const col=r=>earlyGutter===null?'full':r.x+r.w<=earlyGutter?'left':r.x>=earlyGutter?'right':'full';
 // Join fragments on a baseline, but leave the wider inter-column gap intact.
 const rows=[];for(const r of runs){let row=rows.find(a=>Math.abs(a.y-r.y)<Math.min(a.font,r.font)*.35);if(!row){row={y:r.y,font:r.font,runs:[]};rows.push(row);}row.runs.push(r);}
 const lines=[];for(const row of rows){let line;for(const r of row.runs.sort((a,b)=>a.x-b.x)){if(line&&col(line)===col(r)&&r.x-(line.x+line.w)<Math.max(8,r.font*1.3)){line.text+=(/\s$/.test(line.text)||/^\s/.test(r.text)?'':' ')+r.text;line.w=Math.max(line.w,r.x+r.w-line.x);line.h=Math.max(line.h,r.y+r.h-line.y);}else{line={...r};lines.push(line);}}}
 const body=lines.filter(l=>l.w<viewport.width*.75);let gutter=earlyGutter,best=-Infinity;
 for(let x=viewport.width*.25;earlyGutter===null&&x<=viewport.width*.75;x+=2){const left=body.filter(l=>l.x+l.w<=x-4),right=body.filter(l=>l.x>=x+4),cross=body.length-left.length-right.length;if(left.length<2||right.length<2||cross>body.length*.12)continue;const gap=Math.min(...right.map(l=>l.x))-Math.max(...left.map(l=>l.x+l.w));const score=Math.min(left.length,right.length)*3-cross*8+Math.min(gap,45)*.1-Math.abs(x-viewport.width/2)*.002;if(score>best){best=score;gutter=x;}}
 for(const line of lines)line.column=gutter===null?'full':line.x+line.w<=gutter?'left':line.x>=gutter?'right':'full';
 const ordered=[];const full=lines.filter(l=>l.column==='full').sort((a,b)=>a.y-b.y);let from=-Infinity;
 if(gutter===null)ordered.push(...lines.sort((a,b)=>a.y-b.y||a.x-b.x));else for(const boundary of [...full,{y:Infinity}]){for(const col of ['left','right'])ordered.push(...lines.filter(l=>l.column===col&&l.y>=from&&l.y<boundary.y).sort((a,b)=>a.y-b.y));if(boundary.y!==Infinity)ordered.push(boundary);from=boundary.y;}
 const blocks=[];for(const line of ordered){const prev=blocks.at(-1),last=prev?.lines.at(-1),gap=last?line.y-(last.y+last.h):Infinity,indent=last?line.x-last.x:0;
  const join=prev&&prev.column===line.column&&gap>=-2&&gap<line.font*.7&&Math.abs(prev.font-line.font)<1.5&&Math.abs(indent)<line.font*2&&!(indent>line.font*.7)&&!(last.w<prev.maxWidth*.78&&/[.!?]\s*$/.test(last.text))&&prev.source.length<1800;
  if(join){prev.source+=(/-$/.test(prev.source)?'':' ')+line.text;prev.lines.push(line);prev.maxWidth=Math.max(prev.maxWidth,line.w);}else blocks.push({source:line.text,column:line.column,font:line.font,lines:[line],maxWidth:line.w});
 }
 return blocks.filter(b=>/[A-Za-z]{2,}/.test(b.source)).map(b=>{const x=Math.min(...b.lines.map(l=>l.x)),y=Math.min(...b.lines.map(l=>l.y)),right=Math.max(...b.lines.map(l=>l.x+l.w)),bottom=Math.max(...b.lines.map(l=>l.y+l.h));return {id:randomUUID(),source:b.source,text:'',x,y,width:right-x,height:bottom-y,sourceRects:b.lines.map(l=>({x:l.x,y:l.y,width:l.w,height:l.h})),column:b.column,fontSize:Math.min(28,Math.max(8,b.font*.9)),status:'pending',revision:0,keepOriginal:false,error:''};});
}
