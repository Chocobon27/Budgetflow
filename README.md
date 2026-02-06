# 💰 BudgetFlow

Application web et mobile (PWA) de gestion de budget personnel avec synchronisation multi-appareils en temps réel.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Fonctionnalités

- ✅ Gestion des revenus et dépenses
- ✅ Catégorisation des transactions
- ✅ Budgets mensuels par catégorie
- ✅ Objectifs d'épargne
- ✅ Gestion des dettes avec échéancier
- ✅ Budgets partagés (famille, colocation)
- ✅ Statistiques et graphiques
- ✅ Calendrier des transactions
- ✅ Synchronisation temps réel (WebSocket)
- ✅ Mode sombre
- ✅ PWA (installable sur mobile)
- ✅ Panel d'administration

## 🛠️ Stack Technique

### Frontend
- React 18
- Vite
- Tailwind CSS
- Socket.io Client

### Backend
- Node.js / Express
- PostgreSQL
- Socket.io
- JWT Authentication
- bcrypt

### Infrastructure
- Nginx (reverse proxy)
- Let's Encrypt (SSL)
- systemd (service)
- UFW (firewall)

## 📦 Prérequis

- **OS**: Debian 11/12 ou Ubuntu 22.04+
- **Node.js**: 20.x ou supérieur
- **PostgreSQL**: 14 ou supérieur
- **Nginx**: 1.18 ou supérieur
- **RAM**: 1 Go minimum
- **Stockage**: 10 Go minimum
- **Nom de domaine** avec accès DNS

## 🚀 Installation Automatique

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

Le script vous demandera :
- Nom de domaine (ex: `budget.example.com`)
- Email pour Let's Encrypt
- Nom d'utilisateur PostgreSQL
- Mot de passe PostgreSQL
- Nom de la base de données

### 3. Créer le premier administrateur

Après avoir créé un compte via l'interface, exécutez :
```bash
sudo -u postgres psql -d budgetflow -c "UPDATE users SET is_admin = true, admin_permissions = '[\"all\"]' WHERE email = 'votre@email.com';"
```

## 🔧 Installation Manuelle

### 1. Dépendances système
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Base de données PostgreSQL
```bash
sudo -u postgres psql
```
```sql
CREATE USER budgetflow WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE budgetflow OWNER budgetflow;
GRANT ALL PRIVILEGES ON DATABASE budgetflow TO budgetflow;
\q
```

### 3. Configuration de l'application
```bash
cd /var/www/budgetflow

# Créer le fichier .env pour l'API
cp api/.env.example api/.env
nano api/.env
```

Modifier les valeurs :
```env
PORT=3001
DATABASE_URL=postgresql://budgetflow:votre_mot_de_passe@localhost:5432/budgetflow
JWT_SECRET=votre_secret_jwt_64_caracteres_minimum
NODE_ENV=production
CORS_ORIGIN=https://votre-domaine.com
```

### 4. Installation des dépendances
```bash
# Frontend
cd /var/www/budgetflow
npm install
npm run build

# Backend
cd /var/www/budgetflow/api
npm install
```

### 5. Configuration Nginx

Créer `/etc/nginx/sites-available/budgetflow` (voir `install.sh` pour le contenu complet)
```bash
sudo ln -s /etc/nginx/sites-available/budgetflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL avec Let's Encrypt
```bash
sudo certbot --nginx -d votre-domaine.com
```

### 7. Service systemd

Créer `/etc/systemd/system/budgetflow.service` :
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
sudo systemctl enable budgetflow
sudo systemctl start budgetflow
```

### 8. Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📝 Mise à jour
```bash
cd /var/www/budgetflow
./update.sh
```

Ou manuellement :
```bash
git pull origin main
npm install
cd api && npm install && cd ..
npm run build
sudo systemctl restart budgetflow
```

## 🔒 Sécurité

L'application inclut :

- ✅ Rate limiting (protection brute force)
- ✅ Validation des entrées (express-validator)
- ✅ Protection XSS
- ✅ Helmet (headers sécurisés)
- ✅ CORS restrictif
- ✅ JWT avec expiration
- ✅ Hashing bcrypt (12 rounds)
- ✅ HTTPS obligatoire
- ✅ Firewall UFW

## 📊 Commandes Utiles
```bash
# Logs en temps réel
sudo journalctl -u budgetflow -f

# Status du service
sudo systemctl status budgetflow

# Redémarrer l'API
sudo systemctl restart budgetflow

# Rebuild le frontend
cd /var/www/budgetflow && npm run build

# Accès PostgreSQL
sudo -u postgres psql -d budgetflow

# Backup de la base
pg_dump -U budgetflow -h localhost budgetflow > backup.sql
```

## 📁 Structure du Projet
```
budgetflow/
├── api/
│   ├── server.js          # API Express + WebSocket
│   ├── .env               # Configuration (non versionné)
│   ├── .env.example       # Template de configuration
│   └── package.json
├── src/
│   ├── api/               # Client API
│   ├── components/        # Composants React
│   ├── context/           # Context React (AppContext)
│   ├── pages/             # Pages de l'application
│   ├── constants/         # Constantes (catégories, etc.)
│   ├── utils/             # Fonctions utilitaires
│   └── App.jsx            # Composant principal
├── public/
│   ├── manifest.json      # PWA manifest
│   └── icons/             # Icônes PWA
├── dist/                  # Build production (généré)
├── install.sh             # Script d'installation
├── update.sh              # Script de mise à jour
├── package.json
├── vite.config.js
└── README.md
```

## 🐛 Dépannage

### L'API ne démarre pas
```bash
# Vérifier les logs
sudo journalctl -u budgetflow -n 50

# Vérifier la connexion à PostgreSQL
sudo -u postgres psql -d budgetflow -c "SELECT 1"

# Vérifier le fichier .env
cat /var/www/budgetflow/api/.env
```

### Erreur 502 Bad Gateway
```bash
# L'API est-elle lancée ?
sudo systemctl status budgetflow

# Port 3001 écoute ?
sudo ss -tlnp | grep 3001
```

### WebSocket ne se connecte pas

Vérifier la configuration Nginx pour `/socket.io/`

### Certificat SSL expiré
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 📄 License

MIT License - Voir [LICENSE](LICENSE)

## 👤 Auteur

Chocobon27

---

⭐ Si ce projet vous est utile, n'hésitez pas à lui donner une étoile sur GitHub !
