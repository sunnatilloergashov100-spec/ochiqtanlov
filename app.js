(function(){
// Sahifa (index.html) keshdan eski holda ochilgan bo'lsa, uni bir marta keshsiz qayta yuklaymiz
{const BUILD=15,m=document.querySelector('meta[name="ot-build"]');if(!m||+m.content!==BUILD){let again=false;try{again=sessionStorage.getItem("ot-fix-"+BUILD)==="1";sessionStorage.setItem("ot-fix-"+BUILD,"1")}catch(e){}
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
const WEB_VER=15; // sayt kodi versiyasi: yangi fayllar yuklanganda oshiriladi
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
APP_TABS.push(["chat","Xabarlar"]);EMP_TABS.push(["chat","Xabarlar"]);CHIEF_ADM.push(["chat","Xabarlar"]);
const IJ_TABS=[["ijara","E'lonlar"],["ijara-mening","Mening e'lonlarim"],["ijara-shartnoma","Shartnomalar"]];APP_TABS.push(...IJ_TABS);EMP_TABS.push(...IJ_TABS);CHIEF_ADM.push(...IJ_TABS);
APP_TABS.push(["sozlamalarim","Sozlamalar"],["kutish","Ish beruvchi so'rovi"]);EMP_TABS.push(["sozlamalarim","Sozlamalar"]);CHIEF_ADM.push(["sozlamalarim","Sozlamalar"]);
const ALL_VIEWS=["ijara","ijara-mening","ijara-shartnoma","chat","kutish","sozlamalarim","monitoring","kirishlar","foydalanuvchilar","ish-beruvchilar","testlar","gate","vakansiyalar","profil","arizalar","boshqaruv","tashkilotlar","boshqaruv-vak","arizalar-adm","natijalar","shikoyatlar","statistika","jurnal","sozlamalar","qoidalar","haqida","tekshir"];
// Ilova uch qismga bo'linadi; har qism ichida bo'limlar guruhlangan
const MODES=[["applicant","Bo'sh ish o'rinlari"],["ijara","Ijara xonadonlari"],["admin","Ish beruvchi tashkilot"],["chief","Administrator"],["chat","Xabarlar"],["settings","Sozlamalar"]];
const GEAR='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const G_APP=[["Vakansiyalar",["vakansiyalar","arizalar"]],["Profil va test",["profil"]],["Ma'lumot",["statistika","qoidalar","haqida"]]];
const G_EMP=[["Vakansiyalar",["boshqaruv","boshqaruv-vak","arizalar-adm","natijalar"]],["Shikoyatlar",["shikoyatlar"]],["Hisobot",["statistika","jurnal"]],["Ma'lumot",["qoidalar","haqida"]]];
const G_CEMP=[["Vakansiyalar",["boshqaruv","boshqaruv-vak","arizalar-adm","natijalar"]],["Shikoyatlar",["shikoyatlar"]],["Tashkilotlar",["tashkilotlar","ish-beruvchilar"]]];
const G_CADM=[["Monitoring",["monitoring","kirishlar","foydalanuvchilar"]],["Test",["testlar"]],["Hisobot",["statistika","jurnal"]],["Tizim",["sozlamalar","qoidalar","haqida"]]];
const G_SET=[["Sozlamalar",["sozlamalarim"]]];
const TAB_LABEL={...Object.fromEntries(APP_TABS.concat(EMP_TABS,CHIEF_TABS,CHIEF_ADM)),sozlamalar:"Tizim sozlamalari"};
const inG=(G,t)=>G.some(g=>g[1].includes(t));
const isIj=t=>t==="ijara"||t==="ijara-mening"||t==="ijara-shartnoma";
const G_IJ=[["E'lonlar",["ijara"]],["Mening e'lonlarim",["ijara-mening"]],["Shartnomalar",["ijara-shartnoma"]]];
function curMode(t){if(isIj(t))return "ijara";if(t==="chat")return "chat";if(t==="sozlamalarim")return "settings";if(t==="kutish")return "admin";if(S.role==="chief")return inG(G_CEMP,t)?"admin":"chief";return S.role}
function groupsFor(t){if(isIj(t))return G_IJ;if(t==="chat")return [["Xabarlar",["chat"]]];if(t==="sozlamalarim")return G_SET;if(t==="kutish")return [["Ish beruvchi so'rovi",["kutish"]]];if(S.role==="applicant")return G_APP;if(S.role==="admin")return G_EMP;return curMode(t)==="admin"?G_CEMP:G_CADM}
// Bo'lim nomlari: bosh administrator config/ui ichida o'zgartira oladi
const LBL=(k,d)=>{const L=((S.ui||{}).labels)||{};return (L[k]&&String(L[k]).trim())||d};
const MODE_ICON={ijara:'<path d="M3 11l9-7 9 7M5 10v10h14V10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="14" r="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 16v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',chat:'<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',applicant:'<path d="M11 4a7 7 0 1 0 4.2 12.6L20 21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',admin:'<path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',chief:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'};
function renderNav(t){
  const m=curMode(t);
  $("#modes").innerHTML=MODES.map(([k,l])=>`<button type="button" data-mode="${k}" aria-pressed="${k===m}"${k==="settings"?` class="gear"`:""}>${k==="settings"?GEAR:`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${MODE_ICON[k]}</svg>`}<span>${esc(LBL("m:"+k,l))}</span>${k==="admin"&&S.isChief&&(S.admins||[]).some(a=>!a.org)?` <span class="bdg">${(S.admins||[]).filter(a=>!a.org).length}</span>`:""}</button>`).join("");
  const G=groupsFor(t),gi=Math.max(0,G.findIndex(g=>g[1].includes(t)));
  const hide=m==="settings"||m==="chat"||t==="kutish";$("#nav").hidden=hide;$("#sbNavCap").hidden=hide;
  const pend=S.isChief?(S.admins||[]).filter(a=>!a.org).length:0,bdg=n=>n?` <span class="bdg">${n}</span>`:"";
  $("#nav").innerHTML=`<div class="grp">${G.map((g,i)=>{const on=i===gi;
    return `<a class="g" href="#${g[1][0]}" ${on?'aria-current="page"':""}>${esc(LBL("g:"+g[0],g[0]))}${g[1].includes("ish-beruvchilar")?bdg(pend):""}</a>`+
      (on&&g[1].length>1?`<div class="sub">${g[1].map(k=>`<a href="#${k}" ${k===t?'aria-current="page"':""}>${esc(LBL("t:"+k,TAB_LABEL[k]))}${k==="ish-beruvchilar"?bdg(pend):""}</a>`).join("")}</div>`:"")}).join("")}</div>`;
  const c=S.contacts[S.uid]||{},nm=c.name||(S.profile||{}).name||S.login||"";
  const my=(window.CHAT&&CHAT.pub[S.uid])||{};$("#sbProf").innerHTML=`<span class="sb-ava">${my.av?`<img src="${esc(my.av)}" alt="">`:esc(((my.name||nm).trim()[0]||"?").toUpperCase())}</span><span class="sb-pt"><b>${esc(my.name||nm)}</b><small>${esc(S.login||"")} · ${esc(ROLE_UZ[S.role]||"")}</small></span>`;
  document.querySelectorAll("section.section").forEach(sec=>{const k=sec.id.slice(2),h=sec.querySelector("h1");if(!h)return;const L=(((S.ui||{}).labels||{})["t:"+k]||"").trim();
    if(L){if(!h.dataset.ov)h.dataset.orig=h.textContent;h.dataset.ov="1";h.textContent=L}else if(h.dataset.ov){h.textContent=h.dataset.orig;delete h.dataset.ov}});
  if(IJ)ijBadge();if(typeof chBadge==="function"&&window.CHAT)try{chBadge()}catch(e){}
}
function tabs(){return S.role==="chief"?CHIEF_TABS.concat(CHIEF_ADM):S.role==="admin"?EMP_TABS:APP_TABS}
function route(){
  let t=location.hash.slice(1);
  if(t.startsWith("tekshir"))t="tekshir";
  else if(!S.role)t="gate";else if(!tabs().some(x=>x[0]===t))t=tabs()[0][0];
  // ish beruvchi bosh administrator tasdiqlamaguncha (tashkilotga biriktirmaguncha) ichkariga kirmaydi
  if(S.role==="admin"&&!(S.adminDoc||{}).org&&!["sozlamalarim","qoidalar","haqida","tekshir","ijara","ijara-mening","ijara-shartnoma","chat"].includes(t))t="kutish";
  if(IJ&&!$("#ij-modal").hidden&&!isIj(t))ijClose();
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
  if(m==="chat")return go(S.role,"chat");
  if(m==="ijara")return go(S.role,"ijara");
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
  try{await fs.doc("faces/"+id).delete();await log("test",`Face ID tiklandi: ${(S.contacts[id]||{}).login||id}`);toast("Face ID tiklandi: foydalanuvchi keyingi kirishda yuzini qayta ro'yxatga oladi")}catch(x){toast("Bajarib bo'lmadi");e.target.disabled=false}});


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
  if(S.role==="admin"&&!(S.adminDoc||{}).org&&!["sozlamalarim","qoidalar","haqida","ijara","ijara-mening","ijara-shartnoma","chat"].includes(t))t="kutish";
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
  if(t==="chat")renderChat();
  if(isIj(t))renderIjara(t);
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
  fs.doc("faces/"+S.uid).get().then(g=>{$("#st-face").textContent=g.exists?"Yuzingiz ro'yxatga olingan. Test boshlanishida u bilan solishtiriladi.":"Yuz hali ro'yxatga olinmagan."}).catch(()=>{});
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
    const ok=await faceGate();toast(ok?"Face ID yangilandi":"Face ID ro'yxatga olinmadi — test boshida so'raladi");renderMySettings()}
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
  renderOwner();
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
  $("#p-face").innerHTML=hasFace?`<span class="pill win">Ro'yxatga olingan</span>`:`<span class="note">test boshida ro'yxatga olinadi</span>`;
  if(a&&a.status==="running"&&!EX){fs.doc("attempts/"+S.uid).update({status:"terminated",reason:"Test oynasi yopildi yoki ilovadan chiqildi",finishedAt:Date.now()}).catch(()=>{})}
  let h="";
  if(ts.k==="done")h=`<div class="banner"><b>Test topshirilgan: ${ts.t} / 100.</b> ${a&&a.status==="terminated"?"Test to'xtatilgan: "+esc(a.reason||"")+". ":""}Bu ball barcha arizalaringizda ishlatiladi. Qayta topshirish faqat bosh administrator ruxsati bilan.</div>`;
  else if(ts.k==="grading"||ts.k==="running")h=a&&a.status==="terminated"?`<div class="banner warn"><b>Test to'xtatildi.</b> Sabab: ${esc(a.reason||"qoidabuzarlik")}. Natija 0 ball bo'lib hisoblanadi. Texnik sabab bo'lsa, bosh administratorga murojaat qiling.</div>`
    :`<div class="banner"><b>Javoblaringiz qabul qilindi.</b> Natija bosh administrator tizimida avtomatik hisoblanadi va shu yerda paydo bo'ladi.</div>`;
  else if(!testWindow().ok){const w=testWindow();h=w.why==="early"?`<div class="banner"><b>Test ${dt(w.at)} da boshlanadi.</b> Shu vaqtdan keyin "Testni boshlash" tugmasi paydo bo'ladi.${cfg.endAt?" Tugash vaqti: "+dt(cfg.endAt)+".":""}</div>`:w.why==="late"?`<div class="banner warn"><b>Test vaqti tugagan</b> (${dt(w.at)}). Yangi test vaqti e'lon qilinishini kuting.</div>`:`<p class="note">Kasbiy test hali ochilmagan. Bosh administrator testni ochgach, shu yerda "Testni boshlash" tugmasi paydo bo'ladi.</p>`}
  else h=(cfg.endAt?`<p class="note">Test ${dt(cfg.endAt)} gacha ochiq.</p>`:"")+`<ul class="rules"><li>Test faqat <b>bir marta</b> topshiriladi va barcha arizalaringiz uchun ishlatiladi.</li><li>Testga kirishdan oldin <b>Face ID</b>: yuzingiz ro'yxatdan o'tishda saqlangan yuz bilan solishtiriladi. Mos kelmasa, testga kirilmaydi. So'ng <b>bosh administrator ruxsat berishi</b> kutiladi.</li><li>Test davomida <b>kamera yoqiq</b> turadi. Yuzingiz ko'rinmasa, boshqa tomonga qarasangiz, kamerada boshqa odam paydo bo'lsa yoki <b>ilovadan chiqsangiz — test darhol to'xtatiladi</b> va 0 ball qo'yiladi.</li><li>Har bir savolga alohida vaqt beriladi. Vaqt tugasa, keyingi savolga o'tiladi.</li><li>Skrinshot olish taqiqlangan.</li></ul>
    <div><button class="btn" type="button" id="btn-exam" ${profileReady()?"":"disabled"}>Testni boshlash</button></div>${profileReady()?"":`<p class="note">Avval profilni saqlang.</p>`}<p class="note">Yorug' joyda, yolg'iz o'tiring. Internet barqaror bo'lsin. Birinchi marta Face ID modeli yuklanadi (taxminan 6 MB).</p>`;
  box.innerHTML=h;
  const b=$("#btn-exam");if(b)b.onclick=startExam;
}


// --- KIRISHDA MAJBURIY FACE ID (ro'yxatdan o'tishda yuz ro'yxatga olinadi, har kirishda tekshiriladi) ---
const fgKey=uid=>"ot-face-ok-"+uid;
function faceOkThisSession(uid){try{return sessionStorage.getItem(fgKey(uid))==="1"}catch(e){return false}}
// Face ID: ro'yxatdan o'tishda BIR MARTA olinadi va bazada saqlanadi. Har kirishda so'ralmaydi —
// shaxs faqat test boshlanishida tekshiriladi. enrollOnly: yuz allaqachon saqlangan bo'lsa kamera ochilmaydi.
async function faceGate(opt){
  opt=opt||{};
  if(opt.enrollOnly){
    try{const g=await fs.doc("faces/"+S.uid).get();if(g.exists&&Array.isArray((g.data()||{}).desc)){S.face=g.data();return true}}
    catch(e){return true} // internet bo'lmasa kirishni to'xtatmaymiz; test boshida baribir tekshiriladi
  }else if(faceOkThisSession(S.uid))return true;
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
      ui(`<div class="ex-card"><h2>${enroll?"Face ID: yuzingizni ro'yxatga olish":"Face ID: shaxsni tasdiqlash"}</h2><p>${enroll?"Ro'yxatdan o'tishda yuzingiz <b>bir marta</b> olinadi va tizimda saqlanadi. Keyin har kirishda so'ralmaydi — faqat <b>test topshirishdan oldin</b> shu yuz bilan solishtiriladi. Rasm saqlanmaydi — faqat yuzning raqamli izi.":"Kirish uchun kameraga qarang. Yuzingiz ro'yxatdagi yuz bilan solishtiriladi."}</p><p class="note" id="fg-msg">Kameraga ruxsat bering…</p><div><button class="btn ghost" type="button" id="fg-out">Bekor qilish va chiqish</button></div></div>`);
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
function tqReset(){tqEdit=null;$("#tq-q").value="";$("#tq-sec").value=60;$("#tq-pts").value=1;tqOptsRender();$("#tq-title").textContent="Yangi savol";$("#tq-btn").textContent="Savolni qo'shish";$("#tq-cancel").hidden=true;$("#tq-err").hidden=true}
$("#tq-cancel").onclick=tqReset;
$("#tqform").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#tq-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;
  const q=$("#tq-q").value.trim(),raw=[...document.querySelectorAll(".tq-o")].map(x=>x.value.trim()),c=document.querySelector('input[name=tq-ok]:checked'),sec=+$("#tq-sec").value,pts=+$("#tq-pts").value;
  if(!q)return fail("Savol matnini yozing.");
  if(!(pts>0&&pts<=100))return fail("Ball 0 dan katta va 100 dan oshmasin.");
  const idx=raw.map((v,j)=>v?j:-1).filter(j=>j>=0);if(idx.length<2)return fail("Kamida 2 ta variant yozing.");
  if(!c||!raw[+c.value])return fail("To'g'ri javobni belgilang.");
  if(!(sec>=5&&sec<=600))return fail("Vaqt 5 dan 600 soniyagacha bo'lsin.");
  const o=idx.map(j=>raw[j]),a=idx.indexOf(+c.value);
  const id=tqEdit||("q"+Date.now().toString(36)+Math.random().toString(36).slice(2,5));
  try{await fs.doc("questions/"+id).set({q,o,sec,pts,at:Date.now()});await fs.doc("qkeys/"+id).set({a});toast(tqEdit?"Savol yangilandi":"Savol qo'shildi");tqReset()}
  catch(e2){fail("Saqlab bo'lmadi: Firestore qoidalarini yangilang.")}
});
$("#tcfg").addEventListener("submit",async e=>{
  e.preventDefault();
  const fr=$("#tc-from").value?new Date($("#tc-from").value).getTime():null,to=$("#tc-to").value?new Date($("#tc-to").value).getTime():null;
  if(fr&&to&&to<=fr){toast("Tugash vaqti boshlanishdan keyin bo'lishi kerak");return}
  try{await fs.doc("config/test").set({enabled:$("#tc-on").checked,count:Math.max(1,Math.min(100,+$("#tc-n").value||10)),startAt:fr,endAt:to,at:Date.now()});
    await log("test",`Test sozlamalari: ${$("#tc-on").checked?"ochiq":"yopiq"}, ${$("#tc-n").value} ta savol${fr?", "+dt(fr):""}${to?" — "+dt(to):""}`);$("#tc-saved").textContent="Saqlandi";setTimeout(()=>$("#tc-saved").textContent="",2500)}catch(e2){toast("Saqlab bo'lmadi")}
});
function parseBulk(text,defSec,defPts){defPts=defPts||1;
  const blocks=text.replace(/\r/g,"").split(/\n\s*\n/).map(b=>b.split("\n").map(l=>l.trim()).filter(Boolean)).filter(b=>b.length);
  const out=[],errs=[];
  blocks.forEach((b,bi)=>{
    let sec=defSec,pts=defPts,q=[],o=[],a=-1;
    b.forEach(l=>{const t=l.match(/^(vaqt|time|время)\s*[:=]?\s*(\d+)/i);
      if(t){sec=+t[2];return}
      const pb=l.match(/^(ball|bal|ochko|points?|балл)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
      if(pb){pts=+pb[2].replace(",",".");return}
      const m=l.match(/^\*?\s*([A-Fa-f])\s*[\)\.]\s*(.+)$/);
      if(m){let txt=m[2].trim(),ok=l.startsWith("*")||/\*\s*$/.test(txt);txt=txt.replace(/\s*\*\s*$/,"").trim();if(ok)a=o.length;o.push(txt);return}
      if(!o.length)q.push(l.replace(/^\d+\s*[\.\)]\s*/,""));});
    const qt=q.join(" ").trim();
    if(!qt)errs.push(`${bi+1}-savol: savol matni yo'q`);else if(o.length<2)errs.push(`${bi+1}-savol: kamida 2 ta variant kerak`);else if(a<0)errs.push(`${bi+1}-savol: to'g'ri javob (*) belgilanmagan`);else if(!(sec>=5&&sec<=600))errs.push(`${bi+1}-savol: vaqt 5–600 soniya bo'lsin`);
    else if(!(pts>0&&pts<=100))errs.push(`${bi+1}-savol: ball 0 dan katta va 100 dan oshmasin`);
    else out.push({q:qt,o,a,sec,pts});
  });
  return {out,errs};
}
$("#tb-file").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$("#tb-text").value=String(r.result||"")};r.readAsText(f,"utf-8")});
$("#tb-btn").onclick=async()=>{
  const err=$("#tb-err");err.hidden=true;const {out,errs}=parseBulk($("#tb-text").value,+$("#tb-sec").value||60,+$("#tb-pts").value||1);
  if(errs.length){err.textContent=errs.slice(0,6).join("; ")+(errs.length>6?" …":"");err.hidden=false;return}
  if(!out.length){err.textContent="Matn bo'sh.";err.hidden=false;return}
  const b=$("#tb-btn");b.disabled=true;let n=0;
  try{for(const x of out){const id="q"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);await fs.doc("questions/"+id).set({q:x.q,o:x.o,sec:x.sec,pts:x.pts,at:Date.now()});await fs.doc("qkeys/"+id).set({a:x.a});n++;$("#tb-info").textContent=n+" / "+out.length}
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
    const qids=a.qids||[],ans=a.answers||{};let correct=0,earned=0,maxPts=0;
    qids.forEach(id=>{const q=S.questions.find(x=>x.id===id);maxPts+=(q&&+q.pts)||1});
    if(a.status!=="terminated")qids.forEach(id=>{const k=S.qkeys[id],an=ans[id],q=S.questions.find(x=>x.id===id);const lim=((q&&+q.sec)||60)*1000+5000;if(k&&an&&an.i!=null&&an.i===k.a&&(an.t||0)<=lim){correct++;earned+=(q&&+q.pts)||1}});
    earned=Math.round(earned*100)/100;maxPts=Math.round(maxPts*100)/100;
    const test=a.status==="terminated"||!qids.length||!maxPts?0:Math.round(100*earned/maxPts);
    await fs.doc("results/"+a.id).set({test,correct,total:qids.length,earned,maxPts,attemptAt:a.startedAt,status:a.status,reason:a.reason||"",gradedAt:Date.now(),login:a.login||""});
  }}catch(e){console.warn(e)}
  grading=false;
}
let TR_ROWS=[];
// Kutubxonasiz haqiqiy .xlsx yaratish (ZIP "stored" + Office Open XML)
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC_T[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zipStore(files){const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  for(const [name,text] of files){const nb=enc.encode(name),db=enc.encode(text),crc=crc32(db);
    const lh=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(db.length),...u32(db.length),...u16(nb.length),...u16(0)]);
    parts.push(lh,nb,db);
    cd.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(db.length),...u32(db.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nb);
    off+=lh.length+nb.length+db.length}
  const cdSize=cd.reduce((s,x)=>s+x.length,0);
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cdSize),...u32(off),...u16(0)]);
  return new Blob([...parts,...cd,end],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})}
