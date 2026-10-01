/* ═══════════════════════════════════════════════════════════
   SALIS-HMI — dashboard.js v5 CLEAN
═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  startClock();
  startSessionTimer();
  renderTopbar();
  applyNavPermissions();
  startAutolock(() => {
    showToast('Verrouillage automatique', 'warn');
    setTimeout(() => { clearSession(); window.location.href = 'login.html'; }, 1500);
  });
  addAudit('SYSTÈME', '—', 'DÉMARRAGE', 'Interface initialisée', 'audit-login');
  /* Init après que les fonctions HTML soient disponibles */
  setTimeout(() => {
    if (typeof refreshParamDisplay === 'function') refreshParamDisplay();
    if (typeof selectProg === 'function') selectProg(PROGRAMME.mode, false);
    resetTestUI();
    initCharts();
    connectWS();
  }, 50);
});

function doLogout() {
  addAudit(SESSION.user, SESSION.role, 'DÉCONNEXION', 'Session fermée', 'audit-logout');
  stopAutolock(); clearSession(); window.location.href = 'login.html';
}

function applyNavPermissions() {
  const ts = document.getElementById('tab-settings');
  const ta = document.getElementById('tab-admin');
  if (ts) ts.classList.toggle('locked-tab', !can('canModifyParams'));
  if (ta) ta.style.display = SESSION.role === 'admin' ? 'inline-flex' : 'none';
}

/* ══════════════════════════════════════════════════════════
   WEBSOCKET
══════════════════════════════════════════════════════════ */
let ws = null;

function connectWS() {
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
  if (!window.location.hostname.match(/localhost|127\.0\.0\.1/)) return;
  try {
    ws = new WebSocket('ws://' + window.location.host + '/ws');
    ws.onopen    = () => { showToast('Backend connecté', 'ok'); };
    ws.onmessage = (e) => { try { onWSMessage(JSON.parse(e.data)); } catch(_){} };
    ws.onclose   = () => { setTimeout(connectWS, 3000); };
    ws.onerror   = () => { ws.close(); };
  } catch(_) {}
}

function onWSMessage(d) {
  if (d.type === 'dry' && STATE === 'dry_running') {
    pushDryValue(d.pressure || 0);
    el('live-pressure', (d.pressure||0).toFixed(2));
    el('live-massflow', (d.massflow||0).toFixed(1));
    el('live-voltage', '0'); el('live-current', '0.0');
    el('live-time', ((Date.now()-_t0)/1000).toFixed(1));
  }
  if (d.type === 'hv' && STATE === 'hv_running') {
    pushHVValue(d.current || 0);
    el('live-voltage', d.voltage || 0);
    el('live-current', (d.current||0).toFixed(1));
    el('live-pressure', '0.00'); el('live-massflow', '0.0');
    el('live-time', ((Date.now()-_t0)/1000).toFixed(1));
  }
  if (d.type === 'dry_result' && STATE === 'dry_running') {
    clearInterval(_iv); _iv = null;
    onDryResult(d.result === 'OK', (d.massflow||0).toFixed(1));
  }
  if (d.type === 'hv_result' && STATE === 'hv_running') {
    clearInterval(_iv); _iv = null;
    onHVResult(d.result === 'OK');
  }
}

function apiCall(path, body) {
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (SESSION.token || '')
    },
    body: JSON.stringify(body)
  });
}

/* ══════════════════════════════════════════════════════════
   TEST STATE MACHINE
══════════════════════════════════════════════════════════ */
let STATE        = 'idle';
let currentCable = 0;
let totalCables  = 1;
let testType     = 'both';
let cableResults = [];
let _iv          = null;
let _t0          = Date.now();

function getTestConfig() {
  if (PROGRAMME.mode === 'M1') {
    return { nb: 1, testType: MACHINE_PARAMS.m1_test_type || 'both' };
  }
  const ref = PROGRAMME.m2_refs.find(r => r.id === PROGRAMME.m2_selected);
  return { nb: ref?.nb_cables || 1, testType: ref?.test_type || 'both' };
}

function resetTestUI() {
  STATE = 'idle';
  currentCable = 0;
  cableResults = [];
  clearInterval(_iv); _iv = null;

  const cfg = getTestConfig();
  totalCables = cfg.nb;
  testType    = cfg.testType;

  btnDry(true);   /* Enable DRY (or HV if hv-only) */
  btnHV(false);
  btnStop(false);

  if (testType === 'hv') { btnDry(false); btnHV(true); }

  setMsg('wait', 'Prêt — Appuyer DRY pour commencer le câble 1');
  setCableNum(0, cfg.nb);
  clearLive();
  buildCableTable(cfg.nb);
  buildDots(cfg.nb);
  setBadge('ready', 'PRÊT');
  hide('verdictBanner');
  tx('sumOK', '—'); tx('sumNOK', '—');
  resetCharts();
}

