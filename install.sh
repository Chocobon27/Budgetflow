#!/bin/bash

# ============================================
# BudgetFlow - Script d'installation automatique
# Version 2.0
# ============================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║        💰 BudgetFlow - Installation          ║"
echo "║       Budget & Finance Management            ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Ce script doit être exécuté en tant que root (sudo)${NC}"
  exit 1
fi

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ] || [ ! -f "api/server.js" ]; then
  echo -e "${RED}❌ Exécutez ce script depuis le répertoire racine de BudgetFlow${NC}"
  echo -e "${YELLOW}   Ex: cd /var/www/budgetflow && sudo ./install.sh${NC}"
  exit 1
fi

APP_DIR=$(pwd)

# ============================================
# COLLECTE DES INFORMATIONS
# ============================================
echo -e "${CYAN}📋 Configuration initiale${NC}"
echo ""

read -p "🌐 Nom de domaine (ex: fin.example.com): " DOMAIN
read -p "📧 Email pour Let's Encrypt: " EMAIL
read -p "👤 Nom d'utilisateur PostgreSQL à créer: " DB_USER
read -sp "🔑 Mot de passe PostgreSQL: " DB_PASS
echo ""
read -p "🗄️  Nom de la base de données [budgetflow]: " DB_NAME
DB_NAME=${DB_NAME:-budgetflow}

echo ""
read -p "🔔 Activer les notifications push ? (o/n) [o]: " ENABLE_PUSH
ENABLE_PUSH=${ENABLE_PUSH:-o}

# Générer les secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo ""
echo -e "${GREEN}✅ Configuration enregistrée${NC}"
echo ""

# ============================================
# INSTALLATION DES DÉPENDANCES SYSTÈME
# ============================================
echo -e "${YELLOW}📦 [1/9] Mise à jour du système...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}📦 [2/9] Installation des dépendances système...${NC}"
apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw

echo -e "${YELLOW}📦 [3/9] Installation de Node.js 20.x...${NC}"
if command -v node &> /dev/null && [[ $(node -v | cut -d. -f1 | tr -d v) -ge 20 ]]; then
  echo -e "${GREEN}   Node.js $(node -v) déjà installé${NC}"
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo -e "   Node.js $(node -v) | npm $(npm -v)"

# ============================================
# POSTGRESQL
# ============================================
echo -e "${YELLOW}🗄️  [4/9] Configuration de PostgreSQL...${NC}"

sudo -u postgres psql << EOSQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOSQL

echo -e "${YELLOW}   Création des tables...${NC}"
sudo -u postgres psql -d ${DB_NAME} < ${APP_DIR}/schema.sql

echo -e "${GREEN}   ✅ Base de données prête ($(sudo -u postgres psql -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'") tables)${NC}"

# ============================================
# CONFIGURATION DE L'APPLICATION
# ============================================
echo -e "${YELLOW}🔧 [5/9] Configuration de l'application...${NC}"

# Générer les clés VAPID si notifications activées
VAPID_PUBLIC=""
VAPID_PRIVATE=""
VAPID_EMAIL=""

if [[ "$ENABLE_PUSH" == "o" || "$ENABLE_PUSH" == "O" ]]; then
  echo -e "${YELLOW}   Génération des clés VAPID...${NC}"
  
  # Installer web-push globalement pour générer les clés
  npm install -g web-push --silent 2>/dev/null
  
  VAPID_KEYS=$(web-push generate-vapid-keys --json 2>/dev/null)
  if [ $? -eq 0 ]; then
    VAPID_PUBLIC=$(echo $VAPID_KEYS | grep -oP '"publicKey":"[^"]*"' | cut -d'"' -f4)
    VAPID_PRIVATE=$(echo $VAPID_KEYS | grep -oP '"privateKey":"[^"]*"' | cut -d'"' -f4)
    VAPID_EMAIL="mailto:${EMAIL}"
    echo -e "${GREEN}   ✅ Clés VAPID générées${NC}"
  else
    echo -e "${YELLOW}   ⚠️  Impossible de générer les clés VAPID, notifications désactivées${NC}"
  fi
fi

# Créer le fichier .env pour l'API
cat > ${APP_DIR}/api/.env << ENVFILE
# ============================================
# BudgetFlow API Configuration
# Généré le $(date '+%Y-%m-%d %H:%M:%S')
# ============================================

PORT=3001
NODE_ENV=production

# Base de données PostgreSQL
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}

# JWT Secret
JWT_SECRET=${JWT_SECRET}

# CORS
CORS_ORIGIN=https://${DOMAIN}

# Notifications Push (VAPID)
VAPID_PUBLIC_KEY=${VAPID_PUBLIC}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE}
VAPID_EMAIL=${VAPID_EMAIL}
ENVFILE

echo -e "${GREEN}   ✅ Fichier .env créé${NC}"

# ============================================
# INSTALLATION DES DÉPENDANCES NODE
# ============================================
echo -e "${YELLOW}📦 [6/9] Installation des dépendances Node.js...${NC}"

