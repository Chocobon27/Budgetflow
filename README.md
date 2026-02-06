# 💰 BudgetFlow

Application web et mobile (PWA) de gestion de budget personnel avec synchronisation multi-appareils en temps réel.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)

---

## 📋 Fonctionnalités

### Gestion financière
- ✅ Revenus & dépenses avec catégorisation
- ✅ Budgets mensuels par catégorie avec alertes de dépassement
- ✅ Objectifs d'épargne court terme
- ✅ Objectifs long terme avec priorité, simulation et suivi
- ✅ Gestion des dettes avec échéancier automatique
- ✅ Modèles de transactions rapides
- ✅ Dépenses fixes et récurrentes

### Budgets partagés
- ✅ Création de budgets famille / colocation
- ✅ Système d'invitation par code
- ✅ Contributions par membre
- ✅ Historique des modifications

### Analyse & visualisation
- ✅ Statistiques détaillées avec graphiques
- ✅ Cartes cliquables avec détail des transactions
- ✅ Comparaison mois par mois
- ✅ Tendances et projections
- ✅ Calendrier des transactions

### Gamification
- ✅ 40 badges à débloquer
- ✅ Système de streak et points XP
- ✅ Notifications toast à chaque badge

### Technique
- ✅ PWA installable sur mobile (iOS / Android)
- ✅ Synchronisation temps réel (WebSocket)
- ✅ Mode hors-ligne avec Service Worker
- ✅ Notifications push (VAPID)
- ✅ Mode sombre
- ✅ Panel d'administration

---

## 🛠️ Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Socket.io Client |
| **Backend** | Node.js, Express, Socket.io, JWT, bcrypt, web-push |
| **Base de données** | PostgreSQL 14+ |
| **Infrastructure** | Nginx, Let's Encrypt, systemd, UFW |

---

## 📂 Structure du projet

```
/var/www/budgetflow/
├── api/
│   ├── server.js          # API Express + WebSocket
│   ├── package.json
│   └── .env               # Configuration (généré par install.sh)
├── src/
│   ├── App.jsx            # Composant principal
│   ├── api/
│   │   └── index.js       # Client API
│   ├── context/
│   │   └── AppContext.jsx  # État global React
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── Statistics.jsx
│   │   ├── Calendar.jsx
│   │   ├── Budgets.jsx
│   │   ├── Debts.jsx
│   │   ├── Shared.jsx
│   │   └── Admin.jsx
│   ├── components/
│   │   ├── modals/
│   │   ├── transactions/
│   │   ├── common/
│   │   ├── AchievementToast.jsx
│   │   ├── NotificationSettings.jsx
│   │   └── OfflineIndicator.jsx
│   ├── hooks/
│   │   └── useAchievements.js
│   └── utils/
│       └── helpers.js
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js              # Service Worker
│   └── icons/
├── dist/                   # Build de production
├── schema.sql              # Schéma complet de la BDD
├── install.sh              # Script d'installation automatique
├── package.json
├── vite.config.js
└── README.md
```

---

## 📦 Prérequis

| Composant | Version minimum |
|-----------|----------------|
| **OS** | Debian 11/12 ou Ubuntu 22.04+ |
| **Node.js** | 20.x |
| **PostgreSQL** | 14+ |
| **Nginx** | 1.18+ |
| **RAM** | 1 Go |
| **Stockage** | 10 Go |
| **Domaine** | Avec accès DNS configuré |

---

## 🚀 Installation automatique

### 1. Cloner le repository

```bash
cd /var/www/
git clone https://github.com/Chocobon27/budgetflow.git
cd budgetflow
```

### 2. Lancer l'installation

```bash
sudo chmod +x install.sh
sudo ./install.sh
```

Le script interactif vous demandera :
- 🌐 Nom de domaine (ex: `budget.example.com`)
- 📧 Email pour Let's Encrypt
- 👤 Identifiants PostgreSQL
- 🔔 Activation des notifications push

Le script s'occupe de tout :
- Installation de Node.js, PostgreSQL, Nginx
- Création de la base de données + toutes les tables
- Génération des clés JWT et VAPID
- Configuration Nginx + SSL
- Build du frontend
- Création du service systemd

### 3. Créer le premier administrateur

Après avoir créé un compte via l'interface web :

```bash
sudo -u postgres psql -d budgetflow -c "UPDATE users SET is_admin = true, admin_permissions = '[\"all\"]' WHERE email = 'votre@email.com';"
```

---

## 🔧 Installation manuelle

<details>
<summary>Cliquer pour voir les étapes détaillées</summary>

### 1. Dépendances système

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Base de données

