#!/bin/bash
set -e

cd /var/www/budgetflow

echo "📥 Pull des modifications..."
git pull origin main

echo "📦 Installation des dépendances..."
npm install

echo "🔨 Build de production..."
npm run build

echo "✅ Déploiement terminé !"
echo "🌐 https://fin.yugary-esport.fr"
