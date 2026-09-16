// Conservative geometry-based reconstruction; raw source PDF remains untouched.
export function reconstructPage(items,pageWidth=612){
 const runs=items.filter(x=>typeof x.str==='string'&&x.str.trim()).map(x=>({text:x.str,x:x.transform?.[4]||0,y:x.transform?.[5]||0,h:Math.abs(x.height||x.transform?.[3]||10),w:x.width||x.str.length*5})).sort((a,b)=>b.y-a.y||a.x-b.x);
 const rows=[];for(const r of runs){let row=rows.find(l=>Math.abs(l.y-r.y)<Math.max(2,r.h*.3));if(!row){row={y:r.y,runs:[]};rows.push(row);}row.runs.push(r);}
 const lines=[];for(const row of rows){let line=null;for(const r of row.runs.sort((a,b)=>a.x-b.x)){const gap=line?r.x-line.end:0;if(!line||gap>Math.max(24,r.h*2.8)){line={text:r.text,x:r.x,end:r.x+r.w,y:row.y,h:r.h};lines.push(line);}else{line.text+=(/\s$/.test(line.text)||/^\s/.test(r.text)||gap<r.h*.15?'':' ')+r.text;line.end=r.x+r.w;line.h=Math.max(line.h,r.h);}}}
 const left=lines.filter(l=>l.x<pageWidth*.4&&l.end<pageWidth*.59),right=lines.filter(l=>l.x>pageWidth*.43&&l.end>pageWidth*.6);
 const columns=left.length>=4&&right.length>=4&&lines.filter(l=>l.x<pageWidth*.35&&l.end>pageWidth*.7).length<Math.min(left.length,right.length)*.4;
 let ordered=lines.sort((a,b)=>b.y-a.y||a.x-b.x);
 if(columns){const top=Math.max(left[0]?.y||0,right[0]?.y||0);const header=ordered.filter(l=>l.y>top+3),rest=ordered.filter(l=>!header.includes(l));ordered=[...header,...rest.filter(l=>l.x<pageWidth*.43),...rest.filter(l=>l.x>=pageWidth*.43)];}
 let text='',previous;for(const line of ordered){const gap=previous?previous.y-line.y:0;const paragraph=previous&&(gap>Math.max(previous.h,line.h)*1.7||line.h>previous.h*1.18||gap<0);text+=(text?(paragraph?'\n\n':'\n'):'')+line.text.trim();previous=line;}
 return {text:text.replace(/([a-z])-\n(?=[a-z])/g,'$1'),layout:columns?'双栏重建':'单栏重建'};
}