/* ─── LAUNCH DRY ─────────────────────────────────────── */
function launchDry() {
  if (!SESSION.active) { showToast('Non authentifié', 'warn'); return; }
  if (STATE !== 'idle' && STATE !== 'wait_next') return;

  STATE = 'dry_running';
  btnDry(false); btnHV(false); btnStop(true);
  setMsg('dry', 'Câble ' + (currentCable+1) + ' — TEST DRY en cours...');
  setBadge('testing', 'TEST DRY');
  el('live-phase', 'DRY');
  dotState(currentCable, 'active-dry');
  dryActive(true);
  _t0 = Date.now();

  /* Try backend, fallback to local sim */
  const onLocalhost = window.location.hostname.match(/localhost|127\.0\.0\.1/);
  if (onLocalhost && SESSION.token) {
    apiCall('/api/machine/dry', { cable: currentCable + 1 })
      .then(r => { if (!r.ok) throw new Error('401'); })
      .catch(() => simDry());
  } else {
    simDry();
  }
}

function simDry() {
  const p = getActiveParams();
  const dur = (p.dry_stab || 3) * 1000 + 1500;
  const t0  = Date.now();
  _iv = setInterval(() => {
    const e = (Date.now()-t0)/1000;
    const v = e < 3 ? (e/3)*2.0 : 1.9 + Math.sin(e)*0.04 + (Math.random()-0.5)*0.02;
    pushDryValue(v);
    el('live-pressure', v.toFixed(2));
    el('live-massflow', (Math.random()*1.5).toFixed(1));
    el('live-time', e.toFixed(1));
    pb(Math.min(100, (e/(dur/1000))*100));
    pl('DRY — Câble ' + (currentCable+1) + ' — ' + e.toFixed(1) + 's');
  }, 150);
  setTimeout(() => {
    clearInterval(_iv); _iv = null;
    onDryResult(Math.random() > 0.15, (Math.random()*1.5).toFixed(1));
  }, dur);
}

/* ─── DRY RESULT ─────────────────────────────────────── */
function onDryResult(ok, flow) {
  clearLive(); pb(0);
  if (ok) {
    cableResults[currentCable] = { dry:'OK', hv:'—', flow, ok:true };
    updateRow(currentCable, 'OK', '—', flow, 'partial');
    if (testType === 'dry') {
      cableResults[currentCable].hv = 'N/A'; cableResults[currentCable].ok = true;
      updateRow(currentCable, 'OK', 'N/A', flow, 'ok');
      dotState(currentCable, 'done');
      nextCable();
    } else {
      STATE = 'dry_ok';
      btnDry(false); btnHV(true); btnStop(true);
      setMsg('ok', 'Câble ' + (currentCable+1) + ' — DRY OK ✓ — Appuyer HV');
      setBadge('ready', 'DRY OK');
      el('live-phase', 'DRY OK');
      dryActive(false);
    }
  } else {
    cableResults[currentCable] = { dry:'NOK', hv:'N/A', flow, ok:false };
    updateRow(currentCable, 'NOK', 'N/A', flow, 'nok');
    dotState(currentCable, 'fail');
    showToast('Câble ' + (currentCable+1) + ' DRY NOK — passage au suivant', 'warn');
    nextCable();
  }
}

/* ─── LAUNCH HV ──────────────────────────────────────── */
function launchHV() {
  if (!SESSION.active) { showToast('Non authentifié', 'warn'); return; }
  if (STATE !== 'dry_ok' && STATE !== 'idle') return;

  STATE = 'hv_running';
  btnDry(false); btnHV(false); btnStop(true);
  setMsg('hv', 'Câble ' + (currentCable+1) + ' — TEST HV en cours...');
  setBadge('testing', 'TEST HV');
  el('live-phase', 'HV');
  dotState(currentCable, 'active-hv');
  hvActive(true);
  _t0 = Date.now();

  const onLocalhost = window.location.hostname.match(/localhost|127\.0\.0\.1/);
  if (onLocalhost && SESSION.token) {
    apiCall('/api/machine/hv', { cable: currentCable + 1 })
      .then(r => { if (!r.ok) throw new Error('401'); })
      .catch(() => simHV());
  } else {
    simHV();
  }
}