function makeXlsx(rows,opt){opt=opt||{};const x=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
  const col=i=>{let s="";i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
  const sd=rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((v,ci)=>{const ref=col(ci)+(ri+1),st=(opt.bold||[]).includes(ri)?' s="1"':(opt.title===ri?' s="2"':"");
    if(v===""||v==null)return st?`<c r="${ref}"${st}/>`:"";if(typeof v==="number"&&isFinite(v))return `<c r="${ref}"${st}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${x(v)}</t></is></c>`}).join("")+`</row>`).join("");
  const cols=(opt.widths||[]).length?`<cols>${opt.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols>`:"";
  const merge=opt.merge?`<mergeCells count="1"><mergeCell ref="${opt.merge}"/></mergeCells>`:"";
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${opt.freeze?`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${opt.freeze}" topLeftCell="A${opt.freeze+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`:""}${cols}<sheetData>${sd}</sheetData>${merge}</worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B7A62"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const nm=x(opt.sheet||"Reyting").slice(0,31);
  return zipStore([
    ["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nm}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/worksheets/sheet1.xml",sheet],["xl/styles.xml",styles]])}
async function exportTestXlsx(btn){
  let rk=0;const head=["O'rin","F.I.Sh.","Login","To'plangan ball","Maksimal ball","Foiz (%)","To'g'ri javoblar","Jami savol","Holat","Boshlagan vaqti","Davomiyligi (daqiqa)"];
  const data=TR_ROWS.map(x=>{const fr=x.r.attemptAt===x.a.startedAt,done=x.score!=null&&x.a.status==="done";
    return [done?++rk:"",x.name||"",x.login||"",fr?(x.r.earned??x.r.correct):"",fr?(x.r.maxPts??x.r.total):"",x.score==null?"":x.score,fr?x.r.correct:"",fr?x.r.total:"",
      x.a.status==="running"?"Topshiryapti":x.a.status==="terminated"?"To'xtatilgan: "+(x.a.reason||""):"Yakunlangan",dt(x.a.startedAt),x.dur?Math.round(x.dur/60000*10)/10:""]});
  const name="Test_reytingi_"+new Date().toISOString().slice(0,10);
  const inApp=/; wv\)/.test(navigator.userAgent);
  if(inApp){downloadCsv(name+".csv",[head,...data].map(r=>r.join("\t")).join("\n"));return}
  try{const blob=makeXlsx([["OchiqTanlov — kasbiy test reytingi"],["Yuklab olingan: "+dt(Date.now())],[],head,...data],{title:0,bold:[3],freeze:4,merge:"A1:F1",widths:[7,30,16,15,14,10,15,11,30,18,18],sheet:"Reyting"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name+".xlsx";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);
    toast("Excel fayl yuklab olindi");log("test","Test reytingi Excel'ga yuklab olindi").catch(()=>{});
  }catch(e){console.warn(e);toast("Excel faylni yaratib bo'lmadi")}
}
function renderTestAdmin(){
  const cfg=S.testCfg||{},Q=[...S.questions].sort((a,b)=>(a.at||0)-(b.at||0));
  if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest("#tcfg")){$("#tc-on").checked=!!cfg.enabled;$("#tc-n").value=cfg.count||10;$("#tc-from").value=toLocalInput(cfg.startAt);$("#tc-to").value=toLocalInput(cfg.endAt)}
  renderTestReqs();
  const A=S.attempts,done=A.filter(a=>a.status!=="running"),res=Object.values(S.results).filter(r=>typeof r.test==="number");
  const avg=res.length?Math.round(res.reduce((s,r)=>s+r.test,0)/res.length):"—";
  $("#t-kpis").innerHTML=`<div class="kpi"><span>Test holati</span><b style="color:${testWindow().ok?"var(--accent)":"var(--muted)"}">${testWindow().ok?"Ochiq":testWindow().why==="early"?"Kutilmoqda":testWindow().why==="late"?"Tugagan":"Yopiq"}</b>${cfg.startAt||cfg.endAt?`<small class="note">${cfg.startAt?dt(cfg.startAt):"…"} — ${cfg.endAt?dt(cfg.endAt):"…"}</small>`:""}</div><div class="kpi"><span>Savollar bankida</span><b>${Q.length}</b></div><div class="kpi"><span>Har kimga savol</span><b>${Math.min(cfg.count||10,Q.length)}</b></div><div class="kpi"><span>Topshirganlar</span><b>${done.length}</b></div><div class="kpi"><span>Hozir topshiryapti</span><b>${A.filter(a=>a.status==="running").length}</b></div><div class="kpi"><span>To'xtatilgan</span><b style="color:${A.some(a=>a.status==="terminated")?"var(--bad)":"inherit"}">${A.filter(a=>a.status==="terminated").length}</b></div><div class="kpi"><span>O'rtacha ball</span><b>${avg}</b></div>`;
  $("#tq-count").textContent=Q.length+" ta savol · jami vaqt "+Math.round(Q.reduce((s,q)=>s+(+q.sec||60),0)/60)+" daqiqa · jami ball "+(Math.round(Q.reduce((s,q)=>s+(+q.pts||1),0)*10)/10);
  $("#tq-list").innerHTML=Q.length?`<div class="tablebox"><table class="wide"><thead><tr><th>#</th><th>Savol va variantlar</th><th>Vaqt (s) · Ball</th><th></th></tr></thead><tbody>`+Q.map((q,i)=>{const k=S.qkeys[q.id];
    return `<tr><td class="num">${i+1}</td><td><b>${esc(q.q)}</b><div class="opts-mini">${(q.o||[]).map((o,j)=>`<span class="${k&&k.a===j?"ok":""}">${"ABCDEF"[j]}) ${esc(o)}${k&&k.a===j?" ✓":""}</span>`).join("")}</div>${k?"":`<div class="why">To'g'ri javob kaliti topilmadi</div>`}</td>
      <td><div class="inline"><input type="number" min="5" max="600" value="${+q.sec||60}" data-sec="${esc(q.id)}" style="width:80px" title="Vaqt, soniya" aria-label="Vaqt, soniya"><input type="number" min="0.5" max="100" step="0.5" value="${+q.pts||1}" data-pts="${esc(q.id)}" style="width:70px" title="Ball" aria-label="Ball"><button class="btn ghost" type="button" data-secsave="${esc(q.id)}">Saqlash</button></div></td>
      <td><span class="btnrow"><button class="btn ghost" type="button" data-qed="${esc(q.id)}">Tahrirlash</button><button class="btn ghost" type="button" data-qdel="${esc(q.id)}">O'chirish</button></span></td></tr>`}).join("")+`</tbody></table></div>`:`<div class="empty">Savollar banki bo'sh. Yuqoridagi shakl orqali savol qo'shing yoki ommaviy yuklang.</div>`;
  const L=$("#tq-list");
  L.querySelectorAll("[data-secsave]").forEach(b=>b.onclick=async()=>{const id=b.dataset.secsave,v=+L.querySelector(`[data-sec="${id}"]`).value,pt=+L.querySelector(`[data-pts="${id}"]`).value;if(!(v>=5&&v<=600)){toast("Vaqt 5–600 soniya");return}if(!(pt>0&&pt<=100)){toast("Ball 0 dan katta, 100 gacha");return}try{await fs.doc("questions/"+id).update({sec:v,pts:pt});toast(`Saqlandi: ${v} s, ${pt} ball`)}catch(e){toast("Bajarib bo'lmadi")}});
  L.querySelectorAll("[data-qed]").forEach(b=>b.onclick=()=>{const q=S.questions.find(x=>x.id===b.dataset.qed),k=S.qkeys[q.id];tqEdit=q.id;$("#tq-q").value=q.q;$("#tq-sec").value=q.sec||60;$("#tq-pts").value=q.pts||1;tqOptsRender([...q.o],k?k.a:null);$("#tq-title").textContent="Savolni tahrirlash";$("#tq-btn").textContent="O'zgarishlarni saqlash";$("#tq-cancel").hidden=false;$("#tqform").scrollIntoView({behavior:"smooth",block:"start"})});
  L.querySelectorAll("[data-qdel]").forEach(b=>b.onclick=()=>{const id=b.dataset.qdel,cell=b.parentElement;
    cell.innerHTML=`<span class="confirm">O'chirilsinmi? <button class="btn danger" type="button" data-yes>Ha</button><button class="btn ghost" type="button" data-no>Yo'q</button></span>`;
    cell.querySelector("[data-no]").onclick=()=>renderTestAdmin();
    cell.querySelector("[data-yes]").onclick=async()=>{try{await fs.doc("questions/"+id).delete();await fs.doc("qkeys/"+id).delete();toast("O'chirildi")}catch(e){toast("Bajarib bo'lmadi")}}});
  const rows=A.map(a=>{const r=S.results[a.id]||{},c=S.contacts[a.id]||{},f=(S.faces||[]).find(x=>x.id===a.id);return {a,r,name:c.name||"",login:a.login||c.login||"",score:typeof r.test==="number"&&r.attemptAt===a.startedAt?r.test:null,dur:a.finishedAt?a.finishedAt-a.startedAt:null,face:f}})
    .sort((x,y)=>((y.score??-1)-(x.score??-1))||((x.dur||9e15)-(y.dur||9e15)));
  let rk=0;const fresh=x=>x.r.attemptAt===x.a.startedAt,ptsOf=x=>fresh(x)?{e:x.r.earned??x.r.correct,m:x.r.maxPts??x.r.total}:{e:"—",m:"—"};
  TR_ROWS=rows;
  $("#tr-list").innerHTML=(rows.length?`<div class="btnrow" style="margin-bottom:10px"><button class="btn" type="button" id="tr-xlsx">Reytingni Excel'ga yuklab olish</button><span class="note">F.I.Sh., ball va o'rin bilan</span></div>`:"")+(rows.length?`<div class="tablebox"><table class="wide"><thead><tr><th class="num">O'rin</th><th>Login</th><th>F.I.Sh.</th><th class="num">Ball</th><th class="num">Foiz</th><th class="num">To'g'ri</th><th>Holat</th><th>Face ID</th><th>Boshlagan</th><th class="num">Davomiyligi</th><th></th></tr></thead><tbody>`+rows.map(x=>{
    const st=x.a.status==="running"?`<span class="pill open">Topshiryapti</span>`:x.a.status==="terminated"?`<span class="pill out">To'xtatilgan</span><div class="why">${esc(x.a.reason||"")}</div>`:`<span class="pill win">Yakunlangan</span>`;
    const fc=x.a.face||{};const faceTxt=fc.enrolled?"Ro'yxatga olindi":fc.dist!=null?`Mos (${fc.dist})`:"—";
    const place=x.score!=null&&x.a.status==="done"?++rk:"—";
    return `<tr class="${place===1?"winner":""}"><td class="num">${place}</td><td class="mono">${esc(x.login||"—")}</td><td>${esc(x.name||"—")}</td><td class="num"><b>${x.score==null?(x.a.status==="running"?"…":"hisoblanmoqda"):`${ptsOf(x).e} / ${ptsOf(x).m}`}</b></td><td class="num">${x.score==null?"—":x.score+"%"}</td><td class="num">${fresh(x)?`${x.r.correct}/${x.r.total}`:"—"}</td><td>${st}</td><td>${faceTxt}</td><td class="mono" style="white-space:nowrap">${dt(x.a.startedAt)}</td><td class="num">${x.dur?Math.round(x.dur/60000*10)/10+" daq":"—"}</td>
      <td><span class="btnrow"><button class="btn ghost" type="button" data-retake="${esc(x.a.id)}">Qayta topshirishga ruxsat</button>${x.face?`<button class="btn ghost" type="button" data-facereset="${esc(x.a.id)}">Face ID ni tiklash</button>`:""}</span></td></tr>`}).join("")+`</tbody></table></div>`:`<div class="empty">Hali hech kim test topshirmagan.</div>`);
  const T=$("#tr-list");
  const xb=$("#tr-xlsx");if(xb)xb.onclick=()=>exportTestXlsx(xb);
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
  if(!await faceGate({enrollOnly:true})){
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
  try{const c=JSON.parse(localStorage.getItem("ot-ai-models")||"null");if(c&&c.list&&c.list.length&&Date.now()-c.at<864e5)return pref?[pref,...c.list.filter(x=>x!==pref)]:c.list}catch(e){}
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
  if(names.length)try{localStorage.setItem("ot-ai-models",JSON.stringify({at:Date.now(),list}))}catch(e){}
  return pref?[pref,...list.filter(x=>x!==pref)]:list;
}
// Asosiy chaqiruv: system — ko'rsatma, msgs — [{role:"user"|"model",text}]
async function aiAsk(system,msgs,opt){
  opt=opt||{};const cfg=await aiCfg();
  if(!cfg.key)throw new Error("nokey");
  if(cfg.on===false&&!opt.admin)throw new Error("off");
  if(!aiQuota())throw new Error("quota");
  let models=(await aiModels(cfg.key,cfg.model)).slice(0,5);
  if(!cfg.model){try{const ok=localStorage.getItem("ot-ai-model");if(ok&&models.includes(ok))models=[ok,...models.filter(x=>x!==ok)]}catch(e){}}
  const base={systemInstruction:{parts:[{text:system}]},contents:msgs.map(m=>({role:m.role==="model"?"model":"user",parts:[{text:m.text}]}))};
  let last=null;
  for(let i=0;i<models.length;i++){
    const model=models[i];let think=opt.fast?aiThink(model):null;
    for(let attempt=0;attempt<3;attempt++){
      const gc={temperature:opt.temp??0.6,maxOutputTokens:opt.max||1500};if(think)gc.thinkingConfig=think;
      const body=JSON.stringify({...base,generationConfig:gc}),stream=!!opt.onText;
      let r,j;
      try{r=await fetch(AI_BASE+"models/"+encodeURIComponent(model)+(stream?":streamGenerateContent?alt=sse":":generateContent"),{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":cfg.key},body})}
      catch(e){last=e;break}
      if(r.ok){
        let t="",reason="";
        if(stream&&r.body&&/event-stream/i.test(r.headers.get("content-type")||"")){
          // javob bo'lak-bo'lak keladi: har bo'lakni darhol ekranga chiqaramiz
          const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
          try{for(;;){const {done,value}=await rd.read();buf+=done?"\n":dec.decode(value,{stream:true});
            let k;while((k=buf.indexOf("\n"))>=0){const line=buf.slice(0,k).trim();buf=buf.slice(k+1);if(!line.startsWith("data:"))continue;
              try{const d=JSON.parse(line.slice(5)),c=(d.candidates||[])[0];if(c){if(c.finishReason)reason=c.finishReason;const part=((c.content||{}).parts||[]).filter(p=>!p.thought).map(p=>p.text||"").join("");if(part){t+=part;opt.onText(t)}}}catch(e){}}if(done)break}}
          catch(e){if(!t){last=e;break}}
        }else{j=await r.json().catch(()=>({}));const arr=Array.isArray(j)?j:[j];
          for(const d of arr){const c=(d.candidates||[])[0];if(c){if(c.finishReason)reason=c.finishReason;t+=((c.content||{}).parts||[]).filter(p=>!p.thought).map(p=>p.text||"").join("")}}
          if(t&&opt.onText)opt.onText(t)}
        t=t.trim();
        if(t){AI.used=model;try{localStorage.setItem("ot-ai-model",model)}catch(e){}return t}
        last=new Error(reason==="SAFETY"?"AI bu so'rovga javob bermadi.":"AI bo'sh javob qaytardi.");break}
      j=await r.json().catch(()=>({}));if(Array.isArray(j))j=j[0]||{};
      const m=(j.error&&j.error.message)||("HTTP "+r.status);last=new Error(m);last.status=r.status;
      if(r.status===400&&think&&/think/i.test(m)){think=null;continue}                // model "o'ylash" sozlamasini qo'llamasa — usiz
      const busy=r.status===503||r.status===500||/high demand|overloaded|unavailable/i.test(m);
      if(busy&&attempt===0){await new Promise(res=>setTimeout(res,800));continue}   // bir marta qayta urinish
      if(busy||r.status===404||r.status===429)break;                              // keyingi modelga o'tish
      throw last;                                                                  // kalit xatosi va h.k.
    }
  }
  throw last||new Error("AI javob bermadi");
}
// Tezlik uchun "o'ylash" (thinking) bosqichini o'chiramiz yoki eng kam darajaga tushiramiz
function aiThink(model){
  if(/flash-lite/i.test(model))return null;                       // lite modellarda o'ylash yo'q
  if(/gemini-2\.5-flash/i.test(model))return {thinkingBudget:0};
  if(/gemini-(?:[3-9]|\d\d)|flash-latest/i.test(model))return {thinkingLevel:"minimal"};
  return null;
}
function aiErr(e){const m=(e&&e.message)||"";
  if(m==="nokey")return S.isChief?"AI kaliti kiritilmagan. Administrator → Tizim → Sozlamalar bo'limida Gemini kalitini kiriting.":"AI hali yoqilmagan. Bosh administrator sozlamalarni tugatishi kerak.";
  if(m==="off")return "AI yordamchi bosh administrator tomonidan vaqtincha o'chirilgan.";
  if(m==="quota")return "Bugungi AI so'rovlar limiti tugadi. Ertaga qayta urinib ko'ring.";
  if(e&&e.status===429)return "AI xizmati hozir band (bepul limit). Bir daqiqadan keyin qayta urinib ko'ring.";
  if(e&&(e.status===503||e.status===500||/high demand|overloaded/i.test(m)))return "Google AI serverlari hozir juda band. Bir necha daqiqadan keyin qayta urinib ko'ring.";
  if(e&&(e.status===400||e.status===403))return "AI kaliti noto'g'ri yoki bu sayt uchun ruxsat berilmagan.";
  if(/Failed to fetch|NetworkError/i.test(m))return "Internet aloqasi yo'q yoki AI xizmatiga ulanib bo'lmadi.";
  console.warn("AI:",m);return "AI hozir javob bera olmadi. Birozdan keyin qayta urinib ko'ring.";
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

function aiAdminCtx(){
  const vs=S.vacs||[],open=vs.filter(v=>v.status==="open"),closed=vs.filter(v=>v.status==="closed");
  const per=open.map(v=>`- ${v.title} (${orgOf(v.orgId).name}): ${applicantsOf(v).length} ariza, ${daysLeft(v)}`).join("\n");
  const ap=(S.appeals||[]),qn=(S.questions||[]).length,tr=(S.testreqs||[]).filter(r=>r.status==="waiting").length,res=Object.keys(S.results||{}).length;
  return `\n\nUmumiy statistika (shaxsiy ma'lumotsiz): tashkilotlar ${(S.orgs||[]).length}; vakansiyalar: ochiq ${open.length}, yakunlangan ${closed.length}; ish beruvchilar ${(S.admins||[]).length} (ruxsat kutayotgan ${(S.admins||[]).filter(a=>!a.org).length}); test savollari bankida ${qn} ta savol; test topshirganlar ${res}; testga ruxsat kutayotganlar ${tr}; shikoyatlar ${ap.length} (javob kutayotgan ${ap.filter(a=>a.status==="open").length}).\nOchiq vakansiyalar bo'yicha arizalar:\n${per||"yo'q"}`;
}
// ---- 1) AI tahlilchi chat (faqat bosh administrator, Administrator qismida) ----
(function(){
  const fab=document.createElement("button");fab.type="button";fab.className="ai-fab";fab.id="ai-fab";fab.hidden=true;fab.setAttribute("aria-label","AI yordamchi");
  fab.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" fill="currentColor"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" fill="currentColor"/></svg><span>AI tahlilchi</span>';
  const pane=document.createElement("section");pane.className="ai-pane";pane.id="ai-pane";pane.hidden=true;pane.setAttribute("aria-label","AI yordamchi");
  pane.innerHTML=`<header><b>AI tahlilchi</b><span class="note">Gemini · javoblar xato bo'lishi mumkin</span><button type="button" class="ai-x" id="ai-x" aria-label="Yopish">×</button></header>
    <div class="ai-log" id="ai-log"></div>
    <div class="ai-sugg" id="ai-sugg"></div>
    <form class="ai-form" id="ai-form"><textarea id="ai-in" rows="1" maxlength="1000" placeholder="Savolingizni yozing…"></textarea><button class="btn" type="submit" id="ai-send">Yuborish</button></form>`;
  document.body.append(fab,pane);
  const SUG={applicant:["Menga qaysi vakansiya mos?","Ballim qanday hisoblanadi?","Testga qanday tayyorlanay?","Shikoyatni qanday yozaman?"],
    admin:["Vakansiyani qanday e'lon qilaman?","Tanlovni qachon yakunlayman?","G'olibni nega o'zim tanlay olmayman?"],
    chief:["Umumiy holatni tahlil qil","Qaysi vakansiyalarga ariza kam?","Test savollari bankini qanday yaxshilayman?","Shikoyatlarni qanday ko'rib chiqaman?"]};
  function draw(){
    const L=$("#ai-log");
    L.innerHTML=AI.chat.length?AI.chat.map(m=>`<div class="ai-msg ${m.role==="model"?"bot":"me"}">${m.role==="model"?aiMd(m.text):esc(m.text)}</div>`).join(""):`<div class="ai-msg bot"><p>Assalomu alaykum! Men bosh administrator uchun tahlil yordamchisiman. Ilovadagi umumiy statistika, test va shikoyatlar bo'yicha savol bering — men faqat tahlil va maslahat beraman, hech narsani o'zgartirmayman.</p></div>`;
    if(AI.busy)L.insertAdjacentHTML("beforeend",`<div class="ai-msg bot ai-typing"><span></span><span></span><span></span></div>`);
    L.scrollTop=L.scrollHeight;
    $("#ai-sugg").innerHTML=AI.chat.length?"":(SUG[S.role]||SUG.applicant).map(q=>`<button type="button" class="chip">${esc(q)}</button>`).join("");
    $("#ai-sugg").querySelectorAll("button").forEach(b=>b.onclick=()=>send(b.textContent));
    $("#ai-send").disabled=AI.busy;
  }
  async function send(q){
    q=(q||"").trim();if(!q||AI.busy)return;AI.chat.push({role:"user",text:q});AI.busy=true;draw();
    let live=null;const hist=AI.chat.slice(-12);
    const onText=t=>{if(!live){live={role:"model",text:""};AI.chat.push(live);AI.busy=false;draw();AI.busy=true}live.text=t;$("#ai-send").disabled=true;
      const el=$("#ai-log .ai-msg.bot:last-child");if(el){el.innerHTML=aiMd(t);const L=$("#ai-log");if(L.scrollHeight-L.scrollTop-L.clientHeight<120)L.scrollTop=L.scrollHeight}};
    try{const t=await aiAsk(AI_RULES+"\n\nSen hozir BOSH ADMINISTRATOR bilan gaplashyapsan: faqat tahlil, statistik xulosa va maslahat ber; hech qanday qarorni o'zing qabul qilma. Javobni qisqa va aniq yoz.\n\n"+aiContext()+aiAdminCtx(),hist,{temp:0.3,max:1200,admin:true,fast:true,onText});
      if(live)live.text=t;else AI.chat.push({role:"model",text:t})}
    catch(e){if(live&&live.text)live.text+="\n\n("+aiErr(e)+")";else{if(live)AI.chat.splice(AI.chat.indexOf(live),1);AI.chat.push({role:"model",text:aiErr(e)})}}
    AI.busy=false;draw();
  }
  fab.onclick=()=>{pane.hidden=!pane.hidden;fab.classList.toggle("on",!pane.hidden);if(!pane.hidden){draw();setTimeout(()=>$("#ai-in").focus(),50)}};
  $("#ai-x").onclick=()=>{pane.hidden=true;fab.classList.remove("on")};
  $("#ai-form").addEventListener("submit",e=>{e.preventDefault();const i=$("#ai-in");send(i.value);i.value=""});
  $("#ai-in").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#ai-form").requestSubmit()}});
  // faqat ichkariga kirganda va test oynasi yopiq bo'lsa ko'rinadi
  setInterval(()=>{const show=S.role==="chief"&&S.isChief&&S.elev==="chief"&&$("#exam").hidden&&location.hash!=="#chat";fab.hidden=!show;if(!show){pane.hidden=true;fab.classList.remove("on")}},700);
})();

// ---- 2) Test matnini AI bilan tahlil qilib, test bo'limiga yuklash (faqat bosh administrator) ----
// AI savol o'ylab topmaydi: administrator kiritgan savol va javoblarni tartibga soladi, xatolarni topadi.
(function(){
  const tb=$("#tb-text");if(!tb)return;
  const box=document.createElement("div");box.className="ai-box stack";
  box.innerHTML=`<div class="btnrow" style="justify-content:space-between"><b>✨ AI yordamida test matnini tayyorlash</b><span class="note">AI savol o'ylab topmaydi — faqat siz kiritgan matnni tahlil qiladi</span></div>
    <p class="note" style="margin:0">Savollar va javoblarni istalgan ko'rinishda qo'ying (Word, PDF yoki Telegramdan nusxa, javoblar kaliti oxirida bo'lishi ham mumkin). AI ularni tizim formatiga o'tkazadi, to'g'ri javoblarni belgilaydi va xatolarni ko'rsatadi.</p>
    <label for="ai-q-raw">Test matni va javoblar<textarea id="ai-q-raw" rows="7" maxlength="30000" placeholder="1. 2 000 000 so'mning 15 foizi qancha?&#10;a) 150 000  b) 300 000  c) 30 000&#10;...&#10;Javoblar: 1-b, 2-a"></textarea></label>
    <div class="btnrow"><button class="btn ghost" type="button" id="ai-q-go">AI bilan tahlil qilish</button><button class="btn" type="button" id="ai-q-load" hidden>Test bo'limiga yuklash</button><span class="note" id="ai-q-st"></span></div>
    <div id="ai-q-rep" class="ai-rep" hidden></div>`;
  tb.closest("label").before(box);
  const rep=(out,errs,notes)=>{const r=$("#ai-q-rep");r.hidden=false;
    r.innerHTML=`<p><b>${out.length} ta savol yuklashga tayyor.</b>${errs.length?` <span class="err">${errs.length} tasida muammo — pastdagi matnda tuzating:</span>`:" Xato topilmadi."}</p>`+
      (errs.length?`<ul>${errs.slice(0,15).map(e=>`<li>${esc(e)}</li>`).join("")}</ul>`:"")+(notes?`<p class="note">AI izohi: ${esc(notes)}</p>`:"");
    $("#ai-q-load").hidden=!out.length;$("#ai-q-load").textContent=errs.length?`Xatosizlarini yuklash (${out.length})`:`Test bo'limiga yuklash (${out.length})`};
  $("#ai-q-go").onclick=async()=>{
    const raw=$("#ai-q-raw").value.trim(),st=$("#ai-q-st"),b=$("#ai-q-go");
    if(raw.length<10){st.textContent="Avval test matnini qo'ying.";return}
    b.disabled=true;$("#ai-q-load").hidden=true;$("#ai-q-rep").hidden=true;st.textContent="AI matnni tahlil qilmoqda…";
    const sys=`Sen test matnlarini tartibga soluvchi yordamchisan. Senga administrator kiritgan test savollari va javoblari beriladi.
Vazifang — ularni AYNAN quyidagi formatga o'tkazish:
Savol matni?
A) variant
B) variant *
C) variant
Vaqt: 60

Qat'iy qoidalar:
- Savol va variantlar matnini o'zgartirma, qisqartirma va yangi savol qo'shma; faqat raqamlash, ortiqcha belgi va bo'sh joylarni tozala, aniq imlo xatosini tuzatishing mumkin.
- To'g'ri javobni FAQAT matnning o'zidan ol (javoblar kaliti, belgi, qalin yozuv, "to'g'ri javob:" va h.k.). To'g'ri variant oxiriga " *" qo'y. Har savolda faqat bitta "*".
- Agar matnda to'g'ri javob ko'rsatilmagan bo'lsa, o'zing tanlama: o'sha savolni "*" siz qoldir.
- Variant harflari A), B), C), D)... ketma-ket bo'lsin. Savollar orasida bitta bo'sh qator.
- Agar matnda vaqt berilgan bo'lsa "Vaqt: N" qatorini yoz, aks holda yozma.
- Agar matnda savol uchun ball (ochko) ko'rsatilgan bo'lsa "Ball: N" qatorini yoz, aks holda yozma.
- Eng oxirida alohida qatorda "IZOH:" so'zidan keyin topilgan muammolarni qisqa yoz (masalan: "5-savolda javob ko'rsatilmagan", "8-savolda 2 ta to'g'ri javob bor edi"). Muammo bo'lmasa "IZOH: yo'q".
Boshqa hech narsa yozma.`;
    try{
      let t=await aiAsk(sys,[{role:"user",text:raw.slice(0,30000)}],{temp:0.1,max:8000,admin:true});
      t=t.replace(/^```[a-z]*\n?|```\s*$/gim,"").trim();
      let notes="";const im=t.match(/\n?\s*IZOH:\s*([\s\S]*)$/i);if(im){notes=im[1].trim();t=t.slice(0,im.index).trim();if(/^yo['ʻ’`]?q\.?$/i.test(notes))notes=""}
      tb.value=t;const {out,errs}=parseBulk(t,+$("#tb-sec").value||60,+$("#tb-pts").value||1);
      rep(out,errs,notes);st.textContent="Natijani pastdagi oynada ko'rib chiqing.";
      tb.closest("details").open=true;
    }catch(e){st.textContent=aiErr(e)}
    b.disabled=false;
  };
  tb.addEventListener("input",()=>{if(!$("#ai-q-rep").hidden){const {out,errs}=parseBulk(tb.value,+$("#tb-sec").value||60,+$("#tb-pts").value||1);rep(out,errs,"")}});
  $("#ai-q-load").onclick=async()=>{
    const {out}=parseBulk(tb.value,+$("#tb-sec").value||60,+$("#tb-pts").value||1);if(!out.length)return;
    // faqat xatosiz bloklarni qoldirib, mavjud yuklash tugmasi orqali yuklaymiz
    tb.value=out.map(q=>[q.q,...q.o.map((o,i)=>String.fromCharCode(65+i)+") "+o+(i===q.a?" *":"")),"Vaqt: "+q.sec,"Ball: "+q.pts].join("\n")).join("\n\n");
    $("#ai-q-load").hidden=true;$("#ai-q-rep").hidden=true;$("#ai-q-raw").value="";$("#ai-q-st").textContent="";
    $("#tb-btn").click();log("ai",`AI yordamida ${out.length} ta savol tayyorlandi`).catch(()=>{});
  };
})();

// ---- 3) Vakansiya tavsifi maydoni ----
(function(){
  const t=$("#v-title");if(!t)return;
  const wrap=document.createElement("label");wrap.setAttribute("for","v-desc");
  wrap.innerHTML=`Lavozim tavsifi va vazifalar (ixtiyoriy)<textarea id="v-desc" rows="5" maxlength="1500" placeholder="Asosiy vazifalar, ish sharoiti, ish vaqti…"></textarea>`;
  $("#v-salary").closest("label").after(wrap);
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
  try{const t=await aiAsk(sys,[{role:"user",text:ctx}],{temp:0.3,max:1200,admin:true,fast:true});
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
    <p class="note">Bepul kalit: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> → "Create API key". Kalitni faqat bosh administrator ko'radi. AI faqat Administrator qismida: tahlil va test matnini tayyorlash uchun ishlaydi.</p>
    <div class="row2"><label for="ai-key">API kalit<input id="ai-key" type="password" autocomplete="off" class="mono" placeholder="AIza…"></label>
    <label for="ai-model">Model (bo'sh qolsa avtomatik)<input id="ai-model" class="mono" placeholder="avtomatik"></label></div>
    <label class="chk"><input type="checkbox" id="ai-on" checked> AI yordamchi barcha foydalanuvchilar uchun yoqilgan</label>
    <dl class="kv" id="ai-info"></dl>
    <div class="btnrow"><button class="btn" type="submit">Saqlash</button><button class="btn ghost" type="button" id="ai-test">Tekshirish</button><span class="note" id="ai-st"></span></div>`;
  ver.after(f);
  async function fill(){const c=await aiCfg(true);$("#ai-key").value="";$("#ai-key").placeholder=c.key?"saqlangan: …"+String(c.key).slice(-4)+" (o'zgartirish uchun yangisini yozing)":"AIza…";$("#ai-model").value=c.model||"";$("#ai-on").checked=c.on!==false;
    let m="";try{m=localStorage.getItem("ot-ai-model")||""}catch(e){}
    $("#ai-info").innerHTML=`<dt>Holat</dt><dd>${c.key?(c.on===false?"Kalit bor, o'chirilgan":"Yoqilgan"):"Kalit kiritilmagan"}</dd><dt>Ishlatilayotgan model</dt><dd class="mono">${esc(c.model||m||"birinchi so'rovda aniqlanadi")}</dd>`}
  f.addEventListener("submit",async e=>{e.preventDefault();const st=$("#ai-st");const c=await aiCfg(true);
    const key=$("#ai-key").value.trim()||c.key||"";if(!key){st.textContent="Kalitni kiriting.";return}
    try{await fs.doc("aicfg/main").set({key,model:$("#ai-model").value.trim(),on:$("#ai-on").checked,at:Date.now(),by:S.uid});try{localStorage.removeItem("ot-ai-model");localStorage.removeItem("ot-ai-models")}catch(e2){}
      await aiCfg(true);await log("ai","AI sozlamalari yangilandi");st.textContent="Saqlandi";fill()}catch(e2){st.textContent="Saqlab bo'lmadi: Firestore qoidalarini yangilang."}});
  $("#ai-test").onclick=async()=>{const st=$("#ai-st");st.textContent="Tekshirilmoqda…";
    try{const t=await aiAsk("Bitta qisqa jumlada o'zbek tilida javob ber.",[{role:"user",text:"Salom! Ishlayapsanmi?"}],{max:60,admin:true,fast:true});st.textContent="Ishlayapti ✓ ("+(AI.used||"")+") — "+t.slice(0,80);fill()}catch(e){st.textContent=aiErr(e)}};
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


// =================== ILOVA EGASI: ADMINISTRATOR KODINI O'ZGARTIRISH ===================
let OWNER=null,ownerUnsub=null,CHIEFS=[];
let ownerUid=null;
function watchOwner(){if(!S.uid)return;if(ownerUnsub&&ownerUid===S.uid)return;if(ownerUnsub)ownerUnsub();ownerUid=S.uid;OWNER=null;ownerUnsub=fs.doc("owner/main").onSnapshot(sn=>{OWNER=sn.exists?sn.data():null;if(!$("#v-sozlamalar").hidden)renderOwner()},()=>{})}
async function loadChiefs(){try{const q=await fs.collection("chiefs").get();CHIEFS=q.docs.map(d=>({uid:d.id,...d.data()}))}catch(e){CHIEFS=[]}}
function renderOwner(){
  watchOwner();const box=$("#ownerInfo");if(!box)return;const me=OWNER&&OWNER.uid===S.uid;
  $("#codeChange").hidden=!me;$("#chiefList").hidden=!me;
  if(!OWNER){box.innerHTML=`<p class="note">Ilova egasi hali belgilanmagan. Ega — administrator kodini o'zgartira oladigan va boshqa bosh administratorlarning huquqini ola oladigan yagona odam. Buni <b>faqat bir marta</b> qilish mumkin, keyin o'zgartirib bo'lmaydi.</p><div><button class="btn" type="button" id="own-claim">Men ilova egasiman — belgilash</button></div>`;
    $("#own-claim").onclick=async()=>{const b=$("#own-claim");if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Tasdiqlang: egasi faqat bir marta belgilanadi";setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="Men ilova egasiman — belgilash"}},6000);return}
      b.disabled=true;try{await fs.doc("owner/main").set({uid:S.uid,login:S.login||"",at:Date.now()});await log("owner","Ilova egasi belgilandi: "+S.login);toast("Siz ilova egasi sifatida belgilandingiz")}catch(e){toast("Bajarib bo'lmadi: ega allaqachon belgilangan yoki Firestore qoidalari yangilanmagan");b.disabled=false}};return}
  if(!me){box.innerHTML=`<p class="note">Ilova egasi: <b class="mono">${esc(OWNER.login||"—")}</b>. Administrator kodini faqat ega o'zgartira oladi.</p>`;return}
  box.innerHTML=`<p class="note"><span class="pill win">Siz ilova egasisiz</span> Administrator kodini faqat siz o'zgartira olasiz.</p>`;
  loadChiefs().then(()=>{const L=$("#chiefList");
    L.innerHTML=`<p class="sb-cap">Bosh administratorlar</p>`+(CHIEFS.length?`<div class="tablebox"><table class="wide"><thead><tr><th>Login</th><th>F.I.Sh.</th><th>Oxirgi kod tasdig'i</th><th></th></tr></thead><tbody>`+CHIEFS.map(c=>{const ct=S.contacts[c.uid]||{};return `<tr><td class="mono">${esc(c.login||"—")}</td><td>${esc(ct.name||"—")}</td><td class="mono">${c.at?dt(c.at):"—"}</td><td>${c.uid===S.uid?`<span class="pill open">Siz</span>`:`<button class="btn ghost" type="button" data-chrm="${esc(c.uid)}">Huquqni olish</button>`}</td></tr>`}).join("")+`</tbody></table></div>`:`<p class="note">Ro'yxat bo'sh.</p>`);
    L.querySelectorAll("[data-chrm]").forEach(b=>b.onclick=async()=>{if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Tasdiqlash uchun yana bosing";return}
      b.disabled=true;const c=CHIEFS.find(x=>x.uid===b.dataset.chrm);try{await fs.doc("chiefs/"+b.dataset.chrm).delete();await log("owner","Bosh administrator huquqi olindi: "+(c?c.login:""));toast("Huquq olindi");renderOwner()}catch(e){toast("Bajarib bo'lmadi");b.disabled=false}})});
}
$("#codeChange").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#cc-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;$("#cc-ok").textContent="";
  if(!OWNER||OWNER.uid!==S.uid)return fail("Kodni faqat ilova egasi o'zgartira oladi.");
  const pw=$("#cc-pass").value,c1=$("#cc-1").value.trim(),c2=$("#cc-2").value.trim();
  if(c1.length<8||!/[A-Za-z]/.test(c1)||!/\d/.test(c1))return fail("Kod kamida 8 belgi bo'lsin va harf hamda raqam qatnashsin.");
  if(c1.length>64)return fail("Kod 64 belgidan oshmasin.");
  if(c1!==c2)return fail("Kodlar bir xil emas.");
  const u=auth.currentUser,b=$("#cc-btn");if(!u)return;b.disabled=true;
  try{await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,pw))}catch(e2){b.disabled=false;return fail("Parol noto'g'ri.")}
  try{await fs.doc("secrets/chief").set({code:c1,at:Date.now(),by:S.uid});
    try{await fs.doc("chiefs/"+S.uid).update({code:c1,at:Date.now()})}catch(e3){}
    S.elev="chief";["cc-pass","cc-1","cc-2"].forEach(id=>$("#"+id).value="");$("#cc-ok").textContent="Kod o'zgartirildi. Endi faqat yangi kod ishlaydi.";toast("Administrator kodi o'zgartirildi");
    await log("owner","Administrator kodi o'zgartirildi")}
  catch(e2){fail("O'zgartirib bo'lmadi: Firestore qoidalarini yangilang (ilova egasi qoidasi).")}
  b.disabled=false;
});


// =================== XABARLAR: shaxsiy chat, guruh, kanal (Telegram uslubida) ===================
// Ma'lumotlar: pub/{uid} — ochiq profil (ism, @nom, bio, avatar); usernames/{nom} — nom bandligi;
// chats/{cid} — suhbat; chats/{cid}/msgs/{mid} — xabarlar; chatfiles/{id} — rasm/fayl (to'liq nusxa).
const CHAT={pub:{},chats:[],cur:null,msgs:[],filter:"all",view:"list",unsubList:null,unsubMsgs:null,uid:null,allPub:null,files:{},sending:false,panel:null,pubUnsub:null};
window.CHAT=CHAT;
const CH_MAX_FILE=700*1024;           // fayl: 700 KB gacha (Firestore hujjat chegarasi 1 MB)
const UN_RE=/^[a-z][a-z0-9_]{4,31}$/;
const chReadKey=cid=>"ot-chr-"+S.uid+"-"+cid;
function chRead(cid){try{return +localStorage.getItem(chReadKey(cid))||0}catch(e){return 0}}
function chMarkRead(cid,at){try{localStorage.setItem(chReadKey(cid),String(at||Date.now()))}catch(e){}}
function chTime(t){const d=new Date(t),n=new Date();if(d.toDateString()===n.toDateString())return d.toTimeString().slice(0,5);const y=new Date(n-864e5);if(d.toDateString()===y.toDateString())return "kecha";return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")}
function chDay(t){const d=new Date(t),n=new Date();if(d.toDateString()===n.toDateString())return "Bugun";const y=new Date(n-864e5);if(d.toDateString()===y.toDateString())return "Kecha";return dt(t).slice(0,10)}
function chSize(n){return n>1048576?(Math.round(n/104857.6)/10)+" MB":Math.max(1,Math.round(n/1024))+" KB"}
const CH_COLORS=["#E17076","#7BC862","#E5A64E","#65AADD","#A695E7","#EE7AAE","#6EC9CB","#FAA774"];
function chColor(id){let h=0;for(const c of String(id||""))h=(h*31+c.charCodeAt(0))|0;return CH_COLORS[Math.abs(h)%CH_COLORS.length]}
function chAva(o,size){size=size||44;const t=(o&&(o.title||o.name))||"?",id=(o&&(o.id||o.uid))||t;
  return o&&o.av?`<span class="ch-ava" style="width:${size}px;height:${size}px"><img src="${esc(o.av)}" alt=""></span>`:`<span class="ch-ava" style="width:${size}px;height:${size}px;background:${chColor(id)};font-size:${Math.round(size*.4)}px">${esc((t.trim()[0]||"?").toUpperCase())}</span>`}
// rasmni siqish (canvas)
function chImg(file,max,q){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{let w=im.naturalWidth,h=im.naturalHeight;const k=Math.min(1,max/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);
  const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);URL.revokeObjectURL(u);let qq=q,d=c.toDataURL("image/jpeg",qq);while(d.length>950000&&qq>0.35){qq-=0.1;d=c.toDataURL("image/jpeg",qq)}res({data:d,w,h})};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("img"))};im.src=u})}
function chSquare(file,size){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const s=Math.min(im.naturalWidth,im.naturalHeight),c=document.createElement("canvas");c.width=c.height=size;
  c.getContext("2d").drawImage(im,(im.naturalWidth-s)/2,(im.naturalHeight-s)/2,s,s,0,0,size,size);URL.revokeObjectURL(u);res(c.toDataURL("image/jpeg",0.82))};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("img"))};im.src=u})}

