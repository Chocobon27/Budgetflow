import { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api';

// ============================================
// DÉFINITION DE TOUS LES BADGES
// ============================================
export const ALL_ACHIEVEMENTS = [
  // 🌱 PREMIERS PAS (6 badges)
  { id: 'first_transaction', name: 'Premier pas', description: 'Ajouter votre première transaction', icon: '🎯', points: 10, category: 'beginner' },
  { id: 'first_income', name: 'Cha-ching !', description: 'Enregistrer votre premier revenu', icon: '💵', points: 10, category: 'beginner' },
  { id: 'first_expense', name: 'Premier achat', description: 'Enregistrer votre première dépense', icon: '🛒', points: 10, category: 'beginner' },
  { id: 'first_savings', name: 'Écureuil', description: 'Ajouter de l\'argent à l\'épargne', icon: '🐿️', points: 15, category: 'beginner' },
  { id: 'first_budget', name: 'Planificateur', description: 'Créer votre premier budget de catégorie', icon: '📋', points: 15, category: 'beginner' },
  { id: 'first_goal', name: 'Visionnaire', description: 'Créer votre premier objectif d\'épargne', icon: '🔭', points: 15, category: 'beginner' },

  // 🔥 RÉGULARITÉ (5 badges)
  { id: 'streak_3', name: 'Bon début', description: 'Streak de 3 jours consécutifs', icon: '🔥', points: 20, category: 'streak' },
  { id: 'streak_7', name: 'Une semaine !', description: 'Streak de 7 jours consécutifs', icon: '🔥', points: 35, category: 'streak' },
  { id: 'streak_14', name: 'Deux semaines !', description: 'Streak de 14 jours consécutifs', icon: '🔥', points: 50, category: 'streak' },
  { id: 'streak_30', name: 'Un mois entier !', description: 'Streak de 30 jours consécutifs', icon: '🔥', points: 100, category: 'streak' },
  { id: 'streak_100', name: 'Inarrêtable', description: 'Streak de 100 jours consécutifs', icon: '💎', points: 250, category: 'streak' },

  // 💰 ÉPARGNE (6 badges)
  { id: 'savings_100', name: 'Tirelire', description: 'Atteindre 100€ d\'épargne', icon: '🐷', points: 20, category: 'savings' },
  { id: 'savings_500', name: 'Épargnant', description: 'Atteindre 500€ d\'épargne', icon: '💰', points: 40, category: 'savings' },
  { id: 'savings_1000', name: 'Millionnaire en herbe', description: 'Atteindre 1 000€ d\'épargne', icon: '🏦', points: 60, category: 'savings' },
  { id: 'savings_5000', name: 'Coffre-fort', description: 'Atteindre 5 000€ d\'épargne', icon: '🔐', points: 100, category: 'savings' },
  { id: 'savings_10000', name: 'Magnat', description: 'Atteindre 10 000€ d\'épargne', icon: '👑', points: 200, category: 'savings' },
  { id: 'goal_reached', name: 'Objectif atteint !', description: 'Compléter un objectif d\'épargne', icon: '🎉', points: 75, category: 'savings' },

  // 📊 BUDGET (4 badges)
  { id: 'budget_respected', name: 'Discipliné', description: 'Respecter tous les budgets du mois', icon: '✅', points: 50, category: 'budget' },
  { id: 'budget_master', name: 'Maître du budget', description: 'Respecter les budgets 3 mois de suite', icon: '🏆', points: 150, category: 'budget' },
  { id: 'under_budget_50', name: 'Économe', description: 'Dépenser moins de 50% d\'un budget catégorie', icon: '💪', points: 30, category: 'budget' },
  { id: 'all_budgets_set', name: 'Organisé', description: 'Définir un budget pour 5+ catégories', icon: '📊', points: 25, category: 'budget' },

  // 📝 TRANSACTIONS (6 badges)
  { id: 'transactions_10', name: 'Comptable débutant', description: 'Enregistrer 10 transactions', icon: '📝', points: 15, category: 'transactions' },
  { id: 'transactions_50', name: 'Comptable confirmé', description: 'Enregistrer 50 transactions', icon: '📒', points: 30, category: 'transactions' },
  { id: 'transactions_100', name: 'Expert comptable', description: 'Enregistrer 100 transactions', icon: '📚', points: 50, category: 'transactions' },
  { id: 'transactions_250', name: 'Maniaque des chiffres', description: 'Enregistrer 250 transactions', icon: '🧮', points: 100, category: 'transactions' },
  { id: 'transactions_500', name: 'Légende comptable', description: 'Enregistrer 500 transactions', icon: '🌟', points: 200, category: 'transactions' },
  { id: 'no_spend_day', name: 'Jour sans dépense', description: 'Passer une journée sans dépenser', icon: '🧘', points: 15, category: 'transactions' },

  // 🏷️ EXPLORATION (3 badges)
  { id: 'all_categories', name: 'Explorateur', description: 'Utiliser 10+ catégories différentes', icon: '🗺️', points: 30, category: 'exploration' },
  { id: 'template_user', name: 'Efficace', description: 'Créer 3+ templates de transactions', icon: '⚡', points: 20, category: 'exploration' },
  { id: 'shared_budget', name: 'Esprit d\'équipe', description: 'Rejoindre ou créer un budget partagé', icon: '👥', points: 25, category: 'exploration' },

  // ⭐ SPÉCIAUX (6 badges)
  { id: 'positive_month', name: 'Mois positif', description: 'Terminer un mois avec un solde positif', icon: '📈', points: 50, category: 'special' },
  { id: 'debt_free', name: 'Libéré !', description: 'Rembourser entièrement une dette', icon: '🎊', points: 100, category: 'special' },
  { id: 'early_bird', name: 'Lève-tôt', description: 'Ajouter une transaction avant 7h', icon: '🌅', points: 15, category: 'special' },
  { id: 'night_owl', name: 'Oiseau de nuit', description: 'Ajouter une transaction après 23h', icon: '🦉', points: 15, category: 'special' },
  { id: 'weekend_warrior', name: 'Guerrier du weekend', description: 'Ajouter des transactions chaque weekend du mois', icon: '⚔️', points: 30, category: 'special' },
  { id: 'long_term_goal', name: 'Marathonien', description: 'Créer un objectif à long terme', icon: '🏃', points: 20, category: 'special' },
];

// Catégories de badges avec métadonnées
export const ACHIEVEMENT_CATEGORIES = {
  beginner: { name: 'Premiers pas', icon: '🌱', color: '#10B981', description: 'Les fondamentaux' },
  streak: { name: 'Régularité', icon: '🔥', color: '#F59E0B', description: 'La constance paie' },
  savings: { name: 'Épargne', icon: '💰', color: '#8B5CF6', description: 'Construire sa fortune' },
  budget: { name: 'Budget', icon: '📊', color: '#3B82F6', description: 'Maîtriser ses dépenses' },
  transactions: { name: 'Transactions', icon: '📝', color: '#EC4899', description: 'L\'habitude du suivi' },
  exploration: { name: 'Exploration', icon: '🏷️', color: '#14B8A6', description: 'Découvrir les fonctionnalités' },
  special: { name: 'Spéciaux', icon: '⭐', color: '#F97316', description: 'Accomplissements uniques' },
};

// Calcul du niveau à partir des points
export const getLevel = (points) => Math.floor(points / 100) + 1;
export const getXpInLevel = (points) => points % 100;
export const getXpForNextLevel = () => 100;

// Titres de niveaux
export const getLevelTitle = (level) => {
  if (level >= 25) return '💎 Diamant';
  if (level >= 20) return '👑 Platine';
  if (level >= 15) return '🥇 Or';
  if (level >= 10) return '🥈 Argent';
  if (level >= 5) return '🥉 Bronze';
  return '🌱 Débutant';
};

// ============================================
// HOOK useAchievements
// ============================================
const useAchievements = () => {
  const {
    achievements,
    setAchievements,
    setNewAchievement,
    transactions,
    savings,
    savingsGoals,
    categoryBudgets,
    debts,
    quickTemplates,
    sharedBudgets,
    longTermGoals,
    showAlert,
  } = useApp();

  const checkingRef = useRef(false);

  // Vérifier si un badge est déjà débloqué
  const isUnlocked = useCallback((achievementId) => {
    return achievements.unlocked?.some(a => a.id === achievementId) || false;
  }, [achievements.unlocked]);

  // Débloquer un badge
  const unlockAchievement = useCallback(async (achievementId) => {
    if (isUnlocked(achievementId)) return false;
    
    const achievement = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return false;

    const now = new Date().toISOString();
    const newUnlocked = [
      ...(achievements.unlocked || []),
      { id: achievementId, unlockedAt: now }
    ];
    const newPoints = (achievements.points || 0) + achievement.points;

    const updatedAchievements = {
      ...achievements,
      unlocked: newUnlocked,
      points: newPoints,
      lastActivity: now,
    };

    setAchievements(updatedAchievements);
    setNewAchievement(achievement);

    // Sauvegarder en DB
    try {
      await api.updateAchievements(updatedAchievements);
    } catch (e) {
      console.error('Erreur sauvegarde achievement:', e);
    }

    return true;
  }, [achievements, isUnlocked, setAchievements, setNewAchievement]);

  // Mettre à jour le streak
  const updateStreak = useCallback(async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastActivity = achievements.lastActivity;

    if (!lastActivity) {
      // Première activité
      const updated = { ...achievements, streak: 1, lastActivity: now.toISOString() };
      setAchievements(updated);
      try { await api.updateAchievements(updated); } catch (e) { /* silent */ }
      return 1;
    }

    const lastDate = new Date(lastActivity).toISOString().split('T')[0];
    
    if (lastDate === today) {
      // Déjà actif aujourd'hui
      return achievements.streak;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak;
    if (lastDate === yesterdayStr) {
      // Jour consécutif
      newStreak = (achievements.streak || 0) + 1;
    } else {
      // Streak cassé
      newStreak = 1;
    }

    const updated = { ...achievements, streak: newStreak, lastActivity: now.toISOString() };
    setAchievements(updated);
    try { await api.updateAchievements(updated); } catch (e) { /* silent */ }
    return newStreak;
  }, [achievements, setAchievements]);

  // ============================================
  // VÉRIFICATION COMPLÈTE DES ACHIEVEMENTS
  // ============================================
  const checkAllAchievements = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    
    const newlyUnlocked = [];
    const now = new Date();

    try {
      // --- STREAK ---
      const streak = await updateStreak();
      
      if (streak >= 3 && !isUnlocked('streak_3')) newlyUnlocked.push('streak_3');
      if (streak >= 7 && !isUnlocked('streak_7')) newlyUnlocked.push('streak_7');
      if (streak >= 14 && !isUnlocked('streak_14')) newlyUnlocked.push('streak_14');
      if (streak >= 30 && !isUnlocked('streak_30')) newlyUnlocked.push('streak_30');
      if (streak >= 100 && !isUnlocked('streak_100')) newlyUnlocked.push('streak_100');

      // --- PREMIERS PAS ---
      if (transactions.length >= 1 && !isUnlocked('first_transaction')) {
        newlyUnlocked.push('first_transaction');
      }
      if (transactions.some(t => t.type === 'income') && !isUnlocked('first_income')) {
        newlyUnlocked.push('first_income');
      }
      if (transactions.some(t => t.type === 'expense') && !isUnlocked('first_expense')) {
        newlyUnlocked.push('first_expense');
      }
      if (savings > 0 && !isUnlocked('first_savings')) {
        newlyUnlocked.push('first_savings');
      }
      if (Object.keys(categoryBudgets).length > 0 && !isUnlocked('first_budget')) {
        newlyUnlocked.push('first_budget');
      }
      if (savingsGoals.length > 0 && !isUnlocked('first_goal')) {
        newlyUnlocked.push('first_goal');
      }

      // --- ÉPARGNE ---
      if (savings >= 100 && !isUnlocked('savings_100')) newlyUnlocked.push('savings_100');
      if (savings >= 500 && !isUnlocked('savings_500')) newlyUnlocked.push('savings_500');
      if (savings >= 1000 && !isUnlocked('savings_1000')) newlyUnlocked.push('savings_1000');
      if (savings >= 5000 && !isUnlocked('savings_5000')) newlyUnlocked.push('savings_5000');
      if (savings >= 10000 && !isUnlocked('savings_10000')) newlyUnlocked.push('savings_10000');
      
      if (savingsGoals.some(g => g.current >= g.target) && !isUnlocked('goal_reached')) {
        newlyUnlocked.push('goal_reached');
      }

      // --- TRANSACTIONS ---
      const totalTransactions = transactions.length;
      if (totalTransactions >= 10 && !isUnlocked('transactions_10')) newlyUnlocked.push('transactions_10');
      if (totalTransactions >= 50 && !isUnlocked('transactions_50')) newlyUnlocked.push('transactions_50');
      if (totalTransactions >= 100 && !isUnlocked('transactions_100')) newlyUnlocked.push('transactions_100');
      if (totalTransactions >= 250 && !isUnlocked('transactions_250')) newlyUnlocked.push('transactions_250');
      if (totalTransactions >= 500 && !isUnlocked('transactions_500')) newlyUnlocked.push('transactions_500');

      // Jour sans dépense (hier)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const expensesYesterday = transactions.filter(t => t.type === 'expense' && t.date === yesterdayStr);
      if (expensesYesterday.length === 0 && totalTransactions > 0 && !isUnlocked('no_spend_day')) {
        newlyUnlocked.push('no_spend_day');
      }

      // --- BUDGET ---
      const budgetCount = Object.keys(categoryBudgets).filter(k => categoryBudgets[k] > 0).length;
      if (budgetCount >= 5 && !isUnlocked('all_budgets_set')) {
        newlyUnlocked.push('all_budgets_set');
      }

      // Vérifier si budgets sont respectés ce mois
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
      });

      if (budgetCount > 0) {
        const categorySpending = {};
        monthTransactions.forEach(t => {
          categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

        let allRespected = true;
        let anyUnder50 = false;
        for (const [catId, budget] of Object.entries(categoryBudgets)) {
          if (budget <= 0) continue;
          const spent = categorySpending[catId] || 0;
          if (spent > budget) allRespected = false;
          if (spent <= budget * 0.5 && spent > 0) anyUnder50 = true;
        }

        if (allRespected && !isUnlocked('budget_respected')) {
          newlyUnlocked.push('budget_respected');
        }
        if (anyUnder50 && !isUnlocked('under_budget_50')) {
          newlyUnlocked.push('under_budget_50');
        }
      }

      // --- EXPLORATION ---
      const uniqueCategories = new Set(transactions.map(t => t.category).filter(Boolean));
      if (uniqueCategories.size >= 10 && !isUnlocked('all_categories')) {
        newlyUnlocked.push('all_categories');
      }
      if (quickTemplates.length >= 3 && !isUnlocked('template_user')) {
        newlyUnlocked.push('template_user');
      }
      if (sharedBudgets.length > 0 && !isUnlocked('shared_budget')) {
        newlyUnlocked.push('shared_budget');
      }

      // --- SPÉCIAUX ---
      // Mois positif (vérifier le mois précédent)
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
      });
      if (prevMonthTransactions.length > 0) {
        const income = prevMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = prevMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        if (income > expense && !isUnlocked('positive_month')) {
          newlyUnlocked.push('positive_month');
        }
      }

      // Dette remboursée
      if (debts.some(d => d.schedule?.every(s => s.paid)) && !isUnlocked('debt_free')) {
        newlyUnlocked.push('debt_free');
      }

      // Lève-tôt / Nuit
      const hour = now.getHours();
      if (hour < 7 && !isUnlocked('early_bird')) newlyUnlocked.push('early_bird');
      if (hour >= 23 && !isUnlocked('night_owl')) newlyUnlocked.push('night_owl');

      // Objectif long terme
      if (longTermGoals.length > 0 && !isUnlocked('long_term_goal')) {
        newlyUnlocked.push('long_term_goal');
      }

      // Weekend warrior - transactions chaque weekend du mois en cours
      const weekends = [];
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      for (let d = new Date(firstDay); d <= lastDay && d <= now; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day === 0 || day === 6) {
          const weekNum = Math.floor((d.getDate() - 1) / 7);
          if (!weekends.includes(weekNum)) weekends.push(weekNum);
        }
      }
      if (weekends.length >= 2 && !isUnlocked('weekend_warrior')) {
        const weekendDates = new Set();
        transactions.forEach(t => {
          const d = new Date(t.date);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const day = d.getDay();
            if (day === 0 || day === 6) {
              weekendDates.add(Math.floor((d.getDate() - 1) / 7));
            }
          }
        });
        if (weekendDates.size >= weekends.length) {
          newlyUnlocked.push('weekend_warrior');
        }
      }

      // --- DÉBLOQUER LES NOUVEAUX BADGES ---
      for (const achievementId of newlyUnlocked) {
        await unlockAchievement(achievementId);
      }

    } finally {
      checkingRef.current = false;
    }

    return newlyUnlocked;
  }, [
    achievements, transactions, savings, savingsGoals, categoryBudgets,
    debts, quickTemplates, sharedBudgets, longTermGoals,
    isUnlocked, unlockAchievement, updateStreak
  ]);

  return {
    achievements,
    checkAllAchievements,
    unlockAchievement,
    updateStreak,
    isUnlocked,
    ALL_ACHIEVEMENTS,
    ACHIEVEMENT_CATEGORIES,
    getLevel: () => getLevel(achievements.points || 0),
    getXpInLevel: () => getXpInLevel(achievements.points || 0),
    getLevelTitle: () => getLevelTitle(getLevel(achievements.points || 0)),
  };
};

export default useAchievements;
