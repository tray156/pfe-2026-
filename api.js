/* ═══════════════════════════════════════════════════════════
   SALIS-HMI — api.js v2
   • Users / Session / Lockout / Autolock / Audit (unchanged)
   • Theme (dark/light) — new
   • Virtual Keyboard — new
   • M1 / M2 programme — new
═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   SVG ICON SPRITES (inline, used by all pages)
══════════════════════════════════════════════════════════ */
const SVG_SPRITES = `
<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
  <!-- dashboard / home -->
  <symbol id="icon-dashboard" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </symbol>
  <!-- test / beaker -->
  <symbol id="icon-test" viewBox="0 0 24 24">
    <path d="M9 3h6M9 3v8l-4.5 7.5A1 1 0 005.4 20h13.2a1 1 0 00.9-1.5L15 11V3"/>
    <line x1="7" y1="15" x2="17" y2="15"/>
  </symbol>
  <!-- history / clock -->
  <symbol id="icon-history" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9"/>
    <polyline points="12 7 12 12 15 15"/>
  </symbol>
  <!-- settings / gear -->
  <symbol id="icon-settings" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </symbol>
  <!-- audit / log -->
  <symbol id="icon-audit" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="16" y2="17"/>
    <line x1="8" y1="9" x2="10" y2="9"/>
  </symbol>
  <!-- alarm / bell -->
  <symbol id="icon-alarm" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </symbol>
  <!-- hv / zap -->
  <symbol id="icon-zap" viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </symbol>
  <!-- pressure / droplet -->
  <symbol id="icon-drop" viewBox="0 0 24 24">
    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
  </symbol>
  <!-- cable / plug -->
  <symbol id="icon-cable" viewBox="0 0 24 24">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </symbol>
  <!-- chart / bar -->
  <symbol id="icon-chart" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
    <line x1="2"  y1="20" x2="22" y2="20"/>
  </symbol>
  <!-- curve hv / activity -->
  <symbol id="icon-wave" viewBox="0 0 24 24">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </symbol>
  <!-- user / operator -->
  <symbol id="icon-user" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </symbol>
  <!-- lock -->
  <symbol id="icon-lock" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </symbol>
  <!-- key -->
  <symbol id="icon-key" viewBox="0 0 24 24">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </symbol>
  <!-- power / logout -->
  <symbol id="icon-power" viewBox="0 0 24 24">
    <path d="M18.36 6.64a9 9 0 11-12.73 0"/>
    <line x1="12" y1="2" x2="12" y2="12"/>
  </symbol>
  <!-- sun (light mode) -->
  <symbol id="icon-sun" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1"  x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1"  y1="12" x2="3"  y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
    <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
  </symbol>
  <!-- moon (dark mode) -->
  <symbol id="icon-moon" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </symbol>
  <!-- wrench -->
  <symbol id="icon-wrench" viewBox="0 0 24 24">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </symbol>
  <!-- start / play -->
  <symbol id="icon-play" viewBox="0 0 24 24">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </symbol>
  <!-- stop / square -->
  <symbol id="icon-stop" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
  </symbol>
  <!-- save / disk -->
  <symbol id="icon-save" viewBox="0 0 24 24">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </symbol>
  <!-- print -->
  <symbol id="icon-print" viewBox="0 0 24 24">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </symbol>
  <!-- keyboard -->
  <symbol id="icon-keyboard" viewBox="0 0 24 24">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <line x1="6"  y1="10" x2="6"  y2="10"/>
    <line x1="10" y1="10" x2="10" y2="10"/>
    <line x1="14" y1="10" x2="14" y2="10"/>
    <line x1="18" y1="10" x2="18" y2="10"/>
    <line x1="8"  y1="14" x2="16" y2="14"/>
  </symbol>
  <!-- plus -->
  <symbol id="icon-plus" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </symbol>
  <!-- trash -->
  <symbol id="icon-trash" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </symbol>
  <!-- check-circle -->
  <symbol id="icon-check" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </symbol>
  <!-- x-circle -->
  <symbol id="icon-xmark" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </symbol>
  <!-- M1 chip icon -->
  <symbol id="icon-chip" viewBox="0 0 24 24">
    <rect x="7" y="7" width="10" height="10" rx="1"/>
    <line x1="9"  y1="7"  x2="9"  y2="4"/>
    <line x1="12" y1="7"  x2="12" y2="4"/>
    <line x1="15" y1="7"  x2="15" y2="4"/>
    <line x1="9"  y1="20" x2="9"  y2="17"/>
    <line x1="12" y1="20" x2="12" y2="17"/>
    <line x1="15" y1="20" x2="15" y2="17"/>
    <line x1="7"  y1="9"  x2="4"  y2="9"/>
    <line x1="7"  y1="12" x2="4"  y2="12"/>
    <line x1="7"  y1="15" x2="4"  y2="15"/>
    <line x1="20" y1="9"  x2="17" y2="9"/>
    <line x1="20" y1="12" x2="17" y2="12"/>
    <line x1="20" y1="15" x2="17" y2="15"/>
  </symbol>
  <!-- layers (M2 multi-ref) -->
  <symbol id="icon-layers" viewBox="0 0 24 24">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </symbol>
</svg>`;