# Frontend
cd ${APP_DIR}
npm install --silent
echo -e "${GREEN}   ✅ Dépendances frontend installées${NC}"

# Backend
cd ${APP_DIR}/api
npm install --silent
echo -e "${GREEN}   ✅ Dépendances backend installées${NC}"

# Build frontend
cd ${APP_DIR}
echo -e "${YELLOW}   Build du frontend...${NC}"
npm run build
echo -e "${GREEN}   ✅ Frontend compilé${NC}"

# Permissions
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
chmod 600 ${APP_DIR}/api/.env

# ============================================
# NGINX
# ============================================
echo -e "${YELLOW}🌐 [7/9] Configuration de Nginx...${NC}"

cat > /etc/nginx/sites-available/budgetflow << NGINXCONF
# BudgetFlow - Nginx Configuration
# Généré le $(date '+%Y-%m-%d %H:%M:%S')

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    # === SSL (sera configuré par Certbot) ===

    # === Sécurité ===
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # === API Backend ===
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;

        # CORS
        add_header Access-Control-Allow-Origin "https://${DOMAIN}" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }

    # === WebSocket ===
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # === Frontend (PWA) ===
    location / {
        root ${APP_DIR}/dist;
        try_files \$uri \$uri/ /index.html;

        # Cache pour les assets statiques
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # === Sécurité fichiers ===
    location ~ /\. { deny all; }
    location ~ \.(env|git|htaccess)$ { deny all; }
}

server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}
NGINXCONF

ln -sf /etc/nginx/sites-available/budgetflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

echo -e "${GREEN}   ✅ Nginx configuré${NC}"

# ============================================
# SSL
# ============================================
echo -e "${YELLOW}🔐 [8/9] Configuration SSL (Let's Encrypt)...${NC}"
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${EMAIL}
echo -e "${GREEN}   ✅ Certificat SSL installé${NC}"

# ============================================
# SERVICE SYSTEMD
# ============================================
echo -e "${YELLOW}⚙️  [9/9] Configuration du service systemd...${NC}"

cat > /etc/systemd/system/budgetflow-api.service << SYSTEMD
[Unit]
Description=BudgetFlow API Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${APP_DIR}/api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=budgetflow
Environment=NODE_ENV=production

# Limites de sécurité
NoNewPrivileges=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=${APP_DIR}

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable budgetflow-api
systemctl start budgetflow-api

echo -e "${GREEN}   ✅ Service budgetflow-api actif${NC}"

# ============================================
# FIREWALL
# ============================================
echo -e "${YELLOW}🔥 Configuration du firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}   ✅ Firewall configuré${NC}"

# ============================================
# SÉCURISATION POSTGRESQL
# ============================================
echo -e "${YELLOW}🔒 Sécurisation de PostgreSQL...${NC}"
sed -i '/host.*all.*all.*all/d' /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql

# ============================================
# REDÉMARRAGE FINAL
# ============================================
echo -e "${YELLOW}🔄 Redémarrage des services...${NC}"
systemctl restart nginx
systemctl restart budgetflow-api

# Attendre que l'API démarre
sleep 3

# Vérifier le statut
if systemctl is-active --quiet budgetflow-api; then
  API_STATUS="${GREEN}✅ En ligne${NC}"
else
  API_STATUS="${RED}❌ Erreur (voir: journalctl -u budgetflow-api -n 50)${NC}"
fi

# ============================================
# RÉSUMÉ
# ============================================
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════╗"
echo "║      ✅ Installation terminée !              ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "🌐 URL:           ${GREEN}https://${DOMAIN}${NC}"
echo -e "🔌 API:           ${API_STATUS}"
echo -e "🗄️  Base:          ${DB_NAME}"
echo -e "🔔 Notifications: $([ "$VAPID_PUBLIC" ] && echo "${GREEN}✅ Activées${NC}" || echo "${YELLOW}❌ Désactivées${NC}")"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}⚠️  Étapes post-installation :${NC}"
echo ""
echo "  1. Créez un compte via l'interface web"
echo ""
echo "  2. Promouvez-le administrateur :"
echo -e "     ${CYAN}sudo -u postgres psql -d ${DB_NAME} -c \"UPDATE users SET is_admin = true, admin_permissions = '[\\\"all\\\"]' WHERE email = 'votre@email.com';\"${NC}"
echo ""
if [ "$VAPID_PUBLIC" ]; then
echo -e "  3. Clé VAPID publique (à configurer dans le frontend si besoin) :"
echo -e "     ${CYAN}${VAPID_PUBLIC}${NC}"
echo ""
fi
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Commandes utiles :${NC}"
echo "  Logs API      : sudo journalctl -u budgetflow-api -f"
echo "  Restart API   : sudo systemctl restart budgetflow-api"
echo "  Status        : sudo systemctl status budgetflow-api"
echo "  Rebuild front : cd ${APP_DIR} && npm run build"
echo "  DB console    : sudo -u postgres psql -d ${DB_NAME}"
echo ""
