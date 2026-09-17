import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync,readFileSync,renameSync} from 'node:fs';
import {join,delimiter} from 'node:path';
import {createHash} from 'node:crypto';
const pending=new Map();
export async function exportCompare({draft,source,root,data}){
 if(draft.ext!=='.pdf')throw Error('版式对照 PDF 适用于导入的 PDF 文献');
 const python=[process.env.PAPERLEX_PYTHON,join(root,'.pdf-runtime/python/python.exe'),join(process.env.USERPROFILE||'','AppData/Local/Programs/Python/Python312/python.exe'),join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe')].find(p=>p&&existsSync(p));
 if(!python)throw Error('未找到 PDF 导出组件。请运行“安装PDF导出组件.bat”后重试。');
 const id=createHash('sha256').update(readFileSync(join(root,'scripts/export-compare.py'))).update(JSON.stringify(draft)).digest('hex'),folder=join(data,'exports'),output=join(folder,id+'.pdf');mkdirSync(folder,{recursive:true});
 if(!existsSync(output)){if(!pending.has(id))pending.set(id,(async()=>{const input=join(folder,id+'.json');writeFileSync(input,JSON.stringify(draft));await new Promise((resolve,reject)=>{const child=spawn(python,[join(root,'scripts/export-compare.py'),source,input,output+'.tmp'],{cwd:root,windowsHide:true,env:{...process.env,PYTHONPATH:join(root,'.pdf-runtime/packages')+delimiter+(process.env.PYTHONPATH||''),PYTHONUTF8:'1'},stdio:['ignore','pipe','pipe']});let errors='';child.stderr.on('data',d=>errors=(errors+d).slice(-2000));child.stdout.resume();const timer=setTimeout(()=>{child.kill();reject(Error('对照导出超时，请减少文献页数后重试'));},180000);child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error(errors.includes('No module named')?'PDF 排版组件尚未安装，请运行“安装PDF导出组件.bat”。':'对照导出失败：'+errors));});});renameSync(output+'.tmp',output);})().finally(()=>pending.delete(id)));await pending.get(id);}
 return {id,url:'/translation-download?id='+id,pages:draft.pages.length};
}
