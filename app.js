(function(){
if(typeof firebase==="undefined"){document.getElementById("main").innerHTML='<div class="gate"><h1>Internet aloqasi yo\'q</h1><p class="lede">OchiqTanlov ishlashi uchun internet kerak. Ulanishni tekshirib, ilovani qayta oching.</p></div>';return}

const REGIONS=["Toshkent sh.","Toshkent vil.","Andijon","Buxoro","Farg'ona","Jizzax","Xorazm","Namangan","Navoiy","Qashqadaryo","Qoraqalpog'iston","Samarqand","Sirdaryo","Surxondaryo"];
const EDU=["O'rta maxsus","Bakalavr","Magistr"]; const EDU_PTS=[60,80,100];
const SECTORS=["Ta'lim","Sog'liqni saqlash","IT","Moliya","Ishlab chiqarish","Davlat boshqaruvi"];
const SPECS={"Matematika o'qitish":"Ta'lim","Boshlang'ich ta'lim":"Ta'lim","Ingliz tili o'qitish":"Ta'lim","Hamshiralik ishi":"Sog'liqni saqlash","Davolash ishi":"Sog'liqni saqlash","Axborot tizimlari":"IT","Dasturiy injiniring":"IT","Buxgalteriya hisobi":"Moliya","Iqtisodiyot":"Moliya","Mexanika muhandisligi":"Ishlab chiqarish","Elektr ta'minoti":"Ishlab chiqarish","Huquqshunoslik":"Davlat boshqaruvi","Davlat boshqaruvi":"Davlat boshqaruvi"};
const SKILLS=["Excel","1C","Python","SQL","Web (HTML/JS)","Dars rejalash","Onlayn ta'lim","Birinchi yordam","Bemor parvarishi","AutoCAD","Elektr sxemalar","Hujjat yuritish","Fuqarolar bilan ishlash","Rahbarlik"];
const LANGS=["O'zbek","Rus","Ingliz","Koreys","Nemis"];
const ORG_TYPES=["Vazirlik / qo'mita","Hokimlik","Maktab / bog'cha","Oliy ta'lim muassasasi","Tibbiyot muassasasi","Davlat korxonasi","Boshqa davlat tashkiloti"];
const DAY=864e5;

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number(n||0).toLocaleString("ru-RU").replace(/ |,/g," ");
const dt=ms=>{if(!ms)return"—";const d=new Date(ms);return d.toLocaleDateString("ru-RU")+" "+d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})};
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2800)}
function opts(sel,list,first){sel.innerHTML=(first!==undefined?`<option value="">${esc(first)}</option>`:"")+list.map(x=>typeof x==="object"?`<option value="${esc(x.v)}">${esc(x.t)}</option>`:`<option value="${esc(x)}">${esc(x)}</option>`).join("")}
function chips(box,list,selected,onToggle,req){
  box.innerHTML="";list.forEach(x=>{const b=document.createElement("button");b.type="button";const isReq=req&&req.includes(x);
    b.className="chip"+(isReq?" req":"");b.textContent=(isReq?"● ":"")+x;b.setAttribute("aria-pressed",(selected.includes(x)||isReq)?"true":"false");b.onclick=()=>onToggle(x);box.appendChild(b)});
}
function codeFor(uid){let h=2166136261;for(const c of uid){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}h>>>=0;return "N-"+(1000+h%9000)+String.fromCharCode(65+(Math.floor(h/9000)%26))}

// ---------- state ----------
const S={db:null,user:null,uid:null,canEdit:false,role:null,orgs:[],vacs:[],apps:[],contacts:{},audit:[],logins:{},failed:[],myLog:null,dl:null,profile:null,ready:{orgs:false,vacs:false,apps:false},loaded:false};
let roleSaved=null;try{roleSaved=localStorage.getItem("ot-role")}catch(e){}

// ---------- scoring ----------
function check(v,a){
  const why=[];
  if((a.edu??-1)<v.edu)why.push("Ma'lumot: kamida "+EDU[v.edu].toLowerCase()+" kerak");
  if(!(v.specs||[]).includes(a.spec))why.push("Mutaxassislik mos emas");
  if((a.exp||0)<v.exp)why.push("Staj: "+(v.exp-(a.exp||0))+" yil kam");
  const miss=(v.req||[]).filter(s=>!(a.skills||[]).includes(s));if(miss.length)why.push("Majburiy ko'nikma yo'q: "+miss.join(", "));
  if(a.test==null)why.push("Kasbiy test topshirilmagan");else if(a.test<v.test)why.push("Test bali chegaradan past ("+a.test+" < "+v.test+")");
  return why;
}
function score(v,a){
  const pref=v.pref||[],langs=v.langs||[],sk=a.skills||[],lg=a.langs||[];
  const t=a.test||0,e=Math.min(a.exp||0,10)*10,p=pref.length?100*pref.filter(s=>sk.includes(s)).length/pref.length:100,
        d=EDU_PTS[a.edu]||0,l=langs.length?100*langs.filter(s=>lg.includes(s)).length/langs.length:100;
  return {t,e,p,d,l,total:Math.round((.5*t+.2*e+.15*p+.1*d+.05*l)*10)/10};
}
function applicantsOf(v){
  const out=[];S.apps.forEach(doc=>{const it=(doc.items||{})[v.id];if(it&&!it.withdrawn)out.push({uid:doc.uid,code:doc.code,...it})});return out;
}
function ranking(v){
  return applicantsOf(v).map(a=>{const why=check(v,a);return {...a,why,ok:!why.length,s:score(v,a)}})
    .sort((x,y)=>(y.ok-x.ok)||(y.s.total-x.s.total)||((y.test||0)-(x.test||0))||((x.at||0)-(y.at||0)));
}
const isClosed=v=>v.status==="closed";
const deadlinePassed=v=>(v.deadline||0)<=Date.now();
function daysLeft(v){if(isClosed(v))return "Yakunlangan";const ms=(v.deadline||0)-Date.now();if(ms<=0)return "Muddat tugagan, yakunlash kutilmoqda";if(ms<DAY){const h=Math.floor(ms/3600e3),m=Math.ceil((ms%3600e3)/60000);return (h?h+" soat ":"")+m+" daqiqa qoldi"}const d=Math.ceil(ms/DAY);return d+" kun qoldi"}
const orgOf=id=>S.orgs.find(o=>o.id===id)||{name:"Noma'lum tashkilot",stir:"—"};

// ---------- routing ----------
const APP_TABS=[["vakansiyalar","Vakansiyalar"],["arizalar","Arizalarim"],["profil","Profilim"],["haqida","Ilova haqida"]];
const ADM_TABS=[["boshqaruv","Boshqaruv"],["tashkilotlar","Tashkilotlar"],["boshqaruv-vak","Vakansiyalar"],["arizalar-adm","Arizalar"],["natijalar","Natijalar"],["jurnal","Jurnal"],["sozlamalar","Sozlamalar"],["qoidalar","Qoidalar"],["haqida","Ilova haqida"]];
const ALL_VIEWS=["monitoring","kirishlar","foydalanuvchilar","gate","vakansiyalar","profil","arizalar","boshqaruv","tashkilotlar","boshqaruv-vak","arizalar-adm","natijalar","jurnal","sozlamalar","qoidalar","haqida"];
const CHIEF_TABS=[["monitoring","Monitoring"],["kirishlar","Kirish-chiqish"],["foydalanuvchilar","Foydalanuvchilar"]];
function tabs(){return S.role==="chief"?CHIEF_TABS.concat(ADM_TABS):S.role==="admin"?ADM_TABS:APP_TABS}
function route(){
  let t=location.hash.slice(1);
  if(!S.role)t="gate";else if(!tabs().some(x=>x[0]===t))t=tabs()[0][0];
  ALL_VIEWS.forEach(x=>{const el=document.getElementById("v-"+x);if(el)el.hidden=x!==t});
  $("#hdr").hidden=!S.role;
  if(S.role){$("#nav").innerHTML=tabs().map(([k,l],i)=>(S.role==="chief"&&i===CHIEF_TABS.length?'<span class="navsep"></span>':"")+`<a href="#${k}" ${k===t?'aria-current="page"':""}>${l}</a>`).join("")}
  render();
}
window.addEventListener("hashchange",route);

// ---------- auth (Firebase: login + parol) ----------
const auth=firebase.auth(),fs=firebase.firestore();
const EMAIL_DOMAIN="ochiqtanlov.app";
const toEmail=l=>l+"@"+EMAIL_DOMAIN;
let pendingRole=null;
function remember(r){try{r?localStorage.setItem("ot-role",r):localStorage.removeItem("ot-role")}catch(e){}}
function recalled(){try{return localStorage.getItem("ot-role")}catch(e){return null}}
function passProblem(p,p2){
  if(p.length<8)return "Parol kamida 8 belgidan iborat bo'lishi kerak.";
  if(!/[A-Za-z]/.test(p)||!/\d/.test(p))return "Parolda kamida bitta harf va bitta raqam bo'lishi kerak.";
  if(p!==p2)return "Parollar bir xil emas.";
  return null;
}
function authMsg(e){
  const c=e&&e.code||"";
  if(c==="auth/email-already-in-use")return "Bu login band. Boshqa login tanlang yoki \"Kirish\" bo'limidan kiring.";
  if(["auth/invalid-credential","auth/wrong-password","auth/user-not-found","auth/invalid-login-credentials"].includes(c))return "Login yoki parol noto'g'ri.";
  if(c==="auth/too-many-requests")return "Juda ko'p urinish bo'ldi. Birozdan keyin qayta urinib ko'ring.";
  if(c==="auth/network-request-failed")return "Internet aloqasi yo'q. Ulanishni tekshiring.";
  if(c==="auth/weak-password")return "Parol juda oddiy. Uzunroq parol tanlang.";
  return "Xatolik yuz berdi, qayta urinib ko'ring.";
}
function showAuthMode(mode){
  $("#loginForm").hidden=mode!=="login";$("#regForm").hidden=mode!=="reg";$("#resetForm").hidden=true;$("#codeForm").hidden=mode!=="code";
  document.querySelector(".tabs2").hidden=mode==="code";
  $("#tabLogin").setAttribute("aria-selected",mode==="login"?"true":"false");$("#tabReg").setAttribute("aria-selected",mode==="reg"?"true":"false");
  $("#authTitle").textContent=mode==="reg"?"Ro'yxatdan o'tish":mode==="code"?"Administrator kodi":"Kirish";
  ["l-err","r-err","c-err"].forEach(id=>$("#"+id).hidden=true);
  if(mode==="code"){$("#c-code2-wrap").hidden=true;$("#c-code2").required=false;$("#c-code").value="";
    const ck=pendingRole==="chief"?"chief":"admin",cn=ck==="chief"?"bosh administrator":"administrator";
    $("#authTitle").textContent=ck==="chief"?"Bosh administrator kodi":"Administrator kodi";
    $("#c-note").textContent=(firebase.__demo&&!firebase.__demoHasCode(ck))?"Demo rejim: bu qurilmada hali "+cn+" kodi yo'q. Hozir kiritgan kodingiz "+cn+" kodi bo'lib qoladi — uni eslab qoling (kamida 6 belgi).":"Hisobingizga kirdingiz ("+(S.login||"")+"). Davom etish uchun "+cn+" kodini kiriting. Kod faqat bir marta so'raladi.";
    $("#c-btn").textContent="Tasdiqlash";setTimeout(()=>$("#c-code").focus(),0)}
}
function openAuth(role,mode){
  pendingRole=role;document.body.classList.toggle("auth-admin",role==="admin"||role==="chief");
  const b=$("#authRole");b.className="role "+(role==="chief"?"chf":role==="admin"?"adm":"app");b.textContent=ROLE_UZ[role]||"";
  $("#roleStep").hidden=true;$("#authStep").hidden=false;$("#gateErr").hidden=true;
  showAuthMode(mode||"login");
}
function closeAuth(){$("#authStep").hidden=true;$("#roleStep").hidden=false;document.body.classList.remove("auth-admin")}
$("#authBack").onclick=()=>{pendingRole=null;closeAuth()};
$("#tabLogin").onclick=()=>showAuthMode("login");
$("#tabReg").onclick=()=>showAuthMode("reg");
$("#l-forgot").onclick=()=>{const e=$("#l-err");e.textContent="Parolni tiklash uchun ilova administratoriga murojaat qiling: u Firebase konsolida parolingizni yangilab beradi.";e.hidden=false};

