/* ═══════════════════════════════════════════════════════════
   SALIS-HMI — login.js
   Logique de la page login.html
═══════════════════════════════════════════════════════════ */

/* ── Si déjà connecté → rediriger directement ─────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (SESSION.active) {
    window.location.href = 'dashboard.html';
    return;
  }
  startClock();
  updateAttemptDots();

  // Populate user dropdown dynamically from USERS
  const sel = document.getElementById('loginUser');
  sel.innerHTML = '';
  const deptMap = { production:'Production', qualite:'Qualité', technique:'Technique' };
  Object.entries(USERS).forEach(([key, u]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${u.uid || key}  —  ${u.name}  (${deptMap[u.dept]||''})`;
    sel.appendChild(opt);
  });

  document.getElementById('loginPw').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});

/* ══════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════ */
async function doLogin() {
  if (LOCKOUT.locked) return;

  const userKey = document.getElementById('loginUser').value;
  const pw      = document.getElementById('loginPw').value;
  const user    = USERS[userKey];

  if (!pw) { showLoginError('Veuillez saisir un mot de passe.'); return; }

  /* ── If on localhost → authenticate via backend API ── */
  const onLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';

  if (onLocalhost) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userKey, password: pw })
      });
      const data = await res.json();

      if (!res.ok) {
        LOCKOUT.failCount++;
        updateAttemptDots();
        if (LOCKOUT.failCount >= LOCKOUT.maxAttempts) {
          triggerLockout(30);
        } else {
          const rem = LOCKOUT.maxAttempts - LOCKOUT.failCount;
          showLoginError(`Mot de passe incorrect — ${rem} tentative(s) restante(s).`);
          const inp = document.getElementById('loginPw');
          inp.classList.add('error');
          setTimeout(() => inp.classList.remove('error'), 400);
        }
        document.getElementById('loginPw').value = '';
        return;
      }

      /* Backend login success — save JWT token */
      LOCKOUT.failCount = 0;
      updateAttemptDots();
      SESSION.user      = data.user.name;
      SESSION.uid       = data.user.uid;
      SESSION.role      = data.user.role;
      SESSION.dept      = data.user.dept;
      SESSION.token     = data.token;  /* JWT token for API calls */
      SESSION.userKey   = userKey;
      SESSION.loginTime = Date.now();
      SESSION.active    = true;
      saveSession();
      window.location.href = 'dashboard.html';
      return;

    } catch(e) {
      console.warn('Backend unavailable, using local auth:', e);
      /* Fall through to local auth */
    }
  }

  /* ── Local auth (file:// mode or backend unavailable) ── */
  if (!user || hashSimple(pw) !== user.pwHash) {
    LOCKOUT.failCount++;
    updateAttemptDots();
    if (LOCKOUT.failCount >= LOCKOUT.maxAttempts) {
      triggerLockout(30);
    } else {
      const rem = LOCKOUT.maxAttempts - LOCKOUT.failCount;
      showLoginError(`Mot de passe incorrect — ${rem} tentative(s) restante(s).`);
      const inp = document.getElementById('loginPw');
      inp.classList.add('error');
      setTimeout(() => inp.classList.remove('error'), 400);
    }
    document.getElementById('loginPw').value = '';
    return;
  }

  /* Local success */
  LOCKOUT.failCount = 0;
  updateAttemptDots();
  SESSION.user      = user.name;
  SESSION.uid       = user.uid || userKey;
  SESSION.role      = user.role;
  SESSION.dept      = user.dept || 'production';
  SESSION.userKey   = userKey;
  SESSION.loginTime = Date.now();
  SESSION.active    = true;
  SESSION.token     = null;
  saveSession();
  addAudit(user.name, user.displayRole, 'CONNEXION', `Accès local`, 'audit-login');
  window.location.href = 'dashboard.html';
}

/* ══════════════════════════════════════════════════════════
   LOCKOUT
══════════════════════════════════════════════════════════ */
function triggerLockout(seconds) {
  LOCKOUT.locked   = true;
  LOCKOUT.lockUntil = Date.now() + seconds * 1000;
  addAudit('SYSTÈME', '—', 'VERROUILLAGE',
    `Blocage ${seconds}s après ${LOCKOUT.failCount} échecs`, 'audit-lock');

  document.getElementById('loginView').style.display   = 'none';
  document.getElementById('lockoutView').style.display = 'block';

  const tick = setInterval(() => {
    const rem = Math.max(0, Math.ceil((LOCKOUT.lockUntil - Date.now()) / 1000));
    const mm  = String(Math.floor(rem / 60)).padStart(2, '0');
    const ss  = String(rem % 60).padStart(2, '0');
    document.getElementById('lockoutTimer').textContent = `${mm}:${ss}`;

    if (rem <= 0) {
      clearInterval(tick);
      LOCKOUT.locked    = false;
      LOCKOUT.failCount = 0;
      updateAttemptDots();
      document.getElementById('lockoutView').style.display = 'none';
      document.getElementById('loginView').style.display   = 'block';
    }
  }, 500);
}

/* ── Attempt dots ─────────────────────────────────────── */
function updateAttemptDots() {
  for (let i = 0; i < 3; i++) {
    const d = document.getElementById('dot' + i);
    if (d) d.classList.toggle('used', i < LOCKOUT.failCount);
  }
}

/* ── Error helpers ────────────────────────────────────── */
function showLoginError(msg) {
  const el = document.getElementById('loginError');
  if (!el) return;
  document.getElementById('loginErrorText').textContent = msg;
  el.classList.add('visible');
}
