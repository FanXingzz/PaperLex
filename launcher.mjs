import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));process.chdir(root);
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13)){console.error('请安装 Node.js 22.13 或更新版本，然后重新打开启动.bat。');process.exit(1);}
function openBrowser(url){
  if(process.env.PAPERLEX_NO_BROWSER==='1')return;
  const p=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true,stdio:'ignore'});
  p.on('error',()=>console.log('浏览器未能自动打开，请复制上面的地址到浏览器地址栏。'));
}
console.log('PaperLex · 本地科研文献工作台\n正在检查运行环境…');
const ports=process.env.PORT?[Number(process.env.PORT)]:Array.from({length:12},(_,i)=>3089+i);
const directory=resolve(process.env.PAPERLEX_DATA||join(root,'data'));
for(const port of ports){
  try{const u=`http://127.0.0.1:${port}`,r=await fetch(u+'/api/health',{signal:AbortSignal.timeout(400)}),s=await r.json();
    if(s.app==='PaperLex'&&s.data===directory){console.log(`软件已在运行，正在打开：${u}\n如果浏览器没有自动打开，请手动访问该地址。\n此窗口可以关闭；请保留此前启动软件的窗口。`);openBrowser(u);await new Promise(r=>setTimeout(r,250));process.exit(0);}
  }catch{}
}
if(!existsSync(join(root,'node_modules/pdfjs-dist/package.json'))){
  console.log('首次使用：正在安装 PDF 阅读组件，需要联网，请稍候。');
  const install=spawn(process.env.ComSpec||'cmd.exe',['/d','/c','npm install --omit=dev --cache .npm-cache --no-audit --no-fund'],{cwd:root,stdio:'inherit',windowsHide:true});
  const code=await new Promise(r=>{install.once('error',()=>r(1));install.once('exit',r);});
  if(code!==0){console.error('安装失败。请检查网络后重试；已有完整依赖时日常离线使用不需要这一步。');process.exit(1);}
}
console.log('即将自动打开浏览器。使用期间保留此窗口；结束时关闭窗口或按 Ctrl+C。\n详细教程：软件左下角“使用指南”，或双击“详细使用说明.html”。');
const child=spawn(process.execPath,[join(root,'server.mjs')],{cwd:root,stdio:['inherit','pipe','inherit'],env:process.env,windowsHide:true});
let opened=false,output='';child.stdout.setEncoding('utf8');
child.stdout.on('data',chunk=>{process.stdout.write(chunk);output=(output+chunk).slice(-3000);const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(!opened&&match){opened=true;openBrowser(match[0]);}});
child.once('error',e=>{console.error('启动失败：'+e.message);process.exitCode=1;});
child.once('exit',code=>{process.exitCode=code??0;});
process.on('SIGINT',()=>{child.kill();});
