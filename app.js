(function(){
// Sahifa (index.html) keshdan eski holda ochilgan bo'lsa, uni bir marta keshsiz qayta yuklaymiz
{const BUILD=12,m=document.querySelector('meta[name="ot-build"]');if(!m||+m.content!==BUILD){let again=false;try{again=sessionStorage.getItem("ot-fix-"+BUILD)==="1";sessionStorage.setItem("ot-fix-"+BUILD,"1")}catch(e){}
  if(!again){const u=new URL(location.href);u.searchParams.set("b",String(BUILD)+"."+Date.now().toString(36));location.replace(u.toString());return}
  document.getElementById("main").innerHTML='<div class="gate"><h1>Ilova yangilanmoqda</h1><p class="lede">Yangi versiya serverga tarqalmoqda. 2–3 daqiqadan keyin qayta oching.</p><div><button class="btn" type="button" onclick="try{sessionStorage.clear()}catch(e){};location.reload()">Qayta urinish</button></div></div>';return}}
if(typeof firebase==="undefined"){document.getElementById("main").innerHTML='<div class="gate"><h1>Internet aloqasi yo\'q</h1><p class="lede">OchiqTanlov ishlashi uchun internet kerak. Ulanishni tekshirib, ilovani qayta oching.</p></div>';return}

const REGIONS=["Toshkent sh.","Toshkent vil.","Andijon","Buxoro","Farg'ona","Jizzax","Xorazm","Namangan","Navoiy","Qashqadaryo","Qoraqalpog'iston","Samarqand","Sirdaryo","Surxondaryo"];
const EDU=["O'rta maxsus","Bakalavr","Magistr"]; const EDU_PTS=[60,80,100];
const SECTORS=["Ta'lim","Sog'liqni saqlash","IT","Moliya","Ishlab chiqarish","Davlat boshqaruvi"];
const SPECS={"Matematika o'qitish":"Ta'lim","Boshlang'ich ta'lim":"Ta'lim","Ingliz tili o'qitish":"Ta'lim","Hamshiralik ishi":"Sog'liqni saqlash","Davolash ishi":"Sog'liqni saqlash","Axborot tizimlari":"IT","Dasturiy injiniring":"IT","Buxgalteriya hisobi":"Moliya","Iqtisodiyot":"Moliya","Mexanika muhandisligi":"Ishlab chiqarish","Elektr ta'minoti":"Ishlab chiqarish","Huquqshunoslik":"Davlat boshqaruvi","Davlat boshqaruvi":"Davlat boshqaruvi"};
const SKILLS=["Excel","1C","Python","SQL","Web (HTML/JS)","Dars rejalash","Onlayn ta'lim","Birinchi yordam","Bemor parvarishi","AutoCAD","Elektr sxemalar","Hujjat yuritish","Fuqarolar bilan ishlash","Rahbarlik"];
const LANGS=["O'zbek","Rus","Ingliz","Koreys","Nemis"];
const ORG_TYPES=["Vazirlik / qo'mita","Hokimlik","Maktab / bog'cha","Oliy ta'lim muassasasi","Tibbiyot muassasasi","Davlat korxonasi","Boshqa davlat tashkiloti"];
const DAY=864e5;
// ---------- versiyalar ----------
const WEB_VER=12; // sayt kodi versiyasi: yangi fayllar yuklanganda oshiriladi
const APK_VER=(()=>{const q=new URLSearchParams(location.search).get("apk");if(q!=null){try{sessionStorage.setItem("ot-apk",q)}catch(e){}return +q||0}
  try{const s=sessionStorage.getItem("ot-apk");if(s!=null)return +s||0}catch(e){}return /; wv\)/.test(navigator.userAgent)?0:null})(); // null = oddiy brauzer
const FROM_PLAY=(()=>{const q=new URLSearchParams(location.search).get("play");if(q==="1"){try{sessionStorage.setItem("ot-play","1")}catch(e){}return true}try{return sessionStorage.getItem("ot-play")==="1"}catch(e){return false}})();
const PLAY_URL="https://play.google.com/store/apps/details?id=uz.ochiqtanlov.app";

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
const S={db:null,user:null,uid:null,canEdit:false,role:null,orgs:[],vacs:[],apps:[],contacts:{},audit:[],logins:{},failed:[],myLog:null,dl:null,profile:null,ready:{orgs:false,vacs:false,apps:false},loaded:false,adminDoc:null,admins:[],offers:[],appeals:[],results:{},questions:[],qkeys:{},attempts:[],myAttempt:null,face:null,testCfg:null};
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
const testOf=uid=>{const r=S.results[uid];return r&&typeof r.test==="number"?r.test:null};
function applicantsOf(v){
  const out=[];S.apps.forEach(doc=>{const it=(doc.items||{})[v.id];if(it&&!it.withdrawn)out.push({uid:doc.uid,code:doc.code,...it,test:testOf(doc.uid)})});return out;
}
function ranking(v){
  return applicantsOf(v).map(a=>{const why=check(v,a);return {...a,why,ok:!why.length,s:score(v,a)}})
    .sort((x,y)=>(y.ok-x.ok)||(y.s.total-x.s.total)||((y.test||0)-(x.test||0))||((x.at||0)-(y.at||0)));
}
const isClosed=v=>v.status==="closed";
const deadlinePassed=v=>(v.deadline||0)<=Date.now();
function daysLeft(v){if(isClosed(v))return "Yakunlangan";const ms=(v.deadline||0)-Date.now();if(ms<=0)return "Muddat tugagan, yakunlash kutilmoqda";if(ms<DAY){const h=Math.floor(ms/3600e3),m=Math.ceil((ms%3600e3)/60000);return (h?h+" soat ":"")+m+" daqiqa qoldi"}const d=Math.ceil(ms/DAY);return d+" kun qoldi"}
const orgOf=id=>S.orgs.find(o=>o.id===id)||{name:"Noma'lum tashkilot",stir:"—"};
// Ish beruvchi faqat o'ziga biriktirilgan tashkilotni ko'radi
const isEmp=()=>S.role==="admin";
const myOrgId=()=>isEmp()?((S.adminDoc||{}).org||null):null;
const VS=()=>isEmp()?S.vacs.filter(v=>v.orgId===myOrgId()):S.vacs;
// Amaldagi g'olib: yakuniy reytingdan rad etilganlar va voz kechganlar chiqariladi, o'rin keyingisiga o'tadi
function eff(v){
  const d=v.decision||{};if(!isClosed(v))return {winner:null,reserve:null,declined:[],rejected:[]};
  const rej=(d.rejected||[]).map(x=>x.code);
  const declinedOf=code=>{const doc=S.apps.find(a=>a.code===code);const it=doc&&(doc.items||{})[v.id];return !!(it&&it.declined)};
  const pool=(d.snapshot||[]).filter(x=>x.ok&&!rej.includes(x.code));
  const declined=pool.filter(x=>declinedOf(x.code)).map(x=>x.code);
  const live=pool.filter(x=>!declined.includes(x.code));
  return {winner:live[0]?live[0].code:null,winnerUid:live[0]?live[0].uid:null,reserve:live[1]?live[1].code:null,reserveUid:live[1]?live[1].uid:null,declined,rejected:rej};
}
const myTestStatus=()=>{const a=S.myAttempt,t=testOf(S.uid);if(t!=null)return {k:"done",t};if(a&&a.status==="running")return {k:"running"};if(a)return {k:"grading"};return {k:"none"}};

// ---------- routing ----------
const APP_TABS=[["vakansiyalar","Vakansiyalar"],["arizalar","Arizalarim"],["profil","Profil va test"],["statistika","Statistika"],["qoidalar","Qoidalar"],["haqida","Ilova haqida"]];
const EMP_TABS=[["boshqaruv","Boshqaruv"],["boshqaruv-vak","Vakansiyalar"],["arizalar-adm","Arizalar"],["natijalar","Natijalar"],["shikoyatlar","Shikoyatlar"],["statistika","Statistika"],["jurnal","Jurnal"],["qoidalar","Qoidalar"],["haqida","Ilova haqida"]];
const CHIEF_TABS=[["monitoring","Monitoring"],["kirishlar","Kirish-chiqish"],["foydalanuvchilar","Foydalanuvchilar"],["ish-beruvchilar","Ish beruvchilar"],["testlar","Test"]];
const CHIEF_ADM=[["boshqaruv","Boshqaruv"],["tashkilotlar","Tashkilotlar"],["boshqaruv-vak","Vakansiyalar"],["arizalar-adm","Arizalar"],["natijalar","Natijalar"],["shikoyatlar","Shikoyatlar"],["statistika","Statistika"],["jurnal","Jurnal"],["sozlamalar","Sozlamalar"],["qoidalar","Qoidalar"],["haqida","Ilova haqida"]];
APP_TABS.push(["sozlamalarim","Sozlamalar"],["kutish","Ish beruvchi so'rovi"]);EMP_TABS.push(["sozlamalarim","Sozlamalar"]);CHIEF_ADM.push(["sozlamalarim","Sozlamalar"]);
const ALL_VIEWS=["kutish","sozlamalarim","monitoring","kirishlar","foydalanuvchilar","ish-beruvchilar","testlar","gate","vakansiyalar","profil","arizalar","boshqaruv","tashkilotlar","boshqaruv-vak","arizalar-adm","natijalar","shikoyatlar","statistika","jurnal","sozlamalar","qoidalar","haqida","tekshir"];
// Ilova uch qismga bo'linadi; har qism ichida bo'limlar guruhlangan
const MODES=[["applicant","Bo'sh ish o'rinlari"],["admin","Ish beruvchi tashkilot"],["chief","Administrator"],["settings","Sozlamalar"]];
const GEAR='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const G_APP=[["Vakansiyalar",["vakansiyalar","arizalar"]],["Profil va test",["profil"]],["Ma'lumot",["statistika","qoidalar","haqida"]]];
const G_EMP=[["Vakansiyalar",["boshqaruv","boshqaruv-vak","arizalar-adm","natijalar"]],["Shikoyatlar",["shikoyatlar"]],["Hisobot",["statistika","jurnal"]],["Ma'lumot",["qoidalar","haqida"]]];
const G_CEMP=[["Vakansiyalar",["boshqaruv","boshqaruv-vak","arizalar-adm","natijalar"]],["Shikoyatlar",["shikoyatlar"]],["Tashkilotlar",["tashkilotlar","ish-beruvchilar"]]];
const G_CADM=[["Monitoring",["monitoring","kirishlar","foydalanuvchilar"]],["Test",["testlar"]],["Hisobot",["statistika","jurnal"]],["Tizim",["sozlamalar","qoidalar","haqida"]]];
const G_SET=[["Sozlamalar",["sozlamalarim"]]];
const TAB_LABEL={...Object.fromEntries(APP_TABS.concat(EMP_TABS,CHIEF_TABS,CHIEF_ADM)),sozlamalar:"Tizim sozlamalari"};
const inG=(G,t)=>G.some(g=>g[1].includes(t));
function curMode(t){if(t==="sozlamalarim")return "settings";if(t==="kutish")return "admin";if(S.role==="chief")return inG(G_CEMP,t)?"admin":"chief";return S.role}
function groupsFor(t){if(t==="sozlamalarim")return G_SET;if(t==="kutish")return [["Ish beruvchi so'rovi",["kutish"]]];if(S.role==="applicant")return G_APP;if(S.role==="admin")return G_EMP;return curMode(t)==="admin"?G_CEMP:G_CADM}
// Bo'lim nomlari: bosh administrator config/ui ichida o'zgartira oladi
const LBL=(k,d)=>{const L=((S.ui||{}).labels)||{};return (L[k]&&String(L[k]).trim())||d};
const MODE_ICON={applicant:'<path d="M11 4a7 7 0 1 0 4.2 12.6L20 21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',admin:'<path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',chief:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'};
function renderNav(t){
  const m=curMode(t);
  $("#modes").innerHTML=MODES.map(([k,l])=>`<button type="button" data-mode="${k}" aria-pressed="${k===m}"${k==="settings"?` class="gear"`:""}>${k==="settings"?GEAR:`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${MODE_ICON[k]}</svg>`}<span>${esc(LBL("m:"+k,l))}</span>${k==="admin"&&S.isChief&&(S.admins||[]).some(a=>!a.org)?` <span class="bdg">${(S.admins||[]).filter(a=>!a.org).length}</span>`:""}</button>`).join("");
  const G=groupsFor(t),gi=Math.max(0,G.findIndex(g=>g[1].includes(t)));
  const hide=m==="settings"||t==="kutish";$("#nav").hidden=hide;$("#sbNavCap").hidden=hide;
  const pend=S.isChief?(S.admins||[]).filter(a=>!a.org).length:0,bdg=n=>n?` <span class="bdg">${n}</span>`:"";
  $("#nav").innerHTML=`<div class="grp">${G.map((g,i)=>{const on=i===gi;
    return `<a class="g" href="#${g[1][0]}" ${on?'aria-current="page"':""}>${esc(LBL("g:"+g[0],g[0]))}${g[1].includes("ish-beruvchilar")?bdg(pend):""}</a>`+
      (on&&g[1].length>1?`<div class="sub">${g[1].map(k=>`<a href="#${k}" ${k===t?'aria-current="page"':""}>${esc(LBL("t:"+k,TAB_LABEL[k]))}${k==="ish-beruvchilar"?bdg(pend):""}</a>`).join("")}</div>`:"")}).join("")}</div>`;
  const c=S.contacts[S.uid]||{},nm=c.name||(S.profile||{}).name||S.login||"";
  $("#sbProf").innerHTML=`<span class="sb-ava">${esc((nm.trim()[0]||"?").toUpperCase())}</span><span class="sb-pt"><b>${esc(nm)}</b><small>${esc(S.login||"")} · ${esc(ROLE_UZ[S.role]||"")}</small></span>`;
  document.querySelectorAll("section.section").forEach(sec=>{const k=sec.id.slice(2),h=sec.querySelector("h1");if(!h)return;const L=(((S.ui||{}).labels||{})["t:"+k]||"").trim();
    if(L){if(!h.dataset.ov)h.dataset.orig=h.textContent;h.dataset.ov="1";h.textContent=L}else if(h.dataset.ov){h.textContent=h.dataset.orig;delete h.dataset.ov}});
}
function tabs(){return S.role==="chief"?CHIEF_TABS.concat(CHIEF_ADM):S.role==="admin"?EMP_TABS:APP_TABS}
function route(){
  let t=location.hash.slice(1);
  if(t.startsWith("tekshir"))t="tekshir";
  else if(!S.role)t="gate";else if(!tabs().some(x=>x[0]===t))t=tabs()[0][0];
  // ish beruvchi bosh administrator tasdiqlamaguncha (tashkilotga biriktirmaguncha) ichkariga kirmaydi
  if(S.role==="admin"&&!(S.adminDoc||{}).org&&!["sozlamalarim","qoidalar","haqida","tekshir"].includes(t))t="kutish";
  ALL_VIEWS.forEach(x=>{const el=document.getElementById("v-"+x);if(el)el.hidden=x!==t});
  $("#hdr").hidden=!S.role||t==="tekshir";
  document.body.classList.toggle("has-sb",!$("#hdr").hidden);$("#hdr").classList.remove("open");$("#sbBack").hidden=true;$("#sbToggle").setAttribute("aria-expanded","false");
  if(S.role&&t!=="tekshir")renderNav(t);
  render();
  if(S.role==="chief"&&typeof notifyReqs==="function")notifyReqs();
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
  document.body.classList.toggle("auth-code",mode==="code");
  $("#authRole").hidden=mode!=="code";$("#authBack").hidden=mode!=="code";
  if(mode==="code"){$("#c-code2-wrap").hidden=true;$("#c-code2").required=false;$("#c-code").value="";
    const ck=pendingRole==="chief"?"chief":"admin",cn=ck==="chief"?"bosh administrator":"ish beruvchi";
    $("#authTitle").textContent=ck==="chief"?"Bosh administrator kodi":"Ish beruvchi kodi";
    $("#c-note").textContent=(firebase.__demo&&!firebase.__demoHasCode(ck))?"Demo rejim: bu qurilmada hali "+cn+" kodi yo'q. Hozir kiritgan kodingiz "+cn+" kodi bo'lib qoladi — uni eslab qoling (kamida 6 belgi).":"Bu qismga kirish uchun "+cn+" kodini kiriting. Kod har safar shu qismga kirganingizda so'raladi.";
    $("#c-btn").textContent="Tasdiqlash";setTimeout(()=>$("#c-code").focus(),0)}
}
function openAuth(role,mode){
  pendingRole=role;document.body.classList.toggle("auth-admin",role==="admin"||role==="chief");
  const b=$("#authRole");b.className="role "+(role==="chief"?"chf":role==="admin"?"adm":"app");b.textContent=ROLE_UZ[role]||"";
  $("#roleStep").hidden=true;$("#authStep").hidden=false;$("#gateErr").hidden=true;
  showAuthMode(mode||"login");
}
function closeAuth(){$("#authStep").hidden=true;document.body.classList.remove("auth-admin","auth-code")}
$("#authBack").onclick=()=>{pendingRole=null;closeAuth();const r=S.prevRole||"applicant",h=S.prevHash;S.prevRole=null;S.prevHash=null;if(h)history.replaceState(null,"","#"+h);if(S.uid)setRole(r);else route()};
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
    const ref=fs.doc((ck==="chief"?"chiefs/":"admins/")+S.uid),had=ck==="chief"?S.isChief:!!S.adminDoc;
    if(had){await ref.update({code,at:Date.now()})}   // kodni server tekshiradi (Firestore qoidalari)
    else{await ref.set({code,login:S.login||"",at:Date.now()});
      S.isAdmin=true;if(ck==="chief")S.isChief=true;else S.adminDoc={code:"",login:S.login||"",at:Date.now()};subscribe();await log("code",ck==="chief"?"Bosh administrator kodni tasdiqlab kirdi":"Yangi ish beruvchi kodni tasdiqlab kirdi")}
    S.elev=ck;$("#c-code").value="";
    history.replaceState(null,"","#"+(ck==="chief"&&S.codeTarget!=="admin"?"monitoring":"boshqaruv"));S.codeTarget=null;
    btn.disabled=false;finishEnter(ck);toast(ROLE_UZ[ck]+" sifatida kirdingiz");
  }catch(e2){btn.disabled=false;fail(e2&&e2.code==="permission-denied"?"Kod noto'g'ri.":"Tekshirib bo'lmadi. Internet aloqasini tekshiring.")}
});
function enter(role){
  if(role==="admin"&&S.isChief)role="chief";
  if(role==="chief"&&!S.isChief){openAuth("chief","code");return}
  if(role==="admin"&&!S.isAdmin){openAuth("admin","code");return}
  finishEnter(role);
}
function finishEnter(role){pendingRole=null;S.prevRole=null;closeAuth();remember(role);setRole(role);track("login",role)}

function updateWho(){const r=S.role,o=r==="admin"&&myOrgId()?orgOf(myOrgId()).name:"";$("#whoami").textContent=r&&S.login?S.login+(o?" · "+o:""):""}
function setRole(r){
  S.role=r;
  $("#whoami").textContent=r&&S.login?S.login:"";
  document.body.classList.toggle("is-admin",r==="admin"||r==="chief");document.body.classList.toggle("is-chief",r==="chief");
  const b=$("#roleBadge");b.className="role "+(r==="chief"?"chf":r==="admin"?"adm":"app");b.textContent=ROLE_UZ[r]||"";
  updateWho();
  const cur=location.hash.slice(1);
  location.hash=r?(tabs().some(x=>x[0]===cur)?cur:tabs()[0][0]):"";route();
}
document.querySelectorAll(".rolecard").forEach(b=>b.onclick=()=>{
  $("#gateErr").hidden=true;const r=b.dataset.role;if(isLocked()&&S.uid){route();return}
  if(S.uid)enter(r);else openAuth(r,"login");
});
$("#modes").addEventListener("click",e=>{
  const b=e.target.closest("button[data-mode]");if(!b)return;const m=b.dataset.mode;
  const go=(r,h)=>{if(h)history.replaceState(null,"","#"+h);remember(r);if(S.role!==r){setRole(r);track("login",r)}else route()};
  if(m==="settings")return go(S.role,"sozlamalarim");
  if(m==="applicant"){S.elev=null;return go("applicant","vakansiyalar")}
  // Ish beruvchi: kod yo'q — so'rov yuboradi, bosh administrator ruxsat bergach kiradi
  if(m==="admin"&&!S.isChief){S.elev=null;if((S.adminDoc||{}).org)return go("admin","boshqaruv");return go("applicant","kutish")}
  // Administrator qismiga faqat bosh administrator kodi bilan, har kirishda
  if(S.elev==="chief"&&S.isChief)return go("chief",m==="admin"?"boshqaruv":"monitoring");
  S.codeTarget=m;S.prevRole=S.role;S.prevHash=location.hash.slice(1);S.role=null;location.hash="";openAuth("chief","code");route();
});
$("#btnSwitch").onclick=async()=>{await track("logout");const q=getQuick();setQuick({...(q&&q.uid===S.uid?q:{}),uid:S.uid,login:S.login,name:(S.contacts[S.uid]||{}).name||(q&&q.uid===S.uid?q.name:"")||"",role:S.role});remember(null);try{sessionStorage.removeItem(fgKey(S.uid))}catch(e){}S.role=null;S.elev=null;
  setLock(true);unsubAll();location.hash="";route()};
// ---------- FACE ID BILAN KIRISH (shu qurilmada avval login-parol bilan kirilgan akkaunt uchun) ----------
const QK="ot-quick",LK="ot-lock";
function getQuick(){try{return JSON.parse(localStorage.getItem(QK)||"null")}catch(e){return null}}
function setQuick(v){try{v?localStorage.setItem(QK,JSON.stringify(v)):localStorage.removeItem(QK)}catch(e){}}
function isLocked(){try{return localStorage.getItem(LK)==="1"}catch(e){return false}}
function setLock(v){try{v?localStorage.setItem(LK,"1"):localStorage.removeItem(LK)}catch(e){}}
async function fullSignOut(){S.elev=null;setLock(false);setQuick(null);try{sessionStorage.removeItem(fgKey(S.uid))}catch(e){}S.role=null;remember(null);try{await auth.signOut()}catch(e){}location.hash="";route()}
$("#qOther").onclick=fullSignOut;
$("#qFace").onclick=async()=>{
  const u=auth.currentUser;if(!u){fullSignOut();return}
  $("#qFace").disabled=true;
  const ok=await faceGate();
  $("#qFace").disabled=false;
  if(!ok){toast("Face ID tasdiqlanmadi. Qayta urinib ko'ring yoki login-parol bilan kiring");return}
  setLock(false);afterAuth(u,true);
};
$("#l-face").onclick=()=>{
  const q=getQuick(),e=$("#l-err");
  if(q&&auth.currentUser&&auth.currentUser.uid===q.uid){closeAuth();$("#qFace").click();return}
  e.textContent="Face ID bilan kirish uchun bu qurilmada avval bir marta login va parol bilan kiring. Keyingi safar \"Chiqish\"dan so'ng shu tugma orqali parolsiz kirasiz.";e.hidden=false;
};

// ---------- BOSH ADMIN: kirish-chiqish monitoringi ----------
const isAdm=()=>S.role==="admin"||S.role==="chief";
const ROLE_UZ={applicant:"Ish topshiruvchi",admin:"Ish beruvchi",chief:"Bosh administrator"};
const EV_UZ={login:"Kirdi",resume:"Qayta ochdi",logout:"Chiqdi",fail:"Noto'g'ri parol"};
const EV_PILL={login:"open",resume:"res",logout:"closed",fail:"out"};
function device(){
  const u=navigator.userAgent||"";
  const os=/Android/i.test(u)?"Android":/iPhone|iPad|iPod/i.test(u)?"iOS":/Windows/i.test(u)?"Windows":/Mac OS X/i.test(u)?"macOS":/CrOS/i.test(u)?"ChromeOS":/Linux/i.test(u)?"Linux":"Boshqa";
  const kind=/Mobi|Android|iPhone|iPod/i.test(u)?"Telefon":/iPad|Tablet/i.test(u)?"Planshet":"Kompyuter";
  const br=/Edg\//.test(u)?"Edge":/OPR\//.test(u)?"Opera":/YaBrowser/.test(u)?"Yandex":/Chrome\//.test(u)?"Chrome":/Firefox\//.test(u)?"Firefox":/Safari\//.test(u)?"Safari":"Brauzer";
  return {kind,os,br:APK_VER!=null?"OchiqTanlov ilova v"+(APK_VER||"6 yoki eski")+(FROM_PLAY?" (Play)":""):br};
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
  downloadCsv("kirish-chiqish.csv","\ufeff"+lines.join("\r\n"));
};