$("#regForm").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#r-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;
  const name=$("#r-name").value.trim(),phone=$("#r-phone").value.trim(),login=$("#r-login").value.trim().toLowerCase(),p=$("#r-pass").value,p2=$("#r-pass2").value;
  if(name.split(/\s+/).length<2)return fail("Familiya va ismingizni to'liq kiriting.");
  if(!/^\+?[\d\s()-]{9,17}$/.test(phone))return fail("Telefon raqamini to'g'ri kiriting, masalan +998 90 123 45 67.");
  if(!/^[a-z0-9_]{4,20}$/.test(login))return fail("Login 4–20 ta lotin harfi, raqam yoki _ belgisidan iborat bo'lsin.");
  const pp=passProblem(p,p2);if(pp)return fail(pp);
  const btn=$("#r-btn");btn.disabled=true;
  try{
    const cred=await auth.createUserWithEmailAndPassword(toEmail(login),p);
    const uid=cred.user.uid;
    await fs.doc("contacts/"+uid).set({name,phone,login});
    await fs.doc("profiles/"+uid).set({name});
    $("#r-pass").value="";$("#r-pass2").value="";toast("Ro'yxatdan o'tdingiz. Xush kelibsiz!");
  }catch(e2){fail(authMsg(e2))}
  btn.disabled=false;
});
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#l-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;
  const login=$("#l-login").value.trim().toLowerCase(),p=$("#l-pass").value;
  if(!/^[a-z0-9_]{4,20}$/.test(login))return fail("Login yoki parol noto'g'ri.");
  const btn=$("#l-btn");btn.disabled=true;
  try{await auth.signInWithEmailAndPassword(toEmail(login),p);$("#l-pass").value=""}catch(e2){fail(authMsg(e2));
    if(/credential|password|user-not-found/.test((e2&&e2.code)||"")){const dv=device();fs.collection("failed").add({t:Date.now(),login,kind:dv.kind,os:dv.os,br:dv.br}).catch(()=>{})}}
  btn.disabled=false;
});
$("#codeForm").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#c-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;
  const code=$("#c-code").value.trim(),btn=$("#c-btn");if(!code)return fail("Kodni kiriting.");
  const ck=pendingRole==="chief"?"chief":"admin";
  if(firebase.__demo&&!firebase.__demoHasCode(ck)&&code.length<6)return fail("Kod kamida 6 belgidan iborat bo'lsin.");
  btn.disabled=true;
  try{
    await fs.doc((ck==="chief"?"chiefs/":"admins/")+S.uid).set({code,login:S.login||"",at:Date.now()});
    S.isAdmin=true;if(ck==="chief")S.isChief=true;subscribe();await log("code",ck==="chief"?"Bosh administrator kodni tasdiqlab kirdi":"Yangi administrator kodni tasdiqlab kirdi");
    btn.disabled=false;finishEnter(ck);toast(ROLE_UZ[ck]+" sifatida kirdingiz");
  }catch(e2){btn.disabled=false;fail(e2&&e2.code==="permission-denied"?"Kod noto'g'ri.":"Tekshirib bo'lmadi. Internet aloqasini tekshiring.")}
});
function enter(role){
  if(role==="chief"&&!S.isChief){openAuth("chief","code");return}
  if(role==="admin"&&!S.isAdmin){openAuth("admin","code");return}
  finishEnter(role);
}
function finishEnter(role){pendingRole=null;closeAuth();remember(role);setRole(role);track("login",role)}

function setRole(r){
  S.role=r;
  $("#whoami").textContent=r&&S.login?S.login:"";
  document.body.classList.toggle("is-admin",r==="admin"||r==="chief");document.body.classList.toggle("is-chief",r==="chief");
  const b=$("#roleBadge");b.className="role "+(r==="chief"?"chf":r==="admin"?"adm":"app");b.textContent=ROLE_UZ[r]||"";
  const cur=location.hash.slice(1);
  location.hash=r?(tabs().some(x=>x[0]===cur)?cur:tabs()[0][0]):"";route();
}
document.querySelectorAll(".rolecard").forEach(b=>b.onclick=()=>{
  $("#gateErr").hidden=true;const r=b.dataset.role;
  if(S.uid)enter(r);else openAuth(r,"login");
});
$("#btnSwitch").onclick=async()=>{await track("logout");remember(null);S.role=null;try{await auth.signOut()}catch(e){}location.hash="";route()};

// ---------- BOSH ADMIN: kirish-chiqish monitoringi ----------
const isAdm=()=>S.role==="admin"||S.role==="chief";
const ROLE_UZ={applicant:"Ish topshiruvchi",admin:"Administrator",chief:"Bosh administrator"};
const EV_UZ={login:"Kirdi",resume:"Qayta ochdi",logout:"Chiqdi",fail:"Noto'g'ri parol"};
const EV_PILL={login:"open",resume:"res",logout:"closed",fail:"out"};
function device(){
  const u=navigator.userAgent||"";
  const os=/Android/i.test(u)?"Android":/iPhone|iPad|iPod/i.test(u)?"iOS":/Windows/i.test(u)?"Windows":/Mac OS X/i.test(u)?"macOS":/CrOS/i.test(u)?"ChromeOS":/Linux/i.test(u)?"Linux":"Boshqa";
  const kind=/Mobi|Android|iPhone|iPod/i.test(u)?"Telefon":/iPad|Tablet/i.test(u)?"Planshet":"Kompyuter";
  const br=/Edg\//.test(u)?"Edge":/OPR\//.test(u)?"Opera":/YaBrowser/.test(u)?"Yandex":/Chrome\//.test(u)?"Chrome":/Firefox\//.test(u)?"Firefox":/Safari\//.test(u)?"Safari":"Brauzer";
  return {kind,os,br};
}
let trackQ=Promise.resolve();
function writeLog(mut){
  if(!S.db||!S.uid)return trackQ;
  trackQ=trackQ.then(async()=>{
    const ref=S.db.doc("logins/"+S.uid);
    let cur=S.myLog;if(!cur){try{const g=await ref.get();cur=g.exists?g.data():{}}catch(e){cur={}}}
    const next=mut({...cur,events:[...(cur.events||[])]});
    next.uid=S.uid;next.login=S.login||next.login||"";next.lastSeen=Date.now();next.device=device();
    next.events=next.events.slice(-150);
    await ref.set(next);S.myLog=next;
  }).catch(()=>{});
  return trackQ;
}
function track(type,role){
  const dv=device(),r=role||S.role||null;
  return writeLog(d=>{d.events.push({t:Date.now(),type,role:r,kind:dv.kind,os:dv.os,br:dv.br});
    if(type==="login"||type==="resume"){d.online=true;d.role=r;d.since=Date.now()}else if(type==="logout")d.online=false;return d});
}
setInterval(()=>{if(S.role&&S.myLog&&S.myLog.online&&document.visibilityState==="visible")writeLog(d=>d)},60000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&S.role&&S.myLog&&S.myLog.online)writeLog(d=>d)});

const ONLINE_MS=3*60000;
const isOnline=d=>d&&d.online&&Date.now()-(d.lastSeen||0)<ONLINE_MS;
function ago(t){if(!t)return"—";const s=Math.round((Date.now()-t)/1000);if(s<60)return"hozir";const m=Math.round(s/60);if(m<60)return m+" daqiqa oldin";const h=Math.round(m/60);if(h<24)return h+" soat oldin";return dt(t)}
const nameOf=uid=>(S.contacts[uid]||{}).name||"";
function allEvents(){return Object.values(S.logins).flatMap(d=>(d.events||[]).map(e=>({...e,uid:d.uid,login:d.login}))).concat(S.failed.map(f=>({...f,type:"fail",uid:Object.keys(S.contacts).find(k=>(S.contacts[k]||{}).login===f.login)||null,role:null})))}
function devText(e){return [e.kind,e.os,e.br].filter(Boolean).join(" · ")}

function renderMonitoring(){
  const L=Object.values(S.logins),ev=allEvents();
  const t0=new Date();t0.setHours(0,0,0,0);const today=ev.filter(e=>e.t>=t0.getTime());
  const ins=today.filter(e=>e.type==="login"||e.type==="resume");
  const online=L.filter(isOnline).sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0));
  const admins=new Set(ev.filter(e=>e.role==="admin"||e.role==="chief").map(e=>e.uid));
  $("#m-kpis").innerHTML=`<div class="kpi"><span>Hozir onlayn</span><b>${online.length}</b></div><div class="kpi"><span>Bugun kirgan foydalanuvchilar</span><b>${new Set(ins.map(e=>e.uid)).size}</b></div><div class="kpi"><span>Bugungi kirishlar</span><b>${ins.length}</b></div><div class="kpi"><span>Bugungi chiqishlar</span><b>${today.filter(e=>e.type==="logout").length}</b></div><div class="kpi"><span>Noto'g'ri parol (bugun)</span><b style="color:${today.some(e=>e.type==="fail")?"var(--bad)":"inherit"}">${today.filter(e=>e.type==="fail").length}</b></div><div class="kpi"><span>Ro'yxatdan o'tganlar</span><b>${Object.keys(S.contacts).length}</b></div><div class="kpi"><span>Administratorlar</span><b>${admins.size}</b></div>`;
  $("#m-online").innerHTML=online.length?`<div class="tablebox"><table class="wide"><thead><tr><th>Login</th><th>F.I.Sh.</th><th>Rol</th><th>Qurilma</th><th>Kirgan vaqti</th><th>Oxirgi faollik</th></tr></thead><tbody>`+
    online.map(d=>`<tr><td class="mono"><span class="dot on"></span>${esc(d.login||"—")}</td><td>${esc(nameOf(d.uid)||"—")}</td><td>${esc(ROLE_UZ[d.role]||"—")}</td><td>${esc(devText(d.device||{}))}</td><td class="mono">${dt(d.since)}</td><td>${ago(d.lastSeen)}</td></tr>`).join("")+`</tbody></table></div>`
    :`<div class="empty">Hozir hech kim onlayn emas.</div>`;
  const hours=Array(24).fill(0);ins.forEach(e=>hours[new Date(e.t).getHours()]++);const mx=Math.max(1,...hours);
  $("#m-hours").innerHTML=`<div class="hours">`+hours.map((v,h)=>`<div class="hcol" title="${h}:00 — ${v} ta kirish"><span class="hbar" style="height:${Math.round(100*v/mx)}%"></span><span class="hlbl">${h%3===0?h:""}</span></div>`).join("")+`</div>`;
  const last=[...ev].sort((a,b)=>b.t-a.t).slice(0,12);
  $("#m-last").innerHTML=last.length?last.map(e=>`<div class="evrow"><span class="mono">${dt(e.t)}</span><span class="pill ${EV_PILL[e.type]||"rank"}">${EV_UZ[e.type]||e.type}</span><b class="mono">${esc(e.login||"—")}</b><span class="note">${esc(ROLE_UZ[e.role]||"")} · ${esc(devText(e))}</span></div>`).join(""):`<p class="note">Hali hech qanday kirish qayd etilmagan.</p>`;
}