// ---- ochiq profillar ----
async function chPub(uid){if(CHAT.pub[uid])return CHAT.pub[uid];try{const g=await fs.doc("pub/"+uid).get();CHAT.pub[uid]=g.exists?{uid,...g.data()}:{uid,name:(S.contacts[uid]||{}).name||"Foydalanuvchi"}}catch(e){CHAT.pub[uid]={uid,name:"Foydalanuvchi"}}return CHAT.pub[uid]}
async function chAllPub(force){if(CHAT.allPub&&!force)return CHAT.allPub;try{const q=await fs.collection("pub").get();CHAT.allPub=q.docs.map(d=>({uid:d.id,...d.data()}));CHAT.allPub.forEach(p=>CHAT.pub[p.uid]=p)}catch(e){CHAT.allPub=[]}return CHAT.allPub}
// kirgan foydalanuvchi uchun ochiq profil yo'q bo'lsa — yaratamiz
async function chEnsureMe(){
  if(!S.uid)return;if(CHAT.pubUnsub&&CHAT.uid===S.uid)return;
  if(CHAT.pubUnsub)CHAT.pubUnsub();CHAT.uid=S.uid;
  CHAT.pubUnsub=fs.doc("pub/"+S.uid).onSnapshot(async sn=>{
    if(!sn.exists){const c=S.contacts[S.uid]||{},nm=c.name||(S.profile||{}).name||S.login||"Foydalanuvchi";
      try{await fs.doc("pub/"+S.uid).set({name:nm,username:"",bio:"",av:"",at:Date.now()})}catch(e){}return}
    CHAT.pub[S.uid]={uid:S.uid,...sn.data()};if(!$("#hdr").hidden&&S.role)renderNav(location.hash.slice(1));if(!$("#v-sozlamalarim").hidden)tgFill()},()=>{});
  chListen();
}
// ---- chatlar ro'yxati ----
function chListen(){
  if(CHAT.unsubList)CHAT.unsubList();
  const q=fs.collection("chats").where("members","array-contains",S.uid);
  CHAT.unsubList=q.onSnapshot(sn=>{
    const prev=CHAT.chats;CHAT.chats=sn.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.lastAt||b.createdAt||0)-(a.lastAt||a.createdAt||0));
    // yangi xabar bildirishnomasi
    CHAT.chats.forEach(c=>{const p=prev.find(x=>x.id===c.id);if(p&&c.lastAt>(p.lastAt||0)&&c.last&&c.last.by!==S.uid&&!(location.hash==="#chat"&&CHAT.cur===c.id&&document.visibilityState==="visible"))toast("✉ "+(c.type==="dm"?(c.last.name||"Yangi xabar"):c.title)+": "+String(c.last.t||"").slice(0,60))});
    chBadge();CHAT.chats.filter(c=>c.type==="dm").forEach(c=>{const o=c.members.find(m=>m!==S.uid);if(o&&!CHAT.pub[o])chPub(o).then(()=>{if(location.hash==="#chat")chDrawList()})});
    if(location.hash==="#chat"){chDrawList();if(CHAT.cur&&!CHAT.chats.some(c=>c.id===CHAT.cur)&&!CHAT.peek){CHAT.cur=null;chDrawMain()}else if(CHAT.cur)chDrawHead()}
  },e=>console.warn("chats",e));
}
function chUnread(c){return c.lastAt&&c.last&&c.last.by!==S.uid&&c.lastAt>chRead(c.id)}
function chBadge(){const n=CHAT.chats.filter(chUnread).length,b=document.querySelector('#modes button[data-mode="chat"]');if(!b)return;let x=b.querySelector(".bdg");if(n){if(!x){x=document.createElement("span");x.className="bdg";b.append(x)}x.textContent=n}else if(x)x.remove()}
function chTitle(c){if(c.type!=="dm")return c.title||"Suhbat";const o=c.members.find(m=>m!==S.uid)||S.uid,p=CHAT.pub[o];return p?(p.name||"Foydalanuvchi"):"…"}
function chAvaOf(c,size){if(c.type!=="dm")return chAva({id:c.id,title:c.title,av:c.av},size);const o=c.members.find(m=>m!==S.uid)||S.uid,p=CHAT.pub[o]||{uid:o,name:"?"};return chAva({...p,id:o},size)}
const CH_TYPE={dm:"",group:"👥 ",channel:"📢 "};
function chDrawList(){
  const box=$("#ch-items");if(!box)return;const q=$("#ch-q").value.trim().toLowerCase(),f=CHAT.filter;
  const L=CHAT.chats.filter(c=>(f==="all"||c.type===f)&&(!q||chTitle(c).toLowerCase().includes(q)));
  box.innerHTML=L.length?L.map(c=>{const u=chUnread(c),last=c.last||{},who=c.type==="group"&&last.by&&last.by!==S.uid?(last.name||"").split(" ")[0]+": ":last.by===S.uid?"Siz: ":"";
    const prev=last.kind==="img"?"🖼 Rasm":last.kind==="file"?"📎 "+(last.t||"Fayl"):(last.t||(c.type==="channel"?"Kanal yaratildi":c.type==="group"?"Guruh yaratildi":"Suhbat boshlandi"));
    return `<button type="button" class="ch-item${CHAT.cur===c.id?" on":""}" data-cid="${esc(c.id)}">${chAvaOf(c,48)}<span class="ch-it"><span class="ch-r1"><b>${CH_TYPE[c.type]||""}${esc(chTitle(c))}</b><small>${c.lastAt?chTime(c.lastAt):""}</small></span><span class="ch-r2"><span class="ch-prev">${esc(who+prev)}</span>${u?`<span class="ch-dot">●</span>`:""}</span></span></button>`}).join("")
    :`<div class="ch-empty"><p>${q?"Hech narsa topilmadi.":"Hali suhbat yo'q."}</p><button class="btn" type="button" data-act="new">Yangi suhbat boshlash</button></div>`;
  box.querySelectorAll("[data-cid]").forEach(b=>b.onclick=()=>chOpen(b.dataset.cid));
  const nb=box.querySelector('[data-act="new"]');if(nb)nb.onclick=()=>chPanel("new");
}
// ---- suhbatni ochish ----
function chOpen(cid,peek){
  if(CHAT.unsubMsgs){CHAT.unsubMsgs();CHAT.unsubMsgs=null}
  CHAT.cur=cid;CHAT.peek=peek||null;CHAT.panel=null;CHAT.msgs=[];$("#chat").classList.add("open");chDrawList();chDrawMain();
  let ref=fs.collection("chats/"+cid+"/msgs");if(typeof ref.orderBy==="function")ref=ref.orderBy("at","desc").limit(200);
  CHAT.unsubMsgs=ref.onSnapshot(sn=>{CHAT.msgs=sn.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.at||0)-(b.at||0));
    CHAT.msgs.forEach(m=>{if(m.by&&!CHAT.pub[m.by])chPub(m.by).then(()=>chDrawMsgs())});
    chDrawMsgs();const c=chCur();if(c&&location.hash==="#chat"&&document.visibilityState==="visible"){chMarkRead(cid,c.lastAt||Date.now());chBadge();chDrawList()}},e=>{console.warn("msgs",e);chDrawMsgs("Xabarlarni o'qib bo'lmadi.")});
}
function chCur(){return CHAT.chats.find(c=>c.id===CHAT.cur)||CHAT.peek}
const isChAdmin=c=>c&&(c.admins||[]).includes(S.uid);
function chDrawMain(){
  const m=$("#ch-main");if(!m)return;
  if(CHAT.panel)return chDrawPanel();
  const c=chCur();
  if(!c){m.innerHTML=`<div class="ch-blank"><div class="ch-blank-ico">💬</div><h2>Xabarlar</h2><p class="note">Suhbatni tanlang yoki yangisini boshlang: shaxsiy xabar, guruh yoki kanal.</p><button class="btn" type="button" id="ch-b-new">Yangi suhbat</button></div>`;$("#ch-b-new").onclick=()=>chPanel("new");return}
  const canWrite=c.type!=="channel"||isChAdmin(c),member=(c.members||[]).includes(S.uid);
  m.innerHTML=`<header class="ch-head" id="ch-head"></header><div class="ch-msgs" id="ch-msgs"></div>
    ${member&&canWrite?`<form class="ch-comp" id="ch-comp"><button type="button" class="ch-ic" id="ch-att" title="Rasm yoki fayl" aria-label="Rasm yoki fayl biriktirish"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7L10 17.7a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><textarea id="ch-in" rows="1" maxlength="4000" placeholder="Xabar yozing…"></textarea><button class="ch-send" type="submit" id="ch-send" aria-label="Yuborish"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 11l18-8-8 18-2-7z" fill="currentColor"/></svg></button></form>`
      :member?`<div class="ch-ro">📢 Bu kanal — faqat administratorlar yozadi.<button class="linkbtn" type="button" id="ch-leave2">Kanaldan chiqish</button></div>`
      :`<div class="ch-ro"><button class="btn" type="button" id="ch-join">Kanalga qo'shilish</button></div>`}`;
  chDrawHead();chDrawMsgs();
  const comp=$("#ch-comp");if(comp){const ta=$("#ch-in");
    comp.addEventListener("submit",e=>{e.preventDefault();chSendText()});
    ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!/Android|iPhone/i.test(navigator.userAgent)){e.preventDefault();chSendText()}});
    ta.addEventListener("input",()=>{ta.style.height="auto";ta.style.height=Math.min(140,ta.scrollHeight)+"px"});
    $("#ch-att").onclick=()=>$("#ch-file").click();setTimeout(()=>ta.focus(),30)}
  const j=$("#ch-join");if(j)j.onclick=()=>chJoin(c);
  const l2=$("#ch-leave2");if(l2)l2.onclick=()=>chLeave(c);
}
function chDrawHead(){const h=$("#ch-head"),c=chCur();if(!h||!c)return;
  let sub="";if(c.type==="dm"){const o=c.members.find(x=>x!==S.uid)||S.uid,p=CHAT.pub[o]||{};sub=p.username?"@"+p.username:(p.bio||"shaxsiy suhbat")}
  else sub=c.type==="channel"?`kanal · ${(c.members||[]).length} obunachi`:`${(c.members||[]).length} a'zo`;
  h.innerHTML=`<button class="ch-ic ch-back" type="button" id="ch-back" aria-label="Orqaga">←</button>${chAvaOf(c,42)}<div class="ch-ht"><b>${CH_TYPE[c.type]||""}${esc(chTitle(c))}</b><small>${esc(sub)}</small></div><button class="ch-ic" type="button" id="ch-info" aria-label="Ma'lumot">ⓘ</button>`;
  $("#ch-back").onclick=()=>{$("#chat").classList.remove("open");CHAT.cur=null;if(CHAT.unsubMsgs){CHAT.unsubMsgs();CHAT.unsubMsgs=null}chDrawList();chDrawMain()};
  $("#ch-info").onclick=()=>chPanel("info");
}
function chDrawMsgs(err){
  const box=$("#ch-msgs"),c=chCur();if(!box||!c)return;const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;
  if(err){box.innerHTML=`<div class="ch-sys">${esc(err)}</div>`;return}
  let day="",html="",prevBy=null;
  if(!CHAT.msgs.length)html=`<div class="ch-sys">${c.type==="channel"?"Kanalda hali post yo'q.":"Hali xabar yo'q. Birinchi bo'lib yozing!"}</div>`;
  CHAT.msgs.forEach(m=>{const d=chDay(m.at||Date.now());if(d!==day){day=d;html+=`<div class="ch-day"><span>${esc(d)}</span></div>`;prevBy=null}
    const me=m.by===S.uid,p=CHAT.pub[m.by]||{name:m.name||"…"},showName=c.type==="group"&&!me&&prevBy!==m.by;prevBy=m.by;
    let body="";
    if(m.kind==="img")body=`<button type="button" class="ch-img" data-fid="${esc(m.fid||"")}" aria-label="Rasmni kattalashtirish"><img src="${esc(m.thumb||"")}" alt="Rasm" loading="lazy" style="aspect-ratio:${m.w&&m.h?m.w+"/"+m.h:"4/3"}"></button>`;
    if(m.kind==="file")body=`<button type="button" class="ch-fileb" data-fid="${esc(m.fid||"")}" data-fname="${esc(m.fname||"fayl")}"><span class="ch-fico">📄</span><span><b>${esc(m.fname||"Fayl")}</b><small>${chSize(m.fsize||0)} · yuklab olish</small></span></button>`;
    if(m.t&&m.kind!=="file")body+=`<div class="ch-txt">${chLinks(m.t)}</div>`;
    const canDel=me||isChAdmin(c);
    html+=`<div class="ch-row${me?" me":""}">${!me&&c.type==="group"?(showName?`<span class="ch-mava">${chAva({...p,id:m.by},32)}</span>`:`<span class="ch-mava"></span>`):""}<div class="ch-bub${m.kind==="img"?" media":""}">${showName?`<b class="ch-name" style="color:${chColor(m.by)}">${esc(p.name||"")}</b>`:""}${c.type==="channel"&&!me?`<b class="ch-name" style="color:${chColor(c.id)}">${esc(c.title)}</b>`:""}${body}<span class="ch-meta">${(m.at?new Date(m.at).toTimeString().slice(0,5):"")}${me?" ✓":""}${canDel?`<button type="button" class="ch-del" data-mid="${esc(m.id)}" aria-label="O'chirish" title="O'chirish">×</button>`:""}</span></div></div>`});
  box.innerHTML=html;
  if(atBottom||box.dataset.cid!==c.id){box.scrollTop=box.scrollHeight;box.dataset.cid=c.id}
  box.querySelectorAll(".ch-img").forEach(b=>b.onclick=()=>chShowImg(b.dataset.fid,b.querySelector("img").src));
  box.querySelectorAll(".ch-fileb").forEach(b=>b.onclick=()=>chDownload(b.dataset.fid,b.dataset.fname));
  box.querySelectorAll(".ch-del").forEach(b=>b.onclick=async e=>{e.stopPropagation();if(!b.dataset.sure){b.dataset.sure="1";b.textContent="o'chirilsinmi?";setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="×"}},3000);return}
    try{await fs.doc("chats/"+c.id+"/msgs/"+b.dataset.mid).delete()}catch(er){toast("O'chirib bo'lmadi")}});
  box.querySelectorAll("img").forEach(i=>i.addEventListener("load",()=>{if(atBottom||box.dataset.fresh)box.scrollTop=box.scrollHeight},{once:true}));
}
function chLinks(t){return esc(t).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/(^|\s)@([a-z][a-z0-9_]{4,31})/g,'$1<b>@$2</b>').replace(/\n/g,"<br>")}
// ---- yuborish ----
async function chPost(data,lastText,kind){
  const c=chCur();if(!c)return false;const me=CHAT.pub[S.uid]||{};const at=Date.now();
  const msg={by:S.uid,name:me.name||(S.contacts[S.uid]||{}).name||S.login||"",at,kind,...data};
  try{await fs.collection("chats/"+c.id+"/msgs").add(msg);
    await fs.doc("chats/"+c.id).update({last:{t:String(lastText||"").slice(0,120),by:S.uid,name:msg.name,kind},lastAt:at}).catch(()=>{});
    chMarkRead(c.id,at);return true}
  catch(e){console.warn(e);toast("Xabar yuborilmadi: internet yoki ruxsatni tekshiring");return false}
}
async function chSendText(){const ta=$("#ch-in");if(!ta)return;const t=ta.value.trim();if(!t||CHAT.sending)return;CHAT.sending=true;ta.value="";ta.style.height="auto";
  const ok=await chPost({t},t,"text");if(!ok)ta.value=t;CHAT.sending=false;ta.focus()}