function simHV() {
  const p = getActiveParams();
  const dur = (p.hv_time || 5) * 1000 + 1000;
  const t0  = Date.now();
  _iv = setInterval(() => {
    const e = (Date.now()-t0)/1000;
    const v = Math.random()*4 + 0.5;
    pushHVValue(v);
    el('live-voltage', Math.floor(p.hv_voltage - 20 + Math.random()*40));
    el('live-current', v.toFixed(1));
    el('live-pressure', '0.00'); el('live-massflow', '0.0');
    el('live-time', e.toFixed(1));
    pb(Math.min(100, (e/(dur/1000))*100));
    pl('HV — Câble ' + (currentCable+1) + ' — ' + e.toFixed(1) + 's');
  }, 150);
  setTimeout(() => {
    clearInterval(_iv); _iv = null;
    onHVResult(Math.random() > 0.1);
  }, dur);
}

/* ─── HV RESULT ──────────────────────────────────────── */
function onHVResult(ok) {
  const flow = cableResults[currentCable]?.flow || '0.0';
  cableResults[currentCable] = {
    dry: testType==='hv'?'N/A':'OK',
    hv:  ok?'OK':'NOK', flow, ok
  };
  updateRow(currentCable, cableResults[currentCable].dry, ok?'OK':'NOK', flow, ok?'ok':'nok');
  dotState(currentCable, ok?'done':'fail');
  clearLive(); pb(0);
  hvActive(false);
  nextCable();
}

/* ─── NEXT CABLE ─────────────────────────────────────── */
function nextCable() {
  currentCable++;
  if (currentCable < totalCables) {
    STATE = 'wait_next';
    const btn = testType === 'hv' ? 'HV' : 'DRY';
    btnDry(testType !== 'hv'); btnHV(testType === 'hv'); btnStop(true);
    setMsg('wait', 'Insérer câble ' + (currentCable+1) + '/' + totalCables + ' — Appuyer ' + btn);
    setBadge('ready', currentCable + '/' + totalCables + ' testés');
    setCableNum(currentCable, totalCables);
    showToast('Insérer câble ' + (currentCable+1) + ' puis appuyer ' + btn, 'ok');
  } else {
    faisceauDone();
  }
}

/* ─── FAISCEAU DONE ──────────────────────────────────── */
function faisceauDone() {
  STATE = 'faisceau_done';
  btnDry(false); btnHV(false); btnStop(false);
  const okN  = cableResults.filter(r=>r&&r.ok).length;
  const nokN = totalCables - okN;
  const allOk = nokN === 0;
  tx('sumOK', okN); tx('sumNOK', nokN);
  const vb = document.getElementById('verdictBanner');
  if (vb) {
    vb.style.display = 'block';
    vb.className = 'verdict ' + (allOk ? 'accepted' : 'rejected');
    vb.innerHTML = allOk
      ? '<svg class="icon icon-sm icon-green" style="display:inline;vertical-align:middle;margin-right:6px;"><use href="#icon-check"/></svg> FAISCEAU ACCEPTÉ'
      : '<svg class="icon icon-sm icon-red" style="display:inline;vertical-align:middle;margin-right:6px;"><use href="#icon-xmark"/></svg> FAISCEAU REJETÉ';
  }
  setBadge(allOk?'ready':'alarm', allOk?'ACCEPTÉ':'REJETÉ');
  setMsg(allOk?'done':'nok', 'Faisceau terminé — ' + okN + ' OK / ' + nokN + ' NOK');
  pb(100);
  pl('Faisceau terminé — ' + okN + ' OK / ' + nokN + ' NOK');
  saveHist(allOk, okN, nokN);
  addAudit(SESSION.user, SESSION.role, 'TEST TERMINÉ',
    getActiveRef() + ' — ' + okN + '/' + totalCables + ' OK',
    allOk ? 'audit-login' : 'audit-fail');
}

function stopAll() {
  clearInterval(_iv); _iv = null;
  addAudit(SESSION.user, SESSION.role, 'ARRÊT TEST', 'Arrêt manuel', 'audit-fail');
  showToast('Test arrêté', 'warn');
  resetTestUI();
}

