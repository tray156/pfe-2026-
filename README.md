# ⚡ SALIS-HMI

Interface HMI pour machine de test câbles (HV + Pneumatique).

---

## 📁 Structure du projet

```
SALIS-HMI/
├── frontend/
│   ├── login.html        ← Page de connexion
│   ├── dashboard.html    ← Accueil : tests temps réel + câbles
│   ├── tests.html        ← Résultat du dernier test
│   ├── history.html      ← Statistiques + Alarmes + Audit
│   └── settings.html     ← Paramètres machine (accès restreint)
├── css/
│   └── style.css         ← Feuille de style globale partagée
├── js/
│   ├── api.js            ← Couche données : users, session, stockage
│   ├── login.js          ← Logique de la page login
│   └── dashboard.js      ← Moteur de test + graphiques
├── backend/
│   ├── server.js         ← Serveur Express + API REST
│   └── database.db       ← Base SQLite (créée automatiquement)
└── package.json
```

---

## 🚀 Démarrage rapide (sans backend)

Ouvrir simplement `frontend/login.html` dans le navigateur.

**Comptes de test :**
| Utilisateur | Mot de passe | Rôle        |
|-------------|-------------|-------------|
| operator    | op1234      | Opérateur   |
| operator2   | op5678      | Opérateur   |
| engineer    | eng5678     | Ingénieur   |
| admin       | admin9999   | Admin       |

---

## 🖥 Démarrage avec le backend Node.js

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur
npm start
# ou en dev avec rechargement automatique :
npm run dev

# 3. Ouvrir dans le navigateur
# http://localhost:3000
```

---

## 🔐 Système de sécurité

### Niveaux d'accès (RBAC)
| Action                     | Opérateur | Ingénieur | Admin |
|----------------------------|:---------:|:---------:|:-----:|
| Lancer un test             | ✅        | ✅        | ✅    |
| Voir les résultats         | ✅        | ✅        | ✅    |
| Voir les statistiques      | ✅        | ✅        | ✅    |
| Modifier les paramètres    | ❌        | ✅        | ✅    |
| Changer le mot de passe    | ❌        | ✅        | ✅    |
| Accéder au journal d'audit | ❌        | ❌        | ✅    |

### Mécanismes
- **Blocage après 3 tentatives** : délai de 30s → 60s → 120s
- **Verrouillage automatique** : 120s d'inactivité → retour login
- **Persistance des mots de passe** : localStorage (frontend) / bcrypt (backend)
- **Sessions** : sessionStorage (expire à la fermeture du navigateur)
- **Journal d'audit** : toutes les actions horodatées, persistées en localStorage / SQLite

### Architecture frontend (sans backend)
```
login.html  →  sessionStorage (SESSION)
                    ↓
dashboard.html / tests.html / settings.html / history.html
                    ↓
            localStorage (USERS, PARAMS, AUDIT)
```

### Architecture complète (avec backend)
```
frontend  →  POST /api/auth/login  →  JWT token
          →  GET/PUT /api/params   →  SQLite
          →  POST /api/tests       →  SQLite
          →  GET /api/audit        →  SQLite (Admin only)
```

---

## 🛠 Technologies

**Frontend :** HTML5, CSS3, JavaScript vanille  
**Backend :** Node.js, Express, better-sqlite3, bcryptjs, jsonwebtoken  
**Fonts :** Rajdhani, Share Tech Mono, Exo 2 (Google Fonts)