/* Inject sprites once DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  const div = document.createElement('div');
  div.innerHTML = SVG_SPRITES;
  document.body.insertBefore(div.firstElementChild, document.body.firstChild);
});

/* Helper: create icon element */
function icon(id, extraClass = '') {
  return `<svg class="icon ${extraClass}"><use href="#icon-${id}"/></svg>`;
}

/* ══════════════════════════════════════════════════════════
   THEME  (dark / light)
══════════════════════════════════════════════════════════ */
const THEME_KEY = 'hmi_theme_v1';

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

/* Apply theme immediately (before DOMContentLoaded to avoid flash) */
applyTheme(loadTheme());

/* ══════════════════════════════════════════════════════════
   HASH
══════════════════════════════════════════════════════════ */
function hashSimple(pw) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h) ^ pw.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/* ══════════════════════════════════════════════════════════
   USERS
══════════════════════════════════════════════════════════ */
const USERS_DEFAULT = {
  operator:  { uid:'OP-1001', name:'MARTIN P.',  role:'operator', displayRole:'OPÉRATEUR', dept:'production', pwHash: hashSimple('op1234') },
  operator2: { uid:'OP-1002', name:'DUPONT L.',  role:'operator', displayRole:'OPÉRATEUR', dept:'qualite',    pwHash: hashSimple('op5678') },
  engineer:  { uid:'OP-2001', name:'CHEN R.',    role:'engineer', displayRole:'INGÉNIEUR', dept:'technique',  pwHash: hashSimple('eng5678') },
  admin:     { uid:'OP-0001', name:'ADMIN',      role:'admin',    displayRole:'ADMIN',     dept:'technique',  pwHash: hashSimple('admin9999') }
};
const STORAGE_USERS  = 'hmi_users_v1';
const STORAGE_AUDIT  = 'hmi_audit_v1';
const STORAGE_PARAMS = 'hmi_params_v1';
const STORAGE_PROG   = 'hmi_programme_v1';

