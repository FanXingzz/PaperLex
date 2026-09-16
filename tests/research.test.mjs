import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyQuery,curatedEntry,constrainTerms,correctTranslatedTerms,parseModelLookup} from '../research.mjs';
import {researchLookup} from '../lookup.mjs';
import {reconstructPage} from '../pdf-text.mjs';
import {renderAcademicText} from '../public/text-layout.js';
test('科研多义词根据局部语境优先判别，且保留双语义项例句',()=>{
 assert.equal(curatedEntry('plasma','blood plasma protein\nplasma electric field').senses[0].zh,'血浆');
 assert.equal(curatedEntry('quenching','fluorescence emission\nsteel alloy').senses[0].zh,'猝灭');
 assert.equal(curatedEntry('current','The current model describes the electric discharge.').senses[0].zh,'当前的；现有的');
 for(const s of curatedEntry('discharge','plasma voltage').senses)for(const k of ['en','zh','exampleEn','exampleZh'])assert.ok(s[k]);
});
test('整句与术语区分、手动类型覆盖、长术语优先且不破坏单词边界',()=>{
 assert.equal(classifyQuery('electric field'),'word');assert.equal(classifyQuery('It works.'),'sentence');assert.equal(classifyQuery('a very long phrase','sentence'),'sentence');
 assert.equal(constrainTerms('The electric field and fieldwork.',[{en:'electric field',zh:'电场'},{en:'field',zh:'场'}]),'The 电场 and fieldwork.');
});
test('模型结构化输出必须含成对双语例句，拒绝不完整译文',()=>{
 assert.throws(()=>parseModelLookup('{"senses":[{"zh":"a"}]}','word'));
 assert.throws(()=>parseModelLookup('{"translation":""}','sentence'));
 assert.equal(parseModelLookup('{"translation":"完整译文"}','sentence').translation,'完整译文');
});
test('模型失败后回退术语约束全句翻译，整个原句送入翻译',async()=>{
 let input;const r=await researchLookup({q:'The electric field increases.',kind:'sentence',topic:'plasma',terms:[{term:'electric field',translation:'瞬态电场'}]},
 {settings:()=>({online:true,aiEnabled:true}),ai:async()=>{throw Error('offline');},translate:async(text,options)=>{input=text;assert.equal(options.basic,true);return '电场增大。';},fetchJSON:async()=>[]});
 assert.equal(input,'The electric field increases.');assert.equal(r.translation,'瞬态电场增大。');assert.match(r.error,/模型增强失败/);
 assert.equal(correctTranslatedTerms('瞬态电场增大。',[{en:'electric field',zh:'瞬态电场'}],''),'瞬态电场增大。');
});
test('接入模型后传入科研上下文、项目术语及本地证据',async()=>{
 let prompt;const r=await researchLookup({q:'quenching',context:'Fluorescence decreases.',topic:'spectroscopy',local:[{text:'quenching'}],terms:[{term:'quenching',translation:'猝灭'}]},
 {settings:()=>({online:false,aiEnabled:true}),ai:async(i,t)=>{prompt=JSON.parse(t);return JSON.stringify({contextNote:'按光谱语境',senses:[{domain:'光谱',zh:'猝灭',en:'Reduced emission',exampleEn:'Quenching reduces emission.',exampleZh:'猝灭降低发射。'}]});},translate:async()=>'',fetchJSON:async()=>[]});
 assert.equal(prompt.projectTerms[0].zh,'猝灭');assert.equal(prompt.context,'Fluorescence decreases.');assert.equal(r.senses[0].exampleZh,'猝灭降低发射。');
});
test('双栏提取按列阅读，不将同高度左右栏混在一起',()=>{
 const items=[];for(let i=0;i<5;i++){items.push({str:'Left '+i,transform:[10,0,0,10,40,700-i*18],width:200,height:10},{str:'Right '+i,transform:[10,0,0,10,330,700-i*18],width:200,height:10});}
 const page=reconstructPage(items,612);assert.equal(page.layout,'双栏重建');assert.ok(page.text.indexOf('Left 4')<page.text.indexOf('Right 0'));
});
test('精读排版保留原始字符顺序，不因增加标题段落破坏批注偏移',()=>{
 const text='A research title\nAbstract\nFirst paragraph.\n\nMethods\nSecond paragraph.';
 const html=renderAcademicText(text,[],true);assert.match(html,/academic-title/);assert.match(html,/academic-heading/);assert.equal(html.replace(/<[^>]*>/g,''),text);
});