/* ══════════════════════════════════════════════════════════
   SAVE HISTORY
══════════════════════════════════════════════════════════ */
function saveHist(allOk, okN, nokN) {
  const KEY = 'hmi_test_history_v1';
  let h = []; try { h = JSON.parse(localStorage.getItem(KEY)||'[]'); } catch(_){}
  const maxFlow = Math.max(...cableResults.filter(r=>r).map(r=>parseFloat(r.flow)||0)).toFixed(1);
  const now = new Date();
  h.unshift({
    ts:      now.toLocaleTimeString('fr-FR')+' '+now.toLocaleDateString('fr-FR'),
    ref:     getActiveRef(),
    uid:     SESSION.uid||'—',
    op:      SESSION.user||'—',
    dept:    SESSION.dept||'production',
    pneumo:  testType!=='hv'?(cableResults.some(r=>r&&r.dry==='NOK')?'NOK':'OK'):'N/A',
    hv:      testType!=='dry'?(cableResults.some(r=>r&&r.hv==='NOK')?'NOK':'OK'):'N/A',
    maxFlow, cables: totalCables,
    verdict: allOk?'OK':'NOK'
  });
  try { localStorage.setItem(KEY, JSON.stringify(h.slice(0,500))); } catch(_){}
}

/* ══════════════════════════════════════════════════════════
   UI HELPERS
══════════════════════════════════════════════════════════ */
const $  = id => document.getElementById(id);
const el = (id, v) => { const e=$( id); if(e) e.textContent=v; };
const tx = (id, v) => el(id, v);
const hide = id => { const e=$(id); if(e) e.style.display='none'; };

function btnDry(on)  { const b=$('btnDry');  if(b) b.disabled=!on; }
function btnHV(on)   { const b=$('btnHV');   if(b) b.disabled=!on; }
function btnStop(on) { const b=$('btnStopTest'); if(b) b.disabled=!on; }

function pb(pct) {
  const e=$('progress-bar'); if(e) e.style.width=pct+'%';
}
function pl(txt) {
  const e=$('progress-label'); if(e) e.textContent=txt;
}

function setMsg(type, text) {
  const mb=$('msgBox'); if(!mb) return;
  mb.className='msg-box msg-'+type;
  const icons={wait:'cable',dry:'drop',hv:'zap',ok:'check',nok:'xmark',done:'check'};
  mb.innerHTML='<svg class="icon icon-lg"><use href="#icon-'+(icons[type]||'cable')+'"/></svg><span>'+text+'</span>';
}

function setCableNum(idx, tot) {
  el('cableNumBig',  idx < tot ? (idx+1) : '✓');
  el('cableNumTotal','/ '+tot);
}

function setBadge(type, text) {
  const b=$('status-badge'), s=$('status-text');
  if(b) b.className='status-badge '+(type==='testing'?'testing':type==='alarm'?'alarm':'ready');
  if(s) s.textContent=text||'PRÊT';
}

function clearLive() {
  ['live-current','live-voltage','live-pressure','live-massflow','live-time'].forEach(id=>{
    el(id, id.includes('pressure')?'0.00':id.includes('current')?'0.0':'0');
  });
  el('live-phase','—');
}

function buildCableTable(nb) {
  const tb=$('cable-tbody'); if(!tb) return;
  tb.innerHTML=Array.from({length:nb},(_,i)=>`
    <tr id="cr-${i}">
      <td class="cable-num">${i+1}</td>
      <td id="cd-${i}"><span style="color:var(--text-dim);font-family:'Share Tech Mono';font-size:11px;">—</span></td>
      <td id="ch-${i}"><span style="color:var(--text-dim);font-family:'Share Tech Mono';font-size:11px;">—</span></td>
      <td id="cf-${i}"><span style="color:var(--text-dim);font-family:'Share Tech Mono';font-size:11px;">—</span></td>
      <td><span class="state-badge" style="background:var(--border);" id="cs-${i}"></span></td>
    </tr>`).join('');
}

function updateRow(i, dry, hv, flow, state) {
  const fmt = v => v==='OK'?'<span class="res-ok">OK</span>'
    :v==='NOK'?'<span class="res-nok">NOK</span>'
    :v==='N/A'?'<span style="color:var(--text-dim);font-size:10px;">N/A</span>'
    :'<span style="color:var(--text-dim);font-family:\'Share Tech Mono\';font-size:11px;">—</span>';
  const dEl=$('cd-'+i), hEl=$('ch-'+i), fEl=$('cf-'+i), sEl=$('cs-'+i);
  if(dEl) dEl.innerHTML=fmt(dry);
  if(hEl) hEl.innerHTML=fmt(hv);
  if(fEl) fEl.innerHTML=flow&&flow!=='—'
    ?'<span style="font-family:\'Share Tech Mono\';font-size:11px;color:var(--green);">'+flow+'</span>'
    :'<span style="color:var(--text-dim);font-size:11px;">—</span>';
  if(sEl){
    sEl.className='state-badge'+(state==='ok'?' state-ok':state==='nok'?' state-nok':'');
    sEl.style.opacity=state==='partial'?'0.5':'1';
  }
}