function renderUsers(){
  const uids=new Set([...Object.keys(S.contacts),...Object.keys(S.logins)]);
  const rows=[...uids].map(uid=>{const d=S.logins[uid]||{},ev=d.events||[],ins=ev.filter(e=>e.type==="login"||e.type==="resume");
    const roles=[...new Set(ev.map(e=>e.role).filter(Boolean))];const appDoc=S.apps.find(a=>a.uid===uid);
    return {uid,login:d.login||"",name:nameOf(uid),phone:(S.contacts[uid]||{}).phone||"",roles,first:ev.length?Math.min(...ev.map(e=>e.t)):null,last:ins.length?Math.max(...ins.map(e=>e.t)):null,count:ins.length,fails:ev.filter(e=>e.type==="fail").length,online:isOnline(d),seen:d.lastSeen,apps:appDoc?Object.values(appDoc.items||{}).filter(i=>!i.withdrawn).length:0}});
  const q=$("#u-q").value.trim().toLowerCase(),rf=$("#u-role").value;
  const list=rows.filter(r=>(!rf||r.roles.includes(rf))&&(!q||r.login.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)||r.phone.includes(q))).sort((a,b)=>(b.online-a.online)||((b.seen||0)-(a.seen||0)));
  $("#u-count").textContent=list.length+" ta foydalanuvchi";
  $("#u-body").innerHTML=list.length?`<div class="tablebox"><table class="wide"><thead><tr><th>Holat</th><th>Login</th><th>F.I.Sh.</th><th>Telefon</th><th>Rollar</th><th>Birinchi kirish</th><th>Oxirgi kirish</th><th class="num">Kirishlar</th><th class="num">Xato parol</th><th class="num">Arizalar</th><th>Face ID</th></tr></thead><tbody>`+
    list.map(r=>`<tr><td style="white-space:nowrap"><span class="dot ${r.online?"on":""}"></span>${r.online?"Onlayn":ago(r.seen)}</td><td class="mono">${esc(r.login||"—")}</td><td>${esc(r.name||"—")}</td><td class="mono">${esc(r.phone||"—")}</td><td>${r.roles.map(x=>`<span class="tag">${esc(ROLE_UZ[x]||x)}</span>`).join(" ")||"—"}</td><td class="mono">${dt(r.first)}</td><td class="mono">${dt(r.last)}</td><td class="num">${r.count}</td><td class="num" style="${r.fails?"color:var(--bad)":""}">${r.fails}</td><td class="num">${r.apps}</td><td>${(S.faces||[]).some(f=>f.id===r.uid)?`<button class="btn ghost" type="button" data-ufr="${esc(r.uid)}">Tiklash</button>`:`<span class="note">yo'q</span>`}</td></tr>`).join("")+`</tbody></table></div>`
    :`<div class="empty">Hali ro'yxatdan o'tgan foydalanuvchi yo'q.</div>`;
}
["u-q","u-role"].forEach(id=>document.getElementById(id).addEventListener("input",renderUsers));
$("#u-body").addEventListener("click",async e=>{const id=e.target.getAttribute&&e.target.getAttribute("data-ufr");if(!id)return;e.target.disabled=true;
  try{await fs.doc("faces/"+id).delete();await log("test",`Face ID tiklandi: ${(S.contacts[id]||{}).login||id}`);toast("Face ID tiklandi: keyingi kirishda qayta ro'yxatga olinadi")}catch(x){toast("Bajarib bo'lmadi");e.target.disabled=false}});


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


// ---------- BOSH ADMIN: ISH BERUVCHILAR ----------
function renderEmployers(){
  const list=[...S.admins].sort((a,b)=>(!!a.org-!!b.org)||((b.at||0)-(a.at||0))),np=list.filter(a=>!a.org).length;
  $("#eb-count").textContent=list.length+" ta ish beruvchi · "+np+" ta so'rov ruxsat kutmoqda";
  if(!list.length){$("#eb-body").innerHTML=`<div class="empty">Hali so'rov yo'q. Ish beruvchi ro'yxatdan o'tib, "Ish beruvchi tashkilot" qismida so'rov yuborsa, shu yerda chiqadi.</div>`;return}
  const norm=x=>(x||"").toLowerCase().replace(/[^a-z0-9а-яё]+/g,"");
  const guess=a=>{if(a.org)return a.org;const n=norm(a.orgReq);if(!n)return "";const o=S.orgs.find(o=>norm(o.name)===n)||S.orgs.find(o=>norm(o.name).includes(n)||n.includes(norm(o.name)));return o?o.id:""};
  const orgOpts=sel=>`<option value="">— tashkilot tanlang —</option>`+[...S.orgs].sort((a,b)=>a.name.localeCompare(b.name)).map(o=>`<option value="${esc(o.id)}" ${o.id===sel?"selected":""}>${esc(o.name)}</option>`).join("");
  $("#eb-body").innerHTML=`<div class="tablebox"><table class="wide"><thead><tr><th>Ish beruvchi</th><th>So'ragan tashkiloti</th><th>So'rov vaqti</th><th>Ruxsat</th><th></th></tr></thead><tbody>`+
    list.map(a=>{const c=S.contacts[a.uid]||{};return `<tr${a.org?"":' class="row-pend"'}><td><b>${esc(a.name||c.name||"—")}</b><div class="note mono">${esc(a.login||"—")} · ${esc(a.phone||c.phone||"—")}</div></td>
      <td>${esc(a.orgReq||"—")}${a.posReq?`<div class="note">${esc(a.posReq)}</div>`:""}</td><td class="mono">${dt(a.at)}</td>
      <td><div class="inline"><select data-org="${esc(a.uid)}">${orgOpts(guess(a))}</select><button class="btn ${a.org?"ghost":""}" type="button" data-asg="${esc(a.uid)}">${a.org?"O'zgartirish":"Ruxsat berish"}</button></div>${a.org?`<div class="note"><span class="pill open">Ruxsat berilgan</span></div>`:`<div class="note"><span class="pill out">Ruxsat kutmoqda</span> — tizimga kira olmaydi. Tashkilot ro'yxatda bo'lmasa, avval <a href="#tashkilotlar">Tashkilotlar</a> bo'limida qo'shing.</div>`}</td>
      <td><span><button class="btn ghost" type="button" data-rv="${esc(a.uid)}">${a.org?"Huquqni olish":"Rad etish"}</button></span></td></tr>`}).join("")+`</tbody></table></div>`;
  $("#eb-body").querySelectorAll("[data-asg]").forEach(b=>b.onclick=async()=>{
    const uid=b.dataset.asg,org=document.querySelector(`select[data-org="${uid}"]`).value,a=S.admins.find(x=>x.uid===uid),o=org?orgOf(org):null;
    b.disabled=true;
    if(!org&&!a.org){toast("Avval tashkilotni tanlang");b.disabled=false;return}
    try{await fs.doc("admins/"+uid).update({org:org||"",orgName:o?o.name:"",assignedAt:Date.now(),assignedBy:S.uid});
      await log("assign",org?`Ish beruvchi ${a.login} → ${o.name}`:`Ish beruvchi ${a.login} tashkilotdan ajratildi`,org||null);toast(org?(a.org?"O'zgartirildi":"Ruxsat berildi"):"Ajratildi")}catch(e){toast("Bajarib bo'lmadi: Firestore qoidalarini yangilang");b.disabled=false}});
  $("#eb-body").querySelectorAll("[data-rv]").forEach(b=>b.onclick=()=>{
    const uid=b.dataset.rv,a=S.admins.find(x=>x.uid===uid),cell=b.parentElement;
    cell.innerHTML=`<span class="confirm">${esc(a.login)} ${a.org?"ish beruvchi huquqidan mahrum qilinsinmi?":"so'rovi rad etilsinmi?"} <button class="btn danger" type="button" data-yes>Ha</button><button class="btn ghost" type="button" data-no>Yo'q</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderEmployers();
    cell.querySelector("[data-yes]").onclick=async()=>{try{await fs.doc("admins/"+uid).delete();await log("revoke",`Ish beruvchi huquqi olindi: ${a.login}`,a.org||null);toast("Huquq olindi")}catch(e){toast("Bajarib bo'lmadi")}};
  });
}

// ---------- SHIKOYATLAR ----------
function renderAppeals(){
  const st=$("#sh-st").value,chief=S.role==="chief";
  $("#sh-lede").textContent=chief?"Tanlov natijasi e'lon qilingach, ishtirokchi 3 kun ichida shikoyat yozishi mumkin. Shikoyatga faqat siz javob berasiz. Asosli bo'lsa, \"Natijalar\" bo'limida g'olibni rad etishingiz mumkin.":"Tashkilotingiz tanlovlari bo'yicha shikoyatlar. Ularga bosh administrator javob beradi — bu yerda faqat kuzatasiz.";
  const list=S.appeals.filter(a=>(chief||a.orgId===myOrgId())&&(!st||a.status===st)).sort((a,b)=>(a.status==="open"?0:1)-(b.status==="open"?0:1)||(b.at||0)-(a.at||0));
  const box=$("#sh-body");
  if(!list.length){box.innerHTML=`<div class="empty">${st==="open"?"Javob kutayotgan shikoyat yo'q.":"Shikoyat topilmadi."}</div>`;return}
  box.innerHTML=`<div class="vlist">`+list.map(a=>{const v=S.vacs.find(x=>x.id===a.vacId)||{title:"(o'chirilgan vakansiya)"},st2=v.decision?standing(v,a.code):null;
    return `<article class="vac"><div class="top"><div><h3>${esc(v.title)}</h3><div class="org">${esc(orgOf(v.orgId).name)}</div></div><span class="pill ${APPEAL_PILL[a.status]||"rank"}">${APPEAL_UZ[a.status]||a.status}</span></div>
      <div class="note">Kod <b class="mono">${esc(a.code)}</b> · ${dt(a.at)}${st2&&st2.row?` · natijasi: ${esc(st2.status)}${st2.row.ok?", "+st2.row.total+" ball":""}`:""}</div>
      <p style="margin:0;white-space:pre-line">${esc(a.text)}</p>
      ${a.answer?`<div class="appeal"><b>Javob</b> <span class="note">${dt(a.answeredAt)}</span><p>${esc(a.answer)}</p></div>`:""}
      ${chief&&a.status==="open"?`<div class="stack" data-apbox="${esc(a.id)}"><label>Javob (kamida 10 belgi, ishtirokchi va ish beruvchiga ko'rinadi)<textarea rows="3" maxlength="1500" id="ans-${esc(a.id)}"></textarea></label><div class="btnrow"><button class="btn" type="button" data-ans="accepted" data-id="${esc(a.id)}">Qanoatlantirish</button><button class="btn ghost" type="button" data-ans="rejected" data-id="${esc(a.id)}">Rad etish</button>${v.id?`<button class="linkbtn" type="button" data-goto="${esc(v.id)}">Natijani ochish →</button>`:""}</div>${aiAppealHtml(a.id)}</div>`:""}
    </article>`}).join("")+`</div>`;
  box.querySelectorAll("[data-ans]").forEach(b=>b.onclick=async()=>{
    const id=b.dataset.id,answer=document.getElementById("ans-"+id).value.trim(),a=S.appeals.find(x=>x.id===id);
    if(answer.length<10){toast("Javobni kamida 10 belgi bilan yozing");return}
    b.disabled=true;
    try{await fs.doc("appeals/"+id).update({status:b.dataset.ans,answer,answeredAt:Date.now(),answeredBy:S.uid});
      await log("appeal",`Shikoyat (${a.code}) ${b.dataset.ans==="accepted"?"qanoatlantirildi":"rad etildi"}: ${answer}`,a.orgId);toast("Javob yuborildi")}catch(e){toast("Bajarib bo'lmadi");b.disabled=false}});
  box.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>openResult(b.dataset.goto));
  box.querySelectorAll("[data-aiap]").forEach(b=>b.onclick=()=>aiAppeal(b.dataset.aiap));
  box.querySelectorAll("[data-aiuse]").forEach(b=>b.onclick=()=>{const r=AI.appeal[b.dataset.aiuse],ta=document.getElementById("ans-"+b.dataset.aiuse);if(r&&ta){ta.value=r.draft.slice(0,1500);ta.focus()}});
}
document.getElementById("sh-st").addEventListener("input",renderAppeals);

// ---------- OCHIQ STATISTIKA ----------
function renderStats(){
  const V=S.vacs,closed=V.filter(isClosed),apps=V.flatMap(v=>applicantsOf(v));
  const sal=V.filter(v=>v.salary).map(v=>v.salary),avgSal=sal.length?Math.round(sal.reduce((a,b)=>a+b,0)/sal.length):0;
  const winScores=closed.map(v=>{const s=(v.decision&&v.decision.snapshot||[]).filter(x=>x.ok)[0];return s?s.total:null}).filter(x=>x!=null);
  const avgWin=winScores.length?Math.round(10*winScores.reduce((a,b)=>a+b,0)/winScores.length)/10:"—";
  const perVac=V.length?Math.round(10*apps.length/V.length)/10:0;
  $("#st-kpis").innerHTML=`<div class="kpi"><span>Davlat tashkilotlari</span><b>${S.orgs.length}</b></div><div class="kpi"><span>Jami vakansiyalar</span><b>${V.length}</b></div><div class="kpi"><span>Hozir ochiq</span><b>${V.filter(v=>v.status==="open"&&!deadlinePassed(v)).length}</b></div><div class="kpi"><span>Yakunlangan tanlovlar</span><b>${closed.length}</b></div><div class="kpi"><span>Jami arizalar</span><b>${apps.length}</b></div><div class="kpi"><span>Bir o'ringa ariza</span><b>${perVac}</b></div><div class="kpi"><span>O'rtacha maosh, so'm</span><b style="font-size:20px">${fmt(avgSal)}</b></div><div class="kpi"><span>G'oliblarning o'rtacha bali</span><b>${avgWin}</b></div><div class="kpi"><span>Qo'lda tanlangan nomzod</span><b>0</b></div>`;
  const by=(arr,key)=>{const m={};arr.forEach(x=>{const k=key(x);if(k!=null)m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const avg={};V.forEach(v=>{(avg[v.sector]=avg[v.sector]||[]).push(v.salary||0)});
  const avgRows=Object.entries(avg).map(([k,a])=>[k,Math.round(a.reduce((s,x)=>s+x,0)/a.length)]).sort((a,b)=>b[1]-a[1]);
  const comp=Object.entries(V.reduce((m,v)=>{(m[v.sector]=m[v.sector]||[0,0]);m[v.sector][0]++;m[v.sector][1]+=applicantsOf(v).length;return m},{})).map(([k,[n,a]])=>[k,Math.round(10*a/n)/10]).sort((a,b)=>b[1]-a[1]);
  $("#st-grid").innerHTML=`<div class="panel stack"><h2>Hududlar bo'yicha vakansiyalar</h2>${bars(by(V,v=>v.region))}</div>
    <div class="panel stack"><h2>Sohalar bo'yicha vakansiyalar</h2>${bars(by(V,v=>v.sector))}</div>
    <div class="panel stack"><h2>O'rtacha maosh, so'm</h2>${bars(avgRows,fmt)}</div>
    <div class="panel stack"><h2>Raqobat: bir o'ringa ariza (soha bo'yicha)</h2>${bars(comp)}</div>
    <div class="panel stack"><h2>Arizachilarning ma'lumoti</h2>${bars(by(apps,a=>EDU[a.edu]))}</div>
    <div class="panel stack"><h2>Tashkilot turlari bo'yicha vakansiyalar</h2>${bars(by(V,v=>(S.orgs.find(o=>o.id===v.orgId)||{}).type||null))}</div>`;
}

// ---------- render dispatcher ----------
function render(){
  let t=location.hash.slice(1);
  if(t.startsWith("tekshir")){renderVerify();return}
  if(!S.role){renderGate();return}
  if(S.role==="admin"&&!(S.adminDoc||{}).org&&!["sozlamalarim","qoidalar","haqida"].includes(t))t="kutish";
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
  if(t==="ish-beruvchilar")renderEmployers();
  if(t==="shikoyatlar")renderAppeals();
  if(t==="statistika")renderStats();
  if(t==="testlar")renderTestAdmin();
  if(t==="qoidalar"){}
  if(t==="sozlamalarim")renderMySettings();
  if(t==="kutish")renderRequest();
}
// ---------- ISH BERUVCHI SO'ROVI (kodsiz; bosh administrator ruxsat beradi) ----------
function renderRequest(){
  const c=S.contacts[S.uid]||{},a=S.adminDoc,req=!!a&&!a.org;
  $("#kt-form").hidden=!!a;$("#kt-wait").hidden=!req;
  if(!a){$("#kt-name").textContent=c.name||S.login||"";return}
  $("#kt-info").innerHTML=`<dt>Login</dt><dd class="mono">${esc(S.login||"")}</dd><dt>F.I.Sh.</dt><dd>${esc(a.name||c.name||"—")}</dd><dt>Tashkilot</dt><dd>${esc(a.orgReq||"—")}</dd><dt>Lavozim</dt><dd>${esc(a.posReq||"—")}</dd><dt>So'rov vaqti</dt><dd class="mono">${a.at?dt(a.at):"—"}</dd><dt>Holat</dt><dd><span class="pill rank">Ruxsat kutilmoqda</span></dd>`;
}
$("#kt-form").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#kt-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;
  const org=$("#kt-org").value.trim(),pos=$("#kt-pos").value.trim();if(org.length<3)return fail("Tashkilot nomini to'liq yozing.");
  const c=S.contacts[S.uid]||{},btn=$("#kt-send");btn.disabled=true;
  const d={login:S.login||"",name:c.name||"",phone:c.phone||"",orgReq:org.slice(0,120),posReq:pos.slice(0,80),at:Date.now()};
  try{await fs.doc("admins/"+S.uid).set(d);S.adminDoc=d;S.isAdmin=false;subscribe();toast("So'rov bosh administratorga yuborildi");render()}
  catch(e2){fail(e2&&e2.code==="permission-denied"?"So'rov yuborib bo'lmadi: Firestore qoidalarini yangilash kerak.":"Internet aloqasini tekshiring.")}
  btn.disabled=false;
});
$("#kt-cancel").onclick=async()=>{const b=$("#kt-cancel");
  if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Bekor qilish uchun yana bosing";setTimeout(()=>{delete b.dataset.sure;b.textContent="So'rovni bekor qilish"},5000);return}
  delete b.dataset.sure;b.disabled=true;try{await fs.doc("admins/"+S.uid).delete();S.adminDoc=null;subscribe();toast("So'rov bekor qilindi");render()}catch(e){toast("Bajarib bo'lmadi")}b.disabled=false;b.textContent="So'rovni bekor qilish"};

function renderGate(){
  const q=getQuick(),locked=isLocked()&&S.uid&&q&&q.uid===S.uid;
  $("#quickBox").hidden=!locked;$("#roleStep").hidden=true;
  const coding=!!pendingRole&&!$("#codeForm").hidden;
  if(!S.uid&&coding){pendingRole=null;showAuthMode("login")}
  if(!S.uid&&$("#loginForm").hidden&&$("#regForm").hidden&&$("#resetForm").hidden)showAuthMode("login");
  $("#authStep").hidden=locked||(!!S.uid&&!coding)||!S.loaded;
  if(!S.uid)document.body.classList.remove("auth-admin");
  if(locked){$("#qName").textContent=q.name||q.login;$("#qMeta").textContent=" "+q.login+(q.role?" · "+(ROLE_UZ[q.role]||""):"");$("#qAva").textContent=((q.name||q.login||"?").trim()[0]||"?").toUpperCase();$("#gateBanner").innerHTML="";return}
  const b=$("#gateBanner");
  const demo="";
  if(!S.loaded){b.innerHTML=demo+`<p class="note">Serverga ulanmoqda…</p>`;return}
  b.innerHTML=demo+(S.uid?(pendingRole?"":`<p class="note">Kirilmoqda…</p>`):"");
}

// ---------- SOZLAMALAR (har bir foydalanuvchi) ----------
const THK="ot-theme";
function applyTheme(){let th="auto";try{th=localStorage.getItem(THK)||"auto"}catch(e){}
  if(th==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",th);
  document.querySelectorAll("#st-theme button").forEach(b=>b.setAttribute("aria-selected",b.dataset.th===th?"true":"false"));return th}
applyTheme();
$("#st-theme").addEventListener("click",e=>{const b=e.target.closest("button[data-th]");if(!b)return;try{localStorage.setItem(THK,b.dataset.th)}catch(er){}applyTheme()});
function renderMySettings(){
  const c=S.contacts[S.uid]||{};
  $("#st-acc").innerHTML=`<dt>Login</dt><dd class="mono">${esc(S.login||"—")}</dd><dt>F.I.Sh.</dt><dd>${esc(c.name||(S.profile||{}).name||"—")}</dd><dt>Telefon</dt><dd class="mono">${esc(c.phone||"—")}</dd><dt>Huquqlar</dt><dd>${["Ish topshiruvchi"].concat(S.isAdmin&&!S.isChief?["Ish beruvchi"]:S.adminDoc&&!S.isChief?["Ish beruvchi (ruxsat kutilmoqda)"]:[]).concat(S.isChief?["Bosh administrator"]:[]).join(", ")}</dd>`;
  $("#st-app").innerHTML=`<dt>Sayt versiyasi</dt><dd class="mono">${WEB_VER}</dd><dt>Qurilma</dt><dd>${APK_VER==null?"Brauzer":"Android ilova · APK v"+(APK_VER||"6 yoki eski")}</dd>`;
  $("#st-sys").hidden=!S.isChief;
  fs.doc("faces/"+S.uid).get().then(g=>{$("#st-face").textContent=g.exists?"Yuzingiz ro'yxatga olingan. Har kirishda u bilan solishtiriladi.":"Yuz hali ro'yxatga olinmagan."}).catch(()=>{});
  applyTheme();
}
$("#st-sys").onclick=e=>{e.preventDefault();$("#modes button[data-mode=chief]").click()};
$("#st-out").onclick=()=>$("#btnSwitch").click();
$("#st-pass").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#sp-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;$("#sp-ok").textContent="";
  const o=$("#sp-old").value,p=$("#sp-1").value,p2=$("#sp-2").value;const pp=passProblem(p,p2);if(pp)return fail(pp);
  if(o===p)return fail("Yangi parol eskisidan farq qilsin.");
  const u=auth.currentUser,btn=$("#sp-btn");if(!u)return;btn.disabled=true;
  try{await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,o));await u.updatePassword(p);
    ["sp-old","sp-1","sp-2"].forEach(id=>$("#"+id).value="");$("#sp-ok").textContent="Parol yangilandi";toast("Parol yangilandi");log("pass","Parolini o'zgartirdi").catch(()=>{})}
  catch(e2){fail(/wrong-password|invalid-credential|invalid-login/.test((e2&&e2.code)||"")?"Hozirgi parol noto'g'ri.":authMsg(e2))}
  btn.disabled=false;
});
$("#st-reface").onclick=async()=>{
  if(!confirm("Face ID qayta ro'yxatga olinadi. Kamera ochiladi va yuzingiz yangidan saqlanadi. Davom etasizmi?"))return;
  const btn=$("#st-reface");btn.disabled=true;
  try{await fs.doc("faces/"+S.uid).delete();try{sessionStorage.removeItem(fgKey(S.uid))}catch(e){}
    const ok=await faceGate();toast(ok?"Face ID yangilandi":"Face ID ro'yxatga olinmadi — keyingi kirishda so'raladi");renderMySettings()}
  catch(e){toast("Bajarib bo'lmadi. Internet aloqasini tekshiring.")}
  btn.disabled=false;
};

// ---------- APPLICANT ----------
const myDoc=()=>S.apps.find(d=>d.uid===S.uid);
const myItems=()=>(myDoc()||{}).items||{};
function profileReady(){const p=S.profile;return p&&p.name&&p.spec!=null}
const myView=()=>({...(S.profile||{}),test:testOf(S.uid)});