function filteredEvents(){
  const rg=$("#k-range").value,role=$("#k-role").value,type=$("#k-type").value,q=$("#k-q").value.trim().toLowerCase();
  let from=0;const now=Date.now();
  if(rg==="today"){const t=new Date();t.setHours(0,0,0,0);from=t.getTime()}else if(rg)from=now-(+rg)*DAY;
  return allEvents().filter(e=>e.t>=from&&(!role||e.role===role)&&(!type||(type==="login"?(e.type==="login"||e.type==="resume"):e.type===type))&&(!q||(e.login||"").toLowerCase().includes(q)||nameOf(e.uid).toLowerCase().includes(q))).sort((a,b)=>b.t-a.t);
}
function renderKirishlar(){
  const rows=filteredEvents(),box=$("#k-body");
  $("#k-count").textContent=rows.length+" ta yozuv";
  $("#k-csv").hidden=!rows.length;
  if(!rows.length){box.innerHTML=`<div class="empty">Tanlangan shartlar bo'yicha yozuv topilmadi.</div>`;return}
  box.innerHTML=`<div class="tablebox"><table class="wide"><thead><tr><th>Vaqt</th><th>Hodisa</th><th>Login</th><th>F.I.Sh.</th><th>Rol</th><th>Qurilma</th></tr></thead><tbody>`+
    rows.slice(0,500).map(e=>`<tr><td class="mono" style="white-space:nowrap">${dt(e.t)}</td><td><span class="pill ${EV_PILL[e.type]||"rank"}">${EV_UZ[e.type]||e.type}</span></td><td class="mono">${esc(e.login||"—")}</td><td>${esc(nameOf(e.uid)||"—")}</td><td>${esc(ROLE_UZ[e.role]||"—")}</td><td>${esc(devText(e))}</td></tr>`).join("")+`</tbody></table></div>`+(rows.length>500?`<p class="note" style="margin-top:8px">Birinchi 500 ta yozuv ko'rsatildi. Filtrdan foydalaning yoki CSV yuklab oling.</p>`:"");
}
["k-range","k-role","k-type","k-q"].forEach(id=>document.getElementById(id).addEventListener("input",renderKirishlar));
$("#k-csv").onclick=async()=>{
  const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';
  const lines=[["Vaqt","Hodisa","Login","F.I.Sh.","Rol","Qurilma"].map(q).join(";")].concat(filteredEvents().map(e=>[dt(e.t),EV_UZ[e.type]||e.type,e.login,nameOf(e.uid),ROLE_UZ[e.role]||"",devText(e)].map(q).join(";")));
  try{await navigator.clipboard.writeText(lines.join("\n"));toast("Jurnal nusxalandi — Excel'ga joylashtiring")}catch(e){toast("Nusxalab bo'lmadi")}
};

function renderUsers(){
  const uids=new Set([...Object.keys(S.contacts),...Object.keys(S.logins)]);
  const rows=[...uids].map(uid=>{const d=S.logins[uid]||{},ev=d.events||[],ins=ev.filter(e=>e.type==="login"||e.type==="resume");
    const roles=[...new Set(ev.map(e=>e.role).filter(Boolean))];const appDoc=S.apps.find(a=>a.uid===uid);
    return {uid,login:d.login||"",name:nameOf(uid),phone:(S.contacts[uid]||{}).phone||"",roles,first:ev.length?Math.min(...ev.map(e=>e.t)):null,last:ins.length?Math.max(...ins.map(e=>e.t)):null,count:ins.length,fails:ev.filter(e=>e.type==="fail").length,online:isOnline(d),seen:d.lastSeen,apps:appDoc?Object.values(appDoc.items||{}).filter(i=>!i.withdrawn).length:0}});
  const q=$("#u-q").value.trim().toLowerCase(),rf=$("#u-role").value;
  const list=rows.filter(r=>(!rf||r.roles.includes(rf))&&(!q||r.login.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)||r.phone.includes(q))).sort((a,b)=>(b.online-a.online)||((b.seen||0)-(a.seen||0)));
  $("#u-count").textContent=list.length+" ta foydalanuvchi";
  $("#u-body").innerHTML=list.length?`<div class="tablebox"><table class="wide"><thead><tr><th>Holat</th><th>Login</th><th>F.I.Sh.</th><th>Telefon</th><th>Rollar</th><th>Birinchi kirish</th><th>Oxirgi kirish</th><th class="num">Kirishlar</th><th class="num">Xato parol</th><th class="num">Arizalar</th></tr></thead><tbody>`+
    list.map(r=>`<tr><td style="white-space:nowrap"><span class="dot ${r.online?"on":""}"></span>${r.online?"Onlayn":ago(r.seen)}</td><td class="mono">${esc(r.login||"—")}</td><td>${esc(r.name||"—")}</td><td class="mono">${esc(r.phone||"—")}</td><td>${r.roles.map(x=>`<span class="tag">${esc(ROLE_UZ[x]||x)}</span>`).join(" ")||"—"}</td><td class="mono">${dt(r.first)}</td><td class="mono">${dt(r.last)}</td><td class="num">${r.count}</td><td class="num" style="${r.fails?"color:var(--bad)":""}">${r.fails}</td><td class="num">${r.apps}</td></tr>`).join("")+`</tbody></table></div>`
    :`<div class="empty">Hali ro'yxatdan o'tgan foydalanuvchi yo'q.</div>`;
}
["u-q","u-role"].forEach(id=>document.getElementById(id).addEventListener("input",renderUsers));


