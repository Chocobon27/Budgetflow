#!/bin/bash

# ============================================
# BudgetFlow - Script d'installation
# ============================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║       BudgetFlow - Installation          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Ce script doit être exécuté en tant que root (sudo)${NC}"
  exit 1
fi

# Variables
read -p "Entrez le nom de domaine (ex: fin.example.com): " DOMAIN
read -p "Entrez l'email pour Let's Encrypt: " EMAIL
read -p "Entrez le nom d'utilisateur PostgreSQL à créer: " DB_USER
read -sp "Entrez le mot de passe PostgreSQL: " DB_PASS
echo ""
read -p "Entrez le nom de la base de données: " DB_NAME

# Générer JWT secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo -e "\n${YELLOW}📦 Mise à jour du système...${NC}"
apt update && apt upgrade -y

echo -e "\n${YELLOW}📦 Installation des dépendances système...${NC}"
apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw

echo -e "\n${YELLOW}📦 Installation de Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "\n${YELLOW}🔧 Configuration de PostgreSQL...${NC}"
sudo -u postgres psql << EOSQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOSQL

echo -e "\n${YELLOW}🔧 Création des tables...${NC}"
sudo -u postgres psql -d ${DB_NAME} << 'EOSQL'
-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  secret_question VARCHAR(255),
  secret_answer VARCHAR(255),
  is_admin BOOLEAN DEFAULT false,
  admin_permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Savings
CREATE TABLE IF NOT EXISTS savings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) DEFAULT 0
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  brand VARCHAR(50),
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT false,
  recurring_frequency VARCHAR(20) DEFAULT 'monthly',
  is_fixed_expense BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS savings_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10) DEFAULT '🎯',
  target NUMERIC(12,2) NOT NULL,
  current NUMERIC(12,2) DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category Budgets
CREATE TABLE IF NOT EXISTS category_budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category_id VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  UNIQUE(user_id, category_id)
);

-- Custom Categories
CREATE TABLE IF NOT EXISTS custom_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280',
  type VARCHAR(20) NOT NULL
);

-- Custom Brands
CREATE TABLE IF NOT EXISTS custom_brands (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  logo VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280'
);

-- Debts
CREATE TABLE IF NOT EXISTS debts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10) DEFAULT '💳',
  creditor VARCHAR(255) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  start_date DATE NOT NULL,
  duration INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Debt Schedule
CREATE TABLE IF NOT EXISTS debt_schedule (
  id SERIAL PRIMARY KEY,
  debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_date DATE
);

-- Templates
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  brand VARCHAR(50),
  recurring BOOLEAN DEFAULT false,
  is_fixed_expense BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  unlocked JSONB DEFAULT '[]',
  points INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_activity DATE
);

-- Planned Budget
CREATE TABLE IF NOT EXISTS planned_budget (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  expected_income NUMERIC(12,2) DEFAULT 0,
  expected_expenses NUMERIC(12,2) DEFAULT 0,
  planned_savings NUMERIC(12,2) DEFAULT 0,
  categories JSONB DEFAULT '{}',
  notes TEXT,
  month INTEGER,
  year INTEGER
);

-- Shared Budgets
CREATE TABLE IF NOT EXISTS shared_budgets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared Budget Members
CREATE TABLE IF NOT EXISTS shared_budget_members (
  id SERIAL PRIMARY KEY,
  shared_budget_id INTEGER REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shared_budget_id, user_id)
);

-- Shared Transactions
CREATE TABLE IF NOT EXISTS shared_transactions (
  id SERIAL PRIMARY KEY,
  shared_budget_id INTEGER REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  brand VARCHAR(50),
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared Savings
CREATE TABLE IF NOT EXISTS shared_savings (
  id SERIAL PRIMARY KEY,
  shared_budget_id INTEGER UNIQUE REFERENCES shared_budgets(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) DEFAULT 0
);

-- Global Categories (Admin)
CREATE TABLE IF NOT EXISTS global_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280',
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Global Brands (Admin)
CREATE TABLE IF NOT EXISTS global_brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Logs
CREATE TABLE IF NOT EXISTS api_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  level VARCHAR(20) NOT NULL,
  method VARCHAR(10),
  endpoint VARCHAR(255),
  user_id INTEGER,
  user_email VARCHAR(255),
  status_code INTEGER,
  response_time INTEGER,
  message TEXT,
  details JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON api_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON api_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON api_logs(user_id);
EOSQL

echo -e "\n${YELLOW}🔧 Configuration de l'application...${NC}"
APP_DIR="/var/www/budgetflow"

# Créer le fichier .env pour l'API
cat > ${APP_DIR}/api/.env << ENVFILE
PORT=3001
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
CORS_ORIGIN=https://${DOMAIN}
ENVFILE

# Permissions
chown -R www-data:www-data ${APP_DIR}
chmod 600 ${APP_DIR}/api/.env

echo -e "\n${YELLOW}📦 Installation des dépendances Node.js...${NC}"
cd ${APP_DIR}
npm install

cd ${APP_DIR}/api
npm install

echo -e "\n${YELLOW}🔧 Build du frontend...${NC}"
cd ${APP_DIR}
npm run build

echo -e "\n${YELLOW}🔧 Configuration de Nginx...${NC}"
cat > /etc/nginx/sites-available/budgetflow << NGINXCONF
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    root /var/www/budgetflow/dist;
    index index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    client_max_body_size 1M;
    server_tokens off;

    location ~ ^/socket\.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

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

echo -e "\n${YELLOW}🔐 Configuration SSL avec Let's Encrypt...${NC}"
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${EMAIL}

echo -e "\n${YELLOW}🔧 Configuration du service systemd...${NC}"
cat > /etc/systemd/system/budgetflow.service << SYSTEMD
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
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=budgetflow
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable budgetflow
systemctl start budgetflow

echo -e "\n${YELLOW}🔥 Configuration du firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "\n${YELLOW}🔧 Sécurisation de PostgreSQL...${NC}"
# Supprimer l'accès externe à PostgreSQL
sed -i '/host.*all.*all.*all/d' /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql

echo -e "\n${YELLOW}🔄 Redémarrage des services...${NC}"
systemctl restart nginx
systemctl restart budgetflow

echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║     ✅ Installation terminée !           ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "🌐 URL: ${GREEN}https://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}⚠️  Pour créer le premier admin:${NC}"
echo "sudo -u postgres psql -d ${DB_NAME} -c \"UPDATE users SET is_admin = true, admin_permissions = '[\\\"all\\\"]' WHERE email = 'votre@email.com';\""
echo ""
echo -e "${YELLOW}📋 Commandes utiles:${NC}"
echo "  - Logs API: sudo journalctl -u budgetflow -f"
echo "  - Restart API: sudo systemctl restart budgetflow"
echo "  - Status: sudo systemctl status budgetflow"
echo ""