function renderVacs(){
  const fr=$("#f-region").value,fs=$("#f-sector").value,fm=+$("#f-min").value||0,so=$("#f-sort").value,onlyFit=$("#f-fit").checked;
  const box=$("#vlist");
  if(!S.ready.vacs){box.innerHTML=`<div class="empty">Vakansiyalar yuklanmoqda…</div>`;return}
  const p=myView();
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
    if(closed){const me=myDoc(),win=eff(v).winner;
      fitHtml=`<div class="fit"><b>Tanlov yakunlangan</b>${win?"G'olib kodi: <span class='mono'>"+esc(win)+"</span>":"Mos nomzod topilmadi"}${applied&&me?(win===me.code?" — bu siz!":" — natijangiz reytingda"):""}</div>`;
      btn=`<button class="btn ghost" type="button" data-res="${esc(v.id)}">Reyting</button>`}
    else if(!profileReady()){fitHtml=`<div class="fit"><b>Profil to'ldirilmagan</b>Mosligingizni ko'rish uchun avval profilni saqlang va testni topshiring.</div>`;btn=`<a class="btn ghost" href="#profil" style="text-decoration:none;font-weight:600;padding:9px 14px;border-radius:8px;border:1px solid var(--line);color:var(--ink)">Profilga o'tish</a>`}
    else{const why=check(v,p);
      fitHtml=why.length?`<div class="fit no"><b>Talablarga mos emas</b>${why.map(esc).join("; ")}</div>`:`<div class="fit ok"><b>Siz mos kelasiz</b>Taxminiy ballingiz: <span class="mono">${score(v,p).total}</span></div>`;
      btn=applied?`<button class="btn ghost" type="button" disabled>Ariza yuborilgan</button>`:deadlinePassed(v)?`<button class="btn ghost" type="button" disabled>Muddat tugagan</button>`:`<button class="btn" type="button" data-apply="${esc(v.id)}" ${why.length?"disabled":""}>Ariza topshirish</button>`}
    return `<article class="vac">
      <div class="top"><div><h3>${esc(v.title)}</h3><div class="org">${esc(o.name)}</div></div><div class="salary">${fmt(v.salary)}<small>so'm / oy</small></div></div>
      <div class="tags"><span class="tag">${esc(v.region)}</span><span class="tag">${esc(v.sector)}</span><span class="tag">${EDU[v.edu]}+</span><span class="tag">staj ${v.exp}+ yil</span><span class="tag">test ${v.test}+</span>${(v.req||[]).map(s=>`<span class="tag" title="majburiy">● ${esc(s)}</span>`).join("")}</div>
      ${v.desc?`<details class="vdesc"><summary>Lavozim tavsifi</summary><p>${esc(v.desc)}</p></details>`:""}
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
  if(writing)return;const v=S.vacs.find(x=>x.id===vid),p=myView();
  if(!v||!p||check(v,p).length||isClosed(v)||deadlinePassed(v))return;
  writing=true;btn.disabled=true;
  try{
    const items={...myItems()};
    items[vid]={edu:p.edu,spec:p.spec,exp:p.exp||0,skills:[...(p.skills||[])],langs:[...(p.langs||[])],at:Date.now()};
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
  const ts=myTestStatus();
  $("#p-test").innerHTML=ts.k==="done"?`<b>${ts.t}</b> / 100`:ts.k==="grading"?(S.myAttempt.status==="terminated"?`<span style="color:var(--bad)">To'xtatilgan</span>`:"Hisoblanmoqda…"):ts.k==="running"?"Davom etmoqda":"topshirilmagan";
  renderTestPanel();
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
let myRankId=null;
const APPEAL_DAYS=3;
const appealOf=vid=>S.appeals.find(x=>x.vacId===vid&&x.uid===S.uid);
const APPEAL_UZ={open:"Javob kutilmoqda",accepted:"Qanoatlantirildi",rejected:"Rad etildi"};
const APPEAL_PILL={open:"res",accepted:"win",rejected:"out"};
function renderMyApps(){
  const box=$("#myapps"),items=myItems(),ids=Object.keys(items).filter(k=>!items[k].withdrawn);
  if(!ids.length){box.innerHTML=`<div class="empty">Siz hali ariza topshirmagansiz. "Vakansiyalar" bo'limidan o'zingizga ma'qul ish o'rnini tanlang.</div>`;$("#myrank").innerHTML="";return}
  const code=codeFor(S.uid);
  ids.sort((a,b)=>(items[b].at||0)-(items[a].at||0));
  box.innerHTML=`<div class="vlist">`+ids.map(id=>{
    const v=S.vacs.find(x=>x.id===id),it=items[id];if(!v)return `<article class="vac"><p class="note">Bu vakansiya o'chirilgan.</p></article>`;
    const r=ranking(v),me=r.find(x=>x.uid===S.uid),pos=r.filter(x=>x.ok).findIndex(x=>x.uid===S.uid)+1,e=eff(v),d=v.decision||{};
    let st,extra="",acts=[];
    if(v.status==="cancelled")st=`<span class="pill cancel">Bekor qilingan</span>`,extra=`<div class="why" style="color:var(--warn)">Sabab: ${esc(v.cancelReason||"")}</div>`;
    else if(isClosed(v)){
      if(it.declined)st=`<span class="pill cancel">Voz kechdingiz</span>`;
      else if(e.winner===code){st=`<span class="pill win">G'olib</span>`;
        extra=it.accepted?`<div class="offer ok"><b>Taklifni qabul qildingiz.</b> Ism va telefoningiz tashkilotga yuborildi — ular siz bilan bog'lanadi.</div>`
          :`<div class="offer"><b>Tabriklaymiz, tizim sizni g'olib deb topdi!</b> Taklifni qabul qilsangiz, ismingiz va telefoningiz tashkilotga yuboriladi. Voz kechsangiz, o'rin zaxiradagi nomzodga o'tadi.<div class="btnrow" data-offer="${esc(id)}"><button class="btn" type="button" data-acc="${esc(id)}">Taklifni qabul qilaman</button><button class="btn ghost" type="button" data-dec="${esc(id)}">Voz kechaman</button></div></div>`}
      else if(e.reserve===code)st=`<span class="pill res">Zaxira</span>`,extra=`<div class="note">G'olib voz kechsa yoki rad etilsa, o'rin avtomatik sizga o'tadi.</div>`;
      else st=me&&me.ok?`<span class="pill rank">${pos}-o'rin</span>`:`<span class="pill out">Mos emas</span>`;
      const ap=appealOf(id),canAp=!ap&&e.winner!==code&&Date.now()-(d.at||0)<APPEAL_DAYS*DAY;
      if(ap)extra+=`<div class="appeal"><div class="btnrow" style="justify-content:space-between"><b>Shikoyatingiz</b><span class="pill ${APPEAL_PILL[ap.status]||"rank"}">${APPEAL_UZ[ap.status]||ap.status}</span></div><p>${esc(ap.text)}</p>${ap.answer?`<p class="note"><b>Javob:</b> ${esc(ap.answer)}</p>`:""}</div>`;
      if(canAp)acts.push(`<button class="btn ghost" type="button" data-ap="${esc(id)}">Shikoyat yozish</button>`);
      acts.push(`<button class="btn ghost" type="button" data-cert="${esc(id)}">Guvohnoma</button>`);
    }
    else st=me&&me.ok?`<span class="pill open">Hozir ${pos}-o'rin</span>`:`<span class="pill out">Mos emas</span>`;
    if(v.status!=="cancelled")acts.unshift(`<button class="btn ghost" type="button" data-rk="${esc(id)}">Reyting</button>`);
    if(v.status==="open"&&!deadlinePassed(v))acts.push(`<button class="btn ghost" type="button" data-wd="${esc(id)}">Qaytarib olish</button>`);
    return `<article class="vac"><div class="top"><div><h3>${esc(v.title)}</h3><div class="org">${esc(orgOf(v.orgId).name)}</div></div><div class="salary">${fmt(v.salary)}<small>so'm / oy</small></div></div>
      <div class="btnrow">${st}<span class="note">Ball: <b class="mono">${me&&me.ok?me.s.total:"—"}</b> · topshirilgan ${dt(it.at)} · ${daysLeft(v)}</span></div>
      ${me&&!me.ok&&v.status!=="cancelled"?`<div class="why">${me.why.map(esc).join("; ")}</div>`:""}${extra}
      <div class="btnrow" data-wdbox="${esc(id)}">${acts.join("")}</div></article>`}).join("")+`</div>`;
  box.querySelectorAll("[data-wd]").forEach(b=>b.onclick=()=>{
    const cell=b.parentElement,id=b.dataset.wd;
    cell.innerHTML=`<span class="confirm">Arizani qaytarib olasizmi? <button class="btn danger" type="button" data-yes>Ha</button><button class="btn ghost" type="button" data-no>Yo'q</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderMyApps();
    cell.querySelector("[data-yes]").onclick=async()=>{if(writing)return;writing=true;
      try{const items2={...myItems()};delete items2[id];await writeMyApps(items2);toast("Ariza qaytarib olindi");if(myRankId===id)myRankId=null}catch(e){toast("Bajarib bo'lmadi")}
      writing=false};
  });
  box.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>acceptOffer(b.dataset.acc,b));
  box.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{
    const cell=b.parentElement,id=b.dataset.dec;
    cell.innerHTML=`<span class="confirm">Voz kechsangiz, qaytarib bo'lmaydi. O'rin zaxiraga o'tadi. <button class="btn danger" type="button" data-yes>Voz kechaman</button><button class="btn ghost" type="button" data-no>Ortga</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderMyApps();
    cell.querySelector("[data-yes]").onclick=async()=>{if(writing)return;writing=true;
      try{const items2={...myItems()};items2[id]={...items2[id],declined:true,declinedAt:Date.now()};await writeMyApps(items2);toast("Voz kechdingiz. O'rin zaxiradagi nomzodga o'tdi")}catch(e){toast("Bajarib bo'lmadi")}
      writing=false};
  });
  box.querySelectorAll("[data-ap]").forEach(b=>b.onclick=()=>{
    const cell=b.parentElement,id=b.dataset.ap;
    cell.innerHTML=`<div class="stack" style="width:100%"><label>Shikoyat matni (kamida 20 belgi). Ismingiz ko'rsatilmaydi, faqat anonim kodingiz.<textarea id="ap-${esc(id)}" rows="3" maxlength="1500"></textarea></label><div class="btnrow"><button class="btn" type="button" data-yes>Yuborish</button><button class="btn ghost" type="button" data-no>Bekor qilish</button></div></div>`;
    cell.querySelector("[data-no]").onclick=()=>renderMyApps();
    cell.querySelector("[data-yes]").onclick=async()=>{const text=document.getElementById("ap-"+id).value.trim();
      if(text.length<20){toast("Shikoyatni kamida 20 belgi bilan yozing");return}
      const v=S.vacs.find(x=>x.id===id);
      try{await fs.doc("appeals/"+id+"_"+S.uid).set({vacId:id,orgId:v.orgId,uid:S.uid,code:codeFor(S.uid),text,at:Date.now(),status:"open"});toast("Shikoyat yuborildi. Javob shu yerda chiqadi")}catch(e){toast("Yuborib bo'lmadi: muddat o'tgan yoki shikoyat allaqachon yozilgan")}};
  });
  box.querySelectorAll("[data-cert]").forEach(b=>b.onclick=()=>openCert(b.dataset.cert));
  box.querySelectorAll("[data-rk]").forEach(b=>b.onclick=()=>{myRankId=myRankId===b.dataset.rk?null:b.dataset.rk;renderMyApps();if(myRankId)$("#myrank").scrollIntoView({behavior:"smooth",block:"start"})});
  const rv=myRankId&&S.vacs.find(x=>x.id===myRankId);
  if(rv){$("#myrank").innerHTML=`<h2>Reyting: ${esc(rv.title)}</h2><div id="myrankBody"></div>`;renderRanking(rv,$("#myrankBody"),false)}else $("#myrank").innerHTML="";
}
async function acceptOffer(id,btn){
  if(writing)return;const v=S.vacs.find(x=>x.id===id);if(!v)return;writing=true;btn.disabled=true;
  const c=S.contacts[S.uid]||{};
  try{
    await fs.doc("offers/"+id+"_"+S.uid).set({vacId:id,orgId:v.orgId,uid:S.uid,code:codeFor(S.uid),name:c.name||(S.profile||{}).name||"",phone:c.phone||"",login:S.login||"",at:Date.now()});
    const items2={...myItems()};items2[id]={...items2[id],accepted:true,acceptedAt:Date.now()};await writeMyApps(items2);
    toast("Taklif qabul qilindi. Tashkilot siz bilan bog'lanadi");
  }catch(e){toast("Bajarib bo'lmadi, qayta urinib ko'ring");btn.disabled=false}
  writing=false;
}

// ---------- NATIJA GUVOHNOMASI (QR kod bilan) ----------
const SITE=()=>(window.OT_APP_URL||(location.origin+location.pathname)).replace(/#.*$/,"");
const verifyId=(vid,code)=>vid+"."+code;
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
let qrReady=null;
function qrSvg(text){
  qrReady=qrReady||loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js");
  qrReady=qrReady.catch(()=>loadScript("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"));
  return qrReady.then(()=>{const q=qrcode(0,"M");q.addData(text);q.make();return q.createImgTag(4,8)});
}
function standing(v,code){
  const d=v.decision||{},snap=d.snapshot||[],ok=snap.filter(x=>x.ok),i=ok.findIndex(x=>x.code===code),row=snap.find(x=>x.code===code);
  const rej=(d.rejected||[]).some(x=>x.code===code);
  return {row,pos:i>=0?i+1:null,eligible:ok.length,total:snap.length,status:!row?"Ishtirokchi topilmadi":rej?"G'olib deb topilgan, keyin rad etilgan":code===d.winner?"G'olib":code===d.reserve?"Zaxira":row.ok?(i+1)+"-o'rin":"Majburiy talablarga mos kelmagan"};
}
function openCert(vid){
  const v=S.vacs.find(x=>x.id===vid);if(!v||!isClosed(v))return;
  const code=codeFor(S.uid),o=orgOf(v.orgId),st=standing(v,code),e=eff(v),d=v.decision||{},items=myItems(),it=items[vid]||{};
  const now=e.winner===code?"G'olib":e.reserve===code?"Zaxira":it.declined?"Voz kechgan":st.status;
  const url=SITE()+"#tekshir="+verifyId(vid,code);
  $("#certBody").innerHTML=`<div class="cert" id="certPaper">
    <div class="cert-head"><img src="logo.png" alt="" width="44" height="44"><div><b>OchiqTanlov</b><span>Ochiq tanlov tizimi</span></div></div>
    <h2>Natija guvohnomasi</h2>
    <dl class="kv"><dt>Ishtirokchi</dt><dd>${esc((S.profile||{}).name||"")}</dd><dt>Anonim kod</dt><dd class="mono">${esc(code)}</dd>
      <dt>Lavozim</dt><dd>${esc(v.title)}</dd><dt>Tashkilot</dt><dd>${esc(o.name)} · STIR <span class="mono">${esc(o.stir)}</span></dd>
      <dt>Ball</dt><dd class="mono">${st.row&&st.row.ok?st.row.total+" / 100":"—"}</dd><dt>O'rin</dt><dd>${st.pos?st.pos+" / "+st.eligible+" mos nomzod":"—"} <span class="note">(jami ${st.total} ariza)</span></dd>
      <dt>Natija</dt><dd><b>${esc(now)}</b></dd><dt>Tanlov yakunlangan</dt><dd class="mono">${dt(d.at)}</dd></dl>
    <div class="cert-foot"><div class="qr" id="certQr"><span class="note">QR kod yuklanmoqda…</span></div>
      <div><p class="note">Tekshirish raqami:</p><p class="mono"><b>${esc(verifyId(vid,code))}</b></p><p class="note">QR kodni skanerlang yoki raqamni saytdagi "Natija guvohnomasini tekshirish" sahifasiga kiriting. G'olibni administrator emas, ochiq formula bo'yicha tizim belgilagan.</p></div></div>
  </div>
  <div class="btnrow noprint"><button class="btn" type="button" id="certPrint">Chop etish / PDF</button><button class="btn ghost" type="button" id="certCopy">Havolani nusxalash</button><button class="btn ghost" type="button" id="certClose">Yopish</button></div>`;
  $("#cert").hidden=false;document.body.classList.add("modal-open");
  qrSvg(url).then(svg=>{const q=$("#certQr");if(q)q.innerHTML=svg}).catch(()=>{const q=$("#certQr");if(q)q.innerHTML=`<span class="note">QR kodni yaratib bo'lmadi (internet). Tekshirish raqamidan foydalaning.</span>`});
  $("#certClose").onclick=closeCert;
  $("#certPrint").onclick=()=>{try{window.print()}catch(e){toast("Chop etish bu qurilmada mavjud emas. Kompyuterda oching")}};
  $("#certCopy").onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("Havola nusxalandi")}catch(e){toast(url)}};
}
function closeCert(){$("#cert").hidden=true;document.body.classList.remove("modal-open")}
$("#cert").addEventListener("click",e=>{if(e.target.id==="cert")closeCert()});

// ---------- TEKSHIRISH (kirmasdan ham ishlaydi) ----------
let vfCache={};
async function renderVerify(){
  const raw=decodeURIComponent((location.hash.split("=")[1]||"")).trim(),out=$("#vf-out");
  $("#vf-back").setAttribute("href",S.role?"#"+tabs()[0][0]:"#");
  if(document.activeElement!==$("#vf-id"))$("#vf-id").value=raw;
  if(!raw){out.innerHTML="";return}
  const m=raw.match(/^([A-Za-z0-9_-]+)\.(N-\d{4}[A-Z])$/);
  if(!m){out.innerHTML=`<div class="verify bad"><b>Tekshirish raqami noto'g'ri formatda.</b><p class="note">Namuna: v1abc2de.N-1234A</p></div>`;return}
  const [_,vid,code]=m;
  if(!vfCache[raw]){out.innerHTML=`<p class="note">Tekshirilmoqda…</p>`;
    try{const g=await fs.doc("vacancies/"+vid).get();const v=g.exists?{id:vid,...g.data()}:null;let o=null;
      if(v){const og=await fs.doc("orgs/"+v.orgId).get();o=og.exists?og.data():null}
      vfCache[raw]={v,o}}catch(e){out.innerHTML=`<div class="verify bad"><b>Tekshirib bo'lmadi.</b><p class="note">Internet aloqasini tekshiring.</p></div>`;return}}
  const {v,o}=vfCache[raw];
  if(!v||!isClosed(v)){out.innerHTML=`<div class="verify bad"><b>✕ Bunday yakunlangan tanlov topilmadi.</b><p class="note">Guvohnoma soxta yoki raqam xato kiritilgan.</p></div>`;return}
  const st=standing(v,code);
  if(!st.row){out.innerHTML=`<div class="verify bad"><b>✕ Bu kod ushbu tanlov ishtirokchilari orasida yo'q.</b><p class="note">Guvohnoma soxta bo'lishi mumkin.</p></div>`;return}
  out.innerHTML=`<div class="verify ok"><b>✓ Guvohnoma haqiqiy</b><dl class="kv"><dt>Lavozim</dt><dd>${esc(v.title)}</dd><dt>Tashkilot</dt><dd>${esc(o?o.name:"—")}${o?` · STIR <span class="mono">${esc(o.stir)}</span>`:""}</dd><dt>Anonim kod</dt><dd class="mono">${esc(code)}</dd><dt>Ball</dt><dd class="mono">${st.row.ok?st.row.total:"—"}</dd><dt>O'rin</dt><dd>${st.pos?st.pos+" / "+st.eligible:"—"} (jami ${st.total} ariza)</dd><dt>Yakuniy qaror</dt><dd><b>${esc(st.status)}</b></dd><dt>Yakunlangan</dt><dd class="mono">${dt((v.decision||{}).at)}</dd></dl></div>`;
}
$("#vf-form").addEventListener("submit",e=>{e.preventDefault();const id=$("#vf-id").value.trim();location.hash="tekshir="+encodeURIComponent(id)});

// ---------- ADMIN ----------
async function log(kind,text,org){try{await S.db.collection("audit").add({at:Date.now(),by:S.uid,login:S.login||"",kind,text,org:org||null})}catch(e){}}
function noOrgHtml(){return `<div class="banner warn"><b>Siz hali tashkilotga biriktirilmagansiz.</b> Bosh administrator sizni "Ish beruvchilar" bo'limida o'z tashkilotingizga biriktirgach, vakansiya e'lon qila olasiz. Loginingiz: <span class="mono">${esc(S.login||"")}</span></div>`}
function downloadCsv(name,text){
  try{const inApp=/; wv\)/.test(navigator.userAgent)||location.protocol==="file:";
    if(!inApp){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast("Excel (CSV) fayl yuklab olindi");return}}catch(e){}
  navigator.clipboard.writeText(text).then(()=>toast("Jadval nusxalandi — Excel'ga joylashtiring"),()=>toast("Nusxalab bo'lmadi"));
}
const statusPill=v=>v.status==="cancelled"?`<span class="pill cancel">Bekor qilingan</span>`:isClosed(v)?`<span class="pill closed">Yakunlangan</span>`:deadlinePassed(v)?`<span class="pill res">Yakunlash kutilmoqda</span>`:`<span class="pill open">Ochiq</span>`;
function bars(rows,fmtVal){const max=Math.max(1,...rows.map(r=>r[1]));
  return rows.length?`<div class="bars">`+rows.map(([l,v])=>`<div class="bar"><span class="lbl" title="${esc(l)}">${esc(l)}</span><span class="track"><span class="fill" style="width:${Math.round(100*v/max)}%"></span></span><span class="val">${fmtVal?fmtVal(v):v}</span></div>`).join("")+`</div>`:`<p class="note">Ma'lumot yetarli emas.</p>`}