// ---------- ILOVA HAQIDA (hamma o'qiydi, faqat bosh administrator yozadi) ----------
const AB_DEFAULT={
  desc:"OchiqTanlov — davlat tashkilotlaridagi bo'sh ish o'rinlarini ochiq va adolatli to'ldirish uchun ilova. Ish o'rnini rahbar emas, oldindan e'lon qilingan ochiq formula bo'yicha tizim tanlaydi: nomzodlar anonim kod bilan ariza beradi, ball avtomatik hisoblanadi va natija hamma uchun ochiq e'lon qilinadi. Maqsad — tanish-bilishchilikka o'rin qoldirmaslik.",
  devs:[{name:"Ergashov Sunnatillo",role:"Dastur tuzuvchi · O'zMU Jizzax filiali",tg:"",phone:""},{name:"",role:"Dastur tuzuvchi",tg:"",phone:""}]
};
let abEditing=false;
const abData=()=>{const d=S.about||{};return{desc:d.desc||AB_DEFAULT.desc,devs:Array.isArray(d.devs)&&d.devs.length?d.devs:AB_DEFAULT.devs,at:d.at||null}};
const tgUser=v=>String(v||"").trim().replace(/^https?:\/\/(www\.)?(t|telegram)\.me\//i,"").replace(/^@/,"").replace(/[^A-Za-z0-9_]/g,"");
const telNum=v=>String(v||"").replace(/[^\d+]/g,"");
function renderAbout(){
  const d=abData();
  $("#ab-desc").textContent=d.desc;
  const shown=d.devs.filter(x=>x.name||x.tg||x.phone);
  $("#ab-devs").innerHTML=shown.length?shown.map(x=>{
    const tg=tgUser(x.tg),ph=telNum(x.phone);
    return `<div class="dev"><b>${esc(x.name||"—")}</b>${x.role?`<span class="rl">${esc(x.role)}</span>`:""}`+
      (tg?`<a href="https://t.me/${tg}" target="_blank" rel="noopener"><span>Telegram</span>@${esc(tg)}</a>`:"")+
      (ph?`<a href="tel:${esc(ph)}"><span>Telefon</span>${esc(x.phone)}</a>`:"")+`</div>`}).join("")
    :`<div class="empty">Ma'lumot hali kiritilmagan.</div>`;
  $("#ab-meta").textContent=d.at?("Oxirgi yangilanish: "+new Date(d.at).toLocaleString("uz-UZ")):"";
  $("#ab-editbar").hidden=!(S.role==="chief"&&S.isChief)||abEditing;
  $("#ab-form").hidden=!abEditing;
}
function abRow(x,i){
  return `<div class="devrow" data-i="${i}">
    <label>Ism-familiya<input class="ab-name" maxlength="80" value="${esc(x.name||"")}"></label>
    <label>Vazifasi<input class="ab-role" maxlength="80" value="${esc(x.role||"")}" placeholder="Dastur tuzuvchi"></label>
    <label>Telegram<input class="ab-tg" maxlength="64" value="${esc(x.tg||"")}" placeholder="@username"></label>
    <label>Telefon<input class="ab-ph" type="tel" maxlength="24" value="${esc(x.phone||"")}" placeholder="+998 90 123 45 67"></label>
    <button class="btn ghost x" type="button" data-del="${i}">O'chirish</button></div>`;
}
function abCollect(){return [...document.querySelectorAll("#ab-rows .devrow")].map(r=>({name:r.querySelector(".ab-name").value.trim(),role:r.querySelector(".ab-role").value.trim(),tg:r.querySelector(".ab-tg").value.trim(),phone:r.querySelector(".ab-ph").value.trim()}))}
function abFill(devs){$("#ab-rows").innerHTML=devs.map(abRow).join("")}
$("#ab-edit").onclick=()=>{const d=abData();abEditing=true;$("#ab-text").value=d.desc;abFill(d.devs.map(x=>({...x})));$("#ab-err").hidden=true;renderAbout()};
$("#ab-cancel").onclick=()=>{abEditing=false;renderAbout()};
$("#ab-add").onclick=()=>{const v=abCollect();if(v.length>=8)return;v.push({name:"",role:"Dastur tuzuvchi",tg:"",phone:""});abFill(v)};
$("#ab-rows").addEventListener("click",e=>{const i=e.target.getAttribute&&e.target.getAttribute("data-del");if(i==null)return;const v=abCollect();v.splice(+i,1);abFill(v)});
$("#ab-form").onsubmit=async e=>{
  e.preventDefault();
  const err=$("#ab-err");err.hidden=true;
  const desc=$("#ab-text").value.trim(),devs=abCollect().filter(x=>x.name||x.tg||x.phone);
  if(!desc){err.textContent="Qisqacha sharhni yozing.";err.hidden=false;return}
  const bad=devs.find(x=>x.phone&&telNum(x.phone).replace("+","").length<7);
  if(bad){err.textContent="Telefon raqami noto'g'ri: "+bad.phone;err.hidden=false;return}
  const b=$("#ab-save");b.disabled=true;
  try{
    await fs.doc("about/info").set({desc,devs:devs.map(x=>({...x,tg:tgUser(x.tg)})),at:Date.now(),by:S.uid});
    abEditing=false;toast("Ilova haqidagi ma'lumot saqlandi");renderAbout();
  }catch(ex){err.textContent=String(ex&&ex.code||"").includes("permission")?"Ruxsat yo'q: Firestore qoidalariga \"about\" bo'limi qo'shilmagan yoki siz bosh administrator emassiz.":"Saqlab bo'lmadi: "+(ex&&ex.message||ex);err.hidden=false}
  finally{b.disabled=false}
};

// ---------- render dispatcher ----------
function render(){
  const t=location.hash.slice(1);
  if(!S.role){renderGate();return}
  if(t==="vakansiyalar"||!t&&S.role==="applicant")renderVacs();
  if(t==="profil")renderProfile();
  if(t==="arizalar")renderMyApps();
  if(t==="boshqaruv"||!t&&S.role==="admin")renderDash();
  if(t==="tashkilotlar")renderOrgs();
  if(t==="boshqaruv-vak")renderAdmVacs();
  if(t==="arizalar-adm")renderAdmApps();
  if(t==="natijalar")renderResults();
  if(t==="jurnal")renderAudit();
  if(t==="sozlamalar")renderSettings();
  if(t==="monitoring")renderMonitoring();
  if(t==="kirishlar")renderKirishlar();
  if(t==="foydalanuvchilar")renderUsers();
  if(t==="haqida")renderAbout();
}
function renderGate(){
  const b=$("#gateBanner");
  const demo="";
  if(!S.loaded){b.innerHTML=demo+`<p class="note">Serverga ulanmoqda…</p>`;return}
  b.innerHTML=demo+(S.uid?`<div class="banner">Siz <b class="mono">${esc(S.login||"")}</b> sifatida kirgansiz. Rolni tanlang.</div>`:"");
}

// ---------- APPLICANT ----------
const myDoc=()=>S.apps.find(d=>d.uid===S.uid);
const myItems=()=>(myDoc()||{}).items||{};
function profileReady(){const p=S.profile;return p&&p.name&&p.spec!=null}

function renderVacs(){
  const fr=$("#f-region").value,fs=$("#f-sector").value,fm=+$("#f-min").value||0,so=$("#f-sort").value,onlyFit=$("#f-fit").checked;
  const box=$("#vlist");
  if(!S.ready.vacs){box.innerHTML=`<div class="empty">Vakansiyalar yuklanmoqda…</div>`;return}
  const p=S.profile||{};
  const live=S.vacs.filter(v=>v.status==="open"&&!deadlinePassed(v));
  const fit=v=>profileReady()&&!check(v,p).length;
  let list=live.filter(v=>(!fr||v.region===fr)&&(!fs||v.sector===fs)&&(v.salary||0)>=fm&&(!onlyFit||!profileReady()||fit(v)));
  list.sort((a,b)=>so==="sal"?b.salary-a.salary:(a.deadline||0)-(b.deadline||0));
  if(!live.length){box.innerHTML=`<div class="empty">Hozircha ochiq vakansiya yo'q. Yangi vakansiyalar e'lon qilinganda shu yerda chiqadi.</div>`;return}
  if(!list.length){box.innerHTML=`<div class="empty">${onlyFit&&profileReady()?"Profilingizga mos vakansiya topilmadi. \"Faqat menga moslar\" belgisini olib tashlab, barcha vakansiyalarni ko'rishingiz mumkin.":"Bu filtrlar bo'yicha vakansiya topilmadi. Hudud yoki maosh chegarasini o'zgartirib ko'ring."}</div>`;return}
  const mine=myItems();
  box.innerHTML=list.map(v=>{
    const o=orgOf(v.orgId),closed=isClosed(v),applied=mine[v.id]&&!mine[v.id].withdrawn;
    let fitHtml,btn;
    if(closed){const me=myDoc(),win=v.decision&&v.decision.winner;
      fitHtml=`<div class="fit"><b>Tanlov yakunlangan</b>${win?"G'olib kodi: <span class='mono'>"+esc(win)+"</span>":"Mos nomzod topilmadi"}${applied&&me?(win===me.code?" — bu siz!":" — natijangiz reytingda"):""}</div>`;
      btn=`<button class="btn ghost" type="button" data-res="${esc(v.id)}">Reyting</button>`}
    else if(!profileReady()){fitHtml=`<div class="fit"><b>Profil to'ldirilmagan</b>Mosligingizni ko'rish uchun avval profilni saqlang va testni topshiring.</div>`;btn=`<a class="btn ghost" href="#profil" style="text-decoration:none;font-weight:600;padding:9px 14px;border-radius:8px;border:1px solid var(--line);color:var(--ink)">Profilga o'tish</a>`}
    else{const why=check(v,p);
      fitHtml=why.length?`<div class="fit no"><b>Talablarga mos emas</b>${why.map(esc).join("; ")}</div>`:`<div class="fit ok"><b>Siz mos kelasiz</b>Taxminiy ballingiz: <span class="mono">${score(v,p).total}</span></div>`;
      btn=applied?`<button class="btn ghost" type="button" disabled>Ariza yuborilgan</button>`:deadlinePassed(v)?`<button class="btn ghost" type="button" disabled>Muddat tugagan</button>`:`<button class="btn" type="button" data-apply="${esc(v.id)}" ${why.length?"disabled":""}>Ariza topshirish</button>`}
    return `<article class="vac">
      <div class="top"><div><h3>${esc(v.title)}</h3><div class="org">${esc(o.name)}</div></div><div class="salary">${fmt(v.salary)}<small>so'm / oy</small></div></div>
      <div class="tags"><span class="tag">${esc(v.region)}</span><span class="tag">${esc(v.sector)}</span><span class="tag">${EDU[v.edu]}+</span><span class="tag">staj ${v.exp}+ yil</span><span class="tag">test ${v.test}+</span>${(v.req||[]).map(s=>`<span class="tag" title="majburiy">● ${esc(s)}</span>`).join("")}</div>
      ${fitHtml}
      <div class="foot"><span><span class="verified">✓ STIR ${esc(o.stir)}</span> · ${daysLeft(v)}</span>${btn}</div></article>`}).join("");
  box.querySelectorAll("[data-apply]").forEach(b=>b.onclick=()=>apply(b.dataset.apply,b));
  box.querySelectorAll("[data-res]").forEach(b=>b.onclick=()=>openResult(b.dataset.res));
}
["f-region","f-sector","f-min","f-sort","f-fit"].forEach(id=>document.getElementById(id).addEventListener("input",renderVacs));

let writing=false;
async function writeMyApps(items){
  const code=codeFor(S.uid);
  await S.db.doc("applications/"+S.uid).set({uid:S.uid,code,items});
}
async function apply(vid,btn){
  if(writing)return;const v=S.vacs.find(x=>x.id===vid),p=S.profile;
  if(!v||!p||check(v,p).length||isClosed(v)||deadlinePassed(v))return;
  writing=true;btn.disabled=true;
  try{
    const items={...myItems()};
    items[vid]={edu:p.edu,spec:p.spec,exp:p.exp||0,test:p.test??null,skills:[...(p.skills||[])],langs:[...(p.langs||[])],at:Date.now()};
    await writeMyApps(items);
    toast("Ariza "+codeFor(S.uid)+" kodi bilan yuborildi");
  }catch(e){toast("Ariza yuborilmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.");btn.disabled=false}
  writing=false;
}

function renderProfile(){
  const p=S.profile||{};
  const f=document.activeElement&&document.activeElement.closest&&document.activeElement.closest("#pform");
  if(!f){
    $("#p-name").value=p.name||"";$("#p-phone").value=(S.contacts[S.uid]||{}).phone||p.phone||"";
    $("#p-region").value=p.region||"Jizzax";$("#p-edu").value=p.edu??1;$("#p-spec").value=p.spec||Object.keys(SPECS)[0];$("#p-exp").value=p.exp||0;
  }
  draftP.skills=draftP.skills||[...(p.skills||[])];draftP.langs=draftP.langs||[...(p.langs||["O'zbek"])];
  chips($("#p-skills"),SKILLS,draftP.skills,x=>{draftP.skills=draftP.skills.includes(x)?draftP.skills.filter(s=>s!==x):[...draftP.skills,x];renderProfile()});
  chips($("#p-langs"),LANGS,draftP.langs,x=>{draftP.langs=draftP.langs.includes(x)?draftP.langs.filter(s=>s!==x):[...draftP.langs,x];renderProfile()});
  $("#p-test").textContent=p.test!=null?p.test+" / 100":"topshirilmagan";
  $("#p-code").textContent=S.uid?codeFor(S.uid):"—";
}
const draftP={skills:null,langs:null};
async function saveProfile(extra){
  const p={...(S.profile||{}),name:$("#p-name").value.trim(),region:$("#p-region").value,edu:+$("#p-edu").value,spec:$("#p-spec").value,
    exp:Math.max(0,Math.min(45,+$("#p-exp").value||0)),skills:[...(draftP.skills||[])],langs:[...(draftP.langs||[])],...(extra||{})};
  delete p.phone;
  await S.db.doc("profiles/"+S.uid).set(p);
  const phone=$("#p-phone").value.trim();
  const c=S.contacts[S.uid]||{};
  if(c.name!==p.name||c.phone!==phone)await S.db.doc("contacts/"+S.uid).set({name:p.name,phone,login:S.login||""});
}
$("#pform").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#p-err");err.hidden=true;
  if(!$("#p-name").value.trim()){err.textContent="F.I.Sh. ni kiriting.";err.hidden=false;return}
  try{await saveProfile();$("#p-saved").textContent="Saqlandi";setTimeout(()=>$("#p-saved").textContent="",2500)}
  catch(e2){err.textContent="Saqlab bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.";err.hidden=false}
});
const QUIZ=[
 {q:"Jadvalda 1 000 ta qatorni tez saralash uchun nima qulay?",o:["Qo'lda ko'chirish","Filtr va saralash funksiyasi","Har qatorni rangga bo'yash"],a:1},
 {q:"Fuqarodan shikoyat kelsa, birinchi qadam qaysi?",o:["Shikoyatni tinglab, mazmunini aniqlash","E'tibor bermaslik","Boshqa bo'limga yo'naltirib, unutish"],a:0},
 {q:"2 000 000 so'mning 15 foizi qancha?",o:["150 000","300 000","30 000"],a:1},
 {q:"Shaxsga doir ma'lumotni uchinchi shaxsga berish uchun odatda nima kerak?",o:["Hech narsa","Shaxsning roziligi yoki qonuniy asos","Faqat rahbar ruxsati"],a:1},
 {q:"Ish rejasini tuzishda eng avval nima belgilanadi?",o:["Natija va muddat","Ofis rangi","Tushlik vaqti"],a:0}
];
$("#btn-quiz").onclick=()=>{
  const q=$("#quiz");q.hidden=!q.hidden;if(q.hidden)return;
  q.innerHTML=QUIZ.map((x,i)=>`<fieldset><legend>${i+1}. ${esc(x.q)}</legend>${x.o.map((o,j)=>`<label><input type="radio" name="q${i}" id="q${i}_${j}" value="${j}"> ${esc(o)}</label>`).join("")}</fieldset>`).join("")+`<div><button class="btn" id="quiz-done" type="button">Natijani hisoblash</button></div>`;
  $("#quiz-done").onclick=async()=>{
    if(!$("#p-name").value.trim()){toast("Avval F.I.Sh. ni kiriting");return}
    let c=0;QUIZ.forEach((x,i)=>{const s=document.querySelector(`input[name=q${i}]:checked`);if(s&&+s.value===x.a)c++});
    try{await saveProfile({test:40+c*12});q.hidden=true;toast("Test bali saqlandi: "+(40+c*12)+" / 100")}catch(e){toast("Natijani saqlab bo'lmadi")}
  };
};

