import {getApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,GoogleAuthProvider,reauthenticateWithPopup} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const SHEET='1wDI36tQb0EjhaLLhNueCmI0lASRBX_BbQ1J0zX1gwkk';
const WK='日一二三四五六';
const wait=()=>new Promise(r=>{const t=setInterval(()=>{try{getApp();if(document.getElementById('expBtn')){clearInterval(t);r()}}catch(e){}},200)});
await wait();
const auth=getAuth(getApp());
const st=document.createElement('style');st.textContent='body.ro #cloudBtn{display:none!important}.ttl .sub.acts{display:flex;align-items:center;gap:5px;letter-spacing:0;margin-top:3px;white-space:nowrap;overflow:hidden}.acts>*+*{padding-left:5px!important;border-left:1px solid var(--hair)!important}.acts .lk{border:0;background:none;padding:1px 0;min-height:0;font-size:10.5px;font-weight:500;color:var(--deep);text-decoration:underline;text-underline-offset:2px;line-height:1.3;border-radius:0;cursor:pointer}.acts .sync{display:flex;align-items:center;gap:3px;text-decoration:none}.acts .sync .st{font-size:10.5px;color:var(--soft)}.acts .sync svg{width:11px;height:11px}.foot{display:none!important}#tog.more{display:block;margin:12px auto 4px}#tog.more[hidden]{display:none}';document.head.appendChild(st);
const btn=document.createElement('button');btn.className='btn sm';btn.id='cloudBtn';btn.textContent='匯出雲端';
const exp=document.getElementById('expBtn');exp.parentNode.insertBefore(btn,exp);
const sub=document.querySelector('.ttl .sub');sub.textContent='';sub.classList.add('acts');
[document.getElementById('syncBtn'),btn,exp,document.getElementById('logoutBtn')].forEach(el=>{el.classList.remove('btn','sm','tog');el.classList.add('lk');sub.appendChild(el)});
const stEl=document.getElementById('st');new MutationObserver(()=>{const t=stEl.textContent;if(t.startsWith('已同步 '))stEl.textContent=t.slice(4)}).observe(stEl,{childList:true,characterData:true,subtree:true});
const tog=document.getElementById('tog');tog.classList.add('more');document.getElementById('area').appendChild(tog);
const fmtD=ds=>{const [y,m,d]=ds.split('-').map(Number);return m+'/'+d+'('+WK[new Date(y,m-1,d).getDay()]+')'};
function rowsOf(items){
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
  return rows;
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
    const rows=rowsOf(items);
    const H={Authorization:'Bearer '+tok,'Content-Type':'application/json'};
    const base='https://sheets.googleapis.com/v4/spreadsheets/'+SHEET+'/values/';
    let r=await fetch(base+encodeURIComponent('A:Z')+':clear',{method:'POST',headers:H,body:'{}'});
    if(!r.ok)throw new Error('clear '+r.status);
    r=await fetch(base+'A1?valueInputOption=RAW',{method:'PUT',headers:H,body:JSON.stringify({values:rows})});
    if(!r.ok)throw new Error('update '+r.status);
    btn.textContent='已匯出 ✓';
  }catch(e){console.error(e);btn.textContent=e&&e.code==='auth/popup-closed-by-user'?'已取消':'匯出失敗'}
  btn.disabled=false;setTimeout(()=>{btn.textContent='匯出雲端'},2500);
};