function renderDash(){
  const V=VS(),emp=isEmp();
  $("#empBanner").innerHTML=emp?(myOrgId()?`<div class="banner"><b>${esc(orgOf(myOrgId()).name)}</b> · STIR <span class="mono">${esc(orgOf(myOrgId()).stir)}</span> — siz shu tashkilot nomidan ishlaysiz.</div>`:noOrgHtml()):"";
  const open=V.filter(v=>v.status==="open").length,closed=V.filter(isClosed).length,canc=V.filter(v=>v.status==="cancelled").length;
  const all=V.flatMap(v=>ranking(v));const okN=all.filter(a=>a.ok).length;
  const apN=S.appeals.filter(a=>a.status==="open"&&(!emp||a.orgId===myOrgId())).length;
  $("#kpis").innerHTML=(emp?`<div class="kpi"><span>Jami vakansiyalar</span><b>${V.length}</b></div>`:`<div class="kpi"><span>Davlat tashkilotlari</span><b>${S.orgs.length}</b></div>`)+`<div class="kpi"><span>Javob kutayotgan shikoyatlar</span><b style="color:${apN?"var(--warn)":"inherit"}">${apN}</b></div><div class="kpi"><span>Ochiq vakansiyalar</span><b>${open}</b></div><div class="kpi"><span>Jami arizalar</span><b>${all.length}</b></div><div class="kpi"><span>Talablarga mos arizalar</span><b>${all.length?Math.round(100*okN/all.length):0}%</b></div><div class="kpi"><span>Yakunlangan / bekor</span><b>${closed} / ${canc}</b></div><div class="kpi"><span>Qo'lda tanlangan nomzod</span><b>0</b></div>`;
  const pend=V.filter(v=>v.status==="open"&&deadlinePassed(v));
  $("#pending").innerHTML=pend.length?pend.map(v=>closeRow(v)).join(""):`<p class="note">Muddati tugagan, yakunlanmagan tanlov yo'q.</p>`;
  bindClose($("#pending"));
  const by=(arr,key)=>{const m={};arr.forEach(x=>{m[key(x)]=(m[key(x)]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const avg={};V.forEach(v=>{(avg[v.sector]=avg[v.sector]||[]).push(v.salary||0)});
  const avgRows=Object.entries(avg).map(([k,a])=>[k,Math.round(a.reduce((s,x)=>s+x,0)/a.length)]).sort((a,b)=>b[1]-a[1]);
  const top=V.map(v=>[v.title+(emp?"":" — "+orgOf(v.orgId).name),applicantsOf(v).length]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,6);
  $("#statsBox").innerHTML=`<div class="panel stack"><h2>Soha bo'yicha vakansiyalar</h2>${bars(by(V,v=>v.sector))}</div>
   <div class="panel stack"><h2>O'rtacha maosh, so'm</h2>${bars(avgRows,fmt)}</div>
   <div class="panel stack"><h2>Hudud bo'yicha ochiq vakansiyalar</h2>${bars(by(V.filter(v=>v.status==="open"),v=>v.region))}</div>
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
  if(isEmp()&&v.orgId!==myOrgId())return;
  const r=ranking(v),ok=r.filter(x=>x.ok);
  const decision={at:Date.now(),winner:ok[0]?ok[0].code:null,winnerUid:ok[0]?ok[0].uid:null,winnerScore:ok[0]?ok[0].s.total:null,reserve:ok[1]?ok[1].code:null,reserveUid:ok[1]?ok[1].uid:null,eligible:ok.length,total:r.length,rejected:[],
    snapshot:r.map(x=>({code:x.code,uid:x.uid,ok:x.ok,total:x.ok?x.s.total:null}))};
  try{await S.db.doc("vacancies/"+id).update({status:"closed",decision});await log("close",`Tanlov yakunlandi: "${v.title}". G'olib: ${decision.winner||"yo'q"}, zaxira: ${decision.reserve||"yo'q"}`,v.orgId);toast("Tizim g'olibni belgiladi: "+(decision.winner||"mos nomzod yo'q"))}
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
  try{await S.db.doc("orgs/o"+stir).set({name,stir,type:$("#o-type").value,region:$("#o-region").value,createdAt:Date.now()});await log("org",`Tashkilot qo'shildi: ${name} (STIR ${stir})`,"o"+stir);e.target.reset();$("#o-region").value="Jizzax";toast("Tashkilot qo'shildi")}
  catch(e2){err.textContent="Saqlab bo'lmadi: bosh administrator huquqi kerak yoki internet aloqasi yo'q.";err.hidden=false}
});
function renderOrgs(){
  const box=$("#orglist");
  if(!S.orgs.length){box.innerHTML=`<div class="empty">Hali tashkilot kiritilmagan. Chapdagi shakl orqali birinchi davlat tashkilotini qo'shing yoki Sozlamalar bo'limida namuna ma'lumot qo'shing.</div>`;return}
  box.innerHTML=`<div class="tablebox"><table class="wide"><thead><tr><th>Tashkilot</th><th>STIR</th><th>Turi</th><th>Viloyat</th><th class="num">Ochiq</th><th class="num">Jami</th><th class="num">Arizalar</th><th>Ish beruvchilar</th><th></th></tr></thead><tbody>`+
   [...S.orgs].sort((a,b)=>a.name.localeCompare(b.name)).map(o=>{const vs=S.vacs.filter(v=>v.orgId===o.id);const apps=vs.reduce((n,v)=>n+applicantsOf(v).length,0);
     return `<tr><td><b>${esc(o.name)}</b></td><td class="mono">${esc(o.stir)}</td><td>${esc(o.type)}</td><td>${esc(o.region)}</td><td class="num">${vs.filter(v=>v.status==="open").length}</td><td class="num">${vs.length}</td><td class="num">${apps}</td><td>${S.admins.filter(a=>a.org===o.id).map(a=>`<span class="tag mono">${esc(a.login||"—")}</span>`).join(" ")||`<span class="note">biriktirilmagan</span>`}</td><td><span>${apps?`<span class="note">Arizasi bor tashkilotni o'chirib bo'lmaydi</span>`:`<button class="btn ghost" type="button" data-del="${esc(o.id)}">O'chirish</button>`}</span></td></tr>`}).join("")+`</tbody></table></div>`;
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
  if(v){$("#v-org").value=v.orgId;$("#v-title").value=v.title;$("#v-salary").value=v.salary;$("#v-sector").value=v.sector;$("#v-region").value=v.region;$("#v-edu").value=v.edu;$("#v-exp").value=v.exp;$("#v-test").value=v.test;if($("#v-desc"))$("#v-desc").value=v.desc||"";
    {const left=Math.max(0,(v.deadline||0)-Date.now());const o=[...$("#v-days").options].map(x=>+x.value);$("#v-days").value=String(o.reduce((b,x)=>Math.abs(x-left)<Math.abs(b-left)?x:b,o[0]));}
    draftV.specs=[...(v.specs||[])];draftV.req=[...(v.req||[])];draftV.pref=[...(v.pref||[])];draftV.langs=[...(v.langs||[])];$("#vform").scrollIntoView({behavior:"smooth",block:"start"})}
  else{$("#v-title").value="";$("#v-salary").value="";if($("#v-desc"))$("#v-desc").value="";draftV.specs=[];draftV.req=[];draftV.pref=[];draftV.langs=[]}
  renderDraft();
}
$("#vEditCancel").onclick=()=>setEditMode(null);
$("#v-sector").addEventListener("change",()=>{draftV.specs=[];renderDraft()});
$("#v-org").addEventListener("change",()=>{const o=S.orgs.find(x=>x.id===$("#v-org").value);if(o)$("#v-region").value=o.region});
$("#vform").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#v-err");err.hidden=true;
  const orgId=$("#v-org").value,title=$("#v-title").value.trim(),salary=+$("#v-salary").value;
  const fail=m=>{err.textContent=m;err.hidden=false};
  if(!orgId)return fail(isEmp()?"Siz hali tashkilotga biriktirilmagansiz.":"Avval tashkilotni tanlang. Ro'yxat bo'sh bo'lsa, \"Tashkilotlar\" bo'limida qo'shing.");
  if(isEmp()&&orgId!==myOrgId())return fail("Faqat o'z tashkilotingiz nomidan vakansiya e'lon qila olasiz.");
  if(!title)return fail("Lavozim nomini kiriting.");
  if(!(salary>=1000000))return fail("Maoshni aniq ko'rsating (kamida 1 000 000 so'm). \"Kelishiladi\" deb qoldirib bo'lmaydi.");
  if(!draftV.specs.length)return fail("Kamida bitta mutaxassislikni tanlang.");
  const durMs=+$("#v-days").value||14*DAY;
  const body={orgId,title,salary,sector:$("#v-sector").value,region:$("#v-region").value,edu:+$("#v-edu").value,exp:Math.max(0,+$("#v-exp").value||0),test:Math.max(0,Math.min(100,+$("#v-test").value||0)),
    specs:[...draftV.specs],req:[...draftV.req],pref:[...draftV.pref],langs:[...draftV.langs],deadline:Date.now()+durMs,desc:(($("#v-desc")||{}).value||"").trim().slice(0,1500)};
  try{
    if(editingId){const v=S.vacs.find(x=>x.id===editingId);
      if(!v||v.status!=="open"||applicantsOf(v).length)return fail("Bu vakansiyaga ariza tushgan, talablarni endi o'zgartirib bo'lmaydi.");
      await S.db.doc("vacancies/"+editingId).update({...body,editedAt:Date.now()});await log("edit",`Vakansiya tahrirlandi: "${title}"`,orgId);setEditMode(null);toast("O'zgarishlar saqlandi");
    }else{
      const id="v"+Date.now().toString(36);
      await S.db.doc("vacancies/"+id).set({...body,createdAt:Date.now(),status:"open",decision:null});await log("vacancy",`Vakansiya e'lon qilindi: "${title}" — ${orgOf(orgId).name}, ${fmt(salary)} so'm, muddat ${$("#v-days").selectedOptions[0].textContent}`,orgId);
      setEditMode(null);toast("Vakansiya e'lon qilindi");
    }
  }catch(e2){fail("Saqlab bo'lmadi: ruxsat yo'q yoki internet aloqasi yo'q.")}
});
function renderAdmVacs(){
  const emp=isEmp(),mo=myOrgId();
  $("#vNoOrg").innerHTML=emp&&!mo?noOrgHtml():"";$("#vform").hidden=emp&&!mo;
  const orgList=emp?S.orgs.filter(o=>o.id===mo):S.orgs;
  const cur=$("#v-org").value;opts($("#v-org"),orgList.map(o=>({v:o.id,t:o.name})),orgList.length?undefined:"Avval tashkilot qo'shing");if(cur&&orgList.some(o=>o.id===cur))$("#v-org").value=cur;
  $("#v-org").disabled=emp;
  if(emp&&mo&&!editingId){const o=orgOf(mo);if(o.region&&!$("#v-title").value)$("#v-region").value=o.region}
  const box=$("#admvacs"),V=VS();
  if(!V.length){box.innerHTML=`<div class="empty">Hali vakansiya yo'q.${emp&&!mo?"":" Chapdagi shakl orqali birinchi vakansiyani e'lon qiling."}</div>`;return}
  const order=v=>v.status==="open"?(deadlinePassed(v)?0:1):isClosed(v)?2:3;
  const list=[...V].sort((a,b)=>order(a)-order(b)||(b.createdAt||0)-(a.createdAt||0));
  box.innerHTML=`<div class="vlist">`+list.map(v=>{
    const n=applicantsOf(v).length,closed=isClosed(v),d=v.decision||{},open=v.status==="open",e=eff(v);
    const of=closed&&e.winnerUid?S.offers.find(x=>x.vacId===v.id&&x.uid===e.winnerUid):null;
    let actions="";
    if(open&&deadlinePassed(v))actions=`<button class="btn" type="button" data-close="${esc(v.id)}">Tanlovni yakunlash</button>`;
    else if(open){actions=(n?"":`<button class="btn ghost" type="button" data-edit="${esc(v.id)}">Tahrirlash</button>`)+((v.extended||0)<2?`<button class="btn ghost" type="button" data-ext="${esc(v.id)}">+7 kun</button>`:"")}
    if(open)actions+=`<button class="btn ghost" type="button" data-cancel="${esc(v.id)}">Bekor qilish</button>`;
    if(closed)actions=`<button class="btn ghost" type="button" data-res="${esc(v.id)}">Natija</button>`;
    return `<article class="vac"><div class="top"><div><h3>${esc(v.title)}</h3><div class="org">${esc(orgOf(v.orgId).name)}</div></div>${statusPill(v)}</div>
      <dl class="kv"><dt>Maosh</dt><dd class="mono">${fmt(v.salary)} so'm</dd><dt>Arizalar</dt><dd class="mono">${n}</dd><dt>Muddat</dt><dd>${v.status==="cancelled"?"—":daysLeft(v)}${v.extended?` <span class="note">(${v.extended} marta uzaytirilgan)</span>`:""}</dd>
      ${closed?`<dt>G'olib</dt><dd>${e.winner?`<span class="mono">${esc(e.winner)}</span> — ${of?`<span class="pill win">Qabul qildi</span> <b>${esc(of.name)}</b>${of.phone?`, <a class="mono" href="tel:${esc(of.phone.replace(/[^\d+]/g,""))}">${esc(of.phone)}</a>`:""}`:`<span class="note">g'olib javobi kutilmoqda</span>`}`:"Mos nomzod qolmadi"}</dd><dt>Zaxira</dt><dd class="mono">${esc(e.reserve||"—")}</dd>${e.declined.length?`<dt>Voz kechgan</dt><dd class="mono">${e.declined.map(esc).join(", ")}</dd>`:""}${e.rejected.length?`<dt>Rad etilgan</dt><dd class="mono">${e.rejected.map(esc).join(", ")}</dd>`:""}`:v.status==="cancelled"?`<dt>Sabab</dt><dd>${esc(v.cancelReason||"")}</dd>`:`<dt>Nomzodlar</dt><dd>Tanlov tugaguncha ismlar yashirin</dd>`}</dl>
      <div class="foot" style="flex-direction:column;align-items:stretch"><div class="btnrow" data-actbox="${esc(v.id)}">${actions}</div></div></article>`}).join("")+`</div>`;
  bindClose(box);
  box.querySelectorAll("[data-res]").forEach(b=>b.onclick=()=>openResult(b.dataset.res));
  box.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>setEditMode(S.vacs.find(x=>x.id===b.dataset.edit)));
  box.querySelectorAll("[data-ext]").forEach(b=>b.onclick=async()=>{const v=S.vacs.find(x=>x.id===b.dataset.ext);if(!v)return;b.disabled=true;
    try{await S.db.doc("vacancies/"+v.id).update({deadline:Math.max(v.deadline||0,Date.now())+7*DAY,extended:(v.extended||0)+1});await log("extend",`Muddat 7 kunga uzaytirildi: "${v.title}"`,v.orgId);toast("Muddat 7 kunga uzaytirildi")}catch(e){toast("Bajarib bo'lmadi");b.disabled=false}});
  box.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.cancel,v=S.vacs.find(x=>x.id===id),cell=b.parentElement;
    cell.innerHTML=`<span class="inline"><input id="cr-${esc(id)}" placeholder="Bekor qilish sababi (kamida 10 belgi, arizachilarga ko'rinadi)"><button class="btn danger" type="button" data-yes>Bekor qilish</button><button class="btn ghost" type="button" data-no>Ortga</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderAdmVacs();
    cell.querySelector("[data-yes]").onclick=async()=>{const reason=document.getElementById("cr-"+id).value.trim();
      if(reason.length<10){toast("Sababni kamida 10 belgi bilan yozing");return}
      try{await S.db.doc("vacancies/"+id).update({status:"cancelled",cancelReason:reason,cancelledAt:Date.now()});await log("cancel",`Vakansiya bekor qilindi: "${v.title}". Sabab: ${reason}`,v.orgId);toast("Vakansiya bekor qilindi")}catch(e){toast("Bajarib bo'lmadi")}};
  });
}

// all applications (admin)
function renderAdmApps(){
  const sel=$("#aa-vac"),cur=sel.value;
  const V=VS();opts(sel,V.map(v=>({v:v.id,t:v.title+" — "+orgOf(v.orgId).name})),"Barcha vakansiyalar");sel.value=cur&&V.some(v=>v.id===cur)?cur:"";
  const st=$("#aa-st").value,q=$("#aa-q").value.trim().toUpperCase();
  let rows=[];
  V.filter(v=>!sel.value||v.id===sel.value).forEach(v=>{let rank=0;ranking(v).forEach(a=>{if(a.ok)rank++;rows.push({v,a,rank:a.ok?rank:null})})});
  rows=rows.filter(x=>(!st||(st==="ok")===x.a.ok)&&(!q||x.a.code.includes(q)));
  rows.sort((x,y)=>(y.a.at||0)-(x.a.at||0));
  const box=$("#aa-body");
  if(!rows.length){box.innerHTML=`<div class="empty">${V.length?"Tanlangan shartlar bo'yicha ariza topilmadi.":"Hali vakansiya ham, ariza ham yo'q."}</div>`;return}
  box.innerHTML=`<p class="note" style="margin-bottom:8px">${rows.length} ta ariza</p><div class="tablebox"><table class="wide"><thead><tr><th>Kod</th><th>Vakansiya</th><th>Holat</th><th class="num">Ball</th><th class="num">O'rin</th><th>Ma'lumot</th><th class="num">Staj</th><th class="num">Test</th><th>Vaqt</th></tr></thead><tbody>`+
    rows.map(({v,a,rank})=>{const d=eff(v);const pill=v.status==="cancelled"?`<span class="pill cancel">Bekor</span>`:!a.ok?`<span class="pill out">Mos emas</span>`:isClosed(v)&&a.code===d.winner?`<span class="pill win">G'olib</span>`:isClosed(v)&&a.code===d.reserve?`<span class="pill res">Zaxira</span>`:isClosed(v)&&d.declined.includes(a.code)?`<span class="pill cancel">Voz kechgan</span>`:`<span class="pill rank">Mos</span>`;
      return `<tr class="${a.ok?"":"ineligible"}"><td class="mono">${esc(a.code)}</td><td>${esc(v.title)}<div class="org">${esc(orgOf(v.orgId).name)}</div></td><td>${pill}${a.ok?"":`<div class="why">${a.why.map(esc).join("; ")}</div>`}</td><td class="num">${a.ok?a.s.total:"—"}</td><td class="num">${rank||"—"}</td><td>${EDU[a.edu]||"—"}<div class="org">${esc(a.spec||"")}</div></td><td class="num">${a.exp||0}</td><td class="num">${a.test??"—"}</td><td class="mono" style="white-space:nowrap">${dt(a.at)}</td></tr>`}).join("")+`</tbody></table></div>`;
}
["aa-vac","aa-st","aa-q"].forEach(id=>document.getElementById(id).addEventListener("input",renderAdmApps));

// audit
const KIND={org:"Tashkilot",vacancy:"Vakansiya",edit:"Tahrir",extend:"Muddat",cancel:"Bekor qilish",close:"Yakunlash",reject:"G'olibni rad etish",code:"Kod",sample:"Namuna",assign:"Biriktirish",revoke:"Huquqni olish",appeal:"Shikoyat",test:"Test"};
function renderAudit(){
  const box=$("#auditBody"),emp=isEmp(),list=emp?S.audit.filter(x=>x.by===S.uid||(myOrgId()&&x.org===myOrgId())):S.audit;
  if(!list.length){box.innerHTML=`<div class="empty">Jurnal hozircha bo'sh. Administratorlarning birinchi harakatidan boshlab yozuvlar shu yerda chiqadi.</div>`;return}
  box.innerHTML=`<div class="tablebox"><table class="wide"><thead><tr><th>Vaqt</th><th>Kim</th><th>Turi</th><th>Harakat</th></tr></thead><tbody>`+
    [...list].sort((a,b)=>b.at-a.at).map(x=>`<tr><td class="mono" style="white-space:nowrap">${dt(x.at)}</td><td class="mono">${esc(x.login||"—")}</td><td><span class="pill rank">${esc(KIND[x.kind]||x.kind)}</span></td><td>${esc(x.text)}</td></tr>`).join("")+`</tbody></table></div>`;
}

// settings
function renderSettings(){
  const reg=Object.keys(S.contacts).length;
  $("#usersInfo").innerHTML=`<dt>Ro'yxatdan o'tganlar</dt><dd class="mono">${reg}</dd><dt>Ariza bergan foydalanuvchilar</dt><dd class="mono">${S.apps.filter(d=>Object.values(d.items||{}).some(i=>!i.withdrawn)).length}</dd><dt>Sizning loginingiz</dt><dd class="mono">${esc(S.login||"—")}</dd>`;
  $("#sampleBox").hidden=S.orgs.some(o=>o.sample);
  $("#codeChange").hidden=true;
  renderVersion();
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
  const vs=[...VS()].sort((a,b)=>isClosed(b)-isClosed(a)||(b.createdAt||0)-(a.createdAt||0));
  sel.innerHTML=vs.map(v=>`<option value="${esc(v.id)}">${isClosed(v)?"✓ ":v.status==="cancelled"?"✕ ":"◷ "}${esc(v.title)} — ${esc(orgOf(v.orgId).name)}</option>`).join("");
  if(cur&&vs.some(v=>v.id===cur))sel.value=cur;
  const v=vs.find(x=>x.id===sel.value),body=$("#r-body");
  if(!v){body.innerHTML=`<div class="empty">Hali vakansiya yo'q. Vakansiyalar e'lon qilingach, har biri bo'yicha reyting shu yerda chiqadi.</div>`;return}
  renderRanking(v,body,true);
}
$("#r-vac").addEventListener("change",renderResults);
function csvOf(v){
  const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';const d=eff(v);
  const lines=[["Kod","Holat","Test","Staj","Ko'nikma","Ma'lumot","Til","Jami ball","Sabab","Ariza vaqti"].map(q).join(";")];
  ranking(v).forEach(a=>lines.push([a.code,a.ok?(a.code===d.winner?"G'olib":a.code===d.reserve?"Zaxira":d.declined.includes(a.code)?"Voz kechgan":d.rejected.includes(a.code)?"Rad etilgan":"Mos"):"Mos emas",a.s.t,a.s.e,Math.round(a.s.p),a.s.d,Math.round(a.s.l),a.ok?a.s.total:"",a.why.join("; "),dt(a.at)].map(q).join(";")));
  return "﻿"+lines.join("\r\n");
}
function renderRanking(v,body,isAdmin){
  const r=ranking(v),closed=isClosed(v),d=v.decision||{},o=orgOf(v.orgId),myCode=S.uid?codeFor(S.uid):null,E=eff(v);let rank=0;
  const rows=r.map(a=>{let st;
    if(!a.ok)st=`<span class="pill out">Mos emas</span>`;else{rank++;st=closed&&a.code===E.winner?`<span class="pill win">G'olib</span>`:closed&&a.code===E.reserve?`<span class="pill res">Zaxira</span>`:closed&&E.rejected.includes(a.code)?`<span class="pill cancel">Rad etilgan</span>`:closed&&E.declined.includes(a.code)?`<span class="pill cancel">Voz kechgan</span>`:`<span class="pill rank">${rank}-o'rin</span>`}
    return `<tr class="${closed&&a.code===E.winner?"winner":""}${a.ok?"":" ineligible"}"><td class="mono">${esc(a.code)}${a.code===myCode?" <b>(siz)</b>":""}</td><td>${st}${a.ok?"":`<div class="why">${a.why.map(esc).join("; ")}</div>`}</td>
      <td class="num">${a.s.t}</td><td class="num">${a.s.e}</td><td class="num">${Math.round(a.s.p)}</td><td class="num">${a.s.d}</td><td class="num">${Math.round(a.s.l)}</td><td class="num"><b>${a.ok?a.s.total:"—"}</b></td><td class="mono" style="white-space:nowrap">${dt(a.at)}</td></tr>`}).join("");
  const snapOk=(d.snapshot||[]).filter(x=>x.ok),rej=d.rejected||[];
  const expected=snapOk.filter(x=>!rej.some(y=>y.code===x.code))[0];
  const match=closed?((expected?expected.code:null)===d.winner):null;
  const canReject=S.role==="chief"&&isAdmin&&closed&&E.winner&&rej.length<1;
  body.innerHTML=`<div class="panel stack" style="margin-bottom:14px">
     <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0">${esc(v.title)}</h2><div class="org">${esc(o.name)} · STIR <span class="mono">${esc(o.stir)}</span></div></div><div class="salary">${fmt(v.salary)}<small>so'm / oy</small></div></div>
     <div class="tags"><span class="tag">${EDU[v.edu]}+</span><span class="tag">staj ${v.exp}+ yil</span><span class="tag">test ${v.test}+</span><span class="tag">${(v.specs||[]).map(esc).join(" / ")}</span>${(v.req||[]).map(s=>`<span class="tag">● ${esc(s)}</span>`).join("")}${(v.pref||[]).map(s=>`<span class="tag">afzal: ${esc(s)}</span>`).join("")}</div>
     ${isAdmin?`<div class="btnrow">${r.length?`<button class="btn ghost" type="button" id="rkCsv">Excel (CSV) yuklab olish</button>`:""}${canReject?`<span id="rejBox"><button class="btn ghost" type="button" id="rkReject">G'olibni rad etish</button></span>`:""}</div>`:""}</div>
   ${r.length?`<div class="tablebox"><table class="wide"><thead><tr><th>Kod</th><th>Holat</th><th class="num">Test</th><th class="num">Staj</th><th class="num">Ko'nikma</th><th class="num">Ma'lumot</th><th class="num">Til</th><th class="num">Jami</th><th>Ariza vaqti</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="empty">Bu vakansiyaga hali ariza tushmagan.</div>`}
   <div class="audit">${v.status==="cancelled"?`Vakansiya bekor qilingan: ${dt(v.cancelledAt)}
Sabab: ${esc(v.cancelReason||"")}`:closed?`Tanlov yakunlandi: ${dt(d.at)}
Arizalar: ${d.total} · talablarga mos: ${d.eligible}
Tizim belgilagan g'olib: ${esc((d.snapshot||[]).filter(x=>x.ok)[0]?(d.snapshot||[]).filter(x=>x.ok)[0].code:"aniqlanmadi")} · amaldagi g'olib: ${esc(E.winner||"yo'q")} · zaxira: ${esc(E.reserve||"—")}${E.declined.length?"\nVoz kechganlar: "+E.declined.map(esc).join(", "):""}${rej.map(x=>`
Rad etilgan: ${esc(x.code)} — ${dt(x.at)}. Sabab: ${esc(x.reason)}`).join("")}
Qaror manbai: avtomatik formula · qo'lda tanlov: yo'q
Yakuniy qarorni tekshirish: ${match?"formula natijasiga mos keladi ✓":"farq bor — tekshirish kerak"}`:`Tanlov davom etmoqda · ${daysLeft(v)}
Hozirgi tartib oraliq natija. Muddat tugagach tizim g'olibni belgilaydi.`}</div>`;
  const csvB=body.querySelector("#rkCsv");
  if(csvB)csvB.onclick=()=>downloadCsv("natija-"+v.id+".csv",csvOf(v));
  const rjB=body.querySelector("#rkReject");
  if(rjB)rjB.onclick=()=>{
    const box=body.querySelector("#rejBox");
    box.innerHTML=`<span class="inline"><input id="rejReason" placeholder="Rad etish sababi (kamida 20 belgi, hammaga ko'rinadi)"><button class="btn danger" type="button" data-yes>Rad etish</button><button class="btn ghost" type="button" data-no>Ortga</button></span>`;
    box.querySelector("[data-no]").onclick=()=>renderResults();
    box.querySelector("[data-yes]").onclick=async()=>{
      const reason=$("#rejReason").value.trim();if(reason.length<20){toast("Sababni kamida 20 belgi bilan yozing");return}
      const rest=snapOk.filter(x=>x.code!==E.winner&&!rej.some(y=>y.code===x.code)&&!E.declined.includes(x.code));
      const nd={...d,rejected:[...rej,{code:E.winner,reason,at:Date.now()}],winner:rest[0]?rest[0].code:null,winnerUid:rest[0]?rest[0].uid:null,winnerScore:rest[0]?rest[0].total:null,reserve:rest[1]?rest[1].code:null,reserveUid:rest[1]?rest[1].uid:null};
      try{await S.db.doc("vacancies/"+v.id).update({decision:nd});await log("reject",`G'olib rad etildi: "${v.title}", ${E.winner}. Sabab: ${reason}. Yangi g'olib: ${nd.winner||"yo'q"}`,v.orgId);toast("O'rin zaxiradagi nomzodga o'tdi: "+(nd.winner||"nomzod qolmadi"))}catch(e){toast("Bajarib bo'lmadi")}
    };
  };
}


