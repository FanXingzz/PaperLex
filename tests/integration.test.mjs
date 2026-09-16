import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const directory=mkdtempSync(join(tmpdir(),'paperlex-test-'));
const port=31991,base=`http://127.0.0.1:${port}`;let child;
async function start(){child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),PAPERLEX_DATA:directory},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),15000);child.stdout.on('data',()=>{clearTimeout(timer);resolve();});child.on('error',reject);child.on('exit',c=>{if(c)reject(Error('server exit '+c));});});}
async function stop(){if(child?.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
const call=async(path,b)=>{const r=await fetch(base+'/api/'+path,b?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}:{});return {status:r.status,data:await r.json()};};
before(start);after(async()=>{await stop();rmSync(directory,{recursive:true,force:true});});
test('导入、关联、批注、复习、重启持久化完整流程',async()=>{
  const project=(await call('projects',{name:'Plasma research',topic:'electric field diagnostics'})).data;
  const text='Abstract We investigate transient electric fields in atmospheric pressure plasma. The electron density was measured using spectroscopy. Results demonstrate improved resolution.';
  const a=(await call('import',{projectId:project.id,name:'first.txt',content:Buffer.from(text).toString('base64')})).data;
  const b=(await call('import',{projectId:project.id,name:'second.md',content:Buffer.from('The electric field controls electron transport in plasma.').toString('base64')})).data;
  assert.ok(a.id);assert.ok(b.id);
  assert.equal((await call('import',{projectId:project.id,name:'duplicate.txt',content:Buffer.from(text).toString('base64')})).status,400);
  const results=(await call('search?q=electric%20field')).data;assert.equal(results.length,2);
  assert.equal((await call('lookup',{q:'plasma',projectId:project.id})).data.source,'内置科研术语库');
  await call('terms',{projectId:project.id,term:'plasma',translation:'低温等离子体'});assert.equal((await call('lookup',{q:'plasma',projectId:project.id})).data.meaning,'低温等离子体');
  const quote='electric fields';const annotation=await call('annotations',{documentId:a.id,page:1,index:text.indexOf(quote),quote,note:'瞬态电场'});assert.equal(annotation.status,200);
  assert.equal((await call('annotations',{documentId:a.id,page:1,index:0,quote:'invalid'})).status,400);
  const card=(await call('cards',{projectId:project.id,term:'plasma',meaning:'等离子体',documentId:a.id,page:1,context:text})).data;
  assert.equal((await call('review',{id:card.id,rating:'good'})).data.interval,1);
  assert.equal((await call('review',{id:card.id,rating:'good'})).status,400);
  const external=await fetch(base+'/api/projects',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({name:'evil'})});assert.equal(external.status,403);
  assert.equal((await fetch(base+'/vendor/../../server.mjs')).status,404);
  assert.equal((await call('corpus',{q:'plasma',projectId:project.id})).status,400);
  await stop();await start();const persisted=(await call('state')).data;assert.equal(persisted.documents.length,2);assert.equal(persisted.cards[0].reps,1);assert.equal(persisted.annotations.length,1);
  const exported=(await call('export')).data;assert.equal(exported.documents[0].pages[0].text,text);assert.ok(!exported.settings);assert.equal(exported.terms[0].translation,'低温等离子体');
});