```bash
# Créer l'utilisateur et la base
sudo -u postgres psql -c "CREATE USER budgetflow WITH PASSWORD 'votre_mot_de_passe';"
sudo -u postgres psql -c "CREATE DATABASE budgetflow OWNER budgetflow;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE budgetflow TO budgetflow;"

# Créer toutes les tables
sudo -u postgres psql -d budgetflow < schema.sql
```

### 3. Configuration API

```bash
cp api/.env.example api/.env
nano api/.env
```

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://budgetflow:votre_mot_de_passe@localhost:5432/budgetflow
JWT_SECRET=votre_secret_jwt_64_caracteres_minimum
CORS_ORIGIN=https://votre-domaine.com

# Notifications Push (optionnel)
# Générer avec : npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:votre@email.com
```

### 4. Installation des dépendances et build

```bash
# Frontend
cd /var/www/budgetflow
npm install
npm run build

# Backend
cd /var/www/budgetflow/api
npm install
```

### 5. Nginx

Créer `/etc/nginx/sites-available/budgetflow` (voir le fichier généré par install.sh comme modèle).

```bash
sudo ln -s /etc/nginx/sites-available/budgetflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo certbot --nginx -d votre-domaine.com
sudo systemctl restart nginx
```

### 6. Service systemd

Créer `/etc/systemd/system/budgetflow-api.service` :

```ini
[Unit]
Description=BudgetFlow API Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/budgetflow/api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable budgetflow-api
sudo systemctl start budgetflow-api
```

</details>

---

## 🗄️ Base de données

Le fichier `schema.sql` contient les **24 tables** nécessaires :

| Table | Description |
|-------|-------------|
| `users` | Comptes utilisateurs |
| `sessions` | Sessions JWT |
| `savings` | Épargne par utilisateur |
| `transactions` | Revenus et dépenses |
| `savings_goals` | Objectifs d'épargne court terme |
| `long_term_goals` | Objectifs long terme avec priorité |
| `category_budgets` | Budgets mensuels par catégorie |
| `custom_categories` | Catégories personnalisées |
| `custom_brands` | Marques personnalisées |
| `debts` | Dettes |
| `debt_schedule` | Échéancier des dettes |
| `templates` | Modèles de transactions rapides |
| `achievements` | Badges et gamification |
| `planned_budget` | Budget planifié mensuel |
| `shared_budgets` | Budgets partagés |
| `shared_budget_members` | Membres des budgets partagés |
| `shared_transactions` | Transactions partagées |
| `shared_savings` | Épargne partagée |
| `shared_budget_history` | Historique des modifications |
| `push_subscriptions` | Abonnements push |
| `notification_preferences` | Préférences de notifications |
| `global_categories` | Catégories globales (admin) |
| `global_brands` | Marques globales (admin) |
| `api_logs` | Logs de l'API |

---

## 📋 Commandes utiles

```bash
# Logs de l'API en temps réel
sudo journalctl -u budgetflow-api -f

# Redémarrer l'API
sudo systemctl restart budgetflow-api

# Status de l'API
sudo systemctl status budgetflow-api

# Rebuild du frontend après modification
cd /var/www/budgetflow && npm run build

# Console PostgreSQL
sudo -u postgres psql -d budgetflow

# Renouveler le certificat SSL
sudo certbot renew

# Générer de nouvelles clés VAPID
npx web-push generate-vapid-keys
```

---

## 🔄 Mise à jour

```bash
cd /var/www/budgetflow

# Récupérer les dernières modifications
git pull origin main

# Réinstaller les dépendances si besoin
npm install
cd api && npm install && cd ..

# Rebuild du frontend
npm run build

# Redémarrer l'API
sudo systemctl restart budgetflow-api
```

Si de nouvelles tables ont été ajoutées, relancer le schéma (les `CREATE IF NOT EXISTS` sont safe) :

```bash
sudo -u postgres psql -d budgetflow < schema.sql
```

---

## 🔐 Sécurité

- Authentification JWT avec bcrypt
- HTTPS obligatoire (Let's Encrypt)
- Headers de sécurité Nginx (HSTS, XSS, CSRF)
- Rate limiting sur l'API
- Validation et sanitisation des entrées
- PostgreSQL accessible uniquement en local
- UFW firewall (ports 22, 80, 443 uniquement)

---

## 📱 PWA

BudgetFlow est installable comme une application native :

- **Android** : Ouvrir le site dans Chrome → "Ajouter à l'écran d'accueil"
- **iOS** : Ouvrir dans Safari → Partager → "Sur l'écran d'accueil"
- **Desktop** : Chrome → icône d'installation dans la barre d'adresse

---

## 📄 License

MIT License - voir [LICENSE](LICENSE)

---

## 👤 Auteur

**Chocobon27** - [GitHub](https://github.com/Chocobon27)