// =====================================================================
// KASBIY TEST: Face ID, kamera nazorati, savol vaqti, avtomatik to'xtatish
// =====================================================================
const FACE_LIBS=[
  {js:"https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js",models:"https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/"},
  {js:"https://unpkg.com/@vladmandic/face-api@1.7.13/dist/face-api.js",models:"https://unpkg.com/@vladmandic/face-api@1.7.13/model/"},
  {js:"https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js",models:"https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/"}
];
let faceErr="";
const FACE_MATCH=0.5,FACE_SAME=0.6,NOFACE_MS=2500,MULTI_MS=1500,AWAY_MS=2000,ID_EVERY_MS=8000;
let faceReady=null;
function loadFace(){
  if(faceReady)return faceReady;
  faceReady=(async()=>{
    let last;
    for(const L of FACE_LIBS){
      try{if(typeof faceapi==="undefined")await loadScript(L.js);
        if(faceapi.tf&&faceapi.tf.ready){try{await faceapi.tf.ready()}catch(e){}}
        await faceapi.nets.tinyFaceDetector.loadFromUri(L.models);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(L.models);
        await faceapi.nets.faceRecognitionNet.loadFromUri(L.models);
        faceErr="";return true}catch(e){last=e;faceErr=String(e&&e.message||e||"").slice(0,140);try{delete window.faceapi}catch(_){window.faceapi=undefined}}
    }
    throw last||new Error("face");
  })();
  faceReady.catch(()=>{faceReady=null});
  return faceReady;
}
const fOpts=()=>new faceapi.TinyFaceDetectorOptions({inputSize:224,scoreThreshold:0.5});
function poseOf(det){
  const p=det.landmarks.positions,le=p[36],re=p[45],no=p[30],ch=p[8];
  const yaw=(no.x-le.x)/((re.x-le.x)||1),eyeY=(le.y+re.y)/2,pitch=(no.y-eyeY)/((ch.y-eyeY)||1);
  return {yaw,pitch,away:yaw<0.28||yaw>0.72||pitch<0.15||pitch>0.75};
}
function dist(a,b){let s=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];s+=d*d}return Math.sqrt(s)}
async function oneDescriptor(video){
  const d=await faceapi.detectAllFaces(video,fOpts()).withFaceLandmarks(true).withFaceDescriptors();
  if(d.length!==1)return {n:d.length};
  return {n:1,desc:Array.from(d[0].descriptor),pose:poseOf(d[0])};
}
async function captureFace(video,need,timeoutMs,onMsg){
  const got=[],t0=Date.now();
  while(Date.now()-t0<timeoutMs&&got.length<need){
    const r=await oneDescriptor(video);
    if(r.n===0)onMsg("Yuzingiz ko'rinmayapti. Kameraga to'g'ri qarang, yorug'roq joyga o'ting.");
    else if(r.n>1)onMsg("Kamerada bir nechta odam bor. Faqat o'zingiz qoling.");
    else if(r.pose.away)onMsg("To'g'ridan-to'g'ri kameraga qarang.");
    else{got.push(r.desc);onMsg("Yuz aniqlandi… ("+got.length+"/"+need+")")}
    await new Promise(r=>setTimeout(r,350));
  }
  if(got.length<need)return null;
  return got[0].map((_,i)=>got.reduce((s,d)=>s+d[i],0)/got.length);
}
const testWindow=()=>{const c=S.testCfg||{},now=Date.now();if(!c.enabled)return {ok:false,why:"closed"};if(c.startAt&&now<c.startAt)return {ok:false,why:"early",at:c.startAt};if(c.endAt&&now>c.endAt)return {ok:false,why:"late",at:c.endAt};return {ok:true}};
const toLocalInput=ms=>{if(!ms)return "";const d=new Date(ms);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

function renderTestPanel(){
  const box=$("#testPanel");if(!box)return;
  if(EX)return;
  const cfg=S.testCfg||{},ts=myTestStatus(),a=S.myAttempt;
  const hasFace=S.face||(S.faces||[]).some(f=>f.id===S.uid);
  $("#p-face").innerHTML=hasFace?`<span class="pill win">Ro'yxatga olingan</span>`:`<span class="note">kirishda ro'yxatga olinadi</span>`;
  if(a&&a.status==="running"&&!EX){fs.doc("attempts/"+S.uid).update({status:"terminated",reason:"Test oynasi yopildi yoki ilovadan chiqildi",finishedAt:Date.now()}).catch(()=>{})}
  let h="";
  if(ts.k==="done")h=`<div class="banner"><b>Test topshirilgan: ${ts.t} / 100.</b> ${a&&a.status==="terminated"?"Test to'xtatilgan: "+esc(a.reason||"")+". ":""}Bu ball barcha arizalaringizda ishlatiladi. Qayta topshirish faqat bosh administrator ruxsati bilan.</div>`;
  else if(ts.k==="grading"||ts.k==="running")h=a&&a.status==="terminated"?`<div class="banner warn"><b>Test to'xtatildi.</b> Sabab: ${esc(a.reason||"qoidabuzarlik")}. Natija 0 ball bo'lib hisoblanadi. Texnik sabab bo'lsa, bosh administratorga murojaat qiling.</div>`
    :`<div class="banner"><b>Javoblaringiz qabul qilindi.</b> Natija bosh administrator tizimida avtomatik hisoblanadi va shu yerda paydo bo'ladi.</div>`;
  else if(!testWindow().ok){const w=testWindow();h=w.why==="early"?`<div class="banner"><b>Test ${dt(w.at)} da boshlanadi.</b> Shu vaqtdan keyin "Testni boshlash" tugmasi paydo bo'ladi.${cfg.endAt?" Tugash vaqti: "+dt(cfg.endAt)+".":""}</div>`:w.why==="late"?`<div class="banner warn"><b>Test vaqti tugagan</b> (${dt(w.at)}). Yangi test vaqti e'lon qilinishini kuting.</div>`:`<p class="note">Kasbiy test hali ochilmagan. Bosh administrator testni ochgach, shu yerda "Testni boshlash" tugmasi paydo bo'ladi.</p>`}
  else h=(cfg.endAt?`<p class="note">Test ${dt(cfg.endAt)} gacha ochiq.</p>`:"")+`<ul class="rules"><li>Test faqat <b>bir marta</b> topshiriladi va barcha arizalaringiz uchun ishlatiladi.</li><li>Avval <b>Face ID</b>: yuzingiz ro'yxatdagi yuz bilan solishtiriladi. So'ng <b>bosh administrator ruxsat berishi</b> kutiladi.</li><li>Test davomida <b>kamera yoqiq</b> turadi. Yuzingiz ko'rinmasa, boshqa tomonga qarasangiz, kamerada boshqa odam paydo bo'lsa yoki <b>ilovadan chiqsangiz — test darhol to'xtatiladi</b> va 0 ball qo'yiladi.</li><li>Har bir savolga alohida vaqt beriladi. Vaqt tugasa, keyingi savolga o'tiladi.</li><li>Skrinshot olish taqiqlangan.</li></ul>
    <div><button class="btn" type="button" id="btn-exam" ${profileReady()?"":"disabled"}>Testni boshlash</button></div>${profileReady()?"":`<p class="note">Avval profilni saqlang.</p>`}<p class="note">Yorug' joyda, yolg'iz o'tiring. Internet barqaror bo'lsin. Birinchi marta Face ID modeli yuklanadi (taxminan 6 MB).</p>`;
  box.innerHTML=h;
  const b=$("#btn-exam");if(b)b.onclick=startExam;
}


// --- KIRISHDA MAJBURIY FACE ID (ro'yxatdan o'tishda yuz ro'yxatga olinadi, har kirishda tekshiriladi) ---
const fgKey=uid=>"ot-face-ok-"+uid;
function faceOkThisSession(uid){try{return sessionStorage.getItem(fgKey(uid))==="1"}catch(e){return false}}
function faceGate(){
  if(faceOkThisSession(S.uid))return Promise.resolve(true);
  return new Promise(resolve=>{
    let stream=null,stopped=false;const uid=S.uid;
    const ov=$("#exam");ov.hidden=false;ov.classList.add("fg");$(".exam-top b").textContent="OchiqTanlov";document.body.classList.add("exam-open");
    $("#ex-prog").textContent="";$("#ex-timer").textContent="";
    const ui=h=>{$("#ex-body").innerHTML=h};
    const done=ok=>{stopped=true;if(stream)stream.getTracks().forEach(t=>t.stop());$("#ex-video").srcObject=null;ov.hidden=true;ov.classList.remove("fg");document.body.classList.remove("exam-open");
      if(ok){try{sessionStorage.setItem(fgKey(uid),"1")}catch(e){}}resolve(ok)};
    const fail=(t,m)=>{if(stream)stream.getTracks().forEach(x=>x.stop());exCam("Kamera o'chirildi");
      ui(`<div class="ex-card bad"><h2>${esc(t)}</h2><p>${esc(m)}</p><div class="btnrow"><button class="btn" type="button" id="fg-retry">Qayta urinish</button><button class="btn ghost" type="button" id="fg-out">Chiqish</button></div></div>`);
      $("#fg-retry").onclick=()=>{stream=null;run()};$("#fg-out").onclick=()=>done(false)};
    async function run(){
      if(stopped)return;
      let face=null;try{const g=await fs.doc("faces/"+uid).get();face=g.exists?g.data():null}catch(e){}
      const enroll=!face||!Array.isArray(face.desc);
      ui(`<div class="ex-card"><h2>${enroll?"Face ID: yuzingizni ro'yxatga olish":"Face ID: shaxsni tasdiqlash"}</h2><p>${enroll?"Ilovadan foydalanish uchun yuzingiz bir marta ro'yxatga olinadi. Keyingi har kirishda u bilan solishtiriladi. Rasm saqlanmaydi — faqat yuzning raqamli izi.":"Kirish uchun kameraga qarang. Yuzingiz ro'yxatdagi yuz bilan solishtiriladi."}</p><p class="note" id="fg-msg">Kameraga ruxsat bering…</p><div><button class="btn ghost" type="button" id="fg-out">Bekor qilish va chiqish</button></div></div>`);
      $("#fg-out").onclick=()=>done(false);
      const msg=t=>{const m=$("#fg-msg");if(m)m.textContent=t};
      exCam("Kamera ochilmoqda…");
      try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false})}
      catch(e){return fail("Kamera ochilmadi","Face ID uchun kamera kerak. "+(location.protocol==="file:"?"Ilova internetdagi versiyani ocholmadi — internetni tekshiring. ":"")+"Brauzerda manzil satri yonidagi kamera belgisini bosib ruxsat bering; telefonda: Sozlamalar → Ilovalar → OchiqTanlov → Ruxsatlar → Kamera. ("+String(e&&e.name||e)+")")}
      if(stopped){stream.getTracks().forEach(t=>t.stop());return}
      const v=$("#ex-video");v.srcObject=stream;try{await v.play()}catch(e){}exCam("Kamera yoqiq","on");
      try{msg("Face ID modeli yuklanmoqda (birinchi marta ~6 MB, 10–40 soniya)…");await loadFace()}catch(e){return fail("Face ID yuklanmadi","Internet aloqasini tekshirib, qayta urinib ko'ring."+(faceErr?" Texnik ma'lumot: "+faceErr:""))}
      msg("Kameraga to'g'ri qarang…");
      const desc=await captureFace(v,enroll?5:3,25000,msg);
      if(stopped)return;
      if(!desc)return fail("Yuz aniqlanmadi","Yorug'roq joyga o'tib, kameraga to'g'ri qarang va qayta urinib ko'ring.");
      if(enroll){
        try{await fs.doc("faces/"+uid).set({desc,at:Date.now(),login:S.login||""})}
        catch(e){let ex=null;try{const g=await fs.doc("faces/"+uid).get();ex=g.exists?g.data():null}catch(_){}
          if(ex&&Array.isArray(ex.desc)){if(dist(desc,ex.desc)<=FACE_MATCH){S.face=ex;return done(true)}return fail("Yuz mos kelmadi","Bu akkauntga faqat uning egasi kira oladi.")}
          return fail("Face ID saqlanmadi","Internet aloqasini tekshirib, qayta urinib ko'ring. ("+(e&&e.code||e)+")")}
        S.face={desc};toast("Yuzingiz ro'yxatga olindi");return done(true);
      }
      const d=dist(desc,face.desc);
      if(d>FACE_MATCH){
        const dv=device();fs.collection("failed").add({t:Date.now(),login:S.login||"",kind:dv.kind,os:dv.os,br:"Face ID mos kelmadi"}).catch(()=>{});
        return fail("Yuz mos kelmadi","Bu akkauntga faqat uning egasi kira oladi. Agar bu sizning akkauntingiz bo'lsa, yorug'roq joyda qayta urinib ko'ring yoki bosh administratorga murojaat qiling.");
      }
      done(true);
    }
    run();
  });
}

let EX=null;
function exUI(html){$("#ex-body").innerHTML=html}
function exCam(st,cls){const e=$("#ex-cam-st");e.textContent=st;$("#ex-cam").className="exam-cam "+(cls||"")}
function stopCam(){if(EX&&EX.stream)EX.stream.getTracks().forEach(t=>t.stop());const v=$("#ex-video");if(v)v.srcObject=null}
function exClose(){
  if(EX&&EX.reqUnsub){try{EX.reqUnsub()}catch(e){}}
  if(pendingReload)setTimeout(checkVersion,0);
  stopCam();clearTimeout(EX&&EX.ptimer);clearInterval(EX&&EX.qtimer);
  EX=null;$("#exam").hidden=true;document.body.classList.remove("exam-open");
  try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}
  render();
}
function exFail(title,msg){
  exUI(`<div class="ex-card bad"><h2>${esc(title)}</h2><p>${esc(msg)}</p><div><button class="btn" type="button" id="ex-x">Yopish</button></div></div>`);
  $("#ex-x").onclick=exClose;
}
async function startExam(){
  if(EX)return;
  if(S.myAttempt){toast("Siz testni allaqachon topshirgansiz");return}
  EX={answers:{},phase:"prep"};
  $("#exam").hidden=false;$(".exam-top b").textContent="Kasbiy test";document.body.classList.add("exam-open");$("#ex-prog").textContent="";$("#ex-timer").textContent="";
  exCam("Kamera ochilmoqda…");
  exUI(`<div class="ex-card"><h2>Tayyorlanmoqda</h2><p id="ex-msg">Kameraga ruxsat bering…</p><div><button class="btn ghost" type="button" id="ex-x">Bekor qilish</button></div></div>`);
  $("#ex-x").onclick=exClose;
  const msg=t=>{const m=$("#ex-msg");if(m)m.textContent=t};
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("nocam");
    EX.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
  }catch(e){if(!EX)return;exFail("Kamera ochilmadi","Test faqat kamera yoqiq holda topshiriladi. Ilova sozlamalarida kameraga ruxsat bering va qayta urinib ko'ring.");return}
  if(!EX){return}
  const v=$("#ex-video");v.srcObject=EX.stream;try{await v.play()}catch(e){}
  exCam("Kamera yoqiq","on");
  try{msg("Face ID modeli yuklanmoqda…");await loadFace()}catch(e){if(EX)exFail("Face ID yuklanmadi","Internet aloqasini tekshirib, qayta urinib ko'ring.");return}
  if(!EX)return;
  msg("Kameraga to'g'ri qarang…");
  const desc=await captureFace(v,3,25000,msg);
  if(!EX)return;
  if(!desc){exFail("Yuz aniqlanmadi","25 soniya ichida yuzingizni aniq ko'ra olmadik. Yorug'roq joyga o'tib, kameraga to'g'ri qarab qayta urinib ko'ring.");return}
  let enrolled=false,fd=null;
  // Face ID izini har safar to'g'ridan-to'g'ri bazadan o'qiymiz (xotiradagi nusxaga tayanmaymiz)
  const readFace=async()=>{try{const g=await fs.doc("faces/"+S.uid).get();return g.exists?g.data():null}catch(e){return undefined}};
  let face=await readFace();
  if(face===undefined){exFail("Face ID tekshirilmadi","Internet aloqasini tekshirib, qayta urinib ko'ring.");return}
  if(!face){try{await fs.doc("faces/"+S.uid).set({desc,at:Date.now(),login:S.login||""});enrolled=true;S.face={desc}}catch(e){face=await readFace();if(!face){exFail("Face ID saqlanmadi","Internet aloqasini tekshirib, qayta urinib ko'ring. ("+(e&&e.code||e)+")");return}}}
  if(!EX)return;
  if(!enrolled&&face&&Array.isArray(face.desc)){S.face=face;fd=dist(desc,face.desc);
    if(fd>FACE_MATCH){exFail("Face ID: yuz mos kelmadi","Kameradagi yuz ro'yxatga olingan yuzga mos kelmadi. Test faqat akkaunt egasining o'zi topshirishi mumkin. Xatolik bo'lsa, bosh administratorga murojaat qiling.");
      log("test",`Face ID mos kelmadi: ${S.login} (masofa ${fd.toFixed(2)})`).catch(()=>{});return}}
  EX.ref=desc;
  let qs=[];
  try{msg("Savollar yuklanmoqda…");const g=await fs.collection("questions").get();qs=g.docs.map(d=>({id:d.id,...d.data()})).filter(q=>q.q&&Array.isArray(q.o)&&q.o.length>=2)}catch(e){}
  if(!EX)return;
  const n=Math.min(Math.max(1,+((S.testCfg||{}).count)||10),qs.length);
  if(!qs.length){exFail("Savollar yo'q","Bosh administrator hali savollarni yuklamagan.");return}
  EX.qs=shuffle(qs).slice(0,n);
  if(!testWindow().ok){exFail("Test vaqti emas","Test faqat bosh administrator belgilagan vaqt oralig'ida topshiriladi.");return}
  // Bosh administrator ruxsatini so'rash
  const c=S.contacts[S.uid]||{};
  try{await fs.doc("testreq/"+S.uid).set({uid:S.uid,login:S.login||"",name:c.name||(S.profile||{}).name||"",at:Date.now(),status:"waiting",enrolled,faceDist:fd==null?null:Math.round(fd*1000)/1000,device:devText(device())})}
  catch(e){exFail("So'rov yuborilmadi","Internet aloqasini tekshirib, qayta urinib ko'ring.");return}
  exUI(`<div class="ex-card"><h2>${enrolled?"Yuzingiz ro'yxatga olindi ✓":"Face ID tasdiqlandi ✓"}</h2>
    <p><b>Bosh administrator ruxsatini kuting.</b> Ruxsat berilishi bilan test shu ekranda boshlanadi. Kamera oldidan ketmang.</p>
    <div class="waitbar"><span></span></div>
    <div><button class="btn ghost" type="button" id="ex-x">Bekor qilish</button></div></div>`);
  $("#ex-x").onclick=()=>{if(EX&&EX.reqUnsub)EX.reqUnsub();exClose()};
  exCam("Ruxsat kutilmoqda","on");
  EX.reqUnsub=fs.doc("testreq/"+S.uid).onSnapshot(sn=>{
    if(!EX||EX.phase!=="prep")return;const r=sn.exists?sn.data():null;if(!r)return;
    if(r.status==="denied"){EX.reqUnsub();exFail("Ruxsat berilmadi","Bosh administrator testni boshlashga ruxsat bermadi. Batafsil ma'lumot uchun unga murojaat qiling.");return}
    if(r.status==="approved"){EX.reqUnsub();beginRun(n,enrolled,fd)}
  },()=>{});
}
async function beginRun(n,enrolled,fd){
  if(!EX)return;
  exUI(`<div class="ex-card"><h2>Ruxsat berildi ✓</h2>
    <p>${n} ta savol. Har bir savolning o'z vaqti bor. Jami taxminan ${Math.ceil(EX.qs.reduce((s,q)=>s+(q.sec||60),0)/60)} daqiqa.</p>
    <ul class="rules"><li>Kameraga qarab o'tiring, yuzingiz doim ko'rinib tursin.</li><li>Boshqa tomonga qarasangiz, kamerada boshqa odam paydo bo'lsa yoki ilovadan chiqsangiz — <b>test to'xtatiladi</b>.</li><li>Javobni tanlab "Tasdiqlash"ni bosing. Ortga qaytib bo'lmaydi.</li></ul>
    <div class="btnrow"><button class="btn" type="button" id="ex-go">Testni boshlash</button><button class="btn ghost" type="button" id="ex-x">Bekor qilish</button></div></div>`);
  $("#ex-x").onclick=exClose;
  $("#ex-go").onclick=async()=>{
    $("#ex-go").disabled=true;
    EX.startedAt=Date.now();
    try{await fs.doc("attempts/"+S.uid).set({uid:S.uid,login:S.login||"",startedAt:EX.startedAt,status:"running",qids:EX.qs.map(q=>q.id),answers:{},face:{enrolled,dist:fd==null?null:Math.round(fd*1000)/1000},device:devText(device())})}
    catch(e){exFail("Test boshlanmadi","Ruxsat muddati (15 daqiqa) o'tgan, test vaqti tugagan yoki siz testni allaqachon topshirgansiz.");return}
    EX.phase="run";
    try{if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();EX.fs=true}}catch(e){}
    armGuards();proctor();showQ(0);
  };
}
// --- ilovadan chiqish, skrinshot va boshqa qoidabuzarliklar ---
function onHide(){if(document.visibilityState==="hidden")terminate("Ilovadan chiqildi yoki boshqa oynaga o'tildi")}
function onBlur(){terminate("Ilovadan chiqildi yoki boshqa oynaga o'tildi")}
function onKey(e){if(e.key==="PrintScreen"||(e.ctrlKey||e.metaKey)&&["p","s","c","u"].includes((e.key||"").toLowerCase())||(e.metaKey&&e.shiftKey)){e.preventDefault();if(e.key==="PrintScreen")terminate("Skrinshot olishga urinish")}}
function onFs(){if(EX&&EX.fs&&!document.fullscreenElement)terminate("To'liq ekran rejimidan chiqildi")}
const noCopy=e=>e.preventDefault();
function armGuards(){document.addEventListener("visibilitychange",onHide);window.addEventListener("blur",onBlur);window.addEventListener("pagehide",onBlur);document.addEventListener("keydown",onKey,true);document.addEventListener("keyup",onKey,true);document.addEventListener("fullscreenchange",onFs);["copy","cut","contextmenu","selectstart"].forEach(t=>document.addEventListener(t,noCopy,true))}
function disarmGuards(){document.removeEventListener("visibilitychange",onHide);window.removeEventListener("blur",onBlur);window.removeEventListener("pagehide",onBlur);document.removeEventListener("keydown",onKey,true);document.removeEventListener("keyup",onKey,true);document.removeEventListener("fullscreenchange",onFs);["copy","cut","contextmenu","selectstart"].forEach(t=>document.removeEventListener(t,noCopy,true))}
// --- kamera nazorati ---
function proctor(){
  if(!EX||EX.phase!=="run")return;
  const v=$("#ex-video"),now0=Date.now();
  (async()=>{
    let dets=[];
    try{dets=await faceapi.detectAllFaces(v,fOpts()).withFaceLandmarks(true)}catch(e){}
    if(!EX||EX.phase!=="run")return;
    const now=Date.now(),n=dets.length;
    EX.noFace=n===0?(EX.noFace||now):0;
    EX.multi=n>1?(EX.multi||now):0;
    const away=n===1&&poseOf(dets[0]).away;EX.away=away?(EX.away||now):0;
    if(EX.noFace&&now-EX.noFace>NOFACE_MS)return terminate("Yuz kamerada ko'rinmay qoldi");
    if(EX.multi&&now-EX.multi>MULTI_MS)return terminate("Kamerada boshqa odam paydo bo'ldi");
    if(EX.away&&now-EX.away>AWAY_MS)return terminate("Boshqa tomonga qaraldi");
    if(EX.noFace)exCam("Yuz ko'rinmayapti!","warn");else if(EX.multi)exCam("Boshqa odam!","warn");else if(EX.away)exCam("Kameraga qarang!","warn");else exCam("Nazorat: joyida","on");
    if(n===1&&now-(EX.idAt||EX.startedAt)>ID_EVERY_MS){EX.idAt=now;
      try{const r=await oneDescriptor(v);if(EX&&r.n===1&&dist(r.desc,EX.ref)>FACE_SAME)return terminate("Kameradagi odam almashdi (Face ID)")}catch(e){}}
    if(EX&&EX.phase==="run")EX.ptimer=setTimeout(proctor,Math.max(150,500-(Date.now()-now0)));
  })();
}
// --- savollar ---
function showQ(i){
  if(!EX||EX.phase!=="run")return;
  if(i>=EX.qs.length)return finishExam();
  const q=EX.qs[i],sec=Math.max(5,+q.sec||60),t0=Date.now();let sel=null;
  EX.i=i;$("#ex-prog").textContent=`Savol ${i+1} / ${EX.qs.length}`;
  const letters="ABCDEF";
  exUI(`<div class="ex-card q"><div class="ex-bar"><span id="ex-fill"></span></div><h2 class="ex-q">${esc(q.q)}</h2>
    <div class="ex-opts">${q.o.map((o,j)=>`<button type="button" class="ex-opt" data-j="${j}"><span>${letters[j]}</span>${esc(o)}</button>`).join("")}</div>
    <div class="btnrow"><button class="btn" type="button" id="ex-ok" disabled>${i+1<EX.qs.length?"Tasdiqlash va keyingisi":"Tasdiqlash va yakunlash"}</button></div></div>`);
  document.querySelectorAll(".ex-opt").forEach(b=>b.onclick=()=>{sel=+b.dataset.j;document.querySelectorAll(".ex-opt").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));$("#ex-ok").disabled=false});
  const next=()=>{if(!EX||EX.i!==i)return;clearInterval(EX.qtimer);EX.answers[q.id]={i:sel,t:Date.now()-t0};
    fs.doc("attempts/"+S.uid).update({answers:EX.answers}).catch(()=>{});showQ(i+1)};
  $("#ex-ok").onclick=next;
  clearInterval(EX.qtimer);
  const tick=()=>{const left=Math.max(0,sec*1000-(Date.now()-t0));$("#ex-timer").textContent=Math.ceil(left/1000)+" s";$("#ex-timer").classList.toggle("low",left<10000);
    const f=$("#ex-fill");if(f)f.style.width=(100*left/(sec*1000))+"%";if(left<=0)next()};
  tick();EX.qtimer=setInterval(tick,250);
}
async function finishExam(){
  if(!EX||EX.phase!=="run")return;EX.phase="end";disarmGuards();clearTimeout(EX.ptimer);clearInterval(EX.qtimer);stopCam();exCam("Kamera o'chirildi");$("#ex-timer").textContent="";
  try{await fs.doc("attempts/"+S.uid).update({answers:EX.answers,status:"done",finishedAt:Date.now()})}catch(e){}
  exUI(`<div class="ex-card"><h2>Test yakunlandi ✓</h2><p>Javoblaringiz qabul qilindi. Natija bosh administrator tizimida avtomatik hisoblanadi va "Profil va test" bo'limida paydo bo'ladi.</p><div><button class="btn" type="button" id="ex-x">Yopish</button></div></div>`);
  $("#ex-x").onclick=exClose;
}
function terminate(reason){
  if(!EX||EX.phase!=="run")return;EX.phase="end";disarmGuards();clearTimeout(EX.ptimer);clearInterval(EX.qtimer);stopCam();$("#ex-timer").textContent="";exCam("To'xtatildi","warn");
  fs.doc("attempts/"+S.uid).update({answers:EX.answers,status:"terminated",reason,finishedAt:Date.now()}).catch(()=>{});
  try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}
  exFail("Test to'xtatildi",reason+". Test qoidalariga ko'ra natija 0 ball bo'lib hisoblanadi. Texnik sabab bo'lsa, bosh administratorga murojaat qiling.");
}