let myRankId=null;
function renderMyApps(){
  const box=$("#myapps"),items=myItems(),ids=Object.keys(items).filter(k=>!items[k].withdrawn);
  if(!ids.length){box.innerHTML=`<div class="empty">Siz hali ariza topshirmagansiz. "Vakansiyalar" bo'limidan o'zingizga ma'qul ish o'rnini tanlang.</div>`;$("#myrank").innerHTML="";return}
  const code=codeFor(S.uid);
  ids.sort((a,b)=>(items[b].at||0)-(items[a].at||0));
  box.innerHTML=`<div class="tablebox"><table class="wide"><thead><tr><th>Vakansiya</th><th class="num">Maosh</th><th>Topshirilgan</th><th>Holat</th><th class="num">Ball</th><th></th></tr></thead><tbody>`+ids.map(id=>{
    const v=S.vacs.find(x=>x.id===id);if(!v)return `<tr><td colspan="6">Bu vakansiya o'chirilgan</td></tr>`;
    const r=ranking(v),me=r.find(x=>x.uid===S.uid),pos=r.filter(x=>x.ok).findIndex(x=>x.uid===S.uid)+1,d=v.decision||{};
    let st;
    if(v.status==="cancelled")st=`<span class="pill cancel">Bekor qilingan</span><div class="why" style="color:var(--warn)">${esc(v.cancelReason||"")}</div>`;
    else if(isClosed(v)){st=d.winner===code?`<span class="pill win">G'olib</span><div class="note">Tashkilot siz bilan bog'lanadi.</div>`:d.reserve===code?`<span class="pill res">Zaxira</span>`:me&&me.ok?`<span class="pill rank">${pos}-o'rin</span>`:`<span class="pill out">Mos emas</span>`}
    else st=me&&me.ok?`<span class="pill open">Hozir ${pos}-o'rin</span>`:`<span class="pill out">Mos emas</span>`;
    const canWd=v.status==="open"&&!deadlinePassed(v);
    return `<tr><td><b>${esc(v.title)}</b><div class="org">${esc(orgOf(v.orgId).name)}</div><div class="note">${daysLeft(v)}</div></td><td class="num">${fmt(v.salary)}</td><td class="mono">${dt(items[id].at)}</td><td>${st}${me&&!me.ok&&v.status!=="cancelled"?`<div class="why">${me.why.map(esc).join("; ")}</div>`:""}</td><td class="num">${me&&me.ok?me.s.total:"—"}</td>
      <td><div class="btnrow" data-wdbox="${esc(id)}">${v.status!=="cancelled"?`<button class="btn ghost" type="button" data-rk="${esc(id)}">Reyting</button>`:""}${canWd?`<button class="btn ghost" type="button" data-wd="${esc(id)}">Qaytarib olish</button>`:""}</div></td></tr>`}).join("")+`</tbody></table></div>`;
  box.querySelectorAll("[data-wd]").forEach(b=>b.onclick=()=>{
    const cell=b.parentElement,id=b.dataset.wd;
    cell.innerHTML=`<span class="confirm">Arizani qaytarib olasizmi? <button class="btn danger" type="button" data-yes>Ha</button><button class="btn ghost" type="button" data-no>Yo'q</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderMyApps();
    cell.querySelector("[data-yes]").onclick=async()=>{if(writing)return;writing=true;
      try{const items2={...myItems()};delete items2[id];await writeMyApps(items2);toast("Ariza qaytarib olindi");if(myRankId===id)myRankId=null}catch(e){toast("Bajarib bo'lmadi")}
      writing=false};
  });
  box.querySelectorAll("[data-rk]").forEach(b=>b.onclick=()=>{myRankId=myRankId===b.dataset.rk?null:b.dataset.rk;renderMyApps();if(myRankId)$("#myrank").scrollIntoView({behavior:"smooth",block:"start"})});
  const rv=myRankId&&S.vacs.find(x=>x.id===myRankId);
  if(rv){$("#myrank").innerHTML=`<h2>Reyting: ${esc(rv.title)}</h2><div id="myrankBody"></div>`;renderRanking(rv,$("#myrankBody"),false)}else $("#myrank").innerHTML="";
}

// ---------- ADMIN ----------
async function log(kind,text){try{await S.db.collection("audit").add({at:Date.now(),by:S.uid,login:S.login||"",kind,text})}catch(e){}}
const statusPill=v=>v.status==="cancelled"?`<span class="pill cancel">Bekor qilingan</span>`:isClosed(v)?`<span class="pill closed">Yakunlangan</span>`:deadlinePassed(v)?`<span class="pill res">Yakunlash kutilmoqda</span>`:`<span class="pill open">Ochiq</span>`;
function bars(rows,fmtVal){const max=Math.max(1,...rows.map(r=>r[1]));
  return rows.length?`<div class="bars">`+rows.map(([l,v])=>`<div class="bar"><span class="lbl" title="${esc(l)}">${esc(l)}</span><span class="track"><span class="fill" style="width:${Math.round(100*v/max)}%"></span></span><span class="val">${fmtVal?fmtVal(v):v}</span></div>`).join("")+`</div>`:`<p class="note">Ma'lumot yetarli emas.</p>`}
function renderDash(){
  const open=S.vacs.filter(v=>v.status==="open").length,closed=S.vacs.filter(isClosed).length,canc=S.vacs.filter(v=>v.status==="cancelled").length;
  const all=S.vacs.flatMap(v=>ranking(v));const okN=all.filter(a=>a.ok).length;
  $("#kpis").innerHTML=`<div class="kpi"><span>Davlat tashkilotlari</span><b>${S.orgs.length}</b></div><div class="kpi"><span>Ochiq vakansiyalar</span><b>${open}</b></div><div class="kpi"><span>Jami arizalar</span><b>${all.length}</b></div><div class="kpi"><span>Talablarga mos arizalar</span><b>${all.length?Math.round(100*okN/all.length):0}%</b></div><div class="kpi"><span>Yakunlangan / bekor</span><b>${closed} / ${canc}</b></div><div class="kpi"><span>Qo'lda tanlangan nomzod</span><b>0</b></div>`;
  const pend=S.vacs.filter(v=>v.status==="open"&&deadlinePassed(v));
  $("#pending").innerHTML=pend.length?pend.map(v=>closeRow(v)).join(""):`<p class="note">Muddati tugagan, yakunlanmagan tanlov yo'q.</p>`;
  bindClose($("#pending"));
  const by=(arr,key)=>{const m={};arr.forEach(x=>{m[key(x)]=(m[key(x)]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const avg={};S.vacs.forEach(v=>{(avg[v.sector]=avg[v.sector]||[]).push(v.salary||0)});
  const avgRows=Object.entries(avg).map(([k,a])=>[k,Math.round(a.reduce((s,x)=>s+x,0)/a.length)]).sort((a,b)=>b[1]-a[1]);
  const top=S.vacs.map(v=>[v.title+" — "+orgOf(v.orgId).name,applicantsOf(v).length]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,6);
  $("#statsBox").innerHTML=`<div class="panel stack"><h2>Soha bo'yicha vakansiyalar</h2>${bars(by(S.vacs,v=>v.sector))}</div>
   <div class="panel stack"><h2>O'rtacha maosh, so'm</h2>${bars(avgRows,fmt)}</div>
   <div class="panel stack"><h2>Hudud bo'yicha ochiq vakansiyalar</h2>${bars(by(S.vacs.filter(v=>v.status==="open"),v=>v.region))}</div>
   <div class="panel stack"><h2>Eng ko'p ariza tushgan vakansiyalar</h2>${bars(top)}</div>`;
}
function closeRow(v){return `<div class="btnrow" style="justify-content:space-between;border-bottom:1px solid var(--line);padding-block:8px"><span><b>${esc(v.title)}</b> · ${esc(orgOf(v.orgId).name)} · <span class="mono">${applicantsOf(v).length}</span> ariza</span><span><button class="btn" type="button" data-close="${esc(v.id)}">Tanlovni yakunlash</button></span></div>`}
function bindClose(root){
  root.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{
    const box=b.parentElement,id=b.dataset.close;
    box.innerHTML=`<span class="confirm">Tizim g'olibni belgilaydi, natijani o'zgartirib bo'lmaydi. <button class="btn" type="button" data-yes>Yakunlash</button><button class="btn ghost" type="button" data-no>Bekor qilish</button></span>`;
    box.querySelector("[data-no]").onclick=()=>render();
    box.querySelector("[data-yes]").onclick=()=>closeVac(id);
  });
}
async function closeVac(id){
  const v=S.vacs.find(x=>x.id===id);if(!v||v.status!=="open"||!deadlinePassed(v))return;
  const r=ranking(v),ok=r.filter(x=>x.ok);
  const decision={at:Date.now(),winner:ok[0]?ok[0].code:null,winnerUid:ok[0]?ok[0].uid:null,winnerScore:ok[0]?ok[0].s.total:null,reserve:ok[1]?ok[1].code:null,reserveUid:ok[1]?ok[1].uid:null,eligible:ok.length,total:r.length,rejected:[],
    snapshot:r.map(x=>({code:x.code,uid:x.uid,ok:x.ok,total:x.ok?x.s.total:null}))};
  try{await S.db.doc("vacancies/"+id).update({status:"closed",decision});await log("close",`Tanlov yakunlandi: "${v.title}". G'olib: ${decision.winner||"yo'q"}, zaxira: ${decision.reserve||"yo'q"}`);toast("Tizim g'olibni belgiladi: "+(decision.winner||"mos nomzod yo'q"))}
  catch(e){toast("Yakunlab bo'lmadi, qayta urinib ko'ring")}
}

// organisations
opts($("#o-type"),ORG_TYPES);opts($("#o-region"),REGIONS);$("#o-region").value="Jizzax";
$("#oform").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#o-err");err.hidden=true;
  const name=$("#o-name").value.trim(),stir=$("#o-stir").value.trim();
  if(!name){err.textContent="Tashkilot nomini kiriting.";err.hidden=false;return}
  if(!/^\d{9}$/.test(stir)){err.textContent="STIR 9 ta raqamdan iborat bo'lishi kerak.";err.hidden=false;return}
  if(S.orgs.some(o=>o.stir===stir)){err.textContent="Bu STIR bilan tashkilot allaqachon kiritilgan.";err.hidden=false;return}
  try{await S.db.doc("orgs/o"+stir).set({name,stir,type:$("#o-type").value,region:$("#o-region").value,createdAt:Date.now()});await log("org",`Tashkilot qo'shildi: ${name} (STIR ${stir})`);e.target.reset();$("#o-region").value="Jizzax";toast("Tashkilot qo'shildi")}
  catch(e2){err.textContent="Saqlab bo'lmadi: administrator huquqi kerak yoki internet aloqasi yo'q.";err.hidden=false}
});
function renderOrgs(){
  const box=$("#orglist");
  if(!S.orgs.length){box.innerHTML=`<div class="empty">Hali tashkilot kiritilmagan. Chapdagi shakl orqali birinchi davlat tashkilotini qo'shing yoki Sozlamalar bo'limida namuna ma'lumot qo'shing.</div>`;return}
  box.innerHTML=`<div class="tablebox"><table class="wide"><thead><tr><th>Tashkilot</th><th>STIR</th><th>Turi</th><th>Viloyat</th><th class="num">Ochiq</th><th class="num">Jami</th><th class="num">Arizalar</th><th></th></tr></thead><tbody>`+
   [...S.orgs].sort((a,b)=>a.name.localeCompare(b.name)).map(o=>{const vs=S.vacs.filter(v=>v.orgId===o.id);const apps=vs.reduce((n,v)=>n+applicantsOf(v).length,0);
     return `<tr><td><b>${esc(o.name)}</b></td><td class="mono">${esc(o.stir)}</td><td>${esc(o.type)}</td><td>${esc(o.region)}</td><td class="num">${vs.filter(v=>v.status==="open").length}</td><td class="num">${vs.length}</td><td class="num">${apps}</td><td><span>${apps?`<span class="note">Arizasi bor tashkilotni o'chirib bo'lmaydi</span>`:`<button class="btn ghost" type="button" data-del="${esc(o.id)}">O'chirish</button>`}</span></td></tr>`}).join("")+`</tbody></table></div>`;
  box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.del,o=S.orgs.find(x=>x.id===id),n=S.vacs.filter(v=>v.orgId===id).length,cell=b.parentElement;
    cell.innerHTML=`<span class="confirm">${n?n+" ta vakansiyasi bilan ":""}o'chirilsinmi? <button class="btn danger" type="button" data-yes>O'chirish</button><button class="btn ghost" type="button" data-no>Yo'q</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderOrgs();
    cell.querySelector("[data-yes]").onclick=async()=>{try{for(const v of S.vacs.filter(v=>v.orgId===id))await S.db.doc("vacancies/"+v.id).delete();await S.db.doc("orgs/"+id).delete();await log("org",`Tashkilot o'chirildi: ${o?o.name:id}`);toast("O'chirildi")}catch(e){toast("O'chirib bo'lmadi")}};
  });
}

// vacancies
const draftV={specs:[],req:[],pref:[],langs:[]};let editingId=null;
opts($("#v-sector"),SECTORS);opts($("#v-region"),REGIONS);opts($("#v-edu"),EDU.map((t,i)=>({v:i,t})));$("#v-edu").value=1;$("#v-region").value="Jizzax";
function renderDraft(){
  chips($("#v-specs"),Object.keys(SPECS).filter(s=>SPECS[s]===$("#v-sector").value),draftV.specs,x=>{draftV.specs=draftV.specs.includes(x)?draftV.specs.filter(s=>s!==x):[...draftV.specs,x];renderDraft()});
  chips($("#v-skills"),SKILLS,draftV.pref,x=>{
    if(draftV.req.includes(x))draftV.req=draftV.req.filter(s=>s!==x);
    else if(draftV.pref.includes(x)){draftV.pref=draftV.pref.filter(s=>s!==x);draftV.req.push(x)}
    else draftV.pref.push(x);renderDraft()},draftV.req);
  chips($("#v-langs"),LANGS.slice(1),draftV.langs,x=>{draftV.langs=draftV.langs.includes(x)?draftV.langs.filter(s=>s!==x):[...draftV.langs,x];renderDraft()});
}
function setEditMode(v){
  editingId=v?v.id:null;
  $("#vformTitle").textContent=v?"Vakansiyani tahrirlash":"Yangi vakansiya";$("#vSubmit").textContent=v?"O'zgarishlarni saqlash":"Vakansiyani e'lon qilish";
  $("#vEditCancel").hidden=!v;$("#vEditFlag").hidden=!v;
  if(v){$("#v-org").value=v.orgId;$("#v-title").value=v.title;$("#v-salary").value=v.salary;$("#v-sector").value=v.sector;$("#v-region").value=v.region;$("#v-edu").value=v.edu;$("#v-exp").value=v.exp;$("#v-test").value=v.test;
    {const left=Math.max(0,(v.deadline||0)-Date.now());const o=[...$("#v-days").options].map(x=>+x.value);$("#v-days").value=String(o.reduce((b,x)=>Math.abs(x-left)<Math.abs(b-left)?x:b,o[0]));}
    draftV.specs=[...(v.specs||[])];draftV.req=[...(v.req||[])];draftV.pref=[...(v.pref||[])];draftV.langs=[...(v.langs||[])];$("#vform").scrollIntoView({behavior:"smooth",block:"start"})}
  else{$("#v-title").value="";$("#v-salary").value="";draftV.specs=[];draftV.req=[];draftV.pref=[];draftV.langs=[]}
  renderDraft();
}
$("#vEditCancel").onclick=()=>setEditMode(null);
$("#v-sector").addEventListener("change",()=>{draftV.specs=[];renderDraft()});
$("#v-org").addEventListener("change",()=>{const o=S.orgs.find(x=>x.id===$("#v-org").value);if(o)$("#v-region").value=o.region});
$("#vform").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#v-err");err.hidden=true;
  const orgId=$("#v-org").value,title=$("#v-title").value.trim(),salary=+$("#v-salary").value;
  const fail=m=>{err.textContent=m;err.hidden=false};
  if(!orgId)return fail("Avval tashkilotni tanlang. Ro'yxat bo'sh bo'lsa, \"Tashkilotlar\" bo'limida qo'shing.");
  if(!title)return fail("Lavozim nomini kiriting.");
  if(!(salary>=1000000))return fail("Maoshni aniq ko'rsating (kamida 1 000 000 so'm). \"Kelishiladi\" deb qoldirib bo'lmaydi.");
  if(!draftV.specs.length)return fail("Kamida bitta mutaxassislikni tanlang.");
  const durMs=+$("#v-days").value||14*DAY;
  const body={orgId,title,salary,sector:$("#v-sector").value,region:$("#v-region").value,edu:+$("#v-edu").value,exp:Math.max(0,+$("#v-exp").value||0),test:Math.max(0,Math.min(100,+$("#v-test").value||0)),
    specs:[...draftV.specs],req:[...draftV.req],pref:[...draftV.pref],langs:[...draftV.langs],deadline:Date.now()+durMs};
  try{
    if(editingId){const v=S.vacs.find(x=>x.id===editingId);
      if(!v||v.status!=="open"||applicantsOf(v).length)return fail("Bu vakansiyaga ariza tushgan, talablarni endi o'zgartirib bo'lmaydi.");
      await S.db.doc("vacancies/"+editingId).update({...body,editedAt:Date.now()});await log("edit",`Vakansiya tahrirlandi: "${title}"`);setEditMode(null);toast("O'zgarishlar saqlandi");
    }else{
      const id="v"+Date.now().toString(36);
      await S.db.doc("vacancies/"+id).set({...body,createdAt:Date.now(),status:"open",decision:null});await log("vacancy",`Vakansiya e'lon qilindi: "${title}" — ${orgOf(orgId).name}, ${fmt(salary)} so'm, muddat ${$("#v-days").selectedOptions[0].textContent}`);
      setEditMode(null);toast("Vakansiya e'lon qilindi");
    }
  }catch(e2){fail("Saqlab bo'lmadi: administrator huquqi kerak yoki internet aloqasi yo'q.")}
});
function renderAdmVacs(){
  const cur=$("#v-org").value;opts($("#v-org"),S.orgs.map(o=>({v:o.id,t:o.name})),S.orgs.length?undefined:"Avval tashkilot qo'shing");if(cur)$("#v-org").value=cur;
  const box=$("#admvacs");
  if(!S.vacs.length){box.innerHTML=`<div class="empty">Hali vakansiya yo'q. Chapdagi shakl orqali tashkilot nomidan birinchi vakansiyani e'lon qiling.</div>`;return}
  const order=v=>v.status==="open"?(deadlinePassed(v)?0:1):isClosed(v)?2:3;
  const list=[...S.vacs].sort((a,b)=>order(a)-order(b)||(b.createdAt||0)-(a.createdAt||0));
  box.innerHTML=`<div class="vlist">`+list.map(v=>{
    const n=applicantsOf(v).length,closed=isClosed(v),d=v.decision||{},open=v.status==="open";
    const wc=closed&&d.winnerUid?S.contacts[d.winnerUid]:null;
    let actions="";
    if(open&&deadlinePassed(v))actions=`<button class="btn" type="button" data-close="${esc(v.id)}">Tanlovni yakunlash</button>`;
    else if(open){actions=(n?"":`<button class="btn ghost" type="button" data-edit="${esc(v.id)}">Tahrirlash</button>`)+((v.extended||0)<2?`<button class="btn ghost" type="button" data-ext="${esc(v.id)}">+7 kun</button>`:"")}
    if(open)actions+=`<button class="btn ghost" type="button" data-cancel="${esc(v.id)}">Bekor qilish</button>`;
    if(closed)actions=`<button class="btn ghost" type="button" data-res="${esc(v.id)}">Natija</button>`;
    return `<article class="vac"><div class="top"><div><h3>${esc(v.title)}</h3><div class="org">${esc(orgOf(v.orgId).name)}</div></div>${statusPill(v)}</div>
      <dl class="kv"><dt>Maosh</dt><dd class="mono">${fmt(v.salary)} so'm</dd><dt>Arizalar</dt><dd class="mono">${n}</dd><dt>Muddat</dt><dd>${v.status==="cancelled"?"—":daysLeft(v)}${v.extended?` <span class="note">(${v.extended} marta uzaytirilgan)</span>`:""}</dd>
      ${closed?`<dt>Tizim tanlagan</dt><dd>${d.winner?`<span class="mono">${esc(d.winner)}</span>${wc?" — <b>"+esc(wc.name)+"</b>"+(wc.phone?", <span class='mono'>"+esc(wc.phone)+"</span>":""):""}`:"Mos nomzod yo'q"}</dd><dt>Zaxira</dt><dd class="mono">${esc(d.reserve||"—")}</dd>`:v.status==="cancelled"?`<dt>Sabab</dt><dd>${esc(v.cancelReason||"")}</dd>`:`<dt>Nomzodlar</dt><dd>Tanlov tugaguncha ismlar yashirin</dd>`}</dl>
      <div class="foot" style="flex-direction:column;align-items:stretch"><div class="btnrow" data-actbox="${esc(v.id)}">${actions}</div></div></article>`}).join("")+`</div>`;
  bindClose(box);
  box.querySelectorAll("[data-res]").forEach(b=>b.onclick=()=>openResult(b.dataset.res));
  box.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>setEditMode(S.vacs.find(x=>x.id===b.dataset.edit)));
  box.querySelectorAll("[data-ext]").forEach(b=>b.onclick=async()=>{const v=S.vacs.find(x=>x.id===b.dataset.ext);if(!v)return;b.disabled=true;
    try{await S.db.doc("vacancies/"+v.id).update({deadline:Math.max(v.deadline||0,Date.now())+7*DAY,extended:(v.extended||0)+1});await log("extend",`Muddat 7 kunga uzaytirildi: "${v.title}"`);toast("Muddat 7 kunga uzaytirildi")}catch(e){toast("Bajarib bo'lmadi");b.disabled=false}});
  box.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.cancel,v=S.vacs.find(x=>x.id===id),cell=b.parentElement;
    cell.innerHTML=`<span class="inline"><input id="cr-${esc(id)}" placeholder="Bekor qilish sababi (kamida 10 belgi, arizachilarga ko'rinadi)"><button class="btn danger" type="button" data-yes>Bekor qilish</button><button class="btn ghost" type="button" data-no>Ortga</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderAdmVacs();
    cell.querySelector("[data-yes]").onclick=async()=>{const reason=document.getElementById("cr-"+id).value.trim();
      if(reason.length<10){toast("Sababni kamida 10 belgi bilan yozing");return}
      try{await S.db.doc("vacancies/"+id).update({status:"cancelled",cancelReason:reason,cancelledAt:Date.now()});await log("cancel",`Vakansiya bekor qilindi: "${v.title}". Sabab: ${reason}`);toast("Vakansiya bekor qilindi")}catch(e){toast("Bajarib bo'lmadi")}};
  });
}

// all applications (admin)
function renderAdmApps(){
  const sel=$("#aa-vac"),cur=sel.value;
  opts(sel,S.vacs.map(v=>({v:v.id,t:v.title+" — "+orgOf(v.orgId).name})),"Barcha vakansiyalar");sel.value=cur&&S.vacs.some(v=>v.id===cur)?cur:"";
  const st=$("#aa-st").value,q=$("#aa-q").value.trim().toUpperCase();
  let rows=[];
  S.vacs.filter(v=>!sel.value||v.id===sel.value).forEach(v=>{let rank=0;ranking(v).forEach(a=>{if(a.ok)rank++;rows.push({v,a,rank:a.ok?rank:null})})});
  rows=rows.filter(x=>(!st||(st==="ok")===x.a.ok)&&(!q||x.a.code.includes(q)));
  rows.sort((x,y)=>(y.a.at||0)-(x.a.at||0));
  const box=$("#aa-body");
  if(!rows.length){box.innerHTML=`<div class="empty">${S.vacs.length?"Tanlangan shartlar bo'yicha ariza topilmadi.":"Hali vakansiya ham, ariza ham yo'q."}</div>`;return}
  box.innerHTML=`<p class="note" style="margin-bottom:8px">${rows.length} ta ariza</p><div class="tablebox"><table class="wide"><thead><tr><th>Kod</th><th>Vakansiya</th><th>Holat</th><th class="num">Ball</th><th class="num">O'rin</th><th>Ma'lumot</th><th class="num">Staj</th><th class="num">Test</th><th>Vaqt</th></tr></thead><tbody>`+
    rows.map(({v,a,rank})=>{const d=v.decision||{};const pill=v.status==="cancelled"?`<span class="pill cancel">Bekor</span>`:!a.ok?`<span class="pill out">Mos emas</span>`:isClosed(v)&&a.code===d.winner?`<span class="pill win">G'olib</span>`:isClosed(v)&&a.code===d.reserve?`<span class="pill res">Zaxira</span>`:`<span class="pill rank">Mos</span>`;
      return `<tr class="${a.ok?"":"ineligible"}"><td class="mono">${esc(a.code)}</td><td>${esc(v.title)}<div class="org">${esc(orgOf(v.orgId).name)}</div></td><td>${pill}${a.ok?"":`<div class="why">${a.why.map(esc).join("; ")}</div>`}</td><td class="num">${a.ok?a.s.total:"—"}</td><td class="num">${rank||"—"}</td><td>${EDU[a.edu]||"—"}<div class="org">${esc(a.spec||"")}</div></td><td class="num">${a.exp||0}</td><td class="num">${a.test??"—"}</td><td class="mono" style="white-space:nowrap">${dt(a.at)}</td></tr>`}).join("")+`</tbody></table></div>`;
}
["aa-vac","aa-st","aa-q"].forEach(id=>document.getElementById(id).addEventListener("input",renderAdmApps));