function buildDots(nb) {
  const c=$('phaseDots'); if(!c) return;
  c.innerHTML=Array.from({length:nb},(_,i)=>`<div class="phase-dot" id="pd-${i}"></div>`).join('');
}

function dotState(i, s) {
  const e=$('pd-'+i); if(e) e.className='phase-dot '+s;
}

/* ══════════════════════════════════════════════════════════
   CHARTS — Chart.js
══════════════════════════════════════════════════════════ */
const DRY_BUF = Array(50).fill(null);
const HV_BUF  = Array(50).fill(null);
let chartDry = null, chartHV = null;

function pushDryValue(v) {
  DRY_BUF.shift(); DRY_BUF.push(parseFloat(v)||0);
  if(chartDry) { chartDry.data.datasets[0].data=[...DRY_BUF]; chartDry.update('none'); }
}
function pushHVValue(v) {
  HV_BUF.shift();  HV_BUF.push(parseFloat(v)||0);
  if(chartHV)  { chartHV.data.datasets[0].data=[...HV_BUF];  chartHV.update('none');  }
}
function dryActive(on) {
  if(!chartDry) return;
  chartDry.data.datasets[0].borderColor = on ? '#00b4d8' : 'rgba(90,112,144,.4)';
  chartDry.options.plugins.title.text   = on ? 'ACTIF' : 'EN ATTENTE';
  chartDry.options.plugins.title.color  = on ? '#00b4d8' : 'rgba(90,112,144,.5)';
  chartDry.update('none');
}
function hvActive(on) {
  if(!chartHV) return;
  chartHV.data.datasets[0].borderColor = on ? '#ff6b35' : 'rgba(90,112,144,.4)';
  chartHV.options.plugins.title.text   = on ? 'ACTIF' : 'EN ATTENTE';
  chartHV.options.plugins.title.color  = on ? '#ff6b35' : 'rgba(90,112,144,.5)';
  chartHV.update('none');
}
function resetCharts() {
  DRY_BUF.fill(null); HV_BUF.fill(null);
  if(chartDry){chartDry.data.datasets[0].data=Array(50).fill(null);chartDry.update('none');}
  if(chartHV) {chartHV.data.datasets[0].data =Array(50).fill(null);chartHV.update('none');}
  dryActive(false); hvActive(false);
}

function initCharts() {
  if (typeof Chart === 'undefined') {
    setTimeout(initCharts, 500); return;
  }
  const tl = Array.from({length:50},(_,i)=>i%10===0?(i*0.1).toFixed(1)+'s':'');
  const theme = document.documentElement.getAttribute('data-theme')||'dark';
  const gc = theme==='light'?'rgba(100,120,160,.15)':'rgba(30,80,120,.3)';
  const tc = theme==='light'?'rgba(60,80,120,.7)':'rgba(120,160,200,.7)';

  function makeChart(id, color, label) {
    const canvas = document.getElementById(id); if(!canvas) return null;
    if(canvas._chart) { canvas._chart.destroy(); }
    const c = new Chart(canvas, {
      type:'line',
      data:{ labels:tl, datasets:[{
        label, data:Array(50).fill(null),
        borderColor:'rgba(90,112,144,.4)',
        backgroundColor:'rgba(90,112,144,.05)',
        borderWidth:2.5, pointRadius:0, tension:0.3, fill:true
      }]},
      options:{
        responsive:true, maintainAspectRatio:false, animation:{duration:0},
        plugins:{
          legend:{display:false},
          title:{display:true,text:'EN ATTENTE',color:'rgba(90,112,144,.5)',
                 font:{family:'Share Tech Mono',size:11,weight:'bold'}}
        },
        scales:{
          x:{grid:{color:gc},ticks:{color:tc,font:{family:'Share Tech Mono',size:9},maxRotation:0}},
          y:{min:0,grid:{color:gc},ticks:{color:tc,font:{family:'Share Tech Mono',size:9},
              callback:v=>v.toFixed(2)}}
        }
      }
    });
    canvas._chart = c;
    return c;
  }

  if(chartDry){chartDry.destroy();chartDry=null;}
  if(chartHV) {chartHV.destroy(); chartHV=null;}
  chartDry = makeChart('chartDry','#00b4d8','Pression (bar)');
  chartHV  = makeChart('chartHV', '#ff6b35','Courant (µA)');
}

function drawMainCharts() { initCharts(); }
window.addEventListener('resize', ()=>setTimeout(initCharts,100));