// --- BOSH ADMIN: savollar, sozlamalar, baholash va reyting ---
let tqEdit=null;
function tqOptsRender(vals,correct){
  vals=vals||["","","",""];while(vals.length<4)vals.push("");
  $("#tq-opts").innerHTML=vals.map((v,j)=>`<div class="inline tq-opt"><input type="radio" name="tq-ok" value="${j}" ${correct===j?"checked":""} aria-label="To'g'ri javob ${"ABCDEF"[j]}"><input class="tq-o" maxlength="200" placeholder="${"ABCDEF"[j]}) variant" value="${esc(v)}"></div>`).join("")+(vals.length<6?`<div><button class="linkbtn" type="button" id="tq-more">+ variant qo'shish</button></div>`:"");
  const m=$("#tq-more");if(m)m.onclick=()=>{const cur=[...document.querySelectorAll(".tq-o")].map(x=>x.value),c=document.querySelector('input[name=tq-ok]:checked');tqOptsRender([...cur,""],c?+c.value:null)};
}
tqOptsRender();
function tqReset(){tqEdit=null;$("#tq-q").value="";$("#tq-sec").value=60;tqOptsRender();$("#tq-title").textContent="Yangi savol";$("#tq-btn").textContent="Savolni qo'shish";$("#tq-cancel").hidden=true;$("#tq-err").hidden=true}
$("#tq-cancel").onclick=tqReset;
$("#tqform").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#tq-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;
  const q=$("#tq-q").value.trim(),raw=[...document.querySelectorAll(".tq-o")].map(x=>x.value.trim()),c=document.querySelector('input[name=tq-ok]:checked'),sec=+$("#tq-sec").value;
  if(!q)return fail("Savol matnini yozing.");
  const idx=raw.map((v,j)=>v?j:-1).filter(j=>j>=0);if(idx.length<2)return fail("Kamida 2 ta variant yozing.");
  if(!c||!raw[+c.value])return fail("To'g'ri javobni belgilang.");
  if(!(sec>=5&&sec<=600))return fail("Vaqt 5 dan 600 soniyagacha bo'lsin.");
  const o=idx.map(j=>raw[j]),a=idx.indexOf(+c.value);
  const id=tqEdit||("q"+Date.now().toString(36)+Math.random().toString(36).slice(2,5));
  try{await fs.doc("questions/"+id).set({q,o,sec,at:Date.now()});await fs.doc("qkeys/"+id).set({a});toast(tqEdit?"Savol yangilandi":"Savol qo'shildi");tqReset()}
  catch(e2){fail("Saqlab bo'lmadi: Firestore qoidalarini yangilang.")}
});
$("#tcfg").addEventListener("submit",async e=>{
  e.preventDefault();
  const fr=$("#tc-from").value?new Date($("#tc-from").value).getTime():null,to=$("#tc-to").value?new Date($("#tc-to").value).getTime():null;
  if(fr&&to&&to<=fr){toast("Tugash vaqti boshlanishdan keyin bo'lishi kerak");return}
  try{await fs.doc("config/test").set({enabled:$("#tc-on").checked,count:Math.max(1,Math.min(100,+$("#tc-n").value||10)),startAt:fr,endAt:to,at:Date.now()});
    await log("test",`Test sozlamalari: ${$("#tc-on").checked?"ochiq":"yopiq"}, ${$("#tc-n").value} ta savol${fr?", "+dt(fr):""}${to?" — "+dt(to):""}`);$("#tc-saved").textContent="Saqlandi";setTimeout(()=>$("#tc-saved").textContent="",2500)}catch(e2){toast("Saqlab bo'lmadi")}
});
function parseBulk(text,defSec){
  const blocks=text.replace(/\r/g,"").split(/\n\s*\n/).map(b=>b.split("\n").map(l=>l.trim()).filter(Boolean)).filter(b=>b.length);
  const out=[],errs=[];
  blocks.forEach((b,bi)=>{
    let sec=defSec,q=[],o=[],a=-1;
    b.forEach(l=>{const t=l.match(/^(vaqt|time|время)\s*[:=]?\s*(\d+)/i);
      if(t){sec=+t[2];return}
      const m=l.match(/^\*?\s*([A-Fa-f])\s*[\)\.]\s*(.+)$/);
      if(m){let txt=m[2].trim(),ok=l.startsWith("*")||/\*\s*$/.test(txt);txt=txt.replace(/\s*\*\s*$/,"").trim();if(ok)a=o.length;o.push(txt);return}
      if(!o.length)q.push(l.replace(/^\d+\s*[\.\)]\s*/,""));});
    const qt=q.join(" ").trim();
    if(!qt)errs.push(`${bi+1}-savol: savol matni yo'q`);else if(o.length<2)errs.push(`${bi+1}-savol: kamida 2 ta variant kerak`);else if(a<0)errs.push(`${bi+1}-savol: to'g'ri javob (*) belgilanmagan`);else if(!(sec>=5&&sec<=600))errs.push(`${bi+1}-savol: vaqt 5–600 soniya bo'lsin`);
    else out.push({q:qt,o,a,sec});
  });
  return {out,errs};
}
$("#tb-file").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$("#tb-text").value=String(r.result||"")};r.readAsText(f,"utf-8")});
$("#tb-btn").onclick=async()=>{
  const err=$("#tb-err");err.hidden=true;const {out,errs}=parseBulk($("#tb-text").value,+$("#tb-sec").value||60);
  if(errs.length){err.textContent=errs.slice(0,6).join("; ")+(errs.length>6?" …":"");err.hidden=false;return}
  if(!out.length){err.textContent="Matn bo'sh.";err.hidden=false;return}
  const b=$("#tb-btn");b.disabled=true;let n=0;
  try{for(const x of out){const id="q"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);await fs.doc("questions/"+id).set({q:x.q,o:x.o,sec:x.sec,at:Date.now()});await fs.doc("qkeys/"+id).set({a:x.a});n++;$("#tb-info").textContent=n+" / "+out.length}
    await log("test",`${n} ta savol yuklandi`);toast(n+" ta savol yuklandi");$("#tb-text").value="";$("#tb-file").value=""}
  catch(e){err.textContent=`${n} ta yuklandi, keyingisida xato: Firestore qoidalarini tekshiring.`;err.hidden=false}
  b.disabled=false;
};

// --- testni boshlashga ruxsat so'rovlari (bosh admin) ---
const APPROVE_MS=15*60000;
var reqSeen=null;
const trSel=new Set();
function renderTestReqs(){
  const L=[...(S.testreqs||[])].sort((a,b)=>(a.status==="waiting"?0:1)-(b.status==="waiting"?0:1)||(b.at||0)-(a.at||0)).filter(r=>r.status==="waiting"||Date.now()-(r.decidedAt||r.at||0)<3*3600e3);
  const w=L.filter(r=>r.status==="waiting"),wid=w.map(r=>r.id);
  [...trSel].forEach(id=>{if(!wid.includes(id))trSel.delete(id)});
  $("#trq-count").textContent=w.length?w.length+" ta so'rov javob kutmoqda":"Kutilayotgan so'rov yo'q";
  const nSel=trSel.size,allOn=w.length>0&&nSel===w.length;
  const bar=w.length?`<div class="trq-bar"><label class="chk"><input type="checkbox" id="trq-all" ${allOn?"checked":""}> Hammasini belgilash</label><span class="note" id="trq-sel">${nSel?nSel+" ta belgilandi":"Hech kim belgilanmagan"}</span><span class="spacer"></span>
    <button class="btn" type="button" id="trq-ok" ${nSel?"":"disabled"}>Belgilanganlarga ruxsat${nSel?" ("+nSel+")":""}</button><button class="btn ghost" type="button" id="trq-no" ${nSel?"":"disabled"}>Belgilanganlarni rad etish</button><button class="btn ghost" type="button" id="trq-okall">Hammasiga ruxsat (${w.length})</button></div>`:"";
  $("#trq-list").innerHTML=L.length?bar+`<div class="tablebox"><table class="wide"><thead><tr><th style="width:44px"></th><th>Vaqt</th><th>Login</th><th>F.I.Sh.</th><th>Face ID</th><th>Qurilma</th><th>Holat</th><th></th></tr></thead><tbody>`+L.map(r=>{
    const att=S.attempts.find(a=>a.id===r.id),wait=r.status==="waiting",st=wait?`<span class="pill res">Kutmoqda</span>`:r.status==="approved"?(att?`<span class="pill win">Boshladi</span>`:Date.now()-(r.decidedAt||0)>APPROVE_MS?`<span class="pill closed">Muddati o'tdi</span>`:`<span class="pill open">Ruxsat berildi</span>`):`<span class="pill out">Rad etildi</span>`;
    return `<tr class="${wait?"winner":""}${trSel.has(r.id)?" sel":""}"><td>${wait?`<input type="checkbox" class="trq-c" data-id="${esc(r.id)}" aria-label="${esc(r.login||"")} ni belgilash" ${trSel.has(r.id)?"checked":""}>`:""}</td><td class="mono" style="white-space:nowrap">${dt(r.at)}</td><td class="mono">${esc(r.login||"—")}</td><td>${esc(r.name||"—")}</td><td>${r.enrolled?"Ro'yxatga olindi":r.faceDist!=null?`Mos (${r.faceDist})`:"—"}</td><td>${esc(r.device||"")}</td><td>${st}</td>
      <td>${wait?`<span class="btnrow"><button class="btn" type="button" data-rqok="${esc(r.id)}">Ruxsat berish</button><button class="btn ghost" type="button" data-rqno="${esc(r.id)}">Rad etish</button></span>`:""}</td></tr>`}).join("")+`</tbody></table></div>`:`<div class="empty">Hozircha so'rov yo'q.</div>`;
  const box=$("#trq-list");
  async function decide(ids,ok,btn){
    if(!ids.length)return;if(btn)btn.disabled=true;let done=0,fail=0;
    await Promise.all(ids.map(id=>fs.doc("testreq/"+id).update({status:ok?"approved":"denied",decidedAt:Date.now(),decidedBy:S.uid}).then(()=>{done++;trSel.delete(id)}).catch(()=>{fail++})));
    const names=ids.map(id=>{const r=S.testreqs.find(x=>x.id===id);return r?r.login:id}).join(", ");
    if(done)await log("test",`Testga ${ok?"ruxsat berildi":"ruxsat berilmadi"} (${done} ta): ${names}`);
    toast(fail?`${done} ta bajarildi, ${fail} tasi bajarilmadi`:(ok?`${done} ta ishtirokchiga ruxsat berildi`:`${done} ta so'rov rad etildi`));
    renderTestReqs();
  }
  box.querySelectorAll("[data-rqok],[data-rqno]").forEach(b=>b.onclick=()=>decide([b.dataset.rqok||b.dataset.rqno],!!b.dataset.rqok,b));
  box.querySelectorAll(".trq-c").forEach(c=>c.onchange=()=>{c.checked?trSel.add(c.dataset.id):trSel.delete(c.dataset.id);renderTestReqs()});
  const all=$("#trq-all");if(all)all.onchange=()=>{trSel.clear();if(all.checked)wid.forEach(id=>trSel.add(id));renderTestReqs()};
  const ok=$("#trq-ok");if(ok)ok.onclick=()=>decide([...trSel],true,ok);
  const no=$("#trq-no");if(no)no.onclick=()=>decide([...trSel],false,no);
  const oa=$("#trq-okall");if(oa)oa.onclick=()=>{if(!oa.dataset.sure){oa.dataset.sure="1";oa.textContent=`Tasdiqlang: ${w.length} ta hammasiga ruxsat`;setTimeout(()=>{delete oa.dataset.sure;if(oa.isConnected)oa.textContent=`Hammasiga ruxsat (${w.length})`},5000);return}decide(wid,true,oa)};
}
function notifyReqs(){
  const w=(S.testreqs||[]).filter(r=>r.status==="waiting").map(r=>r.id);
  if(reqSeen&&w.some(id=>!reqSeen.includes(id))){toast("Yangi so'rov: ishtirokchi testni boshlashga ruxsat kutmoqda");try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator();o.connect(c.destination);o.frequency.value=880;o.start();o.stop(c.currentTime+.18)}catch(e){}}
  reqSeen=w;
  const a=document.querySelector('#nav a[href="#testlar"]');if(a)a.textContent="Test"+(w.length?" ("+w.length+")":"");
}