// audit
const KIND={org:"Tashkilot",vacancy:"Vakansiya",edit:"Tahrir",extend:"Muddat",cancel:"Bekor qilish",close:"Yakunlash",reject:"G'olibni rad etish",code:"Kod",sample:"Namuna"};
function renderAudit(){
  const box=$("#auditBody");
  if(!S.audit.length){box.innerHTML=`<div class="empty">Jurnal hozircha bo'sh. Administratorlarning birinchi harakatidan boshlab yozuvlar shu yerda chiqadi.</div>`;return}
  box.innerHTML=`<div class="tablebox"><table class="wide"><thead><tr><th>Vaqt</th><th>Administrator</th><th>Turi</th><th>Harakat</th></tr></thead><tbody>`+
    [...S.audit].sort((a,b)=>b.at-a.at).map(x=>`<tr><td class="mono" style="white-space:nowrap">${dt(x.at)}</td><td class="mono">${esc(x.login||"—")}</td><td><span class="pill rank">${esc(KIND[x.kind]||x.kind)}</span></td><td>${esc(x.text)}</td></tr>`).join("")+`</tbody></table></div>`;
}

// settings
function renderSettings(){
  const reg=Object.keys(S.contacts).length;
  $("#usersInfo").innerHTML=`<dt>Ro'yxatdan o'tganlar</dt><dd class="mono">${reg}</dd><dt>Ariza bergan foydalanuvchilar</dt><dd class="mono">${S.apps.filter(d=>Object.values(d.items||{}).some(i=>!i.withdrawn)).length}</dd><dt>Sizning loginingiz</dt><dd class="mono">${esc(S.login||"—")}</dd>`;
  $("#sampleBox").hidden=S.orgs.some(o=>o.sample);
  $("#codeChange").hidden=true;
}

