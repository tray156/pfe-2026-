// ═══════════════════════════════════════════════════════════
//  SALIS-HMI — backend/server.js v2
//  Express + SQLite + WebSocket + Simulateur STM32
//  npm install ws
//  Commande : node backend/server.js   (port 3000)
// ═══════════════════════════════════════════════════════════

const express  = require('express');
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const path     = require('path');
const http     = require('http');
const WebSocket = require('ws');

const app    = express();
const server = http.createServer(app);  /* HTTP server (shared with WS) */
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'hmi_secret_change_in_production';

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js',  express.static(path.join(__dirname, '../js')));

// ── Database ────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'database.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    uid           TEXT,
    role          TEXT NOT NULL CHECK(role IN ('operator','engineer','admin')),
    dept          TEXT DEFAULT 'production',
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name  TEXT, uid TEXT, role TEXT, dept TEXT,
    action     TEXT NOT NULL, detail TEXT, ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS machine_params (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS test_results (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    reference    TEXT NOT NULL,
    operator     TEXT NOT NULL,
    operator_uid TEXT,
    dept         TEXT,
    lot          TEXT,
    nb_cables    INTEGER DEFAULT 1,
    test_type    TEXT DEFAULT 'both',
    verdict      TEXT NOT NULL,
    dry_result   TEXT, hv_result TEXT,
    hv_voltage   REAL, hv_current_max REAL,
    dry_pressure REAL, massflow_max REAL,
    duration_s   REAL,
    cables_json  TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS failed_logins (
    username     TEXT PRIMARY KEY,
    count        INTEGER DEFAULT 0,
    locked_until DATETIME
  );
`);

// ── Seed default users ──────────────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const ins = db.prepare('INSERT INTO users (username,name,uid,role,dept,password_hash) VALUES (?,?,?,?,?,?)');
  [
    ['operator',  'MARTIN P.',  'OP-1001', 'operator', 'production', bcrypt.hashSync('op1234',   10)],
    ['operator2', 'DUPONT L.',  'OP-1002', 'operator', 'qualite',    bcrypt.hashSync('op5678',   10)],
    ['engineer',  'CHEN R.',    'OP-2001', 'engineer', 'technique',  bcrypt.hashSync('eng5678',  10)],
    ['admin',     'ADMIN',      'OP-0001', 'admin',    'technique',  bcrypt.hashSync('admin9999',10)],
  ].forEach(u => ins.run(...u));
  console.log('✔ Utilisateurs par défaut créés');
}

// ── Seed default params ─────────────────────────────────────
if (db.prepare('SELECT COUNT(*) as c FROM machine_params').get().c === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO machine_params (key,value) VALUES (?,?)');
  [
    ['hv_voltage','2000'],['hv_time','5'],['hv_current','5'],
    ['dry_pres','2.0'],['dry_stab','3'],['dry_delta','0.1'],
    ['massflow_seuil','5'],['ref','TYPE-B-5C'],['nb_cables','5'],
    ['cycle_max','30'],['auto_print','OUI'],['m1_test_type','both'],
  ].forEach(([k,v]) => ins.run(k,v));
}

// ══════════════════════════════════════════════════════════
//  SIMULATEUR STM32
//  Reproduit le comportement d'une vraie carte STM32
//  TODO: remplacer par SerialPort quand la carte est disponible
// ══════════════════════════════════════════════════════════
const MACHINE_STATE = {
  running:    false,
  phase:      'idle',   /* 'idle' | 'dry' | 'hv' */
  cable:      0,
  totalCables:1,
  pressure:   0,
  massflow:   0,
  voltage:    0,
  current:    0,
  interval:   null,
};

function simulateDryMeasure() {
  /* Simulate pressure curve: rises then stabilizes */
  const t = MACHINE_STATE._t || 0;
  MACHINE_STATE._t = t + 1;
  const p = t < 10
    ? (t / 10) * 2.0
    : 1.9 + Math.sin(t * 0.3) * 0.04 + (Math.random() - 0.5) * 0.02;
  MACHINE_STATE.pressure  = parseFloat(p.toFixed(3));
  MACHINE_STATE.massflow  = parseFloat((Math.random() * 2).toFixed(2));
  MACHINE_STATE.voltage   = 0;
  MACHINE_STATE.current   = 0;
}

function simulateHVMeasure(targetVoltage) {
  /* Simulate HV: voltage ramps up, current fluctuates */
  const t = MACHINE_STATE._t || 0;
  MACHINE_STATE._t = t + 1;
  const v = Math.min(targetVoltage, (t / 5) * targetVoltage);
  const i = 0.5 + Math.random() * 3.5;
  MACHINE_STATE.voltage  = Math.floor(v);
  MACHINE_STATE.current  = parseFloat(i.toFixed(2));
  MACHINE_STATE.pressure = 0;
  MACHINE_STATE.massflow = 0;
}

function broadcastMeasure(type) {
  const msg = JSON.stringify({
    type,
    pressure: MACHINE_STATE.pressure,
    massflow: MACHINE_STATE.massflow,
    voltage:  MACHINE_STATE.voltage,
    current:  MACHINE_STATE.current,
    cable:    MACHINE_STATE.cable,
    ts:       Date.now(),
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function startSimDry(durationMs, onDone) {
  MACHINE_STATE.phase = 'dry';
  MACHINE_STATE._t    = 0;
  const start = Date.now();
  const iv = setInterval(() => {
    simulateDryMeasure();
    broadcastMeasure('dry');
    if (Date.now() - start >= durationMs) {
      clearInterval(iv);
      MACHINE_STATE.phase = 'idle';
      onDone();
    }
  }, 100);
}

function startSimHV(durationMs, voltage, onDone) {
  MACHINE_STATE.phase = 'hv';
  MACHINE_STATE._t    = 0;
  const start = Date.now();
  const iv = setInterval(() => {
    simulateHVMeasure(voltage);
    broadcastMeasure('hv');
    if (Date.now() - start >= durationMs) {
      clearInterval(iv);
      MACHINE_STATE.phase = 'idle';
      MACHINE_STATE.voltage = 0;
      MACHINE_STATE.current = 0;
      onDone();
    }
  }, 100);
}

function broadcastStatus(extra = {}) {
  const msg = JSON.stringify({ type: 'status', ...MACHINE_STATE, ...extra });
  wss.clients.forEach(c => { if(c.readyState===WebSocket.OPEN) c.send(msg); });
}

// ══════════════════════════════════════════════════════════
//  WEBSOCKET  (même port 3000, path /ws)
// ══════════════════════════════════════════════════════════
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log(`🔌 WebSocket connecté — ${req.socket.remoteAddress}`);
  /* Send current state immediately on connect */
  ws.send(JSON.stringify({ type: 'status', ...MACHINE_STATE }));
  ws.on('close', () => console.log('🔌 WebSocket déconnecté'));
});

/* Keep-alive ping every 30s */
setInterval(() => {
  wss.clients.forEach(ws => {
    if(ws.readyState === WebSocket.OPEN) ws.ping();
  });
}, 30000);

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════
const PERMISSIONS = {
  operator: { canStartTest:true, canViewResults:true, canViewStats:true, canModifyParams:false, canChangePassword:false, canViewAudit:false },
  engineer: { canStartTest:true, canViewResults:true, canViewStats:true, canModifyParams:true,  canChangePassword:true,  canViewAudit:false },
  admin:    { canStartTest:true, canViewResults:true, canViewStats:true, canModifyParams:true,  canChangePassword:true,  canViewAudit:true  },
};

function addAudit(userName, uid, role, dept, action, detail, ip='') {
  db.prepare('INSERT INTO audit_log (user_name,uid,role,dept,action,detail,ip) VALUES (?,?,?,?,?,?,?)')
    .run(userName, uid, role, dept, action, detail, ip);
}

function getParams() {
  const rows = db.prepare('SELECT key,value FROM machine_params').all();
  const p = {};
  rows.forEach(r => p[r.key] = isNaN(r.value) ? r.value : parseFloat(r.value));
  return p;
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' });
  try { req.user = jwt.verify(h.slice(7), SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalide' }); }
}

function requirePerm(perm) {
  return (req, res, next) => {
    if (!PERMISSIONS[req.user.role]?.[perm])
      return res.status(403).json({ error: 'Permission insuffisante' });
    next();
  };
}

// ══════════════════════════════════════════════════════════
//  ROUTES — AUTH
// ══════════════════════════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });

  const lockRow = db.prepare('SELECT * FROM failed_logins WHERE username=?').get(username);
  if (lockRow?.locked_until && new Date(lockRow.locked_until) > new Date()) {
    const rem = new Date(lockRow.locked_until) - new Date();
    return res.status(429).json({ error: 'Compte bloqué', remaining_ms: rem });
  }

  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const failCount = (lockRow?.count||0)+1;
    const DELAYS    = [0,0,0,30,60,120];
    const delay     = DELAYS[Math.min(failCount, DELAYS.length-1)];
    const lockedUntil = delay>0 ? new Date(Date.now()+delay*1000).toISOString() : null;
    db.prepare(`INSERT INTO failed_logins (username,count,locked_until) VALUES (?,?,?)
      ON CONFLICT(username) DO UPDATE SET count=excluded.count,locked_until=excluded.locked_until`)
      .run(username, failCount, lockedUntil);
    addAudit(username,'—','—','—','ÉCHEC CONNEXION',`Tentative ${failCount}`,req.ip);
    return res.status(401).json({ error: 'Identifiants incorrects', attempts: failCount });
  }

  db.prepare('DELETE FROM failed_logins WHERE username=?').run(username);
  const token = jwt.sign(
    { id:user.id, username:user.username, name:user.name, uid:user.uid, role:user.role, dept:user.dept },
    SECRET, { expiresIn:'8h' }
  );
  addAudit(user.name, user.uid, user.role, user.dept, 'CONNEXION', `Accès accordé`, req.ip);
  res.json({ token, user: { name:user.name, uid:user.uid, role:user.role, dept:user.dept, permissions:PERMISSIONS[user.role] } });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  addAudit(req.user.name, req.user.uid, req.user.role, req.user.dept, 'DÉCONNEXION', 'Session fermée', req.ip);
  res.json({ ok:true });
});

app.post('/api/auth/change-password', authMiddleware, (req, res) => {
  if (!PERMISSIONS[req.user.role]?.canChangePassword) return res.status(403).json({ error: 'Permission insuffisante' });
  const { current_password, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash))
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  if (!new_password || new_password.length < 8)
    return res.status(400).json({ error: 'Minimum 8 caractères' });
  db.prepare('UPDATE users SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(bcrypt.hashSync(new_password, 12), user.id);
  addAudit(user.name, user.uid, user.role, user.dept, 'MOD. MOT DE PASSE', 'Changement réussi', req.ip);
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════
//  ROUTES — PARAMS
// ══════════════════════════════════════════════════════════
app.get('/api/params', authMiddleware, (req, res) => res.json(getParams()));

app.put('/api/params', authMiddleware, requirePerm('canModifyParams'), (req, res) => {
  const upd = db.prepare('INSERT OR REPLACE INTO machine_params (key,value,updated_by,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)');
  db.transaction(() => {
    for (const [k,v] of Object.entries(req.body)) upd.run(k, String(v), req.user.name);
  })();
  addAudit(req.user.name, req.user.uid, req.user.role, req.user.dept, 'MODIF. PARAMÈTRES', JSON.stringify(req.body), req.ip);
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════
//  ROUTES — SIMULATION MACHINE
// ══════════════════════════════════════════════════════════

// GET /api/machine/status — état actuel de la machine
app.get('/api/machine/status', authMiddleware, (req, res) => {
  res.json({
    phase:    MACHINE_STATE.phase,
    running:  MACHINE_STATE.running,
    cable:    MACHINE_STATE.cable,
    pressure: MACHINE_STATE.pressure,
    voltage:  MACHINE_STATE.voltage,
    current:  MACHINE_STATE.current,
    massflow: MACHINE_STATE.massflow,
    // TODO: remplacer par lecture SerialPort STM32
    stm32_connected: false,
  });
});

// POST /api/machine/dry — lancer test DRY simulé
app.post('/api/machine/dry', authMiddleware, requirePerm('canStartTest'), (req, res) => {
  if (MACHINE_STATE.running) return res.status(409).json({ error: 'Machine déjà en cours' });

  const params = getParams();
  const duration = ((parseFloat(params.dry_stab)||3) * 1000) + 2000;
  MACHINE_STATE.running = true;
  MACHINE_STATE.cable   = req.body.cable || 1;
  broadcastStatus({ event: 'dry_start', cable: MACHINE_STATE.cable });

  startSimDry(duration, () => {
    /* Determine result */
    const dryOk = Math.random() > 0.15; /* 85% OK */
    const flow   = MACHINE_STATE.massflow;
    const exceeded = flow > (parseFloat(params.massflow_seuil)||5);
    const result = dryOk && !exceeded ? 'OK' : 'NOK';
    MACHINE_STATE.running = false;

    const msg = JSON.stringify({
      type:    'dry_result',
      cable:   MACHINE_STATE.cable,
      result,
      pressure: parseFloat(params.dry_pres)||2.0,
      massflow: parseFloat(flow.toFixed(2)),
      exceeded_flow: exceeded,
    });
    wss.clients.forEach(c => { if(c.readyState===WebSocket.OPEN) c.send(msg); });
    addAudit(req.user.name, req.user.uid, req.user.role, req.user.dept,
      `TEST DRY C${MACHINE_STATE.cable}`, `Résultat: ${result}`, req.ip);
  });

  res.json({ ok:true, message:`DRY démarré — câble ${MACHINE_STATE.cable}`, duration_ms: duration });
});

// POST /api/machine/hv — lancer test HV simulé
app.post('/api/machine/hv', authMiddleware, requirePerm('canStartTest'), (req, res) => {
  if (MACHINE_STATE.running) return res.status(409).json({ error: 'Machine déjà en cours' });

  const params  = getParams();
  const voltage = parseFloat(params.hv_voltage)||2000;
  const duration = ((parseFloat(params.hv_time)||5) * 1000) + 1000;
  MACHINE_STATE.running = true;
  MACHINE_STATE.cable   = req.body.cable || 1;
  broadcastStatus({ event: 'hv_start', cable: MACHINE_STATE.cable });

  startSimHV(duration, voltage, () => {
    const hvOk  = Math.random() > 0.1; /* 90% OK */
    const iMax  = parseFloat((0.5 + Math.random()*4).toFixed(2));
    const exceeded = iMax > (parseFloat(params.hv_current)||5);
    const result = hvOk && !exceeded ? 'OK' : 'NOK';
    MACHINE_STATE.running = false;

    const msg = JSON.stringify({
      type:    'hv_result',
      cable:   MACHINE_STATE.cable,
      result,
      voltage: Math.floor(voltage + (Math.random()-0.5)*20),
      current_max: iMax,
      exceeded_current: exceeded,
    });
    wss.clients.forEach(c => { if(c.readyState===WebSocket.OPEN) c.send(msg); });
    addAudit(req.user.name, req.user.uid, req.user.role, req.user.dept,
      `TEST HV C${MACHINE_STATE.cable}`, `Résultat: ${result}`, req.ip);
  });

  res.json({ ok:true, message:`HV démarré — câble ${MACHINE_STATE.cable}`, duration_ms: duration });
});

// POST /api/machine/stop
app.post('/api/machine/stop', authMiddleware, (req, res) => {
  MACHINE_STATE.running = false;
  MACHINE_STATE.phase   = 'idle';
  MACHINE_STATE.pressure = 0; MACHINE_STATE.voltage = 0;
  MACHINE_STATE.current  = 0; MACHINE_STATE.massflow = 0;
  broadcastStatus({ event: 'stopped' });
  addAudit(req.user.name, req.user.uid, req.user.role, req.user.dept, 'ARRÊT TEST', 'Arrêt manuel', req.ip);
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════
//  ROUTES — TEST RESULTS
// ══════════════════════════════════════════════════════════
app.post('/api/tests', authMiddleware, requirePerm('canStartTest'), (req, res) => {
  const { reference, lot, verdict, nb_cables, test_type,
          dry_result, hv_result, hv_voltage, hv_current_max,
          dry_pressure, massflow_max, duration_s, cables_json } = req.body;
  const info = db.prepare(`
    INSERT INTO test_results
      (reference,operator,operator_uid,dept,lot,nb_cables,test_type,
       verdict,dry_result,hv_result,hv_voltage,hv_current_max,
       dry_pressure,massflow_max,duration_s,cables_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(reference, req.user.name, req.user.uid, req.user.dept,
         lot, nb_cables||1, test_type||'both',
         verdict, dry_result, hv_result, hv_voltage, hv_current_max,
         dry_pressure, massflow_max, duration_s, cables_json);
  addAudit(req.user.name, req.user.uid, req.user.role, req.user.dept,
    `TEST TERMINÉ ${verdict}`, `Ref:${reference} — ${nb_cables}c`, req.ip);
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/tests', authMiddleware, requirePerm('canViewResults'), (req, res) => {
  const limit = parseInt(req.query.limit)||50;
  res.json(db.prepare('SELECT * FROM test_results ORDER BY created_at DESC LIMIT ?').all(limit));
});

app.get('/api/tests/stats', authMiddleware, requirePerm('canViewStats'), (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM test_results').get().c;
  const ok    = db.prepare("SELECT COUNT(*) as c FROM test_results WHERE verdict='OK'").get().c;
  const nok   = db.prepare("SELECT COUNT(*) as c FROM test_results WHERE verdict='NOK'").get().c;
  const avgFlow = db.prepare('SELECT AVG(massflow_max) as a FROM test_results').get().a || 0;
  res.json({ total, ok, nok, defect_rate: total>0?((nok/total)*100).toFixed(1):'0.0', avg_flow: avgFlow.toFixed(2) });
});

// ══════════════════════════════════════════════════════════
//  ROUTES — AUDIT
// ══════════════════════════════════════════════════════════
app.get('/api/audit', authMiddleware, requirePerm('canViewAudit'), (req, res) => {
  res.json(db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100').all());
});

app.delete('/api/audit', authMiddleware, requirePerm('canViewAudit'), (req, res) => {
  db.prepare('DELETE FROM audit_log').run();
  res.json({ ok:true });
});

// ══════════════════════════════════════════════════════════
//  USERS (admin only)
// ══════════════════════════════════════════════════════════
app.get('/api/users', authMiddleware, requirePerm('canViewAudit'), (req, res) => {
  res.json(db.prepare('SELECT id,username,name,uid,role,dept,created_at FROM users').all());
});

// ══════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════
server.listen(PORT, () => {
  console.log(`\n⚡ SALIS-HMI backend démarré sur http://localhost:${PORT}`);
  console.log(`   WebSocket : ws://localhost:${PORT}/ws`);
  console.log(`   Base de données : ${path.join(__dirname,'database.db')}`);
  console.log(`   Mode : ${process.env.NODE_ENV||'development'}\n`);
  console.log(`   // TODO: Connecter STM32 via SerialPort (npm install serialport)\n`);
});

module.exports = app;