$("#ch-file").addEventListener("change",async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;const c=chCur();if(!c)return;
  const isImg=/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(f.type);
  try{
    if(isImg){toast("Rasm yuborilmoqda…");const full=await chImg(f,1600,0.8),th=await chImg(f,420,0.6);
      const ref=await fs.collection("chatfiles").add({by:S.uid,cid:c.id,name:f.name,type:"image/jpeg",size:Math.round(full.data.length*0.75),data:full.data,at:Date.now()});
      await chPost({fid:ref.id,thumb:th.data,w:full.w,h:full.h,t:""},"Rasm","img")}
    else{if(f.size>CH_MAX_FILE){toast(`Fayl juda katta (${chSize(f.size)}). Hozircha ${chSize(CH_MAX_FILE)} gacha fayl yuborish mumkin.`);return}
      toast("Fayl yuborilmoqda…");const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});
      const ref=await fs.collection("chatfiles").add({by:S.uid,cid:c.id,name:f.name,type:f.type||"application/octet-stream",size:f.size,data,at:Date.now()});
      await chPost({fid:ref.id,fname:f.name.slice(0,120),fsize:f.size,ftype:f.type||""},f.name,"file")}
  }catch(er){console.warn(er);toast("Yuborib bo'lmadi: fayl juda katta yoki internet yo'q")}
});
async function chFile(fid){if(CHAT.files[fid])return CHAT.files[fid];const g=await fs.doc("chatfiles/"+fid).get();if(!g.exists)throw new Error("nofile");CHAT.files[fid]=g.data();return CHAT.files[fid]}
async function chShowImg(fid,thumb){
  const lb=document.createElement("div");lb.className="ch-lb";lb.innerHTML=`<img src="${esc(thumb)}" alt="Rasm"><button type="button" class="ch-lbx" aria-label="Yopish">×</button><button type="button" class="btn ch-lbd">Yuklab olish</button>`;document.body.append(lb);
  const close=()=>lb.remove();lb.onclick=e=>{if(e.target===lb||e.target.classList.contains("ch-lbx"))close()};
  document.addEventListener("keydown",function k(e){if(e.key==="Escape"){close();document.removeEventListener("keydown",k)}});
  try{if(fid){const f=await chFile(fid);lb.querySelector("img").src=f.data;lb.querySelector(".ch-lbd").onclick=()=>chSave(f.data,f.name||"rasm.jpg")}}catch(e){lb.querySelector(".ch-lbd").hidden=true}
}
function chSave(data,name){if(/; wv\)/.test(navigator.userAgent)){toast("Telefondagi ilovada fayl yuklab olinmaydi — saytni brauzerda oching");return}
  const a=document.createElement("a");a.href=data;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),300)}