$("#btn-sample").onclick=async()=>{
  const b=$("#btn-sample");b.disabled=true;
  const orgs=[["Jizzax shahar 7-umumta'lim maktabi (namuna)","301245678","Maktab / bog'cha","Jizzax"],["Zomin tuman tibbiyot birlashmasi (namuna)","302556190","Tibbiyot muassasasi","Jizzax"],["Jizzax viloyat hokimligi axborot xizmati (namuna)","203118734","Hokimlik","Jizzax"]];
  const now=Date.now();
  const vacs=[["301245678","Matematika o'qituvchisi","Ta'lim",6800000,1,2,60,["Matematika o'qitish"],["Dars rejalash"],["Onlayn ta'lim","Excel"],["Rus"],10/1440],
    ["301245678","Boshlang'ich sinf o'qituvchisi","Ta'lim",5900000,1,1,55,["Boshlang'ich ta'lim"],["Dars rejalash"],["Onlayn ta'lim"],["Rus"],14],
    ["302556190","Hamshira (qabul bo'limi)","Sog'liqni saqlash",5200000,0,1,55,["Hamshiralik ishi"],["Birinchi yordam"],["Bemor parvarishi","Hujjat yuritish"],["Rus"],10],
    ["203118734","Axborot tizimlari mutaxassisi","IT",8500000,1,0,65,["Axborot tizimlari","Dasturiy injiniring"],["SQL"],["Python","Web (HTML/JS)","Excel"],["Ingliz","Rus"],14]];
  try{
    for(const [name,stir,type,region] of orgs)if(!S.orgs.some(o=>o.stir===stir))await S.db.doc("orgs/o"+stir).set({name,stir,type,region,createdAt:now,sample:true});
    let i=0;for(const [stir,title,sector,salary,edu,exp,test,specs,req,pref,langs,days] of vacs){i++;
      await S.db.doc("vacancies/sample"+i).set({orgId:"o"+stir,title,sector,region:"Jizzax",salary,edu,exp,test,specs,req,pref,langs,createdAt:now,deadline:now+days*DAY,status:"open",decision:null,sample:true})}
    await log("sample","3 ta namuna tashkilot va 4 ta namuna vakansiya qo'shildi");toast("Namuna ma'lumotlar qo'shildi");
  }catch(e){toast("Qo'shib bo'lmadi: administrator huquqi kerak");b.disabled=false}
};