function loadUsers() {
  try {
    const s = localStorage.getItem(STORAGE_USERS);
    if (s) {
      const p = JSON.parse(s);
      const m = {};
      for (const k of Object.keys(USERS_DEFAULT)) {
        m[k] = { ...USERS_DEFAULT[k] };
        if (p[k]?.pwHash) m[k].pwHash = p[k].pwHash;
        if (p[k]?.uid)    m[k].uid    = p[k].uid;
        if (p[k]?.dept)   m[k].dept   = p[k].dept;
        if (p[k]?.name)   m[k].name   = p[k].name;
      }
      // load any extra users created by Admin
      for (const k of Object.keys(p)) {
        if (!m[k]) m[k] = p[k];
      }
      return m;
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(USERS_DEFAULT));
}
function saveUsers(u) {
  try {
    // save ALL fields for all users (including admin-created ones)
    localStorage.setItem(STORAGE_USERS, JSON.stringify(u));
  } catch(e) {}
}
const USERS = loadUsers();

/* ══════════════════════════════════════════════════════════
   MACHINE PARAMS
══════════════════════════════════════════════════════════ */
const PARAMS_DEFAULT = {
  hv_voltage:2000, hv_time:5, hv_current:5,
  dry_pres:2.0, dry_stab:3, dry_delta:0.1,
  ref:'TYPE-B-5C', nb_cables:5,
  cycle_max:30, auto_print:'OUI'
};
function loadParams() {
  try { const s=localStorage.getItem(STORAGE_PARAMS); if(s) return {...PARAMS_DEFAULT,...JSON.parse(s)}; } catch(e){}
  return {...PARAMS_DEFAULT};
}
function saveParams(p) {
  try { localStorage.setItem(STORAGE_PARAMS, JSON.stringify(p)); } catch(e){}
}
const MACHINE_PARAMS = loadParams();

/* ══════════════════════════════════════════════════════════
   PROGRAMME  M1 / M2
   M1 = standard (paramètres communs, 1 seule référence)
   M2 = multi-références (chaque ref peut avoir ses propres params)
══════════════════════════════════════════════════════════ */
const PROG_DEFAULT = {
  mode: 'M1',   /* 'M1' | 'M2' */
  m2_refs: [
    { id:'REF-001', name:'TYPE-A-3C', nb_cables:1, test_type:'both', hv_voltage:1800, hv_time:4, hv_current:4, dry_pres:1.8, dry_stab:3, dry_delta:0.08 },
    { id:'REF-002', name:'TYPE-B-5C', nb_cables:5, test_type:'both', hv_voltage:2000, hv_time:5, hv_current:5, dry_pres:2.0, dry_stab:3, dry_delta:0.10 },
    { id:'REF-003', name:'TYPE-C-8C', nb_cables:3, test_type:'both', hv_voltage:2200, hv_time:6, hv_current:6, dry_pres:2.2, dry_stab:4, dry_delta:0.12 },
  ],
  m2_selected: 'REF-002'
};
function loadProg() {
  try { const s=localStorage.getItem(STORAGE_PROG); if(s) return {...PROG_DEFAULT,...JSON.parse(s)}; } catch(e){}
  return {...PROG_DEFAULT};
}
function saveProg(p) {
  try { localStorage.setItem(STORAGE_PROG, JSON.stringify(p)); } catch(e){}
}
const PROGRAMME = loadProg();

function getActiveRef() {
  if (PROGRAMME.mode === 'M1') return MACHINE_PARAMS.ref;
  const r = PROGRAMME.m2_refs.find(r => r.id === PROGRAMME.m2_selected);
  return r ? r.name : MACHINE_PARAMS.ref;
}
function getActiveParams() {
  if (PROGRAMME.mode === 'M1') return MACHINE_PARAMS;
  const r = PROGRAMME.m2_refs.find(r => r.id === PROGRAMME.m2_selected);
  return r ? { ...MACHINE_PARAMS, ...r } : MACHINE_PARAMS;
}

/* ══════════════════════════════════════════════════════════
   PERMISSIONS
══════════════════════════════════════════════════════════ */
const PERMS = {
  operator: { canStartTest:true,  canViewResults:true,  canViewStats:true,  canModifyParams:false, canChangePassword:false, canViewAudit:false },
  engineer: { canStartTest:true,  canViewResults:true,  canViewStats:true,  canModifyParams:true,  canChangePassword:true,  canViewAudit:false },
  admin:    { canStartTest:true,  canViewResults:true,  canViewStats:true,  canModifyParams:true,  canChangePassword:true,  canViewAudit:true  }
};
function can(action) { return !!(PERMS[SESSION.role||'operator']?.[action]); }

/* ══════════════════════════════════════════════════════════
   SESSION
══════════════════════════════════════════════════════════ */
const SESSION_KEY = 'hmi_session_v1';
const SESSION = (() => {
  try { const s=sessionStorage.getItem(SESSION_KEY); if(s) return JSON.parse(s); } catch(e){}
  return { user:null, uid:null, role:null, dept:null, token:null, loginTime:null, active:false, userKey:null };
})();
function saveSession()  { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(SESSION)); } catch(e){} }
function clearSession() { SESSION.user=null; SESSION.uid=null; SESSION.role=null; SESSION.dept=null; SESSION.token=null; SESSION.loginTime=null; SESSION.active=false; SESSION.userKey=null; try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){} }

