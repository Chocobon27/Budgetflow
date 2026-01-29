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
git clone https://github.com/VOTRE_USERNAME/budgetflow.git
cd budgetflow

