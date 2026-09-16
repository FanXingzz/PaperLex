import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
test('Windows BAT 从其他目录启动、中文输出、识别重复运行及教程路由', {skip:process.platform!=='win32',timeout:25000},async()=>{
 const bat=fileURLToPath(new URL('../启动.bat',import.meta.url)),bytes=readFileSync(bat);assert.ok([...bytes].every(x=>x<128));assert.equal(bytes.toString().replace(/\r\n/g,'').includes('\n'),false);
 const tmp=mkdtempSync(join(tmpdir(),'paperlex-launch-')),env={...process.env,PORT:'31993',PAPERLEX_DATA:tmp,PAPERLEX_NO_BROWSER:'1'};
 const run=()=>spawn(process.env.ComSpec||'cmd.exe',['/d','/c',`call "${bat}"`],{cwd:tmp,env,windowsHide:true,windowsVerbatimArguments:true,stdio:['pipe','pipe','pipe']});
 const child=run();let out='',err='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',s=>out+=s);child.stderr.on('data',s=>err+=s);
 try{
   const deadline=Date.now()+15000;while(!out.includes('PaperLex 已启动')&&Date.now()<deadline){if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));}assert.ok(out.includes('PaperLex 已启动'),out+'\n'+err);assert.ok(!out.includes('不是内部或外部命令'));
   assert.equal((await (await fetch('http://127.0.0.1:31993/api/health')).json()).app,'PaperLex');
   const guide=await fetch('http://127.0.0.1:31993/guide');assert.equal(guide.status,200);assert.match(await guide.text(),/普通联网/);
   const second=run();let again='';second.stdout.setEncoding('utf8');second.stdout.on('data',s=>again+=s);const code=await new Promise(r=>second.once('exit',r));assert.equal(code,0);assert.match(again,/软件已在运行/);
 }finally{
   if(child.exitCode===null){const killed=new Promise(r=>child.once('exit',r));await new Promise(r=>{const p=spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});p.once('exit',r);});await killed;}
   rmSync(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
});
