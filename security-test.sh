#!/bin/bash

# ============================================
# BudgetFlow - Tests de Sécurité
# ============================================

DOMAIN="fin.yugary-esport.fr"
REPORT="/tmp/security-report-$(date +%Y%m%d-%H%M%S).txt"

echo "╔══════════════════════════════════════════╗" | tee $REPORT
echo "║   BudgetFlow - Rapport de Sécurité       ║" | tee -a $REPORT
echo "║   $(date)              ║" | tee -a $REPORT
echo "╚══════════════════════════════════════════╝" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 1: Rate Limiting Login ===" | tee -a $REPORT
echo "6 tentatives de login rapides..." | tee -a $REPORT
for i in {1..6}; do
  RESULT=$(curl -s -X POST https://$DOMAIN/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}')
  echo "Tentative $i: $RESULT" | tee -a $REPORT
  sleep 0.5
done
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 2: Validation Email (Injection SQL) ===" | tee -a $REPORT
RESULT=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com; DROP TABLE users;--","password":"test"}')
echo "Injection SQL: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 3: Validation Email (XSS) ===" | tee -a $REPORT
RESULT=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<script>alert(1)</script>@test.com","password":"test"}')
echo "XSS Email: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 4: Validation Mot de passe vide ===" | tee -a $REPORT
RESULT=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":""}')
echo "Password vide: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 5: Headers de Sécurité ===" | tee -a $REPORT
curl -sI https://$DOMAIN | grep -E "(X-Frame|X-Content|X-XSS|Strict-Transport|Referrer-Policy|Content-Security)" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 6: Accès sans Token ===" | tee -a $REPORT
RESULT=$(curl -s https://$DOMAIN/api/sync)
echo "Sans token: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 7: Token Invalide ===" | tee -a $REPORT
RESULT=$(curl -s https://$DOMAIN/api/sync \
  -H "Authorization: Bearer fake_token_12345")
echo "Token invalide: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 8: Payload trop grand (50KB) ===" | tee -a $REPORT
BIGDATA=$(head -c 50000 /dev/zero | tr '\0' 'a')
RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"$BIGDATA\"}" 2>&1 | tail -c 200)
echo "Payload 50KB: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 9: Port PostgreSQL (5432) ===" | tee -a $REPORT
timeout 3 nc -zv $DOMAIN 5432 2>&1 | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 10: Port Node.js direct (3001) ===" | tee -a $REPORT
timeout 3 nc -zv $DOMAIN 3001 2>&1 | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 11: Inscription - MDP trop court ===" | tee -a $REPORT
RESULT=$(curl -s -X POST https://$DOMAIN/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"sectest1@test.com","password":"abc","name":"Test","secretQuestion":"Question?","secretAnswer":"Answer"}')
echo "MDP court: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 12: Inscription - MDP sans majuscule ===" | tee -a $REPORT
RESULT=$(curl -s -X POST https://$DOMAIN/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"sectest2@test.com","password":"abcdefgh1","name":"Test","secretQuestion":"Question?","secretAnswer":"Answer"}')
echo "MDP sans maj: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 13: Inscription - MDP sans chiffre ===" | tee -a $REPORT
RESULT=$(curl -s -X POST https://$DOMAIN/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"sectest3@test.com","password":"Abcdefgh","name":"Test","secretQuestion":"Question?","secretAnswer":"Answer"}')
echo "MDP sans chiffre: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 14: CORS origine non autorisée ===" | tee -a $REPORT
curl -sI -X OPTIONS https://$DOMAIN/api/auth/login \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null | grep -i "access-control" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 15: SSL/TLS Version ===" | tee -a $REPORT
echo | openssl s_client -connect $DOMAIN:443 2>/dev/null | grep -E "(Protocol|Cipher)" | head -5 | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 16: Certificat SSL ===" | tee -a $REPORT
echo | openssl s_client -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 17: Fichiers sensibles (.env) ===" | tee -a $REPORT
RESULT=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/.env)
echo ".env HTTP code: $RESULT" | tee -a $REPORT
RESULT=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/.env)
echo "api/.env HTTP code: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 18: Health endpoint ===" | tee -a $REPORT
RESULT=$(curl -s https://$DOMAIN/api/health)
echo "Health: $RESULT" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 19: Server info leak ===" | tee -a $REPORT
curl -sI https://$DOMAIN | grep -iE "(server:|x-powered-by)" | tee -a $REPORT
echo "(vide = bien caché)" | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "=== TEST 20: Firewall Status ===" | tee -a $REPORT
sudo ufw status 2>/dev/null | tee -a $REPORT
echo "" | tee -a $REPORT

# ============================================
echo "╔══════════════════════════════════════════╗" | tee -a $REPORT
echo "║         FIN DU RAPPORT                   ║" | tee -a $REPORT
echo "╚══════════════════════════════════════════╝" | tee -a $REPORT

echo ""
echo "📄 Rapport sauvegardé dans: $REPORT"
echo ""
echo "Pour afficher le rapport complet:"
echo "cat $REPORT"
echo ""
echo "Pour copier le contenu:"
echo "cat $REPORT | xclip -selection clipboard"
