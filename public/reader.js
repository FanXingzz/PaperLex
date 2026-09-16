import {renderAcademicText} from './text-layout.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function continuousReader({element,document:doc,annotations,mode,layout='continuous',startPage,zoom=100,position=null,onPosition=()=>{},onPage,onError}){
  element.style.setProperty('--reading-font',`${18*zoom/100}px`);
  const pages=layout==='paged'?doc.pages.filter(p=>p.number===startPage):doc.pages;
  let stopped=false,observer,task,pdf,frame,queue=Promise.resolve();const loaded=new Set(),pending=new Set();
  const section=n=>element.querySelector(`[data-paper-page="${n}"]`);
  const pageTop=el=>el.getBoundingClientRect().top-element.getBoundingClientRect().top+element.scrollTop-12;
  function getPosition(){let n=pages[0].number;const top=element.getBoundingClientRect().top+70;for(const el of element.children){if(el.getBoundingClientRect().top<=top)n=+el.dataset.paperPage||n;else break;}const el=section(n);return {page:n,ratio:el?Math.max(0,(element.scrollTop-pageTop(el))/el.offsetHeight):0,left:element.scrollLeft};}
  function sync(){if(stopped)return;const top=element.getBoundingClientRect().top+70;let active=pages[0].number;for(const el of element.children){if(el.getBoundingClientRect().top<=top)active=+el.dataset.paperPage||active;else break;}onPage(active);onPosition(getPosition());
    for(const n of loaded)if(Math.abs(n-active)>4){const box=section(n)?.querySelector('.pdf-page');if(box){for(const c of box.querySelectorAll('canvas')){c.width=0;c.height=0;}box.replaceChildren();loaded.delete(n);}}
  }
  const goTo=n=>{const el=section(n);if(el){element.scrollTo({top:Math.max(0,pageTop(el)),behavior:'instant'});onPage(n);onPosition(getPosition());}};
  const restore=()=>{goTo(startPage);if(position&&section(startPage)){element.scrollTop+=section(startPage).offsetHeight*(position.ratio||0);element.scrollLeft=position.left||0;sync();}};
  element.onscroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync);};
  if(mode==='text'){
    element.innerHTML=pages.map(p=>`<section class="paper-section" data-paper-page="${p.number}"><div class="page-caption">第 ${p.number} 页 / ${doc.pages.length} · 文本精读</div><article class="paper-text" ${p.number===1?'id="readingText"':''}>${renderAcademicText(p.text,annotations.filter(a=>a.page===p.number),p.number===1)||'本页未提取到文字，请查看 PDF 原版。扫描文献需先 OCR。'}</article></section>`).join('');restore();
  }else{
    element.innerHTML='<div class="loading">正在准备连续阅读…</div>';
    void(async()=>{
      const pdfjs=await import('/vendor/legacy/build/pdf.mjs');if(stopped)return;pdfjs.GlobalWorkerOptions.workerSrc='/vendor/legacy/build/pdf.worker.mjs';
      task=pdfjs.getDocument({url:'/files/'+doc.id,cMapUrl:'/vendor/cmaps/',cMapPacked:true,standardFontDataUrl:'/vendor/standard_fonts/',isEvalSupported:false});pdf=await task.promise;if(stopped)return;
      const first=await pdf.getPage(1),base=first.getViewport({scale:1}),width=Math.max(180,element.clientWidth-48)*zoom/100,height=width*base.height/base.width;
      if(stopped)return;element.innerHTML=pages.map(p=>`<section class="paper-section pdf-section" style="width:${width}px" data-paper-page="${p.number}"><div class="page-caption">第 ${p.number} 页 / ${doc.pages.length}</div><div class="pdf-page" style="width:${width}px;height:${height}px"><div class="loading">第 ${p.number} 页</div></div></section>`).join('');
      async function draw(n){
        if(stopped||loaded.has(n))return;const el=section(n),rect=el.getBoundingClientRect(),root=element.getBoundingClientRect();if(rect.bottom<root.top-900||rect.top>root.bottom+900)return;
        const p=await pdf.getPage(n);if(stopped)return;const natural=p.getViewport({scale:1}),scale=width/natural.width,v=p.getViewport({scale}),box=el.querySelector('.pdf-page');const above=box.getBoundingClientRect().bottom<root.top,delta=v.height-box.clientHeight;
        box.style.height=v.height+'px';if(above)element.scrollTop+=delta;box.style.setProperty('--scale-factor',scale);box.style.setProperty('--total-scale-factor',scale);box.innerHTML='<canvas></canvas><div class="textLayer"></div>';
        const c=box.querySelector('canvas'),ratio=Math.min(devicePixelRatio||1,2);c.width=Math.floor(v.width*ratio);c.height=Math.floor(v.height*ratio);c.style.width=v.width+'px';c.style.height=v.height+'px';
        await p.render({canvasContext:c.getContext('2d'),viewport:v,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null}).promise;if(stopped)return;
        await new pdfjs.TextLayer({textContentSource:await p.getTextContent(),container:box.querySelector('.textLayer'),viewport:v}).render();loaded.add(n);sync();
      }
      observer=new IntersectionObserver(entries=>{for(const entry of entries){const n=+entry.target.dataset.paperPage;if(entry.isIntersecting&&!loaded.has(n)&&!pending.has(n)){pending.add(n);queue=queue.then(()=>draw(n)).catch(e=>{if(!stopped){const box=section(n)?.querySelector('.pdf-page');if(box)box.innerHTML=`<p class="warning">本页加载失败：${esc(e.message)}。可切换阅读模式重试。</p>`;onError(e);}}).finally(()=>pending.delete(n));}}},{root:element,rootMargin:'800px 0px'});
      restore();for(const el of element.children)observer.observe(el);
    })().catch(e=>{if(!stopped){element.innerHTML=`<p class="warning">PDF 加载失败：${esc(e.message)}</p>`;onError(e);}});
  }
  return {goTo,getPosition,destroy(){stopped=true;observer?.disconnect();cancelAnimationFrame(frame);element.onscroll=null;if(task)void task.destroy().catch(()=>{});}};
}
