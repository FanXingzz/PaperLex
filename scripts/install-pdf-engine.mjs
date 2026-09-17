import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),directory=join(root,'.pdf-runtime');mkdirSync(directory,{recursive:true});
async function get(url,path){const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('组件下载失败：'+r.status);writeFileSync(path,Buffer.from(await r.arrayBuffer()));}
async function unpack(zip,dest){mkdirSync(dest,{recursive:true});const quote=s=>"'"+s.replaceAll("'","''")+"'";await new Promise((resolve,reject)=>{const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command',`Expand-Archive -LiteralPath ${quote(zip)} -DestinationPath ${quote(dest)} -Force`],{windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(Error('组件解压失败')));});}
console.log('安装本地 PDF 导出组件。仅下载程序依赖，不读取或上传文献。');
const pythonDir=join(directory,'python');if(!existsSync(join(pythonDir,'python.exe'))){const zip=join(directory,'python.zip');await get('https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip',zip);await unpack(zip,pythonDir);const pathFile=join(pythonDir,'python312._pth');writeFileSync(pathFile,readFileSync(pathFile,'utf8').replace('#import site','import site')+'\n../packages\n');}
if(!existsSync(join(directory,'packages/pymupdf/__init__.py'))){const r=await fetch('https://pypi.org/pypi/PyMuPDF/1.26.4/json');if(!r.ok)throw Error('无法获取 PDF 组件版本');const info=await r.json(),file=info.urls.find(f=>f.filename.endsWith('win_amd64.whl'));if(!file)throw Error('未找到 Windows 组件');const zip=join(directory,'pymupdf.zip');await get(file.url,zip);await unpack(zip,join(directory,'packages'));}
console.log('安装完成，重新点击软件中的“版式对照”即可。');
