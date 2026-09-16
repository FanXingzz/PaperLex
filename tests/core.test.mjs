import test from 'node:test';
import assert from 'node:assert/strict';
import {matches,sentences,schedule,extractSummary} from '../core.mjs';
test('词形与完整短语匹配，不匹配词内片段',()=>{
  assert.equal(matches('The electrons were measured.','electron'),true);
  assert.equal(matches('The electrons were measured.','electron','exact'),false);
  assert.equal(matches('Transient electric fields were measured.','electric field'),true);
  assert.equal(matches('The waveform is stable.','form'),false);
  assert.equal(matches('The field is electric.','electric field'),false);
  assert.equal(matches('Spectroscopic measurements were obtained.',''),false);
});
test('句子分段不使短语跨句命中',()=>{
  assert.equal(sentences('We measured electric. Fields were weak.').some(s=>matches(s,'electric field')),false);
});
test('遗忘、困难、掌握、熟悉分别产生可持久化复习时间',()=>{
  const now=100000, c={reps:0,interval:0,ease:2.5};
  assert.equal(schedule(c,'again',now).due,now+600000);
  assert.equal(schedule(c,'good',now).interval,1);
  assert.equal(schedule(schedule(c,'good',now),'good',now).interval,3);
  assert.equal(schedule(c,'easy',now).interval,4);
  assert.equal(schedule({...c,ease:1.3},'hard',now).ease,1.3);
  assert.throws(()=>schedule(c,'invalid'));
});
test('离线摘要是可追溯原文摘录，不伪造中文',()=>{
  const text='Abstract We investigate transient electric fields in atmospheric pressure plasma. A spectroscopic method is proposed for measuring electron density. The results demonstrate enhanced temporal resolution. Keywords plasma Introduction Background.';
  const result=extractSummary([{number:1,text}]);assert.equal(result.zh,'');assert.ok(result.en.includes('electric fields'));assert.equal(result.method,'摘要段落摘录');
});