async function chDownload(fid,name){try{toast("Fayl yuklanmoqda…");const f=await chFile(fid);chSave(f.data,f.name||name)}catch(e){toast("Faylni olib bo'lmadi")}}
// ---- yangi suhbat / ma'lumot panellari ----
function chPanel(kind){CHAT.panel=kind;$("#chat").classList.add("open");chDrawMain()}
async function chDrawPanel(){
  const m=$("#ch-main"),k=CHAT.panel,back=`<button class="ch-ic" type="button" id="ch-pback" aria-label="Orqaga">←</button>`;
  const bindBack=()=>{$("#ch-pback").onclick=()=>{CHAT.panel=null;if(!chCur())$("#chat").classList.remove("open");chDrawMain()}};
  if(k==="new"){
    m.innerHTML=`<header class="ch-head">${back}<div class="ch-ht"><b>Yangi suhbat</b></div></header><div class="ch-pan">
      <div class="ch-opts"><button type="button" data-p="dm">💬<b>Shaxsiy xabar</b><small>Bitta odam bilan</small></button><button type="button" data-p="group">👥<b>Guruh</b><small>Bir necha kishi yozishadi</small></button><button type="button" data-p="channel">📢<b>Kanal</b><small>Siz yozasiz, boshqalar o'qiydi</small></button><button type="button" data-p="find">🔎<b>Kanallarni topish</b><small>Ochiq kanallarga qo'shiling</small></button></div></div>`;
    bindBack();m.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>chPanel(b.dataset.p));return}
  if(k==="dm"){
    m.innerHTML=`<header class="ch-head">${back}<div class="ch-ht"><b>Shaxsiy xabar</b><small>Kimga yozasiz?</small></div></header><div class="ch-pan"><input id="ch-us" type="search" placeholder="Ism yoki @foydalanuvchi_nomi"><div id="ch-ul" class="ch-ul"><p class="note">Yuklanmoqda…</p></div></div>`;
    bindBack();const all=(await chAllPub(true)).filter(p=>p.uid!==S.uid);
    const draw=()=>{const q=$("#ch-us").value.trim().toLowerCase().replace(/^@/,"");const L=all.filter(p=>!q||(p.name||"").toLowerCase().includes(q)||(p.username||"").includes(q)).slice(0,60);
      $("#ch-ul").innerHTML=L.length?L.map(p=>`<button type="button" class="ch-u" data-u="${esc(p.uid)}">${chAva(p,42)}<span><b>${esc(p.name||"Foydalanuvchi")}</b><small>${p.username?"@"+esc(p.username):"foydalanuvchi nomi yo'q"}${p.bio?" · "+esc(p.bio):""}</small></span></button>`).join(""):`<p class="note">Hech kim topilmadi.</p>`;
      $("#ch-ul").querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>chStartDm(b.dataset.u))};
    $("#ch-us").oninput=draw;draw();setTimeout(()=>$("#ch-us").focus(),30);return}
  if(k==="group"||k==="channel"){
    const isG=k==="group";
    m.innerHTML=`<header class="ch-head">${back}<div class="ch-ht"><b>${isG?"Yangi guruh":"Yangi kanal"}</b></div></header><form class="ch-pan stack" id="ch-cf">
      <div class="ch-cfa"><div class="tg-ava" id="ch-cav" style="width:72px;height:72px">${isG?"👥":"📢"}</div><label class="btn ghost" for="ch-cav-in">Rasm</label><input type="file" id="ch-cav-in" accept="image/*" hidden></div>
      <label for="ch-ct">${isG?"Guruh nomi":"Kanal nomi"}<input id="ch-ct" maxlength="60" required></label>
      <label for="ch-ca">Tavsif (ixtiyoriy)<textarea id="ch-ca" rows="2" maxlength="300"></textarea></label>
      ${isG?"":`<label class="chk"><input type="checkbox" id="ch-cpub" checked> Ochiq kanal — har kim topib qo'shila oladi</label>`}
      <div><label>${isG?"A'zolar":"Obunachilar (ixtiyoriy)"}</label><input id="ch-cs" type="search" placeholder="Ism yoki @nom bo'yicha qidirish"><div id="ch-cl" class="ch-ul ch-pick"></div></div>
      <p class="err" id="ch-cerr" hidden></p><div><button class="btn" type="submit">${isG?"Guruh yaratish":"Kanal yaratish"}</button></div></form>`;
    bindBack();const all=(await chAllPub(true)).filter(p=>p.uid!==S.uid),sel=new Set();let av="";
    const draw=()=>{const q=$("#ch-cs").value.trim().toLowerCase().replace(/^@/,"");const L=all.filter(p=>!q||(p.name||"").toLowerCase().includes(q)||(p.username||"").includes(q)).slice(0,60);
      $("#ch-cl").innerHTML=L.map(p=>`<label class="ch-u"><input type="checkbox" data-u="${esc(p.uid)}" ${sel.has(p.uid)?"checked":""}>${chAva(p,36)}<span><b>${esc(p.name||"")}</b><small>${p.username?"@"+esc(p.username):""}</small></span></label>`).join("")||`<p class="note">Hech kim topilmadi.</p>`;
      $("#ch-cl").querySelectorAll("[data-u]").forEach(i=>i.onchange=()=>{i.checked?sel.add(i.dataset.u):sel.delete(i.dataset.u)})};
    $("#ch-cs").oninput=draw;draw();
    $("#ch-cav-in").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{av=await chSquare(f,160);$("#ch-cav").innerHTML=`<img src="${av}" alt="">`}catch(er){toast("Rasmni o'qib bo'lmadi")}};
    $("#ch-cf").addEventListener("submit",async e=>{e.preventDefault();const t=$("#ch-ct").value.trim(),er=$("#ch-cerr");er.hidden=true;
      if(t.length<2){er.textContent="Nomini yozing.";er.hidden=false;return}if(isG&&!sel.size){er.textContent="Kamida bitta a'zo tanlang.";er.hidden=false;return}
      const id=(isG?"g":"c")+Date.now().toString(36)+Math.random().toString(36).slice(2,6),at=Date.now();
      const doc={type:k,title:t.slice(0,60),about:$("#ch-ca").value.trim().slice(0,300),members:[S.uid,...sel],admins:[S.uid],owner:S.uid,av,createdAt:at,lastAt:at,last:{t:isG?"Guruh yaratildi":"Kanal yaratildi",by:S.uid,name:(CHAT.pub[S.uid]||{}).name||"",kind:"sys"}};
      if(!isG)doc.public=$("#ch-cpub").checked;
      try{await fs.doc("chats/"+id).set(doc);CHAT.panel=null;chOpen(id,{id,...doc});toast(isG?"Guruh yaratildi":"Kanal yaratildi")}catch(er2){er.textContent="Yaratib bo'lmadi: Firestore qoidalarini yangilang.";er.hidden=false}});
    return}
  if(k==="find"){
    m.innerHTML=`<header class="ch-head">${back}<div class="ch-ht"><b>Ochiq kanallar</b></div></header><div class="ch-pan"><div id="ch-fl" class="ch-ul"><p class="note">Yuklanmoqda…</p></div></div>`;bindBack();
    let L=[];try{const q=await fs.collection("chats").where("public","==",true).get();L=q.docs.map(d=>({id:d.id,...d.data()}))}catch(e){}
    $("#ch-fl").innerHTML=L.length?L.map(c=>`<div class="ch-u">${chAva({id:c.id,title:c.title,av:c.av},42)}<span><b>📢 ${esc(c.title)}</b><small>${(c.members||[]).length} obunachi${c.about?" · "+esc(c.about):""}</small></span>${(c.members||[]).includes(S.uid)?`<button class="btn ghost" type="button" data-open="${esc(c.id)}">Ochish</button>`:`<button class="btn" type="button" data-join="${esc(c.id)}">Qo'shilish</button>`}</div>`).join(""):`<p class="note">Hozircha ochiq kanal yo'q. O'zingiz yarating!</p>`;
    $("#ch-fl").querySelectorAll("[data-join]").forEach(b=>b.onclick=()=>chJoin(L.find(x=>x.id===b.dataset.join)));
    $("#ch-fl").querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>chOpen(b.dataset.open));return}
  if(k==="info"){
    const c=chCur();if(!c){CHAT.panel=null;return chDrawMain()}const adm=isChAdmin(c);
    for(const u of c.members||[])if(!CHAT.pub[u])await chPub(u);
    let other=null;if(c.type==="dm")other=CHAT.pub[c.members.find(x=>x!==S.uid)||S.uid]||{};
    m.innerHTML=`<header class="ch-head">${back}<div class="ch-ht"><b>Ma'lumot</b></div></header><div class="ch-pan">
      <div class="ch-card">${chAvaOf(c,96)}<h2>${esc(chTitle(c))}</h2><p class="note">${c.type==="dm"?(other.username?"@"+esc(other.username):""):c.type==="channel"?`Kanal · ${(c.members||[]).length} obunachi${c.public?" · ochiq":""}`:`Guruh · ${(c.members||[]).length} a'zo`}</p>${(c.type==="dm"?other.bio:c.about)?`<p>${esc(c.type==="dm"?other.bio:c.about)}</p>`:""}</div>
      ${c.type!=="dm"?`<p class="sb-cap">${c.type==="channel"?"Obunachilar":"A'zolar"}</p><div class="ch-ul">${(c.members||[]).map(u=>{const p=CHAT.pub[u]||{};return `<div class="ch-u">${chAva({...p,id:u},38)}<span><b>${esc(p.name||"…")}${u===S.uid?" (siz)":""}</b><small>${(c.admins||[]).includes(u)?(u===c.owner?"egasi":"administrator"):(p.username?"@"+esc(p.username):"")}</small></span>${adm&&u!==S.uid&&u!==c.owner?`<button class="btn ghost" type="button" data-rm="${esc(u)}">Chiqarish</button>`:""}</div>`}).join("")}</div>
        ${adm?`<div class="stack"><p class="sb-cap">Qo'shish</p><input id="ch-ad" type="search" placeholder="Ism yoki @nom"><div id="ch-adl" class="ch-ul"></div></div>`:""}`:""}
      <div class="btnrow" style="margin-top:12px">${c.type!=="dm"&&c.owner!==S.uid?`<button class="btn ghost" type="button" id="ch-leave">${c.type==="channel"?"Kanaldan chiqish":"Guruhdan chiqish"}</button>`:""}${c.owner===S.uid?`<button class="btn danger" type="button" id="ch-delc">${c.type==="channel"?"Kanalni o'chirish":"Guruhni o'chirish"}</button>`:""}</div></div>`;
    bindBack();
    m.querySelectorAll("[data-rm]").forEach(b=>b.onclick=async()=>{try{await fs.doc("chats/"+c.id).update({members:(c.members||[]).filter(x=>x!==b.dataset.rm),admins:(c.admins||[]).filter(x=>x!==b.dataset.rm)});toast("Chiqarildi");setTimeout(()=>chDrawPanel(),300)}catch(e){toast("Bajarib bo'lmadi")}});
    const lv=$("#ch-leave");if(lv)lv.onclick=()=>chLeave(c);
    const dl=$("#ch-delc");if(dl)dl.onclick=async()=>{if(!dl.dataset.sure){dl.dataset.sure="1";dl.textContent="Tasdiqlash uchun yana bosing";return}try{await fs.doc("chats/"+c.id).delete();CHAT.panel=null;CHAT.cur=null;$("#chat").classList.remove("open");chDrawMain();toast("O'chirildi")}catch(e){toast("Bajarib bo'lmadi")}};
    const ad=$("#ch-ad");if(ad){const all=await chAllPub();const draw=()=>{const q=ad.value.trim().toLowerCase().replace(/^@/,"");if(!q){$("#ch-adl").innerHTML="";return}
      const L=all.filter(p=>!(c.members||[]).includes(p.uid)&&((p.name||"").toLowerCase().includes(q)||(p.username||"").includes(q))).slice(0,20);
      $("#ch-adl").innerHTML=L.map(p=>`<div class="ch-u">${chAva(p,36)}<span><b>${esc(p.name||"")}</b><small>${p.username?"@"+esc(p.username):""}</small></span><button class="btn" type="button" data-add="${esc(p.uid)}">Qo'shish</button></div>`).join("")||`<p class="note">Topilmadi.</p>`;
      $("#ch-adl").querySelectorAll("[data-add]").forEach(b=>b.onclick=async()=>{try{await fs.doc("chats/"+c.id).update({members:[...(c.members||[]),b.dataset.add]});toast("Qo'shildi");setTimeout(()=>chDrawPanel(),300)}catch(e){toast("Bajarib bo'lmadi")}})};ad.oninput=draw}
  }
}
async function chStartDm(uid){
  const id="dm_"+[S.uid,uid].sort().join("_");let ex=CHAT.chats.find(c=>c.id===id);
  if(!ex){try{const g=await fs.doc("chats/"+id).get();if(g.exists)ex={id,...g.data()}}catch(e){}}
  if(!ex){const at=Date.now(),doc={type:"dm",members:[S.uid,uid].sort(),admins:[],createdAt:at,lastAt:0,last:null};
    try{await fs.doc("chats/"+id).set(doc);ex={id,...doc}}catch(e){toast("Suhbatni boshlab bo'lmadi: Firestore qoidalarini yangilang");return}}
  CHAT.panel=null;chOpen(id,ex);
}
async function chJoin(c){if(!c)return;try{await fs.doc("chats/"+c.id).update({members:[...(c.members||[]),S.uid]});toast("Kanalga qo'shildingiz");CHAT.panel=null;chOpen(c.id,{...c,members:[...(c.members||[]),S.uid]})}catch(e){toast("Qo'shilib bo'lmadi")}}
async function chLeave(c){try{await fs.doc("chats/"+c.id).update({members:(c.members||[]).filter(x=>x!==S.uid),admins:(c.admins||[]).filter(x=>x!==S.uid)});CHAT.panel=null;CHAT.cur=null;$("#chat").classList.remove("open");chDrawMain();toast("Chiqdingiz")}catch(e){toast("Bajarib bo'lmadi")}}
function renderChat(){chEnsureMe();chDrawList();chDrawMain()}
$("#ch-new").onclick=()=>chPanel("new");
$("#ch-q").oninput=()=>chDrawList();
$("#ch-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-f]");if(!b)return;CHAT.filter=b.dataset.f;$("#ch-tabs").querySelectorAll("button").forEach(x=>x.setAttribute("aria-selected",x===b?"true":"false"));chDrawList()});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&location.hash==="#chat"&&CHAT.cur){const c=chCur();if(c){chMarkRead(c.id,c.lastAt||Date.now());chBadge();chDrawList()}}});
// kirgandan keyin chat tinglovchisini ishga tushirish (yangi xabar belgisi uchun)
setInterval(()=>{if(S.uid&&S.role&&(!CHAT.pubUnsub||CHAT.uid!==S.uid))chEnsureMe();if(!S.uid&&CHAT.pubUnsub){CHAT.pubUnsub();CHAT.pubUnsub=null;if(CHAT.unsubList){CHAT.unsubList();CHAT.unsubList=null}if(CHAT.unsubMsgs){CHAT.unsubMsgs();CHAT.unsubMsgs=null}CHAT.chats=[];CHAT.cur=null;CHAT.pub={};CHAT.allPub=null}},1500);

// ---- Telegram uslubidagi profil (Sozlamalar) ----
let tgAv=null;
function tgFill(){const p=CHAT.pub[S.uid]||{},f=$("#tgProf");if(!f||f.contains(document.activeElement))return;
  $("#tg-name").value=p.name||(S.contacts[S.uid]||{}).name||"";$("#tg-user").value=p.username||"";$("#tg-bio").value=p.bio||"";tgAv=null;tgDrawAva(p.av)}
