import {getApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,GoogleAuthProvider,reauthenticateWithPopup} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const FOLDER='133dQOTK4Y8v-JhucX19NZ7BjdvGi4FpW';
const WK='日一二三四五六';
const wait=()=>new Promise(r=>{const t=setInterval(()=>{try{getApp();if(document.getElementById('expBtn')){clearInterval(t);r()}}catch(e){}},200)});
await wait();
const auth=getAuth(getApp()),db=getFirestore(getApp());
const st=document.createElement('style');st.textContent='body.ro #cloudBtn{display:none!important}';document.head.appendChild(st);
const btn=document.createElement('button');btn.className='btn sm';btn.id='cloudBtn';btn.textContent='匯出雲端';
const exp=document.getElementById('expBtn');exp.parentNode.insertBefore(btn,exp);
const fmtD=ds=>{const [y,m,d]=ds.split('-').map(Number);return m+'/'+d+'('+WK[new Date(y,m-1,d).getDay()]+')'};
const q=v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
function csv(items){
  const rows=[['流水號','日期','取件','項目名','應繳','前期結轉','本次應付','付款','狀態','結餘(+寄放/−少付)']];
  let carry=0,from=null;
  [...items].sort((a,b)=>(a.date||'').localeCompare(b.date||'')||((a.seq||0)-(b.seq||0))).forEach(it=>{
    const amt=Number(it.amt)||0,need=amt-carry;
    const unpaid=!it.paid&&(it.pay===null||it.pay===undefined||it.pay==='');
    const pay=it.paid?need:unpaid?0:Number(it.pay)||0;
    const bal=unpaid?carry-amt:pay-need;
    const ct=carry>0?fmtD(from)+'寄放 扣'+carry:carry<0?fmtD(from)+'少付 補'+(-carry):'';
    const s=unpaid?'待收':bal<0?'少付':bal>0?'寄放':'結清';
    rows.push(['#'+String(it.seq||0).padStart(4,'0'),fmtD(it.date),it.picked?'已取':'未取',it.name,amt,ct,need,unpaid?'':pay,s,bal]);
    carry=bal;from=it.date;
  });
  return '﻿'+rows.map(r=>r.map(q).join(',')).join('\n');
}
async function create(tok,body,parents){
  const meta={name:'煙火帆布取件_匯出',mimeType:'application/vnd.google-apps.spreadsheet'};
  if(parents)meta.parents=parents;
  const b='fwb'+Date.now();
  const data='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+b+'\r\nContent-Type: text/csv; charset=UTF-8\r\n\r\n'+body+'\r\n--'+b+'--';
  const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{Authorization:'Bearer '+tok,'Content-Type':'multipart/related; boundary='+b},body:data});
  return r.ok?(await r.json()).id:null;
}
btn.onclick=async()=>{
  const u=auth.currentUser;if(!u||!window.FB)return;
  btn.disabled=true;btn.textContent='授權中…';
  try{
    const p=new GoogleAuthProvider();p.addScope('https://www.googleapis.com/auth/drive.file');p.setCustomParameters({login_hint:u.email});
    const res=await reauthenticateWithPopup(u,p);
    const tok=GoogleAuthProvider.credentialFromResult(res).accessToken;
    btn.textContent='匯出中…';
    const {items}=await window.FB.getData();
    const body=csv(items);
    const ref=doc(db,'meta','export_'+u.email.toLowerCase().replace(/[^a-z0-9]/g,'_'));
    const snap=await getDoc(ref);let fid=snap.exists()?snap.data().fileId:null,ok=false;
    if(fid){const r=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+fid+'?uploadType=media',{method:'PATCH',headers:{Authorization:'Bearer '+tok,'Content-Type':'text/csv; charset=UTF-8'},body});ok=r.ok}
    if(!ok){fid=(await create(tok,body,[FOLDER]))||(await create(tok,body,null));if(!fid)throw new Error('建立失敗');await setDoc(ref,{fileId:fid,email:u.email})}
    btn.textContent='已匯出 ✓';
  }catch(e){console.error(e);btn.textContent=e&&e.code==='auth/popup-closed-by-user'?'已取消':'匯出失敗'}
  btn.disabled=false;setTimeout(()=>{btn.textContent='匯出雲端'},2500);
};
