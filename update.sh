#!/bin/bash

# ============================================
# BudgetFlow - Script de mise à jour
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/budgetflow"

echo -e "${YELLOW}📥 Récupération des mises à jour...${NC}"
cd ${APP_DIR}
git pull origin main

echo -e "${YELLOW}📦 Installation des dépendances frontend...${NC}"
npm install

echo -e "${YELLOW}📦 Installation des dépendances API...${NC}"
cd ${APP_DIR}/api
npm install

echo -e "${YELLOW}🔧 Build du frontend...${NC}"
cd ${APP_DIR}
rm -rf dist
npm run build

echo -e "${YELLOW}🔄 Redémarrage du serveur...${NC}"
sudo systemctl restart budgetflow

echo -e "${GREEN}✅ Mise à jour terminée !${NC}"
