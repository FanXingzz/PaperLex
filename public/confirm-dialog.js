let pending;
export function confirmDelete(message){
 if(pending)return Promise.resolve(false);
 let dialog=document.querySelector('#deleteConfirm');if(!dialog){dialog=document.createElement('dialog');dialog.id='deleteConfirm';dialog.className='delete-confirm';dialog.setAttribute('aria-labelledby','deleteConfirmTitle');dialog.setAttribute('aria-describedby','deleteConfirmMessage');dialog.innerHTML='<h2 id="deleteConfirmTitle">确认删除</h2><p id="deleteConfirmMessage"></p><form method="dialog"><button value="cancel" class="secondary" autofocus>取消</button><button value="delete" class="danger">确认删除</button></form>';document.body.append(dialog);dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close('cancel');});}
 dialog.querySelector('p').textContent=message;dialog.returnValue='';pending=new Promise(resolve=>dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='delete';pending=null;resolve(confirmed);},{once:true}));dialog.showModal();dialog.querySelector('[value="cancel"]').focus();return pending;
}