function tgDrawAva(av){const p=CHAT.pub[S.uid]||{};$("#tg-ava").innerHTML=av?`<img src="${esc(av)}" alt="Profil rasmi">`:`<span style="background:${chColor(S.uid)}">${esc(((p.name||S.login||"?").trim()[0]||"?").toUpperCase())}</span>`;$("#tg-ava-del").hidden=!av}
$("#tg-ava-in").addEventListener("change",async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;try{tgAv=await chSquare(f,256);tgDrawAva(tgAv);$("#tg-ok").textContent="Saqlash tugmasini bosing"}catch(er){toast("Rasmni o'qib bo'lmadi")}});
$("#tg-ava-del").onclick=()=>{tgAv="";tgDrawAva("");$("#tg-ok").textContent="Saqlash tugmasini bosing"};
$("#tgProf").addEventListener("submit",async e=>{
  e.preventDefault();const err=$("#tg-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;$("#tg-ok").textContent="";
  const p=CHAT.pub[S.uid]||{},name=$("#tg-name").value.trim(),un=$("#tg-user").value.trim().toLowerCase().replace(/^@/,""),bio=$("#tg-bio").value.trim();
  if(name.length<2)return fail("Ismingizni yozing.");
  if(un&&!UN_RE.test(un))return fail("Foydalanuvchi nomi 5–32 belgi bo'lsin: lotin harfi bilan boshlansin, faqat harf, raqam va _.");
  const b=$("#tg-save");b.disabled=true;
  try{
    if(un!==(p.username||"")){
      if(un){const g=await fs.doc("usernames/"+un).get().catch(()=>null);if(g&&g.exists&&g.data().uid!==S.uid){b.disabled=false;return fail("Bu nom band. Boshqasini tanlang.")}
        await fs.doc("usernames/"+un).set({uid:S.uid,at:Date.now()})}
      if(p.username)await fs.doc("usernames/"+p.username).delete().catch(()=>{});
    }
    const upd={name:name.slice(0,60),username:un,bio:bio.slice(0,160),at:Date.now()};if(tgAv!==null)upd.av=tgAv;
    await fs.doc("pub/"+S.uid).set({name:upd.name,username:un,bio:upd.bio,av:tgAv!==null?tgAv:(p.av||""),at:upd.at});
    CHAT.pub[S.uid]={...p,...upd,uid:S.uid};tgAv=null;$("#tg-ok").textContent="Saqlandi";toast("Profil saqlandi");renderNav(location.hash.slice(1));
  }catch(er){console.warn(er);fail("Saqlab bo'lmadi: bu nom band yoki Firestore qoidalari yangilanmagan.")}
  b.disabled=false;
});
new MutationObserver(()=>{if(!$("#v-sozlamalarim").hidden){chEnsureMe();tgFill()}}).observe($("#v-sozlamalarim"),{attributes:true,attributeFilter:["hidden"]});


// =================== IJARA XONADONLARI ===================
// rentals/{id}       — e'lon (narx, kim uchun, necha kishi, manzil, qulayliklar, muqova rasmi)
// rentfiles/{id}     — e'lon rasmlari (siqilgan) va video bo'laklari (har biri ~700 KB)
// rentreqs/{id}      — ijarachining so'rovi (egasi qabul qiladi yoki rad etadi)
// rentcontracts/{id} — ikki tomon elektron tasdiqlaydigan ijara shartnomasi
var IJ=null;
IJ={list:[],unsub:null,reqs:{},reqUnsub:[],cons:[],conUnsub:null,uid:null,f:{q:"",g:"",max:"",reg:"",sort:"new"},edit:null,ph:[],vid:null,vidUrl:{},cur:null,started:false};
const IJ_GENDER={qiz:"Qizlar uchun",ogil:"Yigitlar uchun",oila:"Oila uchun",farqsiz:"Farqi yo'q"};
const IJ_TYPE={kvartira:"Kvartira",hovli:"Hovli uy",xona:"Alohida xona",ttj:"Yotoqxonadagi joy"};
const IJ_AMEN=[["wifi","Wi-Fi"],["mebel","Mebel"],["muzlatgich","Muzlatgich"],["kir","Kir yuvish mashinasi"],["konditsioner","Konditsioner"],["isitish","Isitish"],["gaz","Gaz"],["issiqsuv","Issiq suv"],["oshxona","Oshxona"],["tv","Televizor"],["parkovka","Avtoturargoh"],["bekat","Bekatga yaqin"]];
const IJ_MAX_PH=8,IJ_CHUNK=700*1024,IJ_VID_MAX=15*1024*1024,IJ_VID_SEC=120;
const IJ_ST={pending:["Ijarachi imzosi kutilmoqda","rank"],signed:["Imzolangan","res"],declined:["Ijarachi rad etdi","out"],cancelled:["Bekor qilingan","cancel"],ended:["Yakunlangan","closed"]};
const ijMoney=n=>(Math.round(+n||0)).toLocaleString("ru-RU").replace(/ /g," ")+" so'm";
const ijFree=r=>Math.max(0,(+r.capacity||0)-(+r.taken||0));
const ijPrice=r=>ijMoney(r.price)+(r.pay==="kishi"?" / oy, 1 kishi":" / oy");
const ijDate=s=>{if(!s)return"—";const [y,m,d]=String(s).split("-");return d&&m&&y?`${d}.${m}.${y}`:String(s)};
function ijAddMonths(s,n){const d=new Date(s+"T00:00:00Z");if(isNaN(d))return "";const y=d.getUTCFullYear(),m=d.getUTCMonth()+(+n||0),day=Math.min(d.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate());return new Date(Date.UTC(y,m,day)-864e5).toISOString().slice(0,10)}
function ijPending(){if(!IJ||!S.uid)return 0;return Object.values(IJ.reqs).filter(r=>r.owner===S.uid&&r.status==="pending").length+IJ.cons.filter(c=>c.renter===S.uid&&c.status==="pending").length}
function ijBadge(){const n=ijPending(),b=document.querySelector('#modes button[data-mode="ijara"]');if(!b)return;let x=b.querySelector(".bdg");if(n){if(!x){x=document.createElement("span");x.className="bdg";b.append(x)}x.textContent=n}else if(x)x.remove()}
const ijView=()=>{const t=location.hash.slice(1);return t==="ijara"||t==="ijara-mening"||t==="ijara-shartnoma"?t:null};
function ijRefresh(){const t=ijView();if(t==="ijara")ijDrawList();if(t==="ijara-mening")ijDrawMine();if(t==="ijara-shartnoma")ijDrawCons();ijBadge()}

function ijStart(){
  if(!S.uid||IJ.uid===S.uid)return;ijStop();IJ.uid=S.uid;const uid=S.uid,err=e=>console.warn("ijara",e&&e.code||e);
  IJ.unsub=fs.collection("rentals").onSnapshot(q=>{IJ.list=q.docs.map(d=>({id:d.id,...d.data()}));ijRefresh()},err);
  const onReq=q=>{q.docs.forEach(d=>{IJ.reqs[d.id]={id:d.id,...d.data()}});
    // o'chirilgan so'rovlarni tozalash
    const ids=new Set(q.docs.map(d=>d.id));Object.keys(IJ.reqs).forEach(k=>{const r=IJ.reqs[k];if(!ids.has(k)&&((q._side==="o"&&r.owner===uid)||(q._side==="r"&&r.renter===uid)))delete IJ.reqs[k]});ijRefresh()};
  IJ.reqUnsub=[fs.collection("rentreqs").where("owner","==",uid).onSnapshot(q=>{q._side="o";onReq(q)},err),fs.collection("rentreqs").where("renter","==",uid).onSnapshot(q=>{q._side="r";onReq(q)},err)];
  IJ.conUnsub=fs.collection("rentcontracts").where("parties","array-contains",uid).onSnapshot(q=>{IJ.cons=q.docs.map(d=>({id:d.id,...d.data()}));ijCount();ijRefresh();ijModalSync()},err);
}
function ijStop(){if(IJ.unsub)IJ.unsub();(IJ.reqUnsub||[]).forEach(f=>{try{f()}catch(e){}});if(IJ.conUnsub)IJ.conUnsub();Object.assign(IJ,{unsub:null,reqUnsub:[],conUnsub:null,uid:null,list:[],reqs:{},cons:[]})}
setInterval(()=>{if(S.uid&&S.role&&IJ.uid!==S.uid)ijStart();if(!S.uid&&IJ.uid)ijStop()},1500);
// egasi tomoni: imzolangan shartnoma bo'yicha band joylar sonini oshiradi (bir marta)
async function ijCount(){
  for(const c of IJ.cons){if(c.owner!==S.uid||c.status!=="signed"||c.counted)continue;
    const r=IJ.list.find(x=>x.id===c.rid);
    try{if(r)await fs.doc("rentals/"+r.id).update({taken:Math.min(+r.capacity||0,(+r.taken||0)+(+c.people||1)),updatedAt:Date.now()});await fs.doc("rentcontracts/"+c.id).update({counted:true})}catch(e){}}
}

// ---------- modal oyna ----------
function ijModal(html,wide){const m=$("#ij-modal");m.hidden=false;document.body.classList.add("ij-open");$("#ij-sheet").className="sheet ij-sheet"+(wide?" wide":"");$("#ij-sheet").innerHTML=`<button type="button" class="ij-x" aria-label="Yopish">×</button>`+html;$("#ij-sheet").scrollTop=0}
function ijClose(){$("#ij-modal").hidden=true;document.body.classList.remove("ij-open");$("#ij-sheet").innerHTML="";IJ.cur=null;IJ.edit=null}
$("#ij-modal").addEventListener("click",e=>{if(e.target.id==="ij-modal"||e.target.closest(".ij-x"))ijClose()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#ij-modal").hidden&&!document.querySelector(".ch-lb"))ijClose()});
function ijModalSync(){if(IJ.cur&&IJ.cur.kind==="con"){const c=IJ.cons.find(x=>x.id===IJ.cur.id);if(c&&c.status!==IJ.cur.st)ijShowCon(c.id)}}
function ijLightbox(src){const lb=document.createElement("div");lb.className="ch-lb";lb.innerHTML=`<img src="${esc(src)}" alt="Rasm"><button type="button" class="ch-lbx" aria-label="Yopish">×</button>`;document.body.append(lb);lb.onclick=e=>{if(e.target===lb||e.target.classList.contains("ch-lbx"))lb.remove()}}

// ---------- e'lonlar ro'yxati ----------
function renderIjara(t){ijStart();if(t==="ijara")ijDrawList();if(t==="ijara-mening")ijDrawMine();if(t==="ijara-shartnoma")ijDrawCons()}
function ijFilterUi(){const f=IJ.f;
  if(!$("#ij-reg").options.length)$("#ij-reg").innerHTML=`<option value="">Barcha hududlar</option>`+REGIONS.map(r=>`<option>${esc(r)}</option>`).join("");
  $("#ij-q").value=f.q;$("#ij-g").value=f.g;$("#ij-max").value=f.max;$("#ij-reg").value=f.reg;$("#ij-sort").value=f.sort}
function ijCard(r){const free=ijFree(r);
  return `<button type="button" class="ij-card" data-ij="${esc(r.id)}">
    <span class="ij-cover">${r.cover?`<img src="${esc(r.cover)}" alt="" loading="lazy">`:`<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`}
      <span class="ij-g g-${esc(r.gender)}">${esc(IJ_GENDER[r.gender]||"")}</span>${(r.photos||[]).length>1?`<span class="ij-n">${r.photos.length} rasm</span>`:""}${r.video||r.videoLink?`<span class="ij-v">▶ Video</span>`:""}</span>
    <span class="ij-body"><b class="ij-price">${esc(ijPrice(r))}</b><span class="ij-t">${esc(r.title||"")}</span>
      <span class="ij-loc">${esc([r.region,r.district].filter(Boolean).join(", "))}</span>
      <span class="ij-meta"><span>${esc(IJ_TYPE[r.type]||"")}</span>${r.rooms?`<span>${esc(r.rooms)} xona</span>`:""}<span class="${free?"ok":"full"}">${free?`Bo'sh: ${free} / ${esc(r.capacity)} kishi`:"Joy qolmagan"}</span></span></span></button>`}
function ijDrawList(){
  ijFilterUi();const f=IJ.f,q=f.q.trim().toLowerCase(),max=+f.max||0;
  let L=IJ.list.filter(r=>r.status!=="hidden"||r.owner===S.uid);
  if(f.g)L=L.filter(r=>r.gender===f.g||(f.g!=="oila"&&r.gender==="farqsiz"));
  if(f.reg)L=L.filter(r=>r.region===f.reg);
  if(max)L=L.filter(r=>(+r.price||0)<=max);
  if(q)L=L.filter(r=>[r.title,r.district,r.address,r.landmark,r.desc].join(" ").toLowerCase().includes(q));
  L.sort(f.sort==="cheap"?(a,b)=>(a.price||0)-(b.price||0):f.sort==="free"?(a,b)=>ijFree(b)-ijFree(a):(a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $("#ij-count").textContent=L.length?`${L.length} ta e'lon`:"";
  $("#ij-grid").innerHTML=L.length?L.map(ijCard).join(""):`<div class="empty"><b>${IJ.list.length?"Shartlarga mos e'lon topilmadi":"Hozircha e'lon yo'q"}</b><p class="note">${IJ.list.length?"Saralashni o'zgartirib ko'ring.":"Birinchi bo'lib xonadoningizni joylang — «+ E'lon joylash» tugmasini bosing."}</p></div>`;
}
["ij-q","ij-g","ij-max","ij-reg","ij-sort"].forEach(id=>$("#"+id).addEventListener("input",()=>{IJ.f={q:$("#ij-q").value,g:$("#ij-g").value,max:$("#ij-max").value,reg:$("#ij-reg").value,sort:$("#ij-sort").value};ijDrawList()}));
document.addEventListener("click",e=>{const c=e.target.closest("[data-ij]");if(c){ijShow(c.dataset.ij);return}
  if(e.target.closest("[data-ij-new]"))ijForm(null)});

// ---------- e'lon tafsiloti ----------
async function ijShow(id){
  const r=IJ.list.find(x=>x.id===id);if(!r){toast("E'lon topilmadi");return}
  IJ.cur={kind:"rent",id};const own=r.owner===S.uid,free=ijFree(r);
  const myReq=Object.values(IJ.reqs).find(q=>q.rid===id&&q.renter===S.uid&&(q.status==="pending"||q.status==="accepted"));
  const amen=(r.amen||[]).map(k=>(IJ_AMEN.find(a=>a[0]===k)||[k,k])[1]);
  const pub=window.CHAT?await chPub(r.owner).catch(()=>({})):{};
  const kv=(k,v)=>v===undefined||v===null||v===""?"":`<dt>${k}</dt><dd>${v}</dd>`;
  ijModal(`<div class="ij-gal" id="ij-gal"><div class="ij-main" id="ij-main">${r.cover?`<img src="${esc(r.cover)}" alt="${esc(r.title||"")}">`:`<span class="note">Rasm qo'shilmagan</span>`}</div><div class="ij-thumbs" id="ij-thumbs"></div></div>
    <div class="ij-head"><div><h2>${esc(r.title||"")}</h2><p class="note">${esc([r.region,r.district,r.address].filter(Boolean).join(", "))}${r.landmark?` · mo'ljal: ${esc(r.landmark)}`:""}</p></div>
      <div class="ij-pr"><b>${esc(ijMoney(r.price))}</b><small>${r.pay==="kishi"?"oyiga, 1 kishi uchun":"oyiga, butun xonadon"}</small></div></div>
    <div class="chips"><span class="ij-g g-${esc(r.gender)} inl">${esc(IJ_GENDER[r.gender]||"")}</span><span class="chip">${esc(IJ_TYPE[r.type]||"")}</span><span class="chip ${free?"":"full"}">${free?`Bo'sh joy: ${free} / ${esc(r.capacity)}`:"Joy qolmagan"}</span>${r.status==="hidden"?`<span class="pill closed">Yashirilgan</span>`:""}</div>
    ${r.video||r.videoLink?`<div class="ij-video" id="ij-video">${r.video?`<button class="btn ghost" type="button" id="ij-vplay">▶ Videoni ko'rish (${chSize(r.video.size||0)})</button>`:""}${r.videoLink?`<a class="btn ghost" href="${esc(r.videoLink)}" target="_blank" rel="noopener">Videoni havola orqali ochish</a>`:""}</div>`:""}
    <div class="ij-cols"><dl class="kv">
      ${kv("Necha kishi qabul qilinadi",esc(r.capacity)+" kishi")}${kv("Hozir yashayapti",esc(r.taken||0)+" kishi")}
      ${kv("Xonalar",r.rooms?esc(r.rooms):"")}${kv("Maydon",r.area?esc(r.area)+" m²":"")}${kv("Qavat",r.floor?esc(r.floor)+(r.floors?" / "+esc(r.floors):""):"")}
      ${kv("Garov puli",r.deposit?esc(ijMoney(r.deposit)):"Yo'q")}${kv("Kommunal to'lovlar",r.util==="kiradi"?"Narxga kiradi":"Alohida to'lanadi")}
      ${kv("Joylangan",dt(r.createdAt))}</dl>
      <div class="stack">${amen.length?`<div><h3 class="ij-h3">Qulayliklar</h3><div class="chips">${amen.map(a=>`<span class="chip">✓ ${esc(a)}</span>`).join("")}</div></div>`:""}
        ${r.rules?`<div><h3 class="ij-h3">Uy qoidalari</h3><p class="ij-txt">${esc(r.rules)}</p></div>`:""}</div></div>
    ${r.desc?`<div><h3 class="ij-h3">Batafsil</h3><p class="ij-txt">${esc(r.desc)}</p></div>`:""}
    <div class="ij-owner">${window.CHAT?chAva({...pub,uid:r.owner,name:pub.name||r.ownerName},44):""}<span><b>${esc(r.ownerName||pub.name||"Uy egasi")}</b><small>Uy egasi${pub.username?" · @"+esc(pub.username):""}</small></span>
      ${r.phone?`<a class="btn ghost" href="tel:${esc(String(r.phone).replace(/[^+\d]/g,""))}">${esc(r.phone)}</a>`:""}</div>
    <div class="btnrow">${own?`<button class="btn" type="button" id="ij-edit">Tahrirlash</button><button class="btn ghost" type="button" id="ij-hide">${r.status==="hidden"?"Ko'rsatish":"Yashirish"}</button><button class="btn danger" type="button" id="ij-del">O'chirish</button>`:
      `${myReq?`<span class="pill ${myReq.status==="accepted"?"res":"rank"}">${myReq.status==="accepted"?"So'rovingiz qabul qilindi — Shartnomalar bo'limini oching":"So'rovingiz yuborilgan, javob kutilmoqda"}</span>`:free?`<button class="btn" type="button" id="ij-req">Ijaraga so'rov yuborish</button>`:`<span class="pill closed">Joy qolmagan</span>`}
       <button class="btn ghost" type="button" id="ij-chat">Egasiga yozish</button>${S.isChief&&S.role==="chief"?`<button class="btn danger" type="button" id="ij-del">O'chirish (moderator)</button>`:""}`}</div>`,true);
  // rasmlar
  const ids=r.photos||[];if(ids.length){$("#ij-thumbs").innerHTML=ids.map((p,i)=>`<button type="button" data-ph="${esc(p)}" aria-label="${i+1}-rasm"><span class="ij-sk"></span></button>`).join("");
    const big={};ids.forEach(async(p,i)=>{try{const g=await fs.doc("rentfiles/"+p).get();if(!g.exists)return;big[p]=g.data().data;const b=document.querySelector(`#ij-thumbs [data-ph="${CSS.escape(p)}"]`);if(b)b.innerHTML=`<img src="${esc(big[p])}" alt="">`;if(i===0&&$("#ij-main"))$("#ij-main").innerHTML=`<img src="${esc(big[p])}" alt="${esc(r.title||"")}">`}catch(e){}});
    $("#ij-thumbs").onclick=e=>{const b=e.target.closest("[data-ph]");if(b&&big[b.dataset.ph])$("#ij-main").innerHTML=`<img src="${esc(big[b.dataset.ph])}" alt="">`};
    $("#ij-main").onclick=()=>{const im=$("#ij-main img");if(im)ijLightbox(im.src)}}
  const vp=$("#ij-vplay");if(vp)vp.onclick=()=>ijPlay(r);
  const on=(id,f)=>{const b=$("#"+id);if(b)b.onclick=f};
  on("ij-edit",()=>ijForm(r));
  on("ij-hide",async()=>{try{await fs.doc("rentals/"+r.id).update({status:r.status==="hidden"?"active":"hidden",updatedAt:Date.now()});toast(r.status==="hidden"?"E'lon yana ko'rinadi":"E'lon yashirildi");ijClose()}catch(e){toast("Bajarib bo'lmadi")}});
  on("ij-del",()=>ijDelete(r));
  on("ij-req",()=>ijReqForm(r));
  on("ij-chat",async()=>{if(!window.CHAT){toast("Chat mavjud emas");return}ijClose();location.hash="chat";setTimeout(()=>chStartDm(r.owner),200)});
}
async function ijPlay(r){
  const box=$("#ij-video");if(!box||!r.video)return;
  if(IJ.vidUrl[r.video.id]){box.innerHTML=`<video controls playsinline src="${IJ.vidUrl[r.video.id]}"></video>`;return}
  box.innerHTML=`<p class="note" id="ij-vmsg">Video yuklanmoqda… 0%</p>`;
  try{const n=r.video.n||1,parts=new Array(n);let got=0;
    await Promise.all(Array.from({length:n},async(_,i)=>{const g=await fs.doc("rentfiles/"+r.video.id+"_"+i).get();if(!g.exists)throw new Error("part");const b=atob(g.data().data),u=new Uint8Array(b.length);for(let k=0;k<b.length;k++)u[k]=b.charCodeAt(k);parts[i]=u;got++;const m=$("#ij-vmsg");if(m)m.textContent=`Video yuklanmoqda… ${Math.round(got*100/n)}%`}));
    const url=URL.createObjectURL(new Blob(parts,{type:r.video.type||"video/mp4"}));IJ.vidUrl[r.video.id]=url;
    if($("#ij-video"))$("#ij-video").innerHTML=`<video controls playsinline autoplay src="${url}"></video>`;
  }catch(e){if($("#ij-video"))$("#ij-video").innerHTML=`<p class="err">Videoni yuklab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.</p>`}
}
async function ijDelete(r){
  if(!confirm("E'lon, uning rasmlari va videosi o'chiriladi. Davom etasizmi?"))return;
  try{const ids=[...(r.photos||[]),...(r.video?Array.from({length:r.video.n||1},(_,i)=>r.video.id+"_"+i):[])];
    await Promise.all(ids.map(p=>fs.doc("rentfiles/"+p).delete().catch(()=>{})));
    await fs.doc("rentals/"+r.id).delete();if(r.owner!==S.uid)log("ijara",`E'lon o'chirildi (moderator): ${r.title}`).catch(()=>{});toast("E'lon o'chirildi");ijClose()}
  catch(e){toast("O'chirib bo'lmadi")}
}

// ---------- e'lon joylash / tahrirlash ----------
function ijForm(r){
  const c=S.contacts[S.uid]||{},v=r||{status:"active",gender:"",type:"kvartira",pay:"xonadon",util:"alohida",capacity:2,taken:0,region:"Jizzax",phone:c.phone||"",amen:[]};
  IJ.edit={id:r?r.id:fs.collection("rentals").doc().id,orig:r};IJ.ph=(r&&r.photos||[]).map(id=>({id,old:true,thumb:null}));IJ.vid=r&&r.video?{...r.video,old:true}:null;IJ.cur={kind:"form"};
  const opt=(o,sel)=>Object.entries(o).map(([k,l])=>`<option value="${k}" ${k===sel?"selected":""}>${esc(l)}</option>`).join("");
  ijModal(`<form class="stack" id="ij-form" novalidate><h2 style="margin:0">${r?"E'lonni tahrirlash":"Yangi e'lon: ijaraga xonadon"}</h2>
    <label>Sarlavha<input id="ijf-title" maxlength="100" required placeholder="Masalan: 2 xonali kvartira, universitet yonida" value="${esc(v.title||"")}"></label>
    <div class="row3"><label>Turi<select id="ijf-type">${opt(IJ_TYPE,v.type)}</select></label><label>Kim uchun<select id="ijf-g" required><option value="">Tanlang…</option>${opt(IJ_GENDER,v.gender)}</select></label><label>Holati<select id="ijf-st"><option value="active" ${v.status!=="hidden"?"selected":""}>Faol</option><option value="hidden" ${v.status==="hidden"?"selected":""}>Yashirin</option></select></label></div>
    <div class="row3"><label>Narx (so'm)<input id="ijf-price" type="number" min="0" step="10000" inputmode="numeric" required value="${esc(v.price||"")}" placeholder="1500000"></label><label>Narx kimga<select id="ijf-pay"><option value="xonadon" ${v.pay!=="kishi"?"selected":""}>Butun xonadon, oyiga</option><option value="kishi" ${v.pay==="kishi"?"selected":""}>1 kishi, oyiga</option></select></label><label>Garov puli (so'm)<input id="ijf-dep" type="number" min="0" step="10000" inputmode="numeric" value="${esc(v.deposit||"")}" placeholder="0"></label></div>
    <div class="row3"><label>Necha kishi qabul qilinadi<input id="ijf-cap" type="number" min="1" max="50" required value="${esc(v.capacity||"")}"></label><label>Hozir yashayapti<input id="ijf-taken" type="number" min="0" max="50" value="${esc(v.taken||0)}"></label><label>Kommunal to'lovlar<select id="ijf-util"><option value="alohida" ${v.util!=="kiradi"?"selected":""}>Alohida to'lanadi</option><option value="kiradi" ${v.util==="kiradi"?"selected":""}>Narxga kiradi</option></select></label></div>
    <div class="row3"><label>Viloyat<select id="ijf-reg">${REGIONS.map(x=>`<option ${x===v.region?"selected":""}>${esc(x)}</option>`).join("")}</select></label><label>Shahar / tuman<input id="ijf-dist" maxlength="60" value="${esc(v.district||"")}" placeholder="Jizzax sh."></label><label>Mo'ljal<input id="ijf-land" maxlength="80" value="${esc(v.landmark||"")}" placeholder="Universitet, 5-bekat"></label></div>
    <label>Manzil (ko'cha, uy, xonadon)<input id="ijf-addr" maxlength="140" value="${esc(v.address||"")}" placeholder="Sh. Rashidov ko'chasi, 12-uy, 34-xonadon"></label>
    <div class="row3"><label>Xonalar soni<input id="ijf-rooms" type="number" min="1" max="20" value="${esc(v.rooms||"")}"></label><label>Maydon (m²)<input id="ijf-area" type="number" min="1" max="2000" value="${esc(v.area||"")}"></label><label>Qavat / qavatlar<span class="row2"><input id="ijf-floor" type="number" min="0" max="60" value="${esc(v.floor||"")}" aria-label="Qavat"><input id="ijf-floors" type="number" min="0" max="60" value="${esc(v.floors||"")}" aria-label="Qavatlar soni"></span></label></div>
    <fieldset class="ij-amen"><legend>Qulayliklar</legend>${IJ_AMEN.map(([k,l])=>`<label class="chk"><input type="checkbox" value="${k}" ${(v.amen||[]).includes(k)?"checked":""}> ${esc(l)}</label>`).join("")}</fieldset>
    <label>Batafsil ma'lumot<textarea id="ijf-desc" rows="4" maxlength="2000" placeholder="Uy holati, ta'mir, atrofdagi joylar, transport…">${esc(v.desc||"")}</textarea></label>
    <label>Uy qoidalari<textarea id="ijf-rules" rows="2" maxlength="600" placeholder="Masalan: chekish mumkin emas, mehmonlar 22:00 gacha">${esc(v.rules||"")}</textarea></label>
    <div class="row2"><label>Ismingiz (e'londa ko'rinadi)<input id="ijf-name" maxlength="60" required value="${esc(v.ownerName||c.name||(S.profile||{}).name||"")}"></label><label>Telefon<input id="ijf-phone" type="tel" maxlength="20" required value="${esc(v.phone||"")}" placeholder="+998 90 123 45 67"></label></div>
    <div><h3 class="ij-h3">Rasmlar (${IJ_MAX_PH} tagacha)</h3><div class="ij-phs" id="ijf-phs"></div><label class="btn ghost tg-ava-btn" for="ijf-phin">+ Rasm qo'shish</label><input type="file" id="ijf-phin" accept="image/*" multiple hidden><p class="note">Birinchi rasm muqova bo'ladi. Rasmlar avtomatik siqiladi.</p></div>
    <div><h3 class="ij-h3">Video</h3><div id="ijf-vid"></div><label class="btn ghost tg-ava-btn" for="ijf-vin">+ Video tanlash</label><input type="file" id="ijf-vin" accept="video/*" hidden>
      <p class="note">${IJ_VID_SEC/60} daqiqagacha. Katta video saqlashdan oldin avtomatik siqiladi (${IJ_VID_MAX/1048576} MB gacha).</p>
      <label>yoki video havolasi (YouTube, Telegram)<input id="ijf-vlink" type="url" maxlength="300" value="${esc(v.videoLink||"")}" placeholder="https://"></label></div>
    <p class="err" id="ijf-err" hidden></p><p class="note" id="ijf-prog"></p>
    <div class="btnrow"><button class="btn" type="submit" id="ijf-save">${r?"Saqlash":"E'lonni joylash"}</button><button class="btn ghost" type="button" id="ijf-cancel">Bekor qilish</button></div></form>`,true);
  ijDrawPh();ijDrawVid();
  if(r&&r.cover&&IJ.ph[0])IJ.ph[0].thumb=r.cover;
  IJ.ph.forEach(async p=>{if(p.thumb)return;try{const g=await fs.doc("rentfiles/"+p.id).get();if(g.exists){p.thumb=g.data().data;ijDrawPh()}}catch(e){}});
  $("#ijf-cancel").onclick=ijClose;
  $("#ijf-phin").addEventListener("change",async e=>{const fl=[...e.target.files];e.target.value="";
    for(const f of fl){if(IJ.ph.length>=IJ_MAX_PH){toast(`Ko'pi bilan ${IJ_MAX_PH} ta rasm`);break}
      try{const big=await chImg(f,1280,0.8),th=await chImg(f,480,0.7);IJ.ph.push({id:null,data:big.data,thumb:th.data})}catch(er){toast("Rasmni o'qib bo'lmadi: "+f.name)}}
    ijDrawPh()});
  $("#ijf-vin").addEventListener("change",async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;await ijPickVideo(f)});
  $("#ij-form").addEventListener("submit",e=>{e.preventDefault();ijSave()});
}
function ijDrawPh(){const b=$("#ijf-phs");if(!b)return;
  b.innerHTML=IJ.ph.map((p,i)=>`<span class="ij-ph">${p.thumb?`<img src="${esc(p.thumb)}" alt="">`:`<span class="ij-sk"></span>`}${i===0?`<em>Muqova</em>`:""}<span class="ij-pha">${i>0?`<button type="button" data-pm="${i}" aria-label="Oldinga">←</button>`:""}<button type="button" data-pd="${i}" aria-label="O'chirish">×</button></span></span>`).join("")||`<p class="note">Rasm tanlanmagan.</p>`;
  b.onclick=e=>{const d=e.target.closest("[data-pd]"),m=e.target.closest("[data-pm]");
    if(d){const p=IJ.ph.splice(+d.dataset.pd,1)[0];if(p&&p.old)(IJ.edit.delPh=IJ.edit.delPh||[]).push(p.id);ijDrawPh()}
    if(m){const i=+m.dataset.pm;[IJ.ph[i-1],IJ.ph[i]]=[IJ.ph[i],IJ.ph[i-1]];ijDrawPh()}}}
function ijDrawVid(){const b=$("#ijf-vid");if(!b)return;const v=IJ.vid;
  b.innerHTML=v?`<div class="ij-vrow">${v.url?`<video src="${v.url}" controls playsinline muted></video>`:`<span class="chip">▶ Video saqlangan (${chSize(v.size||0)})</span>`}<button class="linkbtn" type="button" id="ijf-vdel">Videoni olib tashlash</button></div>`:"";
  const d=$("#ijf-vdel");if(d)d.onclick=()=>{if(IJ.vid&&IJ.vid.old)IJ.edit.delVid=IJ.vid;IJ.vid=null;ijDrawVid()}}
async function ijPickVideo(f){
  const pr=$("#ijf-prog"),say=t=>{if(pr)pr.textContent=t};
  try{const dur=await ijDuration(f);if(dur>IJ_VID_SEC+1){toast(`Video ${IJ_VID_SEC/60} daqiqadan uzun. Qisqaroq video tanlang yoki havola qo'shing`);return}
    let blob=f;
    if(f.size>IJ_VID_MAX){say("Video siqilmoqda… 0%");blob=await ijShrink(f,p=>say(`Video siqilmoqda… ${Math.round(p*100)}% (video davomiyligicha vaqt oladi)`));}
    if(blob.size>IJ_VID_MAX){say("");toast(`Video siqilgandan keyin ham ${chSize(blob.size)}. Qisqaroq video tanlang yoki havola qo'shing`);return}
    if(IJ.vid&&IJ.vid.old)IJ.edit.delVid=IJ.vid;
    IJ.vid={blob,size:blob.size,type:blob.type||f.type||"video/mp4",url:URL.createObjectURL(blob)};say(f.size>IJ_VID_MAX?`Video siqildi: ${chSize(f.size)} → ${chSize(blob.size)}`:"");ijDrawVid();
  }catch(e){say("");toast(e&&e.message==="unsupported"?"Bu qurilma videoni siqa olmaydi. 15 MB gacha video tanlang yoki havola qo'shing":"Videoni o'qib bo'lmadi")}
}
function ijDuration(f){return new Promise(res=>{const v=document.createElement("video"),u=URL.createObjectURL(f);v.preload="metadata";v.onloadedmetadata=()=>{const d=v.duration;URL.revokeObjectURL(u);res(isFinite(d)?d:0)};v.onerror=()=>{URL.revokeObjectURL(u);res(0)};v.src=u})}
// katta videoni qurilmaning o'zida siqish: canvas → MediaRecorder (640px, ~0.9 Mbit/s)
async function ijShrink(file,onp){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error("unsupported");
  const mime=["video/webm;codecs=vp8,opus","video/webm;codecs=vp8","video/webm","video/mp4"].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t));if(!mime)throw new Error("unsupported");
  const url=URL.createObjectURL(file),v=document.createElement("video");v.src=url;v.playsInline=true;v.preload="auto";
  await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=()=>j(new Error("video"))});
  const k=Math.min(1,640/Math.max(v.videoWidth||640,v.videoHeight||480)),c=document.createElement("canvas");c.width=Math.max(2,Math.round((v.videoWidth||640)*k/2)*2);c.height=Math.max(2,Math.round((v.videoHeight||480)*k/2)*2);
  const x=c.getContext("2d"),st=c.captureStream(24);
  try{const vs=v.captureStream?v.captureStream():null;if(vs)vs.getAudioTracks().forEach(t=>st.addTrack(t))}catch(e){}
  const rec=new MediaRecorder(st,{mimeType:mime,videoBitsPerSecond:900000,audioBitsPerSecond:64000}),parts=[];
  rec.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
  const done=new Promise(r=>rec.onstop=r);let alive=true;
  const draw=()=>{if(!alive)return;x.drawImage(v,0,0,c.width,c.height);onp&&onp(v.duration?v.currentTime/v.duration:0);(v.requestVideoFrameCallback?v.requestVideoFrameCallback(draw):requestAnimationFrame(draw))};
  v.onended=()=>{alive=false;try{rec.stop()}catch(e){}};
  rec.start(1000);try{await v.play()}catch(e){v.muted=true;await v.play()}draw();
  await done;URL.revokeObjectURL(url);st.getTracks().forEach(t=>t.stop());
  return new Blob(parts,{type:mime.split(";")[0]});
}
function ijThumb(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{const k=Math.min(1,480/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement("canvas");c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",0.7))};im.onerror=rej;im.src=src})}
function ijB64(buf){let s="";const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
async function ijSave(){
  const err=$("#ijf-err"),fail=m=>{err.textContent=m;err.hidden=false;err.scrollIntoView({block:"center",behavior:"smooth"})};err.hidden=true;
  const g=id=>$("#"+id).value.trim(),n=id=>+$("#"+id).value||0;
  const d={title:g("ijf-title"),type:g("ijf-type"),gender:g("ijf-g"),status:g("ijf-st"),price:n("ijf-price"),pay:g("ijf-pay"),deposit:n("ijf-dep"),capacity:Math.round(n("ijf-cap")),taken:Math.round(n("ijf-taken")),util:g("ijf-util"),
    region:g("ijf-reg"),district:g("ijf-dist"),landmark:g("ijf-land"),address:g("ijf-addr"),rooms:n("ijf-rooms")||null,area:n("ijf-area")||null,floor:n("ijf-floor")||null,floors:n("ijf-floors")||null,
    amen:[...document.querySelectorAll(".ij-amen input:checked")].map(x=>x.value),desc:g("ijf-desc"),rules:g("ijf-rules"),ownerName:g("ijf-name"),phone:g("ijf-phone"),videoLink:g("ijf-vlink")};
  if(d.title.length<5)return fail("Sarlavhani yozing (kamida 5 belgi).");
  if(!d.gender)return fail("Kim uchun ekanini tanlang: qizlar, yigitlar, oila yoki farqi yo'q.");
  if(!(d.price>0))return fail("Narxni so'mda kiriting.");
  if(!(d.capacity>=1&&d.capacity<=50))return fail("Necha kishi qabul qilinishini kiriting (1–50).");
  if(d.taken<0||d.taken>d.capacity)return fail("Hozir yashayotganlar soni qabul qilinadigan kishilardan ko'p bo'lmasin.");
  if(!d.address&&!d.district)return fail("Manzil yoki shahar/tumanni yozing.");
  if(d.ownerName.length<2)return fail("Ismingizni yozing.");
  if(String(d.phone).replace(/\D/g,"").length<9)return fail("Telefon raqamini to'liq yozing.");
  if(d.videoLink&&!/^https?:\/\//i.test(d.videoLink))return fail("Video havolasi https:// bilan boshlansin.");
  if(!IJ.ph.length)return fail("Kamida bitta rasm qo'shing — rasmsiz e'lonlar kam ko'riladi.");
  const btn=$("#ijf-save"),pr=$("#ijf-prog"),say=t=>{if(pr)pr.textContent=t};btn.disabled=true;
  const rid=IJ.edit.id,orig=IJ.edit.orig;
  try{
    // rasmlar
    const photos=[];let i=0;
    for(const p of IJ.ph){i++;if(p.old){photos.push(p.id);continue}say(`Rasmlar yuklanmoqda: ${i}/${IJ.ph.length}`);
      const ref=fs.collection("rentfiles").doc();await ref.set({by:S.uid,rid,kind:"img",data:p.data,at:Date.now()});p.id=ref.id;p.old=true;photos.push(ref.id)}
    const first=IJ.ph[0];let cover=first.thumb||"";
    if(orig&&first.id===(orig.photos||[])[0]&&orig.cover)cover=orig.cover;else if(cover.length>120000)cover=await ijThumb(cover).catch(()=>"");
    // video
    let video=orig&&orig.video||null;
    if(IJ.vid&&IJ.vid.blob){const buf=await IJ.vid.blob.arrayBuffer(),nP=Math.ceil(buf.byteLength/IJ_CHUNK),vid=fs.collection("rentfiles").doc().id;
      for(let k=0;k<nP;k++){say(`Video yuklanmoqda: ${Math.round(k*100/nP)}%`);await fs.doc("rentfiles/"+vid+"_"+k).set({by:S.uid,rid,kind:"vid",i:k,n:nP,data:ijB64(buf.slice(k*IJ_CHUNK,(k+1)*IJ_CHUNK)),at:Date.now()})}
      video={id:vid,n:nP,size:buf.byteLength,type:IJ.vid.type};IJ.vid={...video,old:true}}
    else if(!IJ.vid)video=null;
    say("Saqlanmoqda…");
    const doc={...d,owner:S.uid,photos,cover,video,updatedAt:Date.now(),createdAt:orig?orig.createdAt||Date.now():Date.now()};
    await fs.doc("rentals/"+rid).set(doc);
    // eski fayllarni tozalash
    const del=[...(IJ.edit.delPh||[]),...(IJ.edit.delVid?Array.from({length:IJ.edit.delVid.n||1},(_,k)=>IJ.edit.delVid.id+"_"+k):[])];
    del.forEach(x=>fs.doc("rentfiles/"+x).delete().catch(()=>{}));
    toast(orig?"E'lon saqlandi":"E'lon joylandi");ijClose();
    if(!orig){location.hash="ijara-mening"}
  }catch(e){console.warn(e);btn.disabled=false;say("");fail("Saqlab bo'lmadi. Internetni tekshiring yoki Firestore qoidalarini yangilang. ("+(e&&e.code||e)+")")}
}

// ---------- ijaraga so'rov ----------
function ijReqForm(r){
  const c=S.contacts[S.uid]||{},p=(S.profile||{}),free=ijFree(r),today=new Date().toISOString().slice(0,10);IJ.cur={kind:"req"};
  ijModal(`<form class="stack" id="ijr-form" novalidate><h2 style="margin:0">Ijaraga so'rov</h2><p class="note" style="margin:0">${esc(r.title)} · ${esc(ijPrice(r))} · ${esc(IJ_GENDER[r.gender]||"")}</p>
    <div class="row2"><label>F.I.Sh.<input id="ijr-name" maxlength="80" required value="${esc(c.name||p.name||"")}"></label><label>Telefon<input id="ijr-phone" type="tel" maxlength="20" required value="${esc(c.phone||p.phone||"")}"></label></div>
    <div class="row3"><label>Necha kishi<input id="ijr-ppl" type="number" min="1" max="${free}" value="1" required></label><label>Kirish sanasi<input id="ijr-start" type="date" min="${today}" value="${today}" required></label><label>Muddat (oy)<input id="ijr-months" type="number" min="1" max="36" value="10" required></label></div>
    <label>Kimlar yashaydi<select id="ijr-who"><option value="qiz">Qiz(lar)</option><option value="ogil">Yigit(lar)</option><option value="oila">Oila</option></select></label>
    <label>Xabar uy egasiga<textarea id="ijr-msg" rows="3" maxlength="600" placeholder="Masalan: Men talabaman, universitetda o'qiyman. Ko'rishga qachon borsam bo'ladi?"></textarea></label>
    <p class="err" id="ijr-err" hidden></p><div class="btnrow"><button class="btn" type="submit" id="ijr-send">So'rov yuborish</button><button class="btn ghost" type="button" id="ijr-back">Orqaga</button></div></form>`);
  $("#ijr-who").value=r.gender==="qiz"?"qiz":r.gender==="ogil"?"ogil":r.gender==="oila"?"oila":"qiz";
  $("#ijr-back").onclick=()=>ijShow(r.id);
  $("#ijr-form").addEventListener("submit",async e=>{e.preventDefault();const err=$("#ijr-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;
    const d={name:$("#ijr-name").value.trim(),phone:$("#ijr-phone").value.trim(),people:Math.round(+$("#ijr-ppl").value||0),start:$("#ijr-start").value,months:Math.round(+$("#ijr-months").value||0),who:$("#ijr-who").value,msg:$("#ijr-msg").value.trim()};
    if(d.name.length<3)return fail("F.I.Sh. ni yozing.");if(String(d.phone).replace(/\D/g,"").length<9)return fail("Telefon raqamini to'liq yozing.");
    if(!(d.people>=1&&d.people<=free))return fail(`Necha kishi: 1 dan ${free} gacha.`);if(!d.start)return fail("Kirish sanasini tanlang.");if(!(d.months>=1&&d.months<=36))return fail("Muddat 1–36 oy.");
    if((r.gender==="qiz"&&d.who!=="qiz")||(r.gender==="ogil"&&d.who!=="ogil")||(r.gender==="oila"&&d.who!=="oila"))return fail(`Bu xonadon: ${IJ_GENDER[r.gender]}. Boshqa e'lonni tanlang.`);
    $("#ijr-send").disabled=true;
    try{await fs.collection("rentreqs").add({rid:r.id,owner:r.owner,renter:S.uid,title:r.title,renterName:d.name,phone:d.phone,people:d.people,start:d.start,months:d.months,who:d.who,msg:d.msg,status:"pending",at:Date.now()});
      toast("So'rov yuborildi. Uy egasi javobini «Mening e'lonlarim» bo'limida ko'rasiz");ijClose()}
    catch(x){$("#ijr-send").disabled=false;fail("Yuborib bo'lmadi. Firestore qoidalarini yangilang yoki internetni tekshiring.")}});
}

// ---------- Mening e'lonlarim ----------
function ijDrawMine(){
  const mine=IJ.list.filter(r=>r.owner===S.uid).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const inc=Object.values(IJ.reqs).filter(r=>r.owner===S.uid).sort((a,b)=>(a.status==="pending"?0:1)-(b.status==="pending"?0:1)||(b.at||0)-(a.at||0));
  const out=Object.values(IJ.reqs).filter(r=>r.renter===S.uid).sort((a,b)=>(b.at||0)-(a.at||0));
  const RS={pending:["Kutilmoqda","rank"],accepted:["Qabul qilindi","res"],rejected:["Rad etildi","out"],cancelled:["Bekor qilindi","cancel"]};
  const pill=s=>{const x=RS[s]||[s,"rank"];return `<span class="pill ${x[1]}">${esc(x[0])}</span>`};
  $("#ij-inc").innerHTML=inc.length?inc.map(q=>`<div class="ij-req ${q.status==="pending"?"new":""}"><div class="ij-rq1"><b>${esc(q.renterName)}</b>${pill(q.status)}</div>
      <p class="note">${esc(q.title||"")} · ${esc(q.people)} kishi (${esc(q.who==="qiz"?"qiz":q.who==="ogil"?"yigit":"oila")}) · ${esc(ijDate(q.start))} dan ${esc(q.months)} oy · ${dt(q.at)}</p>
      ${q.msg?`<p class="ij-txt">${esc(q.msg)}</p>`:""}
      <div class="btnrow"><a class="btn ghost" href="tel:${esc(String(q.phone||"").replace(/[^+\d]/g,""))}">${esc(q.phone||"")}</a><button class="btn ghost" type="button" data-ijdm="${esc(q.renter)}">Yozish</button>
        ${q.status==="pending"?`<button class="btn" type="button" data-ijok="${esc(q.id)}">Qabul qilish va shartnoma tuzish</button><button class="btn danger" type="button" data-ijno="${esc(q.id)}">Rad etish</button>`:""}
        ${q.cid?`<button class="btn ghost" type="button" data-ijcon="${esc(q.cid)}">Shartnomani ochish</button>`:""}</div></div>`).join(""):`<p class="note">Hozircha so'rov kelmagan.</p>`;
  $("#ij-mine").innerHTML=mine.length?`<div class="ij-grid">${mine.map(ijCard).join("")}</div>`:`<div class="empty"><b>Sizda e'lon yo'q</b><p class="note">Xonadoningizni ijaraga bermoqchi bo'lsangiz, e'lon joylang.</p><div><button class="btn" type="button" data-ij-new>+ E'lon joylash</button></div></div>`;
  $("#ij-out").innerHTML=out.length?out.map(q=>`<div class="ij-req"><div class="ij-rq1"><b>${esc(q.title||"")}</b>${pill(q.status)}</div><p class="note">${esc(q.people)} kishi · ${esc(ijDate(q.start))} dan ${esc(q.months)} oy · ${dt(q.at)}</p>
      <div class="btnrow"><button class="btn ghost" type="button" data-ij="${esc(q.rid)}">E'lonni ochish</button><button class="btn ghost" type="button" data-ijdm="${esc(q.owner)}">Egasiga yozish</button>${q.status==="pending"?`<button class="btn ghost" type="button" data-ijcan="${esc(q.id)}">So'rovni bekor qilish</button>`:""}${q.cid?`<button class="btn" type="button" data-ijcon="${esc(q.cid)}">Shartnomani ochish</button>`:""}</div></div>`).join(""):`<p class="note">Siz hali so'rov yubormagansiz.</p>`;
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-ijok],[data-ijno],[data-ijcan],[data-ijdm],[data-ijcon]");if(!b)return;
  if(b.dataset.ijdm){ijClose();location.hash="chat";setTimeout(()=>chStartDm(b.dataset.ijdm),200);return}
  if(b.dataset.ijcon){ijShowCon(b.dataset.ijcon);return}
  if(b.dataset.ijok){const q=IJ.reqs[b.dataset.ijok];if(q)ijTerms(q);return}
  const id=b.dataset.ijno||b.dataset.ijcan,st=b.dataset.ijno?"rejected":"cancelled";
  if(!confirm(st==="rejected"?"So'rov rad etilsinmi?":"So'rov bekor qilinsinmi?"))return;
  b.disabled=true;try{await fs.doc("rentreqs/"+id).update({status:st,decAt:Date.now()});toast(st==="rejected"?"So'rov rad etildi":"So'rov bekor qilindi")}catch(x){b.disabled=false;toast("Bajarib bo'lmadi")}
});

// ---------- shartnoma shartlari (uy egasi) ----------
function ijTerms(q){
  const r=IJ.list.find(x=>x.id===q.rid);if(!r){toast("E'lon topilmadi");return}
  const free=ijFree(r);if(q.people>free){toast(`Bo'sh joy yetarli emas: ${free} ta qolgan`);return}
  const monthly=r.pay==="kishi"?(+r.price||0)*(+q.people||1):(+r.price||0);IJ.cur={kind:"terms"};
  ijModal(`<form class="stack" id="ijt-form" novalidate><h2 style="margin:0">Shartnoma shartlari</h2>
    <p class="note" style="margin:0">${esc(r.title)} · ijarachi: <b>${esc(q.renterName)}</b>, ${esc(q.people)} kishi. Shartlarni tekshiring — shartnoma shu ma'lumotlar bilan tuziladi, so'ng ijarachi o'zi tanishib imzolaydi.</p>
    <div class="row3"><label>Boshlanish sanasi<input id="ijt-start" type="date" value="${esc(q.start)}" required></label><label>Muddat (oy)<input id="ijt-months" type="number" min="1" max="36" value="${esc(q.months)}" required></label><label>To'lov kuni (har oyning)<input id="ijt-day" type="number" min="1" max="28" value="5" required></label></div>
    <div class="row2"><label>Oylik ijara haqi (so'm)<input id="ijt-price" type="number" min="0" step="10000" value="${esc(monthly)}" required></label><label>Garov puli (so'm)<input id="ijt-dep" type="number" min="0" step="10000" value="${esc(r.deposit||0)}"></label></div>
    <div class="row2"><label>Pasport seriya va raqamingiz (ixtiyoriy)<input id="ijt-pass" maxlength="20" autocomplete="off" placeholder="AA 1234567"></label><label>Yashash manzilingiz (ixtiyoriy)<input id="ijt-addr" maxlength="140"></label></div>
    <label>Qo'shimcha shartlar (ixtiyoriy)<textarea id="ijt-extra" rows="3" maxlength="1200" placeholder="Masalan: oyning oxirida hisoblagich ko'rsatkichlari birga yoziladi">${esc(r.rules?"Uy qoidalari: "+r.rules:"")}</textarea></label>
    <label class="chk"><input type="checkbox" id="ijt-ok"> Shartnoma shartlarini tasdiqlayman va uni elektron imzolayman</label>
    <p class="err" id="ijt-err" hidden></p><div class="btnrow"><button class="btn" type="submit" id="ijt-go">Shartnomani tuzish va imzolash</button><button class="btn ghost" type="button" id="ijt-x">Bekor qilish</button></div></form>`);
  $("#ijt-x").onclick=ijClose;
  $("#ijt-form").addEventListener("submit",async e=>{e.preventDefault();const err=$("#ijt-err"),fail=m=>{err.textContent=m;err.hidden=false};err.hidden=true;
    const start=$("#ijt-start").value,months=Math.round(+$("#ijt-months").value||0),payDay=Math.round(+$("#ijt-day").value||0),price=Math.round(+$("#ijt-price").value||0),deposit=Math.round(+$("#ijt-dep").value||0);
    if(!start)return fail("Boshlanish sanasini tanlang.");if(!(months>=1&&months<=36))return fail("Muddat 1–36 oy.");if(!(payDay>=1&&payDay<=28))return fail("To'lov kuni 1–28.");if(!(price>0))return fail("Oylik ijara haqini kiriting.");
    if(!$("#ijt-ok").checked)return fail("Tasdiqlash belgisini qo'ying.");
    $("#ijt-go").disabled=true;
    const ref=fs.collection("rentcontracts").doc(),now=Date.now(),me=S.contacts[S.uid]||{};
    const c={no:"IJ-"+new Date().getFullYear()+"-"+ref.id.slice(-6).toUpperCase(),rid:r.id,req:q.id,owner:S.uid,renter:q.renter,parties:[S.uid,q.renter],status:"pending",createdAt:now,
      title:r.title,type:r.type,region:r.region||"",district:r.district||"",address:r.address||"",landmark:r.landmark||"",rooms:r.rooms||null,area:r.area||null,floor:r.floor||null,amen:r.amen||[],util:r.util||"alohida",
      ownerName:r.ownerName||me.name||"",ownerPhone:r.phone||"",ownerPass:$("#ijt-pass").value.trim(),ownerAddr:$("#ijt-addr").value.trim(),
      renterName:q.renterName,renterPhone:q.phone,people:q.people,who:q.who,start,months,end:ijAddMonths(start,months),payDay,price,deposit,extra:$("#ijt-extra").value.trim(),
      ownerSign:{at:now,name:r.ownerName||me.name||"",login:S.login||""},renterSign:null,counted:false};
    try{await ref.set(c);await fs.doc("rentreqs/"+q.id).update({status:"accepted",cid:ref.id,decAt:now});toast("Shartnoma tuzildi. Endi ijarachi imzolaydi");ijShowCon(ref.id,c)}
    catch(x){console.warn(x);$("#ijt-go").disabled=false;fail("Shartnomani saqlab bo'lmadi. Firestore qoidalarini yangilang. ("+(x&&x.code||x)+")")}});
}

// ---------- shartnoma matni ----------
function ijConHtml(c){
  const v=s=>esc(s||"—"),amen=(c.amen||[]).map(k=>(IJ_AMEN.find(a=>a[0]===k)||[k,k])[1]).join(", ");
  const place=[c.region,c.district,c.address].filter(Boolean).join(", ");
  const sig=(who,s)=>s?`<div class="ij-sig ok"><b>${esc(who)}</b><span>${esc(s.name||"")}</span><small>Elektron tasdiqlangan: ${dt(s.at)}</small></div>`:`<div class="ij-sig"><b>${esc(who)}</b><span>—</span><small>Imzo kutilmoqda</small></div>`;
  let n=0;const H=t=>`<h3>${++n}. ${t}</h3>`;
  return `<article class="ij-doc" id="ij-doc">
  <h2>TURAR JOYNI IJARAGA BERISH SHARTNOMASI</h2><p class="ij-c">№ ${v(c.no)}</p>
  <p class="ij-row"><span>${v(c.district||c.region)}</span><span>${dt(c.createdAt).slice(0,10)}</span></p>
  <p><b>Ijaraga beruvchi:</b> ${v(c.ownerName)}${c.ownerPass?`, pasport: ${v(c.ownerPass)}`:""}${c.ownerAddr?`, yashash manzili: ${v(c.ownerAddr)}`:""}, tel.: ${v(c.ownerPhone)} (keyingi o'rinlarda — «Ijaraga beruvchi») bir tomondan, va</p>
  <p><b>Ijarachi:</b> ${v(c.renterName)}${c.renterPass?`, pasport: ${v(c.renterPass)}`:""}${c.renterAddr?`, doimiy yashash manzili: ${v(c.renterAddr)}`:""}, tel.: ${v(c.renterPhone)} (keyingi o'rinlarda — «Ijarachi») ikkinchi tomondan, birgalikda «Tomonlar», O'zbekiston Respublikasi Fuqarolik kodeksining mulk ijarasi to'g'risidagi qoidalariga muvofiq quyidagilar haqida ushbu shartnomani tuzdilar:</p>
  ${H("Shartnoma predmeti")}
  <p>1.1. Ijaraga beruvchi Ijarachiga quyidagi turar joyni haq evaziga vaqtincha egalik qilish va yashash uchun foydalanishga beradi: <b>${v(IJ_TYPE[c.type]||c.type)}</b>, manzil: <b>${v(place)}</b>${c.landmark?` (mo'ljal: ${v(c.landmark)})`:""}${c.rooms?`, xonalar soni: ${v(c.rooms)}`:""}${c.area?`, umumiy maydoni: ${v(c.area)} m²`:""}${c.floor?`, ${v(c.floor)}-qavat`:""}.</p>
  <p>1.2. Turar joyda yashovchilar soni: <b>${v(c.people)} kishi</b>. Ijaraga beruvchining roziligisiz boshqa shaxslar doimiy yashashi mumkin emas.</p>
  <p>1.3. Turar joy yashash uchun yaroqli holatda topshiriladi${amen?`; unda quyidagi jihozlar va qulayliklar mavjud: ${esc(amen)}`:""}.</p>
  ${H("Shartnoma muddati")}
  <p>2.1. Ijara muddati: <b>${v(ijDate(c.start))}</b> dan <b>${v(ijDate(c.end))}</b> gacha (${v(c.months)} oy).</p>
  <p>2.2. Muddat tugagach shartnoma Tomonlarning kelishuvi bilan uzaytirilishi mumkin.</p>
  ${H("Ijara haqi va to'lov tartibi")}
  <p>3.1. Oylik ijara haqi: <b>${v(ijMoney(c.price))}</b>.</p>
  <p>3.2. Ijara haqi har oyning <b>${v(c.payDay)}-sanasigacha</b> joriy oy uchun oldindan to'lanadi. To'lov naqd yoki bank kartasi orqali amalga oshiriladi; Ijaraga beruvchi to'lov olinganini tasdiqlaydi.</p>
  <p>3.3. ${+c.deposit?`Garov puli: <b>${v(ijMoney(c.deposit))}</b>. U shartnoma tugaganda turar joy va jihozlarga zarar yetkazilmagan bo'lsa, Ijarachiga to'liq qaytariladi; zarar bo'lsa, zarar miqdori ushlab qolinadi.`:"Garov puli olinmaydi."}</p>
  <p>3.4. Kommunal to'lovlar (elektr, gaz, suv, chiqindi, internet): ${c.util==="kiradi"?"<b>ijara haqiga kiradi</b> va ularni Ijaraga beruvchi to'laydi.":"<b>ijara haqiga kirmaydi</b> va ularni hisoblagich ko'rsatkichlari bo'yicha Ijarachi to'laydi."}</p>
  <p>3.5. Ijara haqi shartnoma muddati davomida bir tomonlama o'zgartirilmaydi.</p>
  ${H("Ijaraga beruvchining majburiyatlari")}
  <p>4.1. Turar joyni kelishilgan sanada, kalitlari va jihozlari bilan topshirish.</p>
  <p>4.2. Ijarachining yashashiga to'sqinlik qilmaslik; turar joyga Ijarachi bilan oldindan (kamida 24 soat oldin) kelishmasdan kirmaslik, avariya holatlari bundan mustasno.</p>
  <p>4.3. Ijarachining aybisiz yuzaga kelgan nosozliklarni (kapital ta'mir, quvur, elektr tarmog'i) o'z hisobidan bartaraf etish.</p>
  ${H("Ijarachining majburiyatlari")}
  <p>5.1. Ijara haqi va kommunal to'lovlarni o'z vaqtida to'lash.</p>
  <p>5.2. Turar joy va jihozlardan ehtiyotkorlik bilan foydalanish, tozalik va yong'in xavfsizligi qoidalariga rioya qilish, qo'shnilarning tinchligini buzmaslik.</p>
  <p>5.3. Ijaraga beruvchining yozma roziligisiz turar joyni boshqa shaxslarga ijaraga (subijaraga) bermaslik, qayta qurish va ta'mirlash ishlarini olib bormaslik.</p>
  <p>5.4. O'z aybi bilan yetkazilgan zararni qoplash; shartnoma tugaganda turar joyni olingan holatida (tabiiy eskirishni hisobga olib) qaytarish.</p>
  ${c.extra?`${H("Qo'shimcha shartlar")}<p class="ij-pre">${esc(c.extra)}</p>`:""}
  ${H("Shartnomani o'zgartirish va bekor qilish")}
  <p>${n}.1. Shartnoma Tomonlarning kelishuvi bilan istalgan vaqtda o'zgartirilishi yoki bekor qilinishi mumkin.</p>
  <p>${n}.2. Har bir Tomon ikkinchi Tomonni kamida 30 kun oldin yozma (shu jumladan OchiqTanlov ilovasi orqali) ogohlantirib, shartnomani muddatidan oldin bekor qilishi mumkin.</p>
  <p>${n}.3. Ijarachi ijara haqini ketma-ket ikki oydan ortiq to'lamasa yoki 5-bandni qo'pol buzsa, Ijaraga beruvchi shartnomani qonunchilikda belgilangan tartibda bekor qilishga haqli.</p>
  ${H("Nizolarni hal qilish")}
  <p>${n}.1. Nizolar avvalo muzokaralar yo'li bilan hal qilinadi. Kelishuvga erishilmasa, nizo O'zbekiston Respublikasi qonunchiligiga muvofiq sudda ko'riladi.</p>
  ${H("Yakuniy qoidalar")}
  <p>${n}.1. Shartnoma ikkala Tomon uni OchiqTanlov tizimida elektron tasdiqlagan paytdan kuchga kiradi. Shartnomaning elektron nusxasi tizimda saqlanadi; Tomonlar uni chop etib, qo'lda ham imzolashi mumkin.</p>
  <p>${n}.2. Turar joy ijarasi shartnomasini soliq organlarida hisobga qo'yish (masalan, my.soliq.uz orqali) va ijara daromadidan soliq to'lash qonunchilikka muvofiq Ijaraga beruvchining zimmasida.</p>
  <div class="ij-sigs">${sig("Ijaraga beruvchi",c.ownerSign)}${sig("Ijarachi",c.renterSign)}</div>
  <p class="ij-ver">Tekshirish kodi: <span class="mono">${esc(c.id||"")}</span> · OchiqTanlov</p></article>`;
}
function ijShowCon(id,fresh){
  const c=IJ.cons.find(x=>x.id===id)||(fresh?{id,...fresh}:null);if(!c){toast("Shartnoma topilmadi");return}
  IJ.cur={kind:"con",id,st:c.status};const st=IJ_ST[c.status]||[c.status,"rank"],me=S.uid,isR=c.renter===me,isO=c.owner===me;
  ijModal(`<div class="ij-con-top"><span class="pill ${st[1]}">${esc(st[0])}</span><div class="btnrow"><button class="btn ghost" type="button" id="ijc-print">Chop etish / PDF</button><button class="btn ghost" type="button" id="ijc-doc">Word faylini yuklab olish</button><button class="btn ghost" type="button" data-ijdm="${esc(isR?c.owner:c.renter)}">${isR?"Uy egasiga":"Ijarachiga"} yozish</button></div></div>
    ${ijConHtml(c)}
    ${isR&&c.status==="pending"?`<form class="panel stack ij-signbox" id="ijc-sign" novalidate><h3 style="margin:0">Shartnomani imzolash</h3><p class="note" style="margin:0">Shartnomani diqqat bilan o'qing. Imzolaganingizdan keyin u kuchga kiradi.</p>
      <div class="row2"><label>Pasport seriya va raqamingiz (ixtiyoriy)<input id="ijc-pass" maxlength="20" autocomplete="off" placeholder="AA 1234567"></label><label>Doimiy yashash manzilingiz (ixtiyoriy)<input id="ijc-addr" maxlength="140"></label></div>
      <label class="chk"><input type="checkbox" id="ijc-ok"> Shartnoma shartlari bilan tanishdim, roziman va uni elektron imzolayman</label><p class="err" id="ijc-err" hidden></p>
      <div class="btnrow"><button class="btn" type="submit" id="ijc-go">Imzolash</button><button class="btn danger" type="button" id="ijc-no">Rad etish</button></div></form>`:""}
    ${isO&&c.status==="pending"?`<div class="btnrow"><p class="note" style="margin:0;flex:1">Ijarachi shartnomani o'qib, imzolashi kutilmoqda.</p><button class="btn ghost" type="button" id="ijc-cancel">Shartnomani bekor qilish</button></div>`:""}
    ${isO&&c.status==="signed"?`<div class="btnrow"><p class="note" style="margin:0;flex:1">Ijarachi ko'chib chiqqanda shartnomani yakunlang — bo'sh joylar soni avtomatik qaytadi.</p><button class="btn ghost" type="button" id="ijc-end">Shartnomani yakunlash</button></div>`:""}`,true);
  $("#ijc-print").onclick=()=>{if(/; wv\)/.test(navigator.userAgent)){toast("Chop etish uchun saytni brauzerda oching");return}document.body.classList.add("ij-print");window.print();setTimeout(()=>document.body.classList.remove("ij-print"),500)};
  $("#ijc-doc").onclick=()=>{const html=`<html><head><meta charset="utf-8"><title>${esc(c.no)}</title><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.45}h2{text-align:center;font-size:14pt}h3{font-size:12pt;margin:12pt 0 4pt}.ij-c{text-align:center}.ij-row{display:flex;justify-content:space-between}.ij-sigs{display:flex;gap:40px;margin-top:24pt}.ij-sig{flex:1;border-top:1px solid #000;padding-top:6pt}.ij-sig b,.ij-sig span,.ij-sig small{display:block}</style></head><body>${$("#ij-doc").innerHTML}</body></html>`;
    chSave("data:application/msword;base64,"+btoa(unescape(encodeURIComponent(html))),c.no+".doc")};
  const sf=$("#ijc-sign");if(sf){sf.addEventListener("submit",async e=>{e.preventDefault();const err=$("#ijc-err");err.hidden=true;if(!$("#ijc-ok").checked){err.textContent="Tasdiqlash belgisini qo'ying.";err.hidden=false;return}
      $("#ijc-go").disabled=true;try{await fs.doc("rentcontracts/"+c.id).update({status:"signed",renterSign:{at:Date.now(),name:c.renterName,login:S.login||""},renterPass:$("#ijc-pass").value.trim(),renterAddr:$("#ijc-addr").value.trim()});toast("Shartnoma imzolandi va kuchga kirdi")}
      catch(x){$("#ijc-go").disabled=false;err.textContent="Imzolab bo'lmadi. Internetni tekshiring.";err.hidden=false}});
    $("#ijc-no").onclick=async()=>{if(!confirm("Shartnoma rad etilsinmi?"))return;try{await fs.doc("rentcontracts/"+c.id).update({status:"declined",renterSign:null,renterPass:"",renterAddr:""});toast("Shartnoma rad etildi")}catch(x){toast("Bajarib bo'lmadi")}}}
  const cb=$("#ijc-cancel");if(cb)cb.onclick=async()=>{if(!confirm("Shartnoma bekor qilinsinmi?"))return;try{await fs.doc("rentcontracts/"+c.id).update({status:"cancelled",endAt:Date.now()});toast("Bekor qilindi")}catch(x){toast("Bajarib bo'lmadi")}};
  const eb=$("#ijc-end");if(eb)eb.onclick=async()=>{if(!confirm("Shartnoma yakunlansinmi? Ijarachi ko'chib chiqqan bo'lishi kerak."))return;
    try{const r=IJ.list.find(x=>x.id===c.rid);await fs.doc("rentcontracts/"+c.id).update({status:"ended",endAt:Date.now()});if(r&&c.counted)await fs.doc("rentals/"+r.id).update({taken:Math.max(0,(+r.taken||0)-(+c.people||1)),updatedAt:Date.now()});toast("Shartnoma yakunlandi")}catch(x){toast("Bajarib bo'lmadi")}};
}
function ijDrawCons(){
  const L=IJ.cons.slice().sort((a,b)=>(a.status==="pending"?0:1)-(b.status==="pending"?0:1)||(b.createdAt||0)-(a.createdAt||0));
  $("#ij-cons").innerHTML=L.length?L.map(c=>{const st=IJ_ST[c.status]||[c.status,"rank"],isR=c.renter===S.uid,need=isR&&c.status==="pending";
    return `<button type="button" class="ij-req ij-conrow ${need?"new":""}" data-ijcon="${esc(c.id)}"><div class="ij-rq1"><b>${esc(c.no)} · ${esc(c.title||"")}</b><span class="pill ${st[1]}">${esc(st[0])}</span></div>
      <p class="note">${isR?"Uy egasi: "+esc(c.ownerName):"Ijarachi: "+esc(c.renterName)} · ${esc(ijDate(c.start))} – ${esc(ijDate(c.end))} · ${esc(ijMoney(c.price))}/oy${need?" · <b>imzoingiz kutilmoqda</b>":""}</p></button>`}).join(""):`<div class="empty"><b>Shartnoma yo'q</b><p class="note">Uy egasi ijaraga so'rovingizni qabul qilganda shartnoma shu yerda paydo bo'ladi.</p></div>`;
}

})();