let gradeT=null,grading=false;
function gradeSoon(){clearTimeout(gradeT);gradeT=setTimeout(gradeAll,700)}
async function gradeAll(){
  if(!S.isChief||grading)return;grading=true;
  try{for(const a of S.attempts){
    if(a.status==="running")continue;const r=S.results[a.id];if(r&&r.attemptAt===a.startedAt)continue;
    const qids=a.qids||[],ans=a.answers||{};let correct=0;
    if(a.status!=="terminated")qids.forEach(id=>{const k=S.qkeys[id],an=ans[id],q=S.questions.find(x=>x.id===id);const lim=((q&&+q.sec)||60)*1000+5000;if(k&&an&&an.i!=null&&an.i===k.a&&(an.t||0)<=lim)correct++});
    const test=a.status==="terminated"||!qids.length?0:Math.round(100*correct/qids.length);
    await fs.doc("results/"+a.id).set({test,correct,total:qids.length,attemptAt:a.startedAt,status:a.status,reason:a.reason||"",gradedAt:Date.now(),login:a.login||""});
  }}catch(e){console.warn(e)}
  grading=false;
}
function renderTestAdmin(){
  const cfg=S.testCfg||{},Q=[...S.questions].sort((a,b)=>(a.at||0)-(b.at||0));
  if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest("#tcfg")){$("#tc-on").checked=!!cfg.enabled;$("#tc-n").value=cfg.count||10;$("#tc-from").value=toLocalInput(cfg.startAt);$("#tc-to").value=toLocalInput(cfg.endAt)}
  renderTestReqs();
  const A=S.attempts,done=A.filter(a=>a.status!=="running"),res=Object.values(S.results).filter(r=>typeof r.test==="number");
  const avg=res.length?Math.round(res.reduce((s,r)=>s+r.test,0)/res.length):"—";
  $("#t-kpis").innerHTML=`<div class="kpi"><span>Test holati</span><b style="color:${testWindow().ok?"var(--accent)":"var(--muted)"}">${testWindow().ok?"Ochiq":testWindow().why==="early"?"Kutilmoqda":testWindow().why==="late"?"Tugagan":"Yopiq"}</b>${cfg.startAt||cfg.endAt?`<small class="note">${cfg.startAt?dt(cfg.startAt):"…"} — ${cfg.endAt?dt(cfg.endAt):"…"}</small>`:""}</div><div class="kpi"><span>Savollar bankida</span><b>${Q.length}</b></div><div class="kpi"><span>Har kimga savol</span><b>${Math.min(cfg.count||10,Q.length)}</b></div><div class="kpi"><span>Topshirganlar</span><b>${done.length}</b></div><div class="kpi"><span>Hozir topshiryapti</span><b>${A.filter(a=>a.status==="running").length}</b></div><div class="kpi"><span>To'xtatilgan</span><b style="color:${A.some(a=>a.status==="terminated")?"var(--bad)":"inherit"}">${A.filter(a=>a.status==="terminated").length}</b></div><div class="kpi"><span>O'rtacha ball</span><b>${avg}</b></div>`;
  $("#tq-count").textContent=Q.length+" ta savol · jami vaqt "+Math.round(Q.reduce((s,q)=>s+(+q.sec||60),0)/60)+" daqiqa";
  $("#tq-list").innerHTML=Q.length?`<div class="tablebox"><table class="wide"><thead><tr><th>#</th><th>Savol va variantlar</th><th>Vaqt (soniya)</th><th></th></tr></thead><tbody>`+Q.map((q,i)=>{const k=S.qkeys[q.id];
    return `<tr><td class="num">${i+1}</td><td><b>${esc(q.q)}</b><div class="opts-mini">${(q.o||[]).map((o,j)=>`<span class="${k&&k.a===j?"ok":""}">${"ABCDEF"[j]}) ${esc(o)}${k&&k.a===j?" ✓":""}</span>`).join("")}</div>${k?"":`<div class="why">To'g'ri javob kaliti topilmadi</div>`}</td>
      <td><div class="inline"><input type="number" min="5" max="600" value="${+q.sec||60}" data-sec="${esc(q.id)}" style="width:90px"><button class="btn ghost" type="button" data-secsave="${esc(q.id)}">Saqlash</button></div></td>
      <td><span class="btnrow"><button class="btn ghost" type="button" data-qed="${esc(q.id)}">Tahrirlash</button><button class="btn ghost" type="button" data-qdel="${esc(q.id)}">O'chirish</button></span></td></tr>`}).join("")+`</tbody></table></div>`:`<div class="empty">Savollar banki bo'sh. Yuqoridagi shakl orqali savol qo'shing yoki ommaviy yuklang.</div>`;
  const L=$("#tq-list");
  L.querySelectorAll("[data-secsave]").forEach(b=>b.onclick=async()=>{const id=b.dataset.secsave,v=+L.querySelector(`[data-sec="${id}"]`).value;if(!(v>=5&&v<=600)){toast("Vaqt 5–600 soniya");return}try{await fs.doc("questions/"+id).update({sec:v});toast("Vaqt saqlandi: "+v+" s")}catch(e){toast("Bajarib bo'lmadi")}});
  L.querySelectorAll("[data-qed]").forEach(b=>b.onclick=()=>{const q=S.questions.find(x=>x.id===b.dataset.qed),k=S.qkeys[q.id];tqEdit=q.id;$("#tq-q").value=q.q;$("#tq-sec").value=q.sec||60;tqOptsRender([...q.o],k?k.a:null);$("#tq-title").textContent="Savolni tahrirlash";$("#tq-btn").textContent="O'zgarishlarni saqlash";$("#tq-cancel").hidden=false;$("#tqform").scrollIntoView({behavior:"smooth",block:"start"})});
  L.querySelectorAll("[data-qdel]").forEach(b=>b.onclick=()=>{const id=b.dataset.qdel,cell=b.parentElement;
    cell.innerHTML=`<span class="confirm">O'chirilsinmi? <button class="btn danger" type="button" data-yes>Ha</button><button class="btn ghost" type="button" data-no>Yo'q</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderTestAdmin();
    cell.querySelector("[data-yes]").onclick=async()=>{try{await fs.doc("questions/"+id).delete();await fs.doc("qkeys/"+id).delete();toast("O'chirildi")}catch(e){toast("Bajarib bo'lmadi")}}});
  const rows=A.map(a=>{const r=S.results[a.id]||{},c=S.contacts[a.id]||{},f=(S.faces||[]).find(x=>x.id===a.id);return {a,r,name:c.name||"",login:a.login||c.login||"",score:typeof r.test==="number"&&r.attemptAt===a.startedAt?r.test:null,dur:a.finishedAt?a.finishedAt-a.startedAt:null,face:f}})
    .sort((x,y)=>((y.score??-1)-(x.score??-1))||((x.dur||9e15)-(y.dur||9e15)));
  let rk=0;
  $("#tr-list").innerHTML=rows.length?`<div class="tablebox"><table class="wide"><thead><tr><th class="num">O'rin</th><th>Login</th><th>F.I.Sh.</th><th class="num">Ball</th><th class="num">To'g'ri</th><th>Holat</th><th>Face ID</th><th>Boshlagan</th><th class="num">Davomiyligi</th><th></th></tr></thead><tbody>`+rows.map(x=>{
    const st=x.a.status==="running"?`<span class="pill open">Topshiryapti</span>`:x.a.status==="terminated"?`<span class="pill out">To'xtatilgan</span><div class="why">${esc(x.a.reason||"")}</div>`:`<span class="pill win">Yakunlangan</span>`;
    const fc=x.a.face||{};const faceTxt=fc.enrolled?"Ro'yxatga olindi":fc.dist!=null?`Mos (${fc.dist})`:"—";
    const place=x.score!=null&&x.a.status==="done"?++rk:"—";
    return `<tr class="${place===1?"winner":""}"><td class="num">${place}</td><td class="mono">${esc(x.login||"—")}</td><td>${esc(x.name||"—")}</td><td class="num"><b>${x.score==null?(x.a.status==="running"?"…":"hisoblanmoqda"):x.score}</b></td><td class="num">${x.r.attemptAt===x.a.startedAt?`${x.r.correct}/${x.r.total}`:"—"}</td><td>${st}</td><td>${faceTxt}</td><td class="mono" style="white-space:nowrap">${dt(x.a.startedAt)}</td><td class="num">${x.dur?Math.round(x.dur/60000*10)/10+" daq":"—"}</td>
      <td><span class="btnrow"><button class="btn ghost" type="button" data-retake="${esc(x.a.id)}">Qayta topshirishga ruxsat</button>${x.face?`<button class="btn ghost" type="button" data-facereset="${esc(x.a.id)}">Face ID ni tiklash</button>`:""}</span></td></tr>`}).join("")+`</tbody></table></div>`:`<div class="empty">Hali hech kim test topshirmagan.</div>`;
  const T=$("#tr-list");
  T.querySelectorAll("[data-retake]").forEach(b=>b.onclick=()=>{const id=b.dataset.retake,cell=b.parentElement,a=S.attempts.find(x=>x.id===id);
    cell.innerHTML=`<span class="confirm">Eski natija o'chiriladi. Ruxsat berilsinmi? <button class="btn" type="button" data-yes>Ha</button><button class="btn ghost" type="button" data-no>Yo'q</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderTestAdmin();
    cell.querySelector("[data-yes]").onclick=async()=>{try{await fs.doc("attempts/"+id).delete();await fs.doc("results/"+id).delete();await fs.doc("testreq/"+id).delete().catch(()=>{});await log("test",`Qayta topshirishga ruxsat: ${a?a.login:id}`);toast("Ruxsat berildi")}catch(e){toast("Bajarib bo'lmadi")}}});
  T.querySelectorAll("[data-facereset]").forEach(b=>b.onclick=async()=>{const id=b.dataset.facereset;try{await fs.doc("faces/"+id).delete();await log("test",`Face ID tiklandi: ${(S.attempts.find(x=>x.id===id)||{}).login||id}`);toast("Face ID tiklandi: keyingi testda qayta ro'yxatga olinadi")}catch(e){toast("Bajarib bo'lmadi")}});
  $("#tr-csv").onclick=()=>{const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';let k=0;
    downloadCsv("test-reytingi.csv","﻿"+[["O'rin","Login","F.I.Sh.","Ball","To'g'ri","Jami","Holat","Sabab","Boshlagan","Davomiyligi (daq)"].map(q).join(";")].concat(rows.map(x=>[x.score!=null&&x.a.status==="done"?++k:"",x.login,x.name,x.score??"",x.r.correct??"",x.r.total??"",x.a.status==="done"?"Yakunlangan":x.a.status==="terminated"?"To'xtatilgan":"Topshiryapti",x.a.reason||"",dt(x.a.startedAt),x.dur?Math.round(x.dur/6000)/10:""].map(q).join(";"))).join("\r\n"))};
}


// ---------- AKKAUNTNI O'CHIRISH (Google Play talabi) ----------
$("#del-btn").onclick=async()=>{
  const err=$("#del-err"),pw=$("#del-pass").value,u=auth.currentUser;err.hidden=true;
  if(!u)return;if(!pw){err.textContent="Parolingizni kiriting.";err.hidden=false;return}
  if(S.isChief||S.isAdmin){err.textContent="Administrator akkauntini ilovadan o'chirib bo'lmaydi. Avval bosh administrator huquqingizni olib tashlasin.";err.hidden=false;return}
  const b=$("#del-btn");b.disabled=true;
  try{await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,pw))}
  catch(e){err.textContent="Parol noto'g'ri.";err.hidden=false;b.disabled=false;return}
  const uid=u.uid;
  try{
    for(const p of ["applications/","profiles/","contacts/","faces/","logins/","testreq/"])await fs.doc(p+uid).delete().catch(()=>{});
    unsubAll();await u.delete();
    setQuick(null);setLock(false);remember(null);try{sessionStorage.clear()}catch(e){}
    S.role=null;location.hash="";toast("Akkauntingiz o'chirildi");route();
  }catch(e){err.textContent="O'chirib bo'lmadi: "+(e&&e.code||"internet aloqasini tekshiring");err.hidden=false;b.disabled=false}
};

// ---------- MAJBURIY YANGILANISH ----------
let appCfg=null,pendingReload=false;
fs.doc("config/app").onSnapshot(sn=>{appCfg=sn.exists?sn.data():{};checkVersion()},()=>{});
function showUpd(html){$("#updBody").innerHTML=html;$("#upd").hidden=false;document.body.classList.add("modal-open")}
function checkVersion(){
  const c=appCfg||{};
  if(c.webVer&&c.webVer>WEB_VER){
    if(EX&&EX.phase==="run"){pendingReload=true;return}
    let done=false;try{done=sessionStorage.getItem("ot-reload-"+c.webVer)==="1";sessionStorage.setItem("ot-reload-"+c.webVer,"1")}catch(e){}
    showUpd(`<h2>Yangi versiya o'rnatilmoqda…</h2><p>Ilova yangilandi (v${c.webVer}). Sahifa avtomatik qayta yuklanadi.</p>${done?`<div><button class="btn" type="button" onclick="location.reload()">Qayta yuklash</button></div>`:""}`);
    if(!done)setTimeout(()=>location.reload(),2000);
    return;
  }
  if(APK_VER!=null&&c.minApk&&APK_VER<c.minApk){
    const url=FROM_PLAY?PLAY_URL:(c.apkUrl||SITE()+"OchiqTanlov.apk");
    showUpd(`<img src="logo.png" alt="" width="56" height="56" style="border-radius:12px"><h2>Yangilash majburiy</h2><p>OchiqTanlov ilovasining yangi versiyasi chiqdi (v${c.minApk}). Sizda v${APK_VER||"6 yoki eski"} o'rnatilgan. Davom etish uchun yangilang — akkauntingiz va ma'lumotlaringiz saqlanib qoladi.</p>
      ${c.note?`<div class="banner"><b>Yangiliklar:</b> ${esc(c.note)}</div>`:""}
      <div><a class="btn" href="${esc(url)}" id="updGo" style="text-decoration:none;display:inline-block">${FROM_PLAY?"Play Market'da yangilash":"Yangi versiyani yuklab olish"}</a></div>
      ${FROM_PLAY?`<p class="note">Play Market ochiladi — <b>Yangilash</b> tugmasini bosing, so'ng ilovani qayta oching.</p>`:`<ol class="rules"><li>Fayl yuklab olingach, uni oching va <b>O'rnatish</b> ni bosing (eskisining ustidan o'rnatiladi).</li><li>Telefon "noma'lum manba" deb so'rasa, ruxsat bering.</li><li>Ilovani qayta oching.</li></ol>`}
      <p class="note">Tugma ishlamasa, telefon brauzerida (Chrome) shu manzilni oching:<br><span class="mono" style="word-break:break-all">${esc(url)}</span></p>
      <div><button class="btn ghost" type="button" id="updCopy">Manzilni nusxalash</button></div>`);
    $("#updCopy").onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("Manzil nusxalandi — brauzerga joylashtiring")}catch(e){toast(url)}};
    return;
  }
  $("#upd").hidden=true;if(!$("#cert")||$("#cert").hidden)document.body.classList.remove("modal-open");
  if(S.isChief&&(!c.webVer||c.webVer<WEB_VER))fs.doc("config/app").set({...c,webVer:WEB_VER,webAt:Date.now()}).catch(()=>{});
}
function renderVersion(){
  const c=appCfg||{};
  $("#verInfo").innerHTML=`<dt>Sayt (kod) versiyasi</dt><dd class="mono">v${WEB_VER}${c.webVer?` · tarqatilgan: v${c.webVer}`:""}</dd><dt>Eng kam APK versiyasi</dt><dd class="mono">${c.minApk?"v"+c.minApk:"cheklov yo'q"}</dd><dt>Siz hozir</dt><dd>${APK_VER==null?"brauzerdasiz":"APK v"+(APK_VER||"6 yoki eski")}</dd>`;
  if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest("#verForm")){$("#ver-min").value=c.minApk||"";$("#ver-url").value=c.apkUrl||SITE()+"OchiqTanlov.apk";$("#ver-note").value=c.note||""}
}
$("#verForm").addEventListener("submit",async e=>{
  e.preventDefault();const min=Math.max(0,+$("#ver-min").value||0),url=$("#ver-url").value.trim();
  if(min&&!/^https:\/\/.+\.apk$/i.test(url)){toast("APK havolasi https:// bilan boshlanib, .apk bilan tugashi kerak");return}
  try{await fs.doc("config/app").set({...(appCfg||{}),minApk:min,apkUrl:url,note:$("#ver-note").value.trim(),apkAt:Date.now()});
    await log("test",`Majburiy yangilanish: eng kam APK v${min||"—"}`);$("#ver-saved").textContent="Saqlandi";setTimeout(()=>$("#ver-saved").textContent="",2500)}catch(e2){toast("Saqlab bo'lmadi: Firestore qoidalarini yangilang")}
});

// ---------- static selects ----------
opts($("#f-region"),REGIONS,"Barcha hududlar");opts($("#f-sector"),SECTORS,"Barcha sohalar");
opts($("#p-region"),REGIONS);opts($("#p-edu"),EDU.map((t,i)=>({v:i,t})));opts($("#p-spec"),Object.keys(SPECS));
renderDraft();route();

// ---------- connect (Firestore) ----------
S.db=fs;document.body.classList.add("owner");
setInterval(()=>{const h=location.hash.slice(1);if((S.role==="chief"&&["monitoring","foydalanuvchilar","testlar"].includes(h))||(S.role==="applicant"&&h==="profil"&&!EX))render()},30000);
let unsubs=[];
function unsubAll(){unsubs.forEach(u=>{try{u()}catch(e){}});unsubs=[];(typeof orgUnsubs!=="undefined"?orgUnsubs:[]).forEach(u=>{try{u()}catch(e){}})}
function subscribe(){
  unsubAll();if(!S.uid)return;
  const err=e=>{console.warn(e)};
  const col=(path,set,q)=>{let r=fs.collection(path);if(q)r=r.where(q[0],"==",q[1]);unsubs.push(r.onSnapshot(s=>{set(s.docs.map(d=>({id:d.id,...d.data()})));render()},err))};
  col("orgs",x=>{S.orgs=x;S.ready.orgs=true});
  col("vacancies",x=>{S.vacs=x;S.ready.vacs=true});
  col("applications",x=>{S.apps=x.map(d=>({...d,uid:d.id}));S.ready.apps=true});
  col("results",x=>{const m={};x.forEach(d=>m[d.id]=d);S.results=m});
  unsubs.push(fs.doc("about/info").onSnapshot(s=>{S.about=s.exists?s.data():null;if(!abEditing)render()},err));
  unsubs.push(fs.doc("config/test").onSnapshot(s=>{S.testCfg=s.exists?s.data():null;render()},err));
  unsubs.push(fs.doc("profiles/"+S.uid).onSnapshot(s=>{S.profile=s.exists?s.data():null;draftP.skills=null;draftP.langs=null;render()},err));
  if(S.isChief){
    unsubs.push(fs.collection("logins").onSnapshot(s=>{const m={};s.docs.forEach(d=>m[d.id]={uid:d.id,...d.data()});S.logins=m;render()},err));
    col("failed",x=>{S.failed=x});
    col("contacts",x=>{const c={};x.forEach(d=>{c[d.id]=d});S.contacts=c});
    col("admins",x=>{S.admins=x.map(d=>({...d,uid:d.id}));const np=S.admins.filter(a=>!a.org).length;
      if(S._pend!=null&&np>S._pend&&S.role==="chief")toast("Yangi ish beruvchi so'rovi — Tashkilotlar → Ish beruvchilar");S._pend=np;
      if(S.role==="chief"&&!$("#hdr").hidden)renderNav(location.hash.slice(1))});
    col("offers",x=>{S.offers=x});
    col("appeals",x=>{S.appeals=x});
    col("questions",x=>{S.questions=x});
    col("qkeys",x=>{const m={};x.forEach(d=>m[d.id]=d);S.qkeys=m;gradeSoon()});
    col("attempts",x=>{S.attempts=x;gradeSoon()});
    col("faces",x=>{S.faces=x});
    col("testreq",x=>{S.testreqs=x;notifyReqs()});
  }else{
    unsubs.push(fs.doc("contacts/"+S.uid).onSnapshot(s=>{S.contacts=s.exists?{[S.uid]:s.data()}:{};render()},err));
    unsubs.push(fs.doc("attempts/"+S.uid).onSnapshot(s=>{S.myAttempt=s.exists?s.data():null;render()},err));
    unsubs.push(fs.doc("faces/"+S.uid).onSnapshot(s=>{S.face=s.exists?s.data():null},err));
    if(!S.isChief&&(S.isAdmin||S.adminDoc))unsubs.push(fs.doc("admins/"+S.uid).onSnapshot(s=>{
        const had=!!S.adminDoc,prevOrg=(S.adminDoc||{}).org,was=S.isAdmin;S.adminDoc=s.exists?s.data():null;S.isAdmin=!!(S.adminDoc&&S.adminDoc.org);
        if(!s.exists){if(S.role==="admin"){toast("Ish beruvchi huquqingiz olib tashlandi");remember("applicant");setRole("applicant")}else if(had&&location.hash==="#kutish")toast("Bosh administrator so'rovingizni rad etdi");if(was)subscribe();else render();return}
        if(was!==S.isAdmin){subscribe();
          if(S.isAdmin&&location.hash==="#kutish"){toast("Bosh administrator ruxsat berdi — xush kelibsiz!");history.replaceState(null,"","#boshqaruv");remember("admin");setRole("admin");track("login","admin");return}
          if(!S.isAdmin&&S.role==="admin"){toast("Tashkilotdan ajratildingiz — ruxsat kutilmoqda");history.replaceState(null,"","#kutish");setRole("applicant");return}
          route();return}
        if(prevOrg!==S.adminDoc.org){subscribeOrg();if(!prevOrg&&S.adminDoc.org&&S.role==="admin")toast("Bosh administrator sizni tasdiqladi");updateWho();route()}else{updateWho();render()}},err));
    if(S.isAdmin){subscribeOrg()}else{
      col("offers",x=>{S.offers=x},["uid",S.uid]);
      col("appeals",x=>{S.appeals=x},["uid",S.uid]);
    }
  }
  if(S.isAdmin)col("audit",x=>{S.audit=x});
}
let orgUnsubs=[];
function subscribeOrg(){
  orgUnsubs.forEach(u=>{try{u()}catch(e){}});orgUnsubs=[];S.offers=[];S.appeals=[];
  const org=(S.adminDoc||{}).org;if(!org)return;
  const err=e=>{console.warn(e)};
  orgUnsubs.push(fs.collection("offers").where("orgId","==",org).onSnapshot(s=>{S.offers=s.docs.map(d=>({id:d.id,...d.data()}));render()},err));
  orgUnsubs.push(fs.collection("appeals").where("orgId","==",org).onSnapshot(s=>{S.appeals=s.docs.map(d=>({id:d.id,...d.data()}));render()},err));
}
auth.onAuthStateChanged(async u=>{
  unsubAll();
  if(u&&isLocked()&&(getQuick()||{}).uid===u.uid){S.uid=u.uid;S.login=(u.email||"").split("@")[0];S.loaded=true;S.role=null;location.hash="";route();checkVersion();return}
  if(u&&isLocked())setLock(false);
  if(!u){Object.assign(S,{uid:null,login:null,isAdmin:false,isChief:false,logins:{},failed:[],myLog:null,orgs:[],vacs:[],apps:[],contacts:{},audit:[],profile:null,loaded:true,adminDoc:null,admins:[],offers:[],appeals:[],results:{},attempts:[],myAttempt:null,face:null});
    if(S.role){S.role=null;location.hash=""}route();return}
  afterAuth(u,false);
});
async function afterAuth(u,quick){
  S.uid=u.uid;S.login=(u.email||"").split("@")[0];
  try{S.isChief=(await fs.doc("chiefs/"+u.uid).get()).exists}catch(e){S.isChief=false}
  try{const ad=S.isChief?null:await fs.doc("admins/"+u.uid).get();S.adminDoc=ad&&ad.exists?ad.data():null;S.isAdmin=S.isChief||!!(S.adminDoc&&S.adminDoc.org)}catch(e){S.isAdmin=S.isChief}
  try{const g=await fs.doc("logins/"+u.uid).get();S.myLog=g.exists?g.data():null}catch(e){S.myLog=null}
  S.loaded=true;subscribe();
  route();checkVersion();
  if(!await faceGate()){
    if(quick||getQuick()&&getQuick().uid===S.uid){setLock(true);unsubAll();S.role=null;location.hash="";route();return}
    S.role=null;remember(null);try{await auth.signOut()}catch(e){}location.hash="";closeAuth();route();return}
  const c=S.contacts[S.uid]||{},prev=getQuick();
  setQuick({uid:S.uid,login:S.login,name:c.name||(prev&&prev.uid===S.uid?prev.name:"")||"",role:prev&&prev.uid===S.uid?prev.role:null});
  setTimeout(()=>{const q=getQuick(),cc=S.contacts[S.uid];if(q&&q.uid===S.uid&&cc&&cc.name&&q.name!==cc.name)setQuick({...q,name:cc.name})},2500);
  // kirgandan keyin har doim "Bo'sh ish o'rinlari" qismi ochiladi; boshqa qismlarga kod bilan o'tiladi
  S.elev=null;const was=!quick&&recalled();remember("applicant");setRole("applicant");track(was?"resume":"login","applicant");
}

// =================== SUN'IY INTELLEKT (Google Gemini) ===================
// Kalit Firestore'dagi aicfg/main hujjatida saqlanadi (faqat bosh administrator yozadi, kirgan foydalanuvchi o'qiydi).
// Kalitni Google Cloud'da faqat sayt manzili (HTTP referrer) va Generative Language API bilan cheklab qo'yish tavsiya etiladi.
const AI={cfg:null,model:null,busy:false,chat:[],appeal:{}};
const AI_BASE="https://generativelanguage.googleapis.com/v1beta/";
const AI_DAY_LIMIT=60; // bitta qurilmadan kuniga so'rovlar (tejash uchun)
async function aiCfg(force){
  if(AI.cfg&&!force)return AI.cfg;
  try{const g=await fs.doc("aicfg/main").get();AI.cfg=g.exists?g.data():{}}catch(e){AI.cfg={}}
  return AI.cfg;
}
function aiQuota(){try{const k="ot-ai-"+new Date().toISOString().slice(0,10),n=+(localStorage.getItem(k)||0);if(n>=AI_DAY_LIMIT&&S.role!=="chief")return false;localStorage.setItem(k,n+1);return true}catch(e){return true}}
// Mavjud modellar ro'yxati: eng yangi "flash" birinchi, keyin zaxiradagilar (band bo'lsa navbatdagisiga o'tiladi)
async function aiModels(key,pref){
  try{const c=JSON.parse(sessionStorage.getItem("ot-ai-models")||"null");if(c&&c.length)return pref?[pref,...c.filter(x=>x!==pref)]:c}catch(e){}
  let names=[];
  try{const r=await fetch(AI_BASE+"models?pageSize=200",{headers:{"x-goog-api-key":key}});const j=await r.json();
    names=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes("generateContent")).map(m=>m.name.replace(/^models\//,""))}catch(e){}
  const bad=/image|tts|live|audio|embed|vision|thinking|exp|nano|robot|computer/i;
  const ver=n=>{const m=n.match(/(\d+(?:\.\d+)?)/);return m?+m[1]:0};
  const flash=names.filter(n=>/^gemini-[\d.]+-flash$/.test(n)).sort((a,b)=>ver(b)-ver(a));
  const lite=names.filter(n=>/^gemini-[\d.]+-flash-lite$/.test(n)).sort((a,b)=>ver(b)-ver(a));
  const other=names.filter(n=>/flash/i.test(n)&&!bad.test(n)&&!/preview/i.test(n)&&!flash.includes(n)&&!lite.includes(n)).sort((a,b)=>ver(b)-ver(a));
  let list=[...flash.slice(0,3),...lite.slice(0,2),...other.slice(0,2)];
  if(!list.length)list=["gemini-flash-latest","gemini-flash-lite-latest"];
  try{sessionStorage.setItem("ot-ai-models",JSON.stringify(list))}catch(e){}
  return pref?[pref,...list.filter(x=>x!==pref)]:list;
}
// Asosiy chaqiruv: system — ko'rsatma, msgs — [{role:"user"|"model",text}]
async function aiAsk(system,msgs,opt){
  opt=opt||{};const cfg=await aiCfg();
  if(!cfg.key)throw new Error("nokey");
  if(cfg.on===false&&!opt.admin)throw new Error("off");
  if(!aiQuota())throw new Error("quota");
  let models=(await aiModels(cfg.key,cfg.model)).slice(0,5);
  if(!cfg.model){try{const ok=sessionStorage.getItem("ot-ai-model");if(ok&&models.includes(ok))models=[ok,...models.filter(x=>x!==ok)]}catch(e){}}
  const body=JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:msgs.map(m=>({role:m.role==="model"?"model":"user",parts:[{text:m.text}]})),
    generationConfig:{temperature:opt.temp??0.6,maxOutputTokens:opt.max||1500}});
  let last=null;
  for(let i=0;i<models.length;i++){
    const model=models[i];
    for(let attempt=0;attempt<2;attempt++){
      let r,j;
      try{r=await fetch(AI_BASE+"models/"+encodeURIComponent(model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":cfg.key},body});j=await r.json().catch(()=>({}))}
      catch(e){last=e;break}
      if(r.ok){const c=(j.candidates||[])[0];const t=c&&c.content&&(c.content.parts||[]).map(p=>p.text||"").join("").trim();
        if(t){AI.used=model;try{sessionStorage.setItem("ot-ai-model",model)}catch(e){}return t}
        last=new Error(c&&c.finishReason==="SAFETY"?"AI bu so'rovga javob bermadi.":"AI bo'sh javob qaytardi.");break}
      const m=(j.error&&j.error.message)||("HTTP "+r.status);last=new Error(m);last.status=r.status;
      const busy=r.status===503||r.status===500||/high demand|overloaded|unavailable/i.test(m);
      if(busy&&attempt===0){await new Promise(res=>setTimeout(res,1200));continue}   // bir marta qayta urinish
      if(busy||r.status===404||r.status===429)break;                               // keyingi modelga o'tish
      throw last;                                                                   // kalit xatosi va h.k.
    }
  }
  throw last||new Error("AI javob bermadi");
}
function aiErr(e){const m=(e&&e.message)||"";
  if(m==="nokey")return S.isChief?"AI kaliti kiritilmagan. Administrator → Tizim → Sozlamalar bo'limida Gemini kalitini kiriting.":"AI hali yoqilmagan. Bosh administrator sozlamalarni tugatishi kerak.";
  if(m==="off")return "AI yordamchi bosh administrator tomonidan vaqtincha o'chirilgan.";
  if(m==="quota")return "Bugungi AI so'rovlar limiti tugadi. Ertaga qayta urinib ko'ring.";
  if(e&&e.status===429)return "AI xizmati hozir band (bepul limit). Bir daqiqadan keyin qayta urinib ko'ring.";
  if(e&&(e.status===503||e.status===500||/high demand|overloaded/i.test(m)))return "Google AI serverlari hozir juda band. Bir necha daqiqadan keyin qayta urinib ko'ring.";
  if(e&&(e.status===400||e.status===403))return "AI kaliti noto'g'ri yoki bu sayt uchun ruxsat berilmagan.";
  if(/Failed to fetch|NetworkError/i.test(m))return "Internet aloqasi yo'q yoki AI xizmatiga ulanib bo'lmadi.";
  return "AI xatosi: "+m.slice(0,160);
}
// oddiy markdown: **qalin**, ro'yxat, qatorlar
function aiMd(t){
  const lines=esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").split(/\n/);let out="",ul=false;
  for(const l of lines){const m=l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if(m){if(!ul){out+="<ul>";ul=true}out+="<li>"+m[1]+"</li>";continue}
    if(ul){out+="</ul>";ul=false}out+=l.trim()?"<p>"+l+"</p>":""}
  return out+(ul?"</ul>":"");
}
const AI_RULES=`Sen "OchiqTanlov" platformasining yordamchisisan. Faqat o'zbek tilida (lotin yozuvida), qisqa, aniq va xushmuomala javob ber.
OchiqTanlov — O'zbekistondagi davlat tashkilotlari bo'sh ish o'rinlari uchun sayt va Android ilova. G'olibni rahbar emas, ochiq formula aniqlaydi.
Qoidalar:
- Ball = 0,50·Test + 0,20·Staj + 0,15·Afzal ko'nikmalar ulushi + 0,10·Ma'lumot + 0,05·Afzal tillar ulushi. Staj: har yil 10 ball, ko'pi bilan 10 yil. Ma'lumot: o'rta maxsus 60, bakalavr 80, magistr 100. Teng ballda test bali, keyin arizani ertaroq topshirgan ustun.
- Majburiy talablar (ma'lumot, staj, eng kam test bali, majburiy ko'nikmalar, mutaxassislik) bajarilmasa, nomzod "mos emas" bo'ladi.
- Ariza anonim kod bilan topshiriladi; ish beruvchi ismni ko'rmaydi. Natija ochiq reytingda e'lon qilinadi. G'olib rad etsa, o'rin zaxiraga o'tadi. Natijadan keyin 3 kun ichida shikoyat yozish mumkin, unga bosh administrator javob beradi. G'olibga QR guvohnoma beriladi.
- Kasbiy test: Face ID orqali tasdiqlanadi, kamera yoqiq turadi, chetga qarash, ikkinchi odam yoki ilovadan chiqish testni yopadi. Testni boshlash uchun bosh administrator ruxsat beradi va belgilangan vaqt oralig'ida topshiriladi.
- Ilova qismlari: "Bo'sh ish o'rinlari" (vakansiyalar, arizalarim, profil va test), "Ish beruvchi tashkilot" (so'rov yuborib, administrator ruxsati bilan), "Administrator" (maxfiy kod bilan), "Sozlamalar" (parol, Face ID, mavzu).
Muhim: test savollarining to'g'ri javoblarini bilmaysan va aytma. Natijani o'zgartirish yoki kimnidir g'olib qilish mumkin emasligini tushuntir. Bilmagan narsangni o'ylab topma — "bu haqda ma'lumotim yo'q" de. Shaxsiy ma'lumot so'rama.`;
function aiContext(){
  const p=S.profile||{},t=testOf(S.uid),live=S.vacs.filter(v=>v.status==="open"&&!deadlinePassed(v)).slice(0,40);
  const vac=live.map(v=>`- ${v.title} | ${orgOf(v.orgId).name} | ${fmt(v.salary)} so'm | ${v.region} | ${v.sector} | ma'lumot: ${EDU[v.edu]}+ | staj ${v.exp}+ | test ${v.test}+ | majburiy: ${(v.req||[]).join(", ")||"—"} | afzal: ${(v.pref||[]).join(", ")||"—"} | ${daysLeft(v)}${v.desc?" | tavsif: "+String(v.desc).slice(0,200):""}`).join("\n");
  const me=profileReady()?`Foydalanuvchi profili: ma'lumot ${EDU[p.edu]||"—"}, staj ${p.exp||0} yil, mutaxassislik ${p.spec??"—"}, ko'nikmalar: ${(p.skills||[]).join(", ")||"—"}, tillar: ${(p.langs||[]).join(", ")||"—"}, test bali: ${t==null?"hali yo'q":t}.`:"Foydalanuvchi profili hali to'ldirilmagan.";
  const role={applicant:"ish izlovchi",admin:"ish beruvchi",chief:"bosh administrator"}[S.role]||"foydalanuvchi";
  return `Hozirgi foydalanuvchi roli: ${role}. ${me}\nHozir ochiq vakansiyalar (${live.length} ta):\n${vac||"yo'q"}`;
}

// ---- 1) AI yordamchi chat (pastki o'ng burchak) ----
(function(){
  const fab=document.createElement("button");fab.type="button";fab.className="ai-fab";fab.id="ai-fab";fab.hidden=true;fab.setAttribute("aria-label","AI yordamchi");
  fab.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" fill="currentColor"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" fill="currentColor"/></svg><span>AI yordamchi</span>';
  const pane=document.createElement("section");pane.className="ai-pane";pane.id="ai-pane";pane.hidden=true;pane.setAttribute("aria-label","AI yordamchi");
  pane.innerHTML=`<header><b>AI yordamchi</b><span class="note">Gemini · javoblar xato bo'lishi mumkin</span><button type="button" class="ai-x" id="ai-x" aria-label="Yopish">×</button></header>
    <div class="ai-log" id="ai-log"></div>
    <div class="ai-sugg" id="ai-sugg"></div>
    <form class="ai-form" id="ai-form"><textarea id="ai-in" rows="1" maxlength="1000" placeholder="Savolingizni yozing…"></textarea><button class="btn" type="submit" id="ai-send">Yuborish</button></form>`;
  document.body.append(fab,pane);
  const SUG={applicant:["Menga qaysi vakansiya mos?","Ballim qanday hisoblanadi?","Testga qanday tayyorlanay?","Shikoyatni qanday yozaman?"],
    admin:["Vakansiyani qanday e'lon qilaman?","Tanlovni qachon yakunlayman?","G'olibni nega o'zim tanlay olmayman?"],
    chief:["Ish beruvchiga qanday ruxsat beraman?","Testni qanday ochaman?","Shikoyatga qanday javob beraman?"]};
  function draw(){
    const L=$("#ai-log");
    L.innerHTML=AI.chat.length?AI.chat.map(m=>`<div class="ai-msg ${m.role==="model"?"bot":"me"}">${m.role==="model"?aiMd(m.text):esc(m.text)}</div>`).join(""):`<div class="ai-msg bot"><p>Assalomu alaykum! Men OchiqTanlov yordamchisiman. Vakansiyalar, ariza, test va ball haqida so'rang.</p></div>`;
    if(AI.busy)L.insertAdjacentHTML("beforeend",`<div class="ai-msg bot ai-typing"><span></span><span></span><span></span></div>`);
    L.scrollTop=L.scrollHeight;
    $("#ai-sugg").innerHTML=AI.chat.length?"":(SUG[S.role]||SUG.applicant).map(q=>`<button type="button" class="chip">${esc(q)}</button>`).join("");
    $("#ai-sugg").querySelectorAll("button").forEach(b=>b.onclick=()=>send(b.textContent));
    $("#ai-send").disabled=AI.busy;
  }
  async function send(q){
    q=(q||"").trim();if(!q||AI.busy)return;AI.chat.push({role:"user",text:q});AI.busy=true;draw();
    try{const t=await aiAsk(AI_RULES+"\n\n"+aiContext(),AI.chat.slice(-12),{temp:0.4,max:900});AI.chat.push({role:"model",text:t})}
    catch(e){AI.chat.push({role:"model",text:aiErr(e)})}
    AI.busy=false;draw();
  }
  fab.onclick=()=>{pane.hidden=!pane.hidden;fab.classList.toggle("on",!pane.hidden);if(!pane.hidden){draw();setTimeout(()=>$("#ai-in").focus(),50)}};
  $("#ai-x").onclick=()=>{pane.hidden=true;fab.classList.remove("on")};
  $("#ai-form").addEventListener("submit",e=>{e.preventDefault();const i=$("#ai-in");send(i.value);i.value=""});
  $("#ai-in").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#ai-form").requestSubmit()}});
  // faqat ichkariga kirganda va test oynasi yopiq bo'lsa ko'rinadi
  setInterval(()=>{const show=!!S.role&&!!S.uid&&$("#exam").hidden;fab.hidden=!show;if(!show){pane.hidden=true;fab.classList.remove("on")}},700);
})();

// ---- 2) Test savollarini AI bilan yaratish ----
(function(){
  const tb=$("#tb-text");if(!tb)return;
  const box=document.createElement("div");box.className="ai-box stack";
  box.innerHTML=`<div class="btnrow" style="justify-content:space-between"><b>✨ AI bilan savol yaratish</b><span class="note">Natijani tekshirib, keyin yuklang</span></div>
    <div class="row3"><label for="ai-q-topic">Mavzu / lavozim<input id="ai-q-topic" maxlength="200" placeholder="Boshlang'ich sinf o'qituvchisi: pedagogika va metodika"></label>
    <label for="ai-q-n">Savollar soni<input id="ai-q-n" type="number" min="1" max="20" value="5"></label>
    <label for="ai-q-lvl">Qiyinlik<select id="ai-q-lvl"><option value="oson">Oson</option><option value="o'rtacha" selected>O'rtacha</option><option value="qiyin">Qiyin</option></select></label></div>
    <div class="btnrow"><button class="btn ghost" type="button" id="ai-q-go">Savollarni yaratish</button><span class="note" id="ai-q-st"></span></div>`;
  tb.closest("label").before(box);
  $("#ai-q-go").onclick=async()=>{
    const topic=$("#ai-q-topic").value.trim(),n=Math.max(1,Math.min(20,+$("#ai-q-n").value||5)),lvl=$("#ai-q-lvl").value,st=$("#ai-q-st"),b=$("#ai-q-go");
    if(topic.length<3){st.textContent="Mavzuni yozing.";return}
    b.disabled=true;st.textContent="AI savollar tayyorlamoqda…";
    const sys=`Sen davlat tashkilotiga ishga qabul uchun kasbiy test tuzuvchi mutaxassissan. O'zbek tilida (lotin) yoz.
Faqat quyidagi formatda javob ber, boshqa hech qanday so'z, sarlavha yoki izoh yozma:
Savol matni?
A) variant
B) variant *
C) variant
D) variant
Vaqt: 60

Qoidalar: har savolda 4 ta variant, faqat bittasi to'g'ri va uning oxirida " *" bo'lsin; savollar orasida bitta bo'sh qator; "Vaqt:" — soniyada (30–120, qiyinligiga qarab); savollar amaliy, aniq va bir ma'noli bo'lsin; to'g'ri javob o'rni har xil bo'lsin; siyosiy, diniy yoki shaxsiy mavzular bo'lmasin.`;
    try{
      let t=await aiAsk(sys,[{role:"user",text:`Mavzu: ${topic}\nSavollar soni: ${n}\nQiyinlik: ${lvl}`}],{temp:0.7,max:3500,admin:true});
      t=t.replace(/^```[a-z]*\n?|```$/gim,"").trim();
      const {out,errs}=parseBulk(t,+$("#tb-sec").value||60);
      tb.value=(tb.value.trim()?tb.value.trim()+"\n\n":"")+t;
      st.textContent=`${out.length} ta savol tayyor${errs.length?`, ${errs.length} tasida xato — tuzatib yuklang`:""}. Pastdagi matnni tekshirib, "Tekshirib yuklash"ni bosing.`;
      log("ai",`AI ${out.length} ta test savoli yaratdi: ${topic}`).catch(()=>{});
    }catch(e){st.textContent=aiErr(e)}
    b.disabled=false;
  };
})();

// ---- 3) Vakansiya tavsifini AI bilan yozish ----
(function(){
  const t=$("#v-title");if(!t)return;
  const wrap=document.createElement("div");wrap.className="stack";wrap.style.gap="6px";
  wrap.innerHTML=`<label for="v-desc">Lavozim tavsifi va vazifalar (ixtiyoriy)<textarea id="v-desc" rows="5" maxlength="1500" placeholder="Asosiy vazifalar, ish sharoiti, ish vaqti…"></textarea></label>
    <div class="btnrow"><button class="btn ghost" type="button" id="ai-v-go">✨ AI bilan yozish</button><span class="note" id="ai-v-st"></span></div>`;
  $("#v-salary").closest("label").after(wrap);
  $("#ai-v-go").onclick=async()=>{
    const title=t.value.trim(),st=$("#ai-v-st"),b=$("#ai-v-go");if(!title){st.textContent="Avval lavozim nomini yozing.";return}
    const o=S.orgs.find(x=>x.id===$("#v-org").value)||{};b.disabled=true;st.textContent="AI yozmoqda…";
    const sys=`Sen davlat tashkilotlari uchun vakansiya e'lonlarini yozuvchi kadrlar mutaxassisisan. O'zbek tilida (lotin), rasmiy va sodda uslubda yoz.
Faqat e'lon matnini qaytar (sarlavhasiz, 600–1200 belgi): 1) qisqa kirish jumlasi; 2) "Asosiy vazifalar:" — 4–6 ta qator "- " bilan; 3) "Ish sharoiti:" — 2–3 qator. Maosh, talab va muddatni takrorlama — ular alohida ko'rsatiladi. Kamsituvchi talab (yosh, jins, millat, tashqi ko'rinish) yozma. O'ylab topilgan raqam yoki imtiyoz yozma.`;
    try{const r=await aiAsk(sys,[{role:"user",text:`Lavozim: ${title}\nTashkilot: ${o.name||"—"}\nSoha: ${$("#v-sector").value}\nHudud: ${$("#v-region").value}\nEng kam ma'lumot: ${$("#v-edu").selectedOptions[0]?$("#v-edu").selectedOptions[0].textContent:""}\nStaj: ${$("#v-exp").value} yil\nMutaxassisliklar: ${draftV.specs.join(", ")||"—"}\nKo'nikmalar: ${draftV.req.concat(draftV.pref).join(", ")||"—"}`}],{temp:0.6,max:1200,admin:true});
      $("#v-desc").value=r.replace(/\*\*/g,"").slice(0,1500);st.textContent="Tayyor. Kerak bo'lsa tahrirlang.";}
    catch(e){st.textContent=aiErr(e)}
    b.disabled=false;
  };
})();

// ---- 4) Shikoyatni AI bilan tahlil qilish (bosh administrator) ----
async function aiAppeal(id){
  const a=S.appeals.find(x=>x.id===id);if(!a)return;const v=S.vacs.find(x=>x.id===a.vacId)||{};
  AI.appeal[id]={busy:true};renderAppeals();
  const snap=((v.decision||{}).snapshot||[]).slice(0,15).map((x,i)=>`${i+1}. ${x.code}${x.code===a.code?" (SHIKOYATCHI)":""}: ${x.ok?"mos, jami "+(x.total??"—"):"mos emas"+(x.why&&x.why.length?" — "+x.why.join("; "):"")}${x.test!=null?", test "+x.test:""}`).join("\n");
  const sys=`Sen ishga qabul tanlovlari bo'yicha shikoyatlarni xolis tahlil qiluvchi yordamchisan. O'zbek tilida (lotin) yoz. Qaror qabul qilmaysan — faqat bosh administratorga yordam berasan.
Javob tuzilishi:
**Qisqa mazmun:** 1–2 jumla.
**Faktlar:** shikoyatchining natijasi va qoidalar bo'yicha 2–4 qator.
**Baho:** shikoyat asosli ko'rinadimi yoki yo'qmi va nima uchun (taxminiy, ehtiyotkor).
**Javob loyihasi:** ishtirokchiga yuboriladigan 2–4 jumlali xushmuomala javob.
Ball formulasi: 0,50·Test + 0,20·Staj + 0,15·Ko'nikmalar + 0,10·Ma'lumot + 0,05·Tillar. Faqat berilgan ma'lumotga tayan, o'ylab topma.`;
  const ctx=`Vakansiya: ${v.title||"—"} (${orgOf(v.orgId).name})\nTalablar: ma'lumot ${EDU[v.edu]||"—"}+, staj ${v.exp??"—"}+, test ${v.test??"—"}+, majburiy ko'nikmalar: ${(v.req||[]).join(", ")||"—"}\nYakuniy reyting (anonim):\n${snap||"ma'lumot yo'q"}\n\nShikoyatchi kodi: ${a.code}\nShikoyat matni:\n${a.text}`;
  try{const t=await aiAsk(sys,[{role:"user",text:ctx}],{temp:0.3,max:1200,admin:true});
    const m=t.match(/\*\*Javob loyihasi:?\*\*:?\s*([\s\S]+)$/i);AI.appeal[id]={text:t,draft:m?m[1].replace(/\*\*/g,"").trim():""}}
  catch(e){AI.appeal[id]={err:aiErr(e)}}
  renderAppeals();
}
function aiAppealHtml(id){const r=AI.appeal[id];if(!r)return `<button class="btn ghost" type="button" data-aiap="${esc(id)}">✨ AI tahlil va javob loyihasi</button>`;
  if(r.busy)return `<div class="ai-box"><span class="note">AI shikoyatni tahlil qilmoqda…</span></div>`;
  if(r.err)return `<div class="ai-box"><span class="err">${esc(r.err)}</span> <button class="linkbtn" type="button" data-aiap="${esc(id)}">Qayta urinish</button></div>`;
  return `<div class="ai-box ai-out"><div class="btnrow" style="justify-content:space-between"><b>✨ AI tahlili</b><span class="note">maslahat, qaror emas</span></div>${aiMd(r.text)}${r.draft?`<div><button class="btn ghost" type="button" data-aiuse="${esc(id)}">Javob loyihasini qo'yish</button></div>`:""}</div>`}

// ---- Bosh administrator: AI sozlamalari ----
(function(){
  const ver=$("#verForm");if(!ver)return;
  const f=document.createElement("form");f.className="panel stack";f.id="aiForm";
  f.innerHTML=`<h2>Sun'iy intellekt (Google Gemini)</h2>
    <p class="note">Bepul kalit: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> → "Create API key". Xavfsizlik uchun Google Cloud'da kalitni faqat sayt manzili (HTTP referrer) va "Generative Language API" bilan cheklang.</p>
    <div class="row2"><label for="ai-key">API kalit<input id="ai-key" type="password" autocomplete="off" class="mono" placeholder="AIza…"></label>
    <label for="ai-model">Model (bo'sh qolsa avtomatik)<input id="ai-model" class="mono" placeholder="avtomatik"></label></div>
    <label class="chk"><input type="checkbox" id="ai-on" checked> AI yordamchi barcha foydalanuvchilar uchun yoqilgan</label>
    <dl class="kv" id="ai-info"></dl>
    <div class="btnrow"><button class="btn" type="submit">Saqlash</button><button class="btn ghost" type="button" id="ai-test">Tekshirish</button><span class="note" id="ai-st"></span></div>`;
  ver.after(f);
  async function fill(){const c=await aiCfg(true);$("#ai-key").value="";$("#ai-key").placeholder=c.key?"saqlangan: …"+String(c.key).slice(-4)+" (o'zgartirish uchun yangisini yozing)":"AIza…";$("#ai-model").value=c.model||"";$("#ai-on").checked=c.on!==false;
    let m="";try{m=sessionStorage.getItem("ot-ai-model")||""}catch(e){}
    $("#ai-info").innerHTML=`<dt>Holat</dt><dd>${c.key?(c.on===false?"Kalit bor, o'chirilgan":"Yoqilgan"):"Kalit kiritilmagan"}</dd><dt>Ishlatilayotgan model</dt><dd class="mono">${esc(c.model||m||"birinchi so'rovda aniqlanadi")}</dd>`}
  f.addEventListener("submit",async e=>{e.preventDefault();const st=$("#ai-st");const c=await aiCfg(true);
    const key=$("#ai-key").value.trim()||c.key||"";if(!key){st.textContent="Kalitni kiriting.";return}
    try{await fs.doc("aicfg/main").set({key,model:$("#ai-model").value.trim(),on:$("#ai-on").checked,at:Date.now(),by:S.uid});try{sessionStorage.removeItem("ot-ai-model");sessionStorage.removeItem("ot-ai-models")}catch(e2){}
      await aiCfg(true);await log("ai","AI sozlamalari yangilandi");st.textContent="Saqlandi";fill()}catch(e2){st.textContent="Saqlab bo'lmadi: Firestore qoidalarini yangilang."}});
  $("#ai-test").onclick=async()=>{const st=$("#ai-st");st.textContent="Tekshirilmoqda…";
    try{const t=await aiAsk("Bitta qisqa jumlada o'zbek tilida javob ber.",[{role:"user",text:"Salom! Ishlayapsanmi?"}],{max:60,admin:true});st.textContent="Ishlayapti ✓ ("+(AI.used||"")+") — "+t.slice(0,80);fill()}catch(e){st.textContent=aiErr(e)}};
  const obs=new MutationObserver(()=>{if(!$("#v-sozlamalar").hidden&&S.isChief&&!f.dataset.filled){f.dataset.filled="1";fill()}if($("#v-sozlamalar").hidden)delete f.dataset.filled});
  obs.observe($("#v-sozlamalar"),{attributes:true,attributeFilter:["hidden"]});
})();


// =================== SIDEBAR (mobil menyu) VA MATNLARNI TAHRIRLASH ===================
$("#sbToggle").onclick=()=>{const o=!$("#hdr").classList.contains("open");$("#hdr").classList.toggle("open",o);$("#sbBack").hidden=!o;$("#sbToggle").setAttribute("aria-expanded",String(o))};
$("#sbBack").onclick=()=>{$("#hdr").classList.remove("open");$("#sbBack").hidden=true;$("#sbToggle").setAttribute("aria-expanded","false")};
$("#modes").addEventListener("click",()=>{$("#hdr").classList.remove("open");$("#sbBack").hidden=true});
const GATE_DEF={title:$("#gateTitle").textContent,lede:$("#gateLede").textContent};
function applyUi(){const u=S.ui||{};$("#gateTitle").textContent=(u.gateTitle||"").trim()||GATE_DEF.title;$("#gateLede").textContent=(u.gateLede||"").trim()||GATE_DEF.lede}
fs.doc("config/ui").onSnapshot(sn=>{S.ui=sn.exists?sn.data():{};applyUi();if(S.role&&!$("#hdr").hidden)renderNav(location.hash.slice(1));if(!$("#v-sozlamalar").hidden)uiFill()},()=>{});
function uiKeys(){
  const modes=MODES.map(([k,l])=>["m:"+k,l]);
  const groups=[];[G_APP,G_EMP,G_CEMP,G_CADM].forEach(G=>G.forEach(g=>{if(!groups.some(x=>x[1]===g[0]))groups.push(["g:"+g[0],g[0]])}));
  const tabs=[];Object.keys(TAB_LABEL).forEach(k=>{if(!tabs.some(x=>x[0]==="t:"+k))tabs.push(["t:"+k,TAB_LABEL[k]])});
  return {modes,groups,tabs};
}
(function(){
  const ver=$("#verForm");if(!ver)return;
  const f=document.createElement("form");f.className="panel stack";f.id="uiForm";
  f.innerHTML=`<h2>Kirish sahifasi va bo'lim nomlari</h2>
    <p class="note">Bu yerda yozganingiz hamma foydalanuvchilarda darhol o'zgaradi. Bo'sh qoldirilgan maydon asl matnni ishlatadi.</p>
    <label for="ui-gt">Kirish sahifasi sarlavhasi<input id="ui-gt" maxlength="160"></label>
    <label for="ui-gl">Kirish sahifasi matni<textarea id="ui-gl" rows="3" maxlength="600"></textarea></label>
    <details class="stack"><summary style="cursor:pointer;font-weight:600">Qismlar, bo'limlar va sahifa nomlari</summary><div id="ui-labels" class="ui-labels"></div></details>
    <div class="btnrow"><button class="btn" type="submit">Saqlash</button><button class="btn ghost" type="button" id="ui-reset">Asl holiga qaytarish</button><span class="note" id="ui-st"></span></div>`;
  ver.before(f);
  f.addEventListener("submit",async e=>{e.preventDefault();const labels={};f.querySelectorAll("[data-lk]").forEach(i=>{const v=i.value.trim();if(v&&v!==i.placeholder)labels[i.dataset.lk]=v.slice(0,40)});
    try{await fs.doc("config/ui").set({gateTitle:$("#ui-gt").value.trim().slice(0,160),gateLede:$("#ui-gl").value.trim().slice(0,600),labels,at:Date.now(),by:S.uid});await log("ui","Kirish sahifasi va bo'lim nomlari yangilandi");$("#ui-st").textContent="Saqlandi";toast("Saqlandi")}
    catch(e2){$("#ui-st").textContent="Saqlab bo'lmadi: ruxsat yo'q yoki internet yo'q."}});
  $("#ui-reset").onclick=async()=>{const b=$("#ui-reset");if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Tasdiqlash uchun yana bosing";setTimeout(()=>{delete b.dataset.sure;b.textContent="Asl holiga qaytarish"},5000);return}
    delete b.dataset.sure;b.textContent="Asl holiga qaytarish";try{await fs.doc("config/ui").set({gateTitle:"",gateLede:"",labels:{},at:Date.now(),by:S.uid});await log("ui","Matnlar asl holiga qaytarildi");$("#ui-st").textContent="Asl holiga qaytarildi"}catch(e){$("#ui-st").textContent="Bajarib bo'lmadi"}};
})();
function uiFill(){
  const f=$("#uiForm");if(!f||f.contains(document.activeElement))return;const u=S.ui||{},L=u.labels||{};
  $("#ui-gt").value=u.gateTitle||"";$("#ui-gt").placeholder=GATE_DEF.title;$("#ui-gl").value=u.gateLede||"";$("#ui-gl").placeholder=GATE_DEF.lede;
  const K=uiKeys(),row=([k,d])=>`<label>${esc(d)}<input data-lk="${esc(k)}" maxlength="40" placeholder="${esc(d)}" value="${esc(L[k]||"")}"></label>`;
  $("#ui-labels").innerHTML=`<p class="sb-cap">Qismlar</p><div class="ui-grid">${K.modes.map(row).join("")}</div><p class="sb-cap">Bo'lim guruhlari</p><div class="ui-grid">${K.groups.map(row).join("")}</div><p class="sb-cap">Sahifalar</p><div class="ui-grid">${K.tabs.map(row).join("")}</div>`;
}
new MutationObserver(()=>{if(!$("#v-sozlamalar").hidden)uiFill()}).observe($("#v-sozlamalar"),{attributes:true,attributeFilter:["hidden"]});

})();
