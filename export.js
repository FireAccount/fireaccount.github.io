import {getApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,GoogleAuthProvider,reauthenticateWithPopup} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,doc,getDoc,deleteDoc,setDoc} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const SHEET='1wDI36tQb0EjhaLLhNueCmI0lASRBX_BbQ1J0zX1gwkk';
const WK='日一二三四五六';
const wait=()=>new Promise(r=>{const t=setInterval(()=>{try{getApp();if(document.getElementById('expBtn')){clearInterval(t);r()}}catch(e){}},200)});
await wait();
const auth=getAuth(getApp());
auth.authStateReady().then(()=>setTimeout(()=>document.documentElement.classList.remove('auth-wait'),300));
const flushDel=()=>{const t=document.getElementById('toast'),u=document.getElementById('undo');if(t&&!t.hidden&&u&&!u.hidden)document.getElementById('syncBtn').click()};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushDel()});
window.addEventListener('pagehide',flushDel);
const db=getFirestore(getApp());const COL=(window.APP_CONFIG&&window.APP_CONFIG.collection)||'fwItems';
let lastDel=null,delP=null;
const showMsg=t=>{const to=document.getElementById('toast'),tt=document.getElementById('toastTxt'),un=document.getElementById('undo');if(!to)return;tt.textContent=t;un.hidden=true;to.hidden=false;setTimeout(()=>{to.hidden=true},5000)};
document.getElementById('grid').addEventListener('click',e=>{
  const b=e.target.closest('[data-act="del"]');if(!b||document.body.classList.contains('ro'))return;
  const card=b.closest('.card');if(!card)return;const id=card.dataset.id;const ref=doc(db,COL,id);
  delP=(async()=>{try{const s=await getDoc(ref);lastDel=s.exists()?{id,data:s.data()}:null;await deleteDoc(ref)}catch(err){console.error(err);lastDel=null;showMsg('刪除失敗：'+(err.code||err.message))}})();
},true);
document.getElementById('undo').addEventListener('click',async()=>{if(delP)await delP;if(!lastDel)return;const x=lastDel;lastDel=null;try{await setDoc(doc(db,COL,x.id),x.data)}catch(err){showMsg('復原失敗：'+(err.code||err.message))}},true);
const st=document.createElement('style');st.textContent='body.ro #cloudBtn{display:none!important}.ttl .sub.acts{display:flex;align-items:center;gap:5px;letter-spacing:0;margin-top:3px;white-space:nowrap;overflow:hidden}.acts>*+*{padding-left:5px!important;border-left:1px solid var(--hair)!important}.acts .lk{border:0;background:none;padding:1px 0;min-height:0;font-size:10.5px;font-weight:500;color:var(--deep);text-decoration:underline;text-underline-offset:2px;line-height:1.3;border-radius:0;cursor:pointer}.acts .sync{display:flex;align-items:center;gap:3px;text-decoration:none}.acts .sync .st{font-size:10.5px;color:var(--soft)}.acts .sync svg{width:11px;height:11px}.foot{display:none!important}#tog.more{display:block;margin:12px auto 4px}#tog.more[hidden]{display:none}';document.head.appendChild(st);
const btn=document.createElement('button');btn.className='btn sm';btn.id='cloudBtn';btn.textContent='匯出雲端';
const exp=document.getElementById('expBtn');exp.parentNode.insertBefore(btn,exp);
exp.style.display='none';
const sub=document.querySelector('.ttl .sub');sub.textContent='';sub.classList.add('acts');
[document.getElementById('syncBtn'),btn,document.getElementById('logoutBtn')].forEach(el=>{el.classList.remove('btn','sm','tog');el.classList.add('lk');sub.appendChild(el)});
const stEl=document.getElementById('st');new MutationObserver(()=>{const t=stEl.textContent;if(t.startsWith('已同步 '))stEl.textContent=t.slice(4)}).observe(stEl,{childList:true,characterData:true,subtree:true});
const tog=document.getElementById('tog');tog.classList.add('more');document.getElementById('area').appendChild(tog);
const fmtD=ds=>{const [y,m,d]=ds.split('-').map(Number);return m+'/'+d+'('+WK[new Date(y,m-1,d).getDay()]+')'};
const HEAD=['流水號','日期','取件','項目名','應繳','前期結轉','本次應付','付款','狀態','結餘(+寄放/−少付)','key'];
function rowsOf(items){
  const out=[];let carry=0,from=null;
  [...items].sort((a,b)=>(a.date||'').localeCompare(b.date||'')||((a.seq||0)-(b.seq||0))).forEach(it=>{
    const amt=Number(it.amt)||0,need=amt-carry;
    const unpaid=!it.paid&&(it.pay===null||it.pay===undefined||it.pay==='');
    const pay=it.paid?need:unpaid?0:Number(it.pay)||0;
    const bal=unpaid?carry-amt:pay-need;
    const ct=carry>0?fmtD(from)+'寄放 扣'+carry:carry<0?fmtD(from)+'少付 補'+(-carry):'';
    const s=unpaid?'待收':bal<0?'少付':bal>0?'寄放':'結清';
    const key=it.date+'|'+String(it.seq||0).padStart(6,'0')+'|'+it.id;
    out.push({id:it.id,key,del:false,vals:['#'+String(it.seq||0).padStart(4,'0'),fmtD(it.date),it.picked?'已取':'未取',it.name,amt,ct,need,unpaid?'':pay,s,bal,key]});
    carry=bal;from=it.date;
  });
  return out;
}
btn.onclick=async()=>{
  const u=auth.currentUser;if(!u||!window.FB)return;
  btn.disabled=true;btn.textContent='授權中…';
  try{
    const p=new GoogleAuthProvider();p.addScope('https://www.googleapis.com/auth/spreadsheets');p.setCustomParameters({login_hint:u.email});
    const res=await reauthenticateWithPopup(u,p);
    const tok=GoogleAuthProvider.credentialFromResult(res).accessToken;
    btn.textContent='匯出中…';
    const {items}=await window.FB.getData();
    const cur=rowsOf(items);const ids=new Set(cur.map(r=>r.id));
    const H={Authorization:'Bearer '+tok,'Content-Type':'application/json'};
    const api='https://sheets.googleapis.com/v4/spreadsheets/'+SHEET;
    let r=await fetch(api+'/values/'+encodeURIComponent('A2:K'),{headers:H});
    if(!r.ok)throw new Error('read '+r.status);
    const old=((await r.json()).values)||[];
    old.forEach(v=>{const k=v[10];if(!k)return;const id=k.split('|').slice(2).join('|');if(ids.has(id))return;ids.add(id);
      const vals=v.slice(0,11);while(vals.length<11)vals.push('');cur.push({id,key:k,del:true,vals})});
    cur.sort((a,b)=>a.key.localeCompare(b.key));
    r=await fetch(api+'/values/'+encodeURIComponent('A:Z')+':clear',{method:'POST',headers:H,body:'{}'});
    if(!r.ok)throw new Error('clear '+r.status);
    r=await fetch(api+'/values/A1?valueInputOption=RAW',{method:'PUT',headers:H,body:JSON.stringify({values:[HEAD].concat(cur.map(x=>x.vals))})});
    if(!r.ok)throw new Error('update '+r.status);
    r=await fetch(api+'?fields=sheets.properties.sheetId',{headers:H});
    const sid=(await r.json()).sheets[0].properties.sheetId;
    const reqs=[{repeatCell:{range:{sheetId:sid,startRowIndex:1,endRowIndex:cur.length+50},cell:{userEnteredFormat:{textFormat:{strikethrough:false,foregroundColor:{red:0,green:0,blue:0}}}},fields:'userEnteredFormat.textFormat.strikethrough,userEnteredFormat.textFormat.foregroundColor'}},
      {updateDimensionProperties:{range:{sheetId:sid,dimension:'COLUMNS',startIndex:10,endIndex:11},properties:{hiddenByUser:true},fields:'hiddenByUser'}}];
    cur.forEach((x,i)=>{if(x.del)reqs.push({repeatCell:{range:{sheetId:sid,startRowIndex:i+1,endRowIndex:i+2,startColumnIndex:0,endColumnIndex:10},cell:{userEnteredFormat:{textFormat:{strikethrough:true,foregroundColor:{red:0.6,green:0.6,blue:0.6}}}},fields:'userEnteredFormat.textFormat.strikethrough,userEnteredFormat.textFormat.foregroundColor'}})});
    r=await fetch(api+':batchUpdate',{method:'POST',headers:H,body:JSON.stringify({requests:reqs})});
    if(!r.ok)throw new Error('format '+r.status);
    btn.textContent='已匯出 ✓';
  }catch(e){console.error(e);btn.textContent=e&&e.code==='auth/popup-closed-by-user'?'已取消':'匯出失敗'}
  btn.disabled=false;setTimeout(()=>{btn.textContent='匯出雲端'},2500);
};