/* ══════════════════════════════════════════════════════════
   AUDIT LOG
══════════════════════════════════════════════════════════ */
function loadAudit() { try{ const s=localStorage.getItem(STORAGE_AUDIT); if(s) return JSON.parse(s); }catch(e){} return []; }
function saveAuditStore(l) { try{ localStorage.setItem(STORAGE_AUDIT, JSON.stringify(l.slice(0,100))); }catch(e){} }
const auditLog = loadAudit();
function addAudit(user,role,action,detail,cls='') {
  const now=new Date();
  auditLog.unshift({
    ts:now.toLocaleTimeString('fr-FR')+' '+now.toLocaleDateString('fr-FR'),
    uid: SESSION.uid || '—',
    dept: SESSION.dept || '—',
    user, role, action, detail, cls
  });
  saveAuditStore(auditLog);
}

/* ══════════════════════════════════════════════════════════
   LOCKOUT
══════════════════════════════════════════════════════════ */
const LOCKOUT = { failCount:0, maxAttempts:3, locked:false, lockUntil:null, DELAYS:[0,0,0,30,60,120] };

/* ══════════════════════════════════════════════════════════
   AUTOLOCK
══════════════════════════════════════════════════════════ */
const AUTOLOCK = { timeout:120, warning:30, lastActivity:Date.now(), barInterval:null };
function resetActivity() { AUTOLOCK.lastActivity=Date.now(); }
function startAutolock(onLock) {
  stopAutolock();
  AUTOLOCK.lastActivity=Date.now();
  ['mousemove','keydown','mousedown','touchstart'].forEach(ev=>document.addEventListener(ev,resetActivity));
  AUTOLOCK.barInterval=setInterval(()=>{
    if(!SESSION.active) return;
    const elapsed=(Date.now()-AUTOLOCK.lastActivity)/1000;
    const rem=Math.max(0,AUTOLOCK.timeout-elapsed);
    const pct=(rem/AUTOLOCK.timeout)*100;
    const bar=document.getElementById('autolockBar');
    if(bar){ bar.style.width=pct+'%'; bar.style.transition='width 0.5s linear'; bar.className='autolock-progress'+(rem<=10?' autolock-critical':rem<=AUTOLOCK.warning?' autolock-warning':''); }
    if(rem<=0){ addAudit(SESSION.user,'SYSTÈME','VERROUILLAGE AUTO','Inactivité détectée','audit-lock'); if(typeof onLock==='function') onLock(); }
  },500);
}
function stopAutolock() {
  clearInterval(AUTOLOCK.barInterval);
  ['mousemove','keydown','mousedown','touchstart'].forEach(ev=>document.removeEventListener(ev,resetActivity));
  const bar=document.getElementById('autolockBar');
  if(bar){ bar.style.width='100%'; bar.className='autolock-progress'; }
}

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
let _toastTimer;
function showToast(msg,type='ok') {
  let t=document.getElementById('toast'); if(!t)return;
  t.innerHTML=msg; t.className=`toast toast-${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

/* ══════════════════════════════════════════════════════════
   TOPBAR RENDER
══════════════════════════════════════════════════════════ */
function renderTopbar() {
  const $=s=>document.getElementById(s);
  if($('topUser')) $('topUser').textContent = SESSION.user || '—';
  if($('topUID'))  $('topUID').textContent  = SESSION.uid  || '—';
  if($('topDept')) {
    const deptMap = { production:'Production', qualite:'Qualité', technique:'Technique' };
    $('topDept').textContent = deptMap[SESSION.dept] || '—';
  }
  if($('topRef'))  $('topRef').textContent = getActiveRef();
  if($('logoutBtn')) $('logoutBtn').style.display = SESSION.active ? 'flex' : 'none';
  const rb=$('roleBadge');
  if(rb){ rb.style.display=SESSION.active?'flex':'none'; if(SESSION.active){ rb.className='role-badge '+SESSION.role; const rt=$('roleText'); if(rt){ const u=Object.values(USERS).find(u=>u.name===SESSION.user); rt.textContent=u?u.displayRole:SESSION.role.toUpperCase(); } } }
}

/* ══════════════════════════════════════════════════════════
   CLOCK + SESSION TIMER
══════════════════════════════════════════════════════════ */
function startClock() {
  function tick(){ const c=document.getElementById('clock'); if(c) c.textContent=new Date().toLocaleTimeString('fr-FR'); }
  tick(); setInterval(tick,1000);
}
function startSessionTimer() {
  setInterval(()=>{
    const el=document.getElementById('sessionTimer'); if(!el) return;
    if(!SESSION.active||!SESSION.loginTime){ el.textContent='00:00'; return; }
    const e=Math.floor((Date.now()-SESSION.loginTime)/1000);
    el.textContent=`${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`;
  },1000);
}

/* ══════════════════════════════════════════════════════════
   CHANGE PASSWORD
══════════════════════════════════════════════════════════ */
function openChpw() {
  if(!can('canChangePassword')){ showToast('⛔ Permission insuffisante','error'); return; }
  const o=document.getElementById('chpwOverlay'); if(!o) return;
  o.classList.remove('hidden');
  ['chpwCurrent','chpwNew','chpwConfirm'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const bar=document.getElementById('chpwStrengthBar'); if(bar){ bar.className='chpw-strength'; bar.style.width='0'; }
  const msg=document.getElementById('chpwMsg'); if(msg) msg.textContent='';
}
function closeChpw() { const o=document.getElementById('chpwOverlay'); if(o) o.classList.add('hidden'); }
function checkStrength(pw) {
  const bar=document.getElementById('chpwStrengthBar'); if(!bar) return;
  if(pw.length<6){ bar.className='chpw-strength weak'; return; }
  if(pw.length>=10&&/[0-9]/.test(pw)&&/[A-Z]/.test(pw)){ bar.className='chpw-strength strong'; return; }
  bar.className='chpw-strength medium';
}
function doChangePassword() {
  const cur=document.getElementById('chpwCurrent')?.value;
  const nw=document.getElementById('chpwNew')?.value;
  const cf=document.getElementById('chpwConfirm')?.value;
  const msg=document.getElementById('chpwMsg');
  const userKey=SESSION.userKey; if(!userKey||!USERS[userKey]) return;
  const user=USERS[userKey];
  if(hashSimple(cur)!==user.pwHash){ if(msg){msg.textContent='❌ Mot de passe actuel incorrect.';msg.style.color='var(--red)';} return; }
  if(!nw||nw.length<8){ if(msg){msg.textContent='⚠ Minimum 8 caractères requis.';msg.style.color='var(--yellow)';} return; }
  if(nw!==cf){ if(msg){msg.textContent='❌ Les mots de passe ne correspondent pas.';msg.style.color='var(--red)';} return; }
  USERS[userKey].pwHash=hashSimple(nw);
  saveUsers(USERS);
  addAudit(user.name,user.displayRole,'MOD. MOT DE PASSE',`Changement réussi pour ${user.name}`,'audit-chpw');
  closeChpw();
  showToast('✔ Mot de passe modifié et sauvegardé','ok');
}

/* ══════════════════════════════════════════════════════════
   GUARD
══════════════════════════════════════════════════════════ */
function requireAuth(requiredPerm) {
  if(!SESSION.active){ window.location.href='login.html'; return false; }
  if(requiredPerm&&!can(requiredPerm)) return false;
  return true;
}

/* ══════════════════════════════════════════════════════════
   VIRTUAL KEYBOARD
══════════════════════════════════════════════════════════ */
const VKbd = (() => {
  let _targetInput = null;
  let _targetLabel = '';
  let _value       = '';
  let _shifted     = false;
  let _mode        = 'alpha'; /* 'alpha' | 'num' */
  let _onConfirm   = null;

  const ROWS_ALPHA_LOW = [
    ['a','z','e','r','t','y','u','i','o','p'],
    ['q','s','d','f','g','h','j','k','l','m'],
    ['SHIFT','w','x','c','v','b','n','-','_','DEL'],
    ['123','@','.','SPACE','CLEAR','OK']
  ];
  const ROWS_ALPHA_UP = [
    ['A','Z','E','R','T','Y','U','I','O','P'],
    ['Q','S','D','F','G','H','J','K','L','M'],
    ['SHIFT','W','X','C','V','B','N','-','_','DEL'],
    ['abc','@','.','SPACE','CLEAR','OK']
  ];
  const ROWS_NUM = [
    ['7','8','9'],
    ['4','5','6'],
    ['1','2','3'],
    ['.',  '0','DEL'],
    ['CLEAR','OK']
  ];

  function open(inputEl, labelText, onConfirm) {
    _targetInput = inputEl;
    _targetLabel = labelText || 'Saisie';
    _value       = inputEl ? (inputEl.value || '') : '';
    _onConfirm   = onConfirm || null;
    _shifted     = false;
    _mode        = 'alpha';
    render();
    document.getElementById('vkbdOverlay').classList.remove('hidden');
    update();
  }

  function close() {
    document.getElementById('vkbdOverlay').classList.add('hidden');
    _targetInput = null; _onConfirm = null;
  }

  function confirm() {
    if (_targetInput) _targetInput.value = _value;
    if (typeof _onConfirm === 'function') _onConfirm(_value);
    close();
  }

  function press(key) {
    resetActivity();
    switch(key) {
      case 'DEL':   _value = _value.slice(0,-1); break;
      case 'CLEAR': _value = ''; break;
      case 'SPACE': _value += ' '; break;
      case 'OK':    confirm(); return;
      case 'SHIFT': _shifted = !_shifted; break;
      case '123':   _mode = 'num'; break;
      case 'abc':   _mode = 'alpha'; _shifted = false; break;
      default:      _value += key; if(_shifted && _mode==='alpha'){ _shifted=false; }
    }
    update();
  }

  function update() {
    const val = document.getElementById('vkbdVal');
    if (val) val.textContent = _value || '';
    const lbl = document.getElementById('vkbdLabel');
    if (lbl) lbl.textContent = _targetLabel;
    if (_targetInput) _targetInput.value = _value;
    /* highlight shift */
    document.querySelectorAll('.vk.key-shift').forEach(b => b.classList.toggle('on', _shifted));
    /* redraw rows if mode changed */
    renderRows();
  }

  function render() {
    const overlay = document.getElementById('vkbdOverlay');
    if (!overlay) return;
    overlay.innerHTML = `
      <div class="vkbd" id="vkbdBox">
        <div class="vkbd-preview">
          <span class="vkbd-preview-label" id="vkbdLabel">${_targetLabel}</span>
          <span class="vkbd-preview-val"   id="vkbdVal"></span>
          <span class="vkbd-preview-cursor"></span>
          <button class="vkbd-close" onclick="VKbd.close()">
            <svg class="icon icon-sm"><use href="#icon-xmark"/></svg> FERMER
          </button>
        </div>
        <div class="vkbd-tabs">
          <button class="vkbd-tab active" onclick="VKbd.setMode('alpha')">ABC</button>
          <button class="vkbd-tab"        onclick="VKbd.setMode('num')">123</button>
        </div>
        <div id="vkbdRows"></div>
      </div>`;
    renderRows();
  }

  function renderRows() {
    const cont = document.getElementById('vkbdRows');
    if (!cont) return;

    const tabs = document.querySelectorAll('.vkbd-tab');
    tabs.forEach((t,i) => t.classList.toggle('active', (i===0&&_mode==='alpha')||(i===1&&_mode==='num')));

    if (_mode === 'num') {
      cont.className = 'vkbd-numpad';
      const rows = ROWS_NUM;
      cont.innerHTML = `<div class="vkbd-rows">${rows.map(row=>`<div class="vkbd-row">${row.map(k=>keyHTML(k)).join('')}</div>`).join('')}</div>`;
    } else {
      cont.className = '';
      const rows = _shifted ? ROWS_ALPHA_UP : ROWS_ALPHA_LOW;
      cont.innerHTML = `<div class="vkbd-rows">${rows.map(row=>`<div class="vkbd-row">${row.map(k=>keyHTML(k)).join('')}</div>`).join('')}</div>`;
    }
  }

  function keyHTML(k) {
    const special = { 'DEL':'DEL','CLEAR':'CLR','SPACE':'ESPACE','OK':'OK','SHIFT':'⇧','123':'123','abc':'abc' };
    const cls = {
      'DEL':'key-del','CLEAR':'key-clr','SPACE':'key-space w5','OK':'key-ok w2',
      'SHIFT':'key-shift','123':'key-123','abc':'key-abc'
    };
    const label = special[k] || k;
    const c = cls[k] || '';
    return `<button class="vk ${c}" onclick="VKbd.press('${k}')">${label}</button>`;
  }

  function setMode(m) { _mode = m; if(m==='alpha') _shifted=false; update(); }

  return { open, close, confirm, press, setMode };
})();

/* Helper: attach keyboard to any input */
function attachKbd(inputId, label, onConfirm) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.readOnly = true;
  inp.style.cursor = 'pointer';
  inp.addEventListener('click', () => VKbd.open(inp, label, onConfirm));
}