// ---------- RESULTS ----------
function openResult(id){if(!isAdm()){myRankId=id;location.hash="arizalar";return}location.hash="natijalar";setTimeout(()=>{$("#r-vac").value=id;renderResults()},0)}
function renderResults(){
  const sel=$("#r-vac"),cur=sel.value;
  const vs=[...S.vacs].sort((a,b)=>isClosed(b)-isClosed(a)||(b.createdAt||0)-(a.createdAt||0));
  sel.innerHTML=vs.map(v=>`<option value="${esc(v.id)}">${isClosed(v)?"✓ ":v.status==="cancelled"?"✕ ":"◷ "}${esc(v.title)} — ${esc(orgOf(v.orgId).name)}</option>`).join("");
  if(cur&&vs.some(v=>v.id===cur))sel.value=cur;
  const v=S.vacs.find(x=>x.id===sel.value),body=$("#r-body");
  if(!v){body.innerHTML=`<div class="empty">Hali vakansiya yo'q. Vakansiyalar e'lon qilingach, har biri bo'yicha reyting shu yerda chiqadi.</div>`;return}
  renderRanking(v,body,true);
}
$("#r-vac").addEventListener("change",renderResults);
function csvOf(v){
  const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';const d=v.decision||{};
  const lines=[["Kod","Holat","Test","Staj","Ko'nikma","Ma'lumot","Til","Jami ball","Sabab","Ariza vaqti"].map(q).join(";")];
  ranking(v).forEach(a=>lines.push([a.code,a.ok?(a.code===d.winner?"G'olib":a.code===d.reserve?"Zaxira":"Mos"):"Mos emas",a.s.t,a.s.e,Math.round(a.s.p),a.s.d,Math.round(a.s.l),a.ok?a.s.total:"",a.why.join("; "),dt(a.at)].map(q).join(";")));
  return "﻿"+lines.join("\r\n");
}
function renderRanking(v,body,isAdmin){
  const r=ranking(v),closed=isClosed(v),d=v.decision||{},o=orgOf(v.orgId),myCode=S.uid?codeFor(S.uid):null;let rank=0;
  const rows=r.map(a=>{let st;
    if(!a.ok)st=`<span class="pill out">Mos emas</span>`;else{rank++;st=closed&&a.code===d.winner?`<span class="pill win">G'olib</span>`:closed&&a.code===d.reserve?`<span class="pill res">Zaxira</span>`:closed&&(d.rejected||[]).some(x=>x.code===a.code)?`<span class="pill cancel">Rad etilgan</span>`:`<span class="pill rank">${rank}-o'rin</span>`}
    return `<tr class="${closed&&a.code===d.winner?"winner":""}${a.ok?"":" ineligible"}"><td class="mono">${esc(a.code)}${a.code===myCode?" <b>(siz)</b>":""}</td><td>${st}${a.ok?"":`<div class="why">${a.why.map(esc).join("; ")}</div>`}</td>
      <td class="num">${a.s.t}</td><td class="num">${a.s.e}</td><td class="num">${Math.round(a.s.p)}</td><td class="num">${a.s.d}</td><td class="num">${Math.round(a.s.l)}</td><td class="num"><b>${a.ok?a.s.total:"—"}</b></td><td class="mono" style="white-space:nowrap">${dt(a.at)}</td></tr>`}).join("");
  const snapOk=(d.snapshot||[]).filter(x=>x.ok),rej=d.rejected||[];
  const expected=snapOk.filter(x=>!rej.some(y=>y.code===x.code))[0];
  const match=closed?((expected?expected.code:null)===d.winner):null;
  const canReject=isAdmin&&closed&&d.winner&&rej.length<1;
  body.innerHTML=`<div class="panel stack" style="margin-bottom:14px">
     <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0">${esc(v.title)}</h2><div class="org">${esc(o.name)} · STIR <span class="mono">${esc(o.stir)}</span></div></div><div class="salary">${fmt(v.salary)}<small>so'm / oy</small></div></div>
     <div class="tags"><span class="tag">${EDU[v.edu]}+</span><span class="tag">staj ${v.exp}+ yil</span><span class="tag">test ${v.test}+</span><span class="tag">${(v.specs||[]).map(esc).join(" / ")}</span>${(v.req||[]).map(s=>`<span class="tag">● ${esc(s)}</span>`).join("")}${(v.pref||[]).map(s=>`<span class="tag">afzal: ${esc(s)}</span>`).join("")}</div>
     ${isAdmin?`<div class="btnrow">${r.length?`<button class="btn ghost" type="button" id="rkCsv">CSV nusxalash</button>`:""}${canReject?`<span id="rejBox"><button class="btn ghost" type="button" id="rkReject">G'olibni rad etish</button></span>`:""}</div>`:""}</div>
   ${r.length?`<div class="tablebox"><table class="wide"><thead><tr><th>Kod</th><th>Holat</th><th class="num">Test</th><th class="num">Staj</th><th class="num">Ko'nikma</th><th class="num">Ma'lumot</th><th class="num">Til</th><th class="num">Jami</th><th>Ariza vaqti</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="empty">Bu vakansiyaga hali ariza tushmagan.</div>`}
   <div class="audit">${v.status==="cancelled"?`Vakansiya bekor qilingan: ${dt(v.cancelledAt)}
Sabab: ${esc(v.cancelReason||"")}`:closed?`Tanlov yakunlandi: ${dt(d.at)}
Arizalar: ${d.total} · talablarga mos: ${d.eligible}
G'olib: ${esc(d.winner||"aniqlanmadi")}${d.winnerScore!=null?" ("+d.winnerScore+" ball)":""} · zaxira: ${esc(d.reserve||"—")}${rej.map(x=>`
Rad etilgan: ${esc(x.code)} — ${dt(x.at)}. Sabab: ${esc(x.reason)}`).join("")}
Qaror manbai: avtomatik formula · qo'lda tanlov: yo'q
Yakuniy qarorni tekshirish: ${match?"formula natijasiga mos keladi ✓":"farq bor — tekshirish kerak"}`:`Tanlov davom etmoqda · ${daysLeft(v)}
Hozirgi tartib oraliq natija. Muddat tugagach tizim g'olibni belgilaydi.`}</div>`;
  const csvB=body.querySelector("#rkCsv");
  if(csvB)csvB.onclick=async()=>{const t=csvOf(v);try{await navigator.clipboard.writeText(t);toast("CSV nusxalandi — Excel yoki Telegram'ga joylashtiring")}catch(e){toast("Nusxalab bo'lmadi")}};
  const rjB=body.querySelector("#rkReject");
  if(rjB)rjB.onclick=()=>{
    const box=body.querySelector("#rejBox");
    box.innerHTML=`<span class="inline"><input id="rejReason" placeholder="Rad etish sababi (kamida 20 belgi, hammaga ko'rinadi)"><button class="btn danger" type="button" data-yes>Rad etish</button><button class="btn ghost" type="button" data-no>Ortga</button></span>`;
    box.querySelector("[data-no]").onclick=()=>renderResults();
    box.querySelector("[data-yes]").onclick=async()=>{
      const reason=$("#rejReason").value.trim();if(reason.length<20){toast("Sababni kamida 20 belgi bilan yozing");return}
      const rest=snapOk.filter(x=>x.code!==d.winner&&!rej.some(y=>y.code===x.code));
      const nd={...d,rejected:[...rej,{code:d.winner,reason,at:Date.now()}],winner:rest[0]?rest[0].code:null,winnerUid:rest[0]?rest[0].uid:null,winnerScore:rest[0]?rest[0].total:null,reserve:rest[1]?rest[1].code:null,reserveUid:rest[1]?rest[1].uid:null};
      try{await S.db.doc("vacancies/"+v.id).update({decision:nd});await log("reject",`G'olib rad etildi: "${v.title}", ${d.winner}. Sabab: ${reason}. Yangi g'olib: ${nd.winner||"yo'q"}`);toast("O'rin zaxiradagi nomzodga o'tdi: "+(nd.winner||"nomzod qolmadi"))}catch(e){toast("Bajarib bo'lmadi")}
    };
  };
}

// ---------- static selects ----------
opts($("#f-region"),REGIONS,"Barcha hududlar");opts($("#f-sector"),SECTORS,"Barcha sohalar");
opts($("#p-region"),REGIONS);opts($("#p-edu"),EDU.map((t,i)=>({v:i,t})));opts($("#p-spec"),Object.keys(SPECS));
renderDraft();route();

// ---------- connect (Firestore) ----------
S.db=fs;document.body.classList.add("owner");
setInterval(()=>{if(S.role==="chief"&&["monitoring","foydalanuvchilar"].includes(location.hash.slice(1)))render()},30000);
let unsubs=[];
function unsubAll(){unsubs.forEach(u=>{try{u()}catch(e){}});unsubs=[]}
function subscribe(){
  unsubAll();if(!S.uid)return;
  const err=e=>{console.warn(e)};
  unsubs.push(fs.collection("orgs").onSnapshot(s=>{S.orgs=s.docs.map(d=>({id:d.id,...d.data()}));S.ready.orgs=true;render()},err));
  unsubs.push(fs.collection("vacancies").onSnapshot(s=>{S.vacs=s.docs.map(d=>({id:d.id,...d.data()}));S.ready.vacs=true;render()},err));
  unsubs.push(fs.collection("applications").onSnapshot(s=>{S.apps=s.docs.map(d=>({uid:d.id,...d.data()}));S.ready.apps=true;render()},err));
  unsubs.push(fs.doc("about/info").onSnapshot(s=>{S.about=s.exists?s.data():null;if(!abEditing)render()},err));
  unsubs.push(fs.doc("profiles/"+S.uid).onSnapshot(s=>{S.profile=s.exists?s.data():null;draftP.skills=null;draftP.langs=null;render()},err));
  if(S.isChief){
    unsubs.push(fs.collection("logins").onSnapshot(s=>{const m={};s.docs.forEach(d=>m[d.id]={uid:d.id,...d.data()});S.logins=m;render()},err));
    unsubs.push(fs.collection("failed").onSnapshot(s=>{S.failed=s.docs.map(d=>({id:d.id,...d.data()}));render()},err));
  }
  if(S.isAdmin){
    unsubs.push(fs.collection("contacts").onSnapshot(s=>{const c={};s.docs.forEach(d=>c[d.id]=d.data());S.contacts=c;render()},err));
    unsubs.push(fs.collection("audit").onSnapshot(s=>{S.audit=s.docs.map(d=>({id:d.id,...d.data()}));render()},err));
  }else{
    unsubs.push(fs.doc("contacts/"+S.uid).onSnapshot(s=>{S.contacts=s.exists?{[S.uid]:s.data()}:{};render()},err));
  }
}
auth.onAuthStateChanged(async u=>{
  unsubAll();
  if(!u){Object.assign(S,{uid:null,login:null,isAdmin:false,isChief:false,logins:{},failed:[],myLog:null,orgs:[],vacs:[],apps:[],contacts:{},audit:[],profile:null,loaded:true});
    if(S.role){S.role=null;location.hash=""}route();return}
  S.uid=u.uid;S.login=(u.email||"").split("@")[0];
  try{S.isChief=(await fs.doc("chiefs/"+u.uid).get()).exists}catch(e){S.isChief=false}
  try{S.isAdmin=S.isChief||(await fs.doc("admins/"+u.uid).get()).exists}catch(e){S.isAdmin=S.isChief}
  try{const g=await fs.doc("logins/"+u.uid).get();S.myLog=g.exists?g.data():null}catch(e){S.myLog=null}
  S.loaded=true;subscribe();
  if(pendingRole)enter(pendingRole);
  else{const r=recalled();if((r==="chief"&&S.isChief)||(r==="admin"&&S.isAdmin)||r==="applicant"){setRole(r);track("resume",r)}else route()}
});
})();
