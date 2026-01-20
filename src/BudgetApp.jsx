import React, { useState, useEffect, useMemo, useCallback } from 'react';
const ADMIN_EMAIL = 'buteau.samuel@hotmail.fr'; // REMPLACE PAR TON EMAIL


// ============================================
// SYSTÈME DE SÉCURITÉ
// ============================================

const SecurityManager = (() => {
  // Clé de chiffrement fixe (permet la synchronisation entre appareils)
  const getDeviceKey = () => {
    // Utiliser uniquement le timezone pour avoir une certaine variabilité
    // mais garder la compatibilité entre desktop et mobile
    return 'BF_FIXED_KEY_2024';
  };

  // Chiffrement XOR simple mais efficace
  const encrypt = (data, key) => {
    const str = JSON.stringify(data);
    const keyStr = key + getDeviceKey();
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(encodeURIComponent(result));
  };

  const decrypt = (encryptedData, key) => {
    try {
      const str = decodeURIComponent(atob(encryptedData));
      const keyStr = key + getDeviceKey();
      let result = '';
      for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length);
        result += String.fromCharCode(charCode);
      }
      return JSON.parse(result);
    } catch (e) {
      return null;
    }
  };

  // Clé maître de l'application
  const APP_KEY = 'BudgetFlow_2024_Secure';
  const STORAGE_PREFIX = '_bf_';

  return {
    // Sauvegarder des données chiffrées
    saveSecure: (key, data) => {
      try {
        const encrypted = encrypt(data, APP_KEY);
        localStorage.setItem(STORAGE_PREFIX + key, encrypted);
        return true;
      } catch (e) {
        return false;
      }
    },

    // Lire des données chiffrées
    loadSecure: (key) => {
      try {
        const encrypted = localStorage.getItem(STORAGE_PREFIX + key);
        if (!encrypted) return null;
        return decrypt(encrypted, APP_KEY);
      } catch (e) {
        return null;
      }
    },

    // Supprimer des données
    removeSecure: (key) => {
      localStorage.removeItem(STORAGE_PREFIX + key);
    },

    // Hash sécurisé pour mots de passe
    hashPassword: (password, salt = '') => {
      const str = password + salt + 'BF_SALT_2024';
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
      h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
      h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    },

    // Hash pour réponse secrète (insensible à la casse)
    hashSecretAnswer: (answer) => {
      const normalized = answer.toLowerCase().trim().replace(/\s+/g, '');
      return SecurityManager.hashPassword(normalized, 'SECRET');
    }
  };
})();

// Protéger contre l'accès console (désactiver en dev si besoin)
(() => {
  const protectedKeys = ['_bf_users', '_bf_session', '_bf_transactions'];
  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalSetItem = localStorage.setItem.bind(localStorage);
  
  // Détecter si la console est ouverte
  let consoleOpen = false;
  const checkConsole = () => {
    const threshold = 160;
    consoleOpen = window.outerWidth - window.innerWidth > threshold || 
                  window.outerHeight - window.innerHeight > threshold;
  };
  
  window.addEventListener('resize', checkConsole);
  checkConsole();

  // Avertissement si accès direct tenté
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'budgetData', {
      get: () => {
        console.warn('⚠️ Accès non autorisé aux données BudgetFlow');
        return null;
      }
    });
  }
})();

// ============================================
// CONSTANTES
// ============================================

const CATEGORIES = [
  { id: 'salary', name: 'Salaire', icon: '💰', color: '#10B981', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#6366F1', type: 'income' },
  { id: 'investment', name: 'Investissement', icon: '📈', color: '#8B5CF6', type: 'income' },
  { id: 'rental', name: 'Loyer reçu', icon: '🏠', color: '#F59E0B', type: 'income' },
  { id: 'other_income', name: 'Autre revenu', icon: '✨', color: '#EC4899', type: 'income' },
  { id: 'rent', name: 'Loyer', icon: '🏡', color: '#EF4444', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#F97316', type: 'expense' },
  { id: 'food', name: 'Alimentation', icon: '🍔', color: '#84CC16', type: 'expense' },
  { id: 'health', name: 'Santé', icon: '🏥', color: '#06B6D4', type: 'expense' },
  { id: 'entertainment', name: 'Loisirs', icon: '🎮', color: '#A855F7', type: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#EC4899', type: 'expense' },
  { id: 'utilities', name: 'Factures', icon: '💡', color: '#FBBF24', type: 'expense' },
  { id: 'insurance', name: 'Assurance', icon: '🛡️', color: '#3B82F6', type: 'expense' },
  { id: 'subscription', name: 'Abonnements', icon: '📺', color: '#8B5CF6', type: 'expense' },
  { id: 'education', name: 'Éducation', icon: '📚', color: '#14B8A6', type: 'expense' },
  { id: 'savings', name: 'Épargne', icon: '🏦', color: '#22C55E', type: 'expense' },
  { id: 'other_expense', name: 'Autre dépense', icon: '📌', color: '#6B7280', type: 'expense' },
];

const POPULAR_BRANDS = [
  { id: 'netflix', name: 'Netflix', logo: '🎬', color: '#E50914' },
  { id: 'spotify', name: 'Spotify', logo: '🎵', color: '#1DB954' },
  { id: 'amazon', name: 'Amazon', logo: '📦', color: '#FF9900' },
  { id: 'apple', name: 'Apple', logo: '🍎', color: '#A2AAAD' },
  { id: 'google', name: 'Google', logo: '🔍', color: '#4285F4' },
  { id: 'uber', name: 'Uber', logo: '🚕', color: '#000000' },
  { id: 'edf', name: 'EDF', logo: '⚡', color: '#FF6600' },
  { id: 'orange', name: 'Orange', logo: '📱', color: '#FF7900' },
  { id: 'sfr', name: 'SFR', logo: '📶', color: '#E4002B' },
  { id: 'free', name: 'Free', logo: '📡', color: '#CD1E25' },
  { id: 'sncf', name: 'SNCF', logo: '🚄', color: '#9B2743' },
  { id: 'carrefour', name: 'Carrefour', logo: '🛒', color: '#004E9F' },
  { id: 'lidl', name: 'Lidl', logo: '🏪', color: '#0050AA' },
  { id: 'total', name: 'Total', logo: '⛽', color: '#FF0000' },
  { id: 'ikea', name: 'IKEA', logo: '🪑', color: '#0051BA' },
  { id: 'decathlon', name: 'Decathlon', logo: '🏃', color: '#0082C3' },
  { id: 'gym', name: 'Salle de sport', logo: '🏋️', color: '#FF4500' },
  { id: 'disney', name: 'Disney+', logo: '🏰', color: '#113CCF' },
  { id: 'prime', name: 'Prime Video', logo: '🎥', color: '#00A8E1' },
  { id: 'playstation', name: 'PlayStation', logo: '🎮', color: '#003791' },
];

const SECRET_QUESTIONS = [
  { id: 'pet', question: 'Quel est le nom de votre premier animal de compagnie ?' },
  { id: 'city', question: 'Dans quelle ville êtes-vous né(e) ?' },
  { id: 'mother', question: 'Quel est le nom de jeune fille de votre mère ?' },
  { id: 'school', question: 'Quel est le nom de votre école primaire ?' },
  { id: 'friend', question: 'Quel est le prénom de votre meilleur(e) ami(e) d\'enfance ?' },
  { id: 'car', question: 'Quelle était la marque de votre première voiture ?' },
  { id: 'book', question: 'Quel est votre livre préféré ?' },
  { id: 'food', question: 'Quel est votre plat préféré ?' },
];

const EMOJI_PICKER = [
  '💰', '💵', '💴', '💶', '💷', '💸', '💳', '🏦', '🏧', '💹',
  '📈', '📉', '📊', '🛒', '🛍️', '🏪', '🏬', '🏢', '🏠', '🏡',
  '🚗', '🚕', '🚌', '🚎', '🚐', '🚑', '🚒', '✈️', '🚀', '🚄',
  '🍔', '🍕', '🍜', '🍱', '🍣', '🥗', '🥪', '☕', '🍺', '🍷',
  '🎮', '🎬', '🎵', '🎤', '🎧', '📺', '📱', '💻', '🖥️', '⌨️',
  '🏥', '💊', '💉', '🩺', '🏋️', '⚽', '🏀', '🎾', '🏊', '🚴',
  '📚', '📖', '✏️', '🎓', '🔬', '🔭', '🎨', '🎭', '🎪', '🎢',
  '👔', '👗', '👠', '👟', '👜', '💄', '💍', '👓', '🧥', '👕',
  '⚡', '💡', '🔌', '📡', '📶', '🛡️', '🔒', '🔑', '🗝️', '🔐',
  '⭐', '🌟', '✨', '💫', '🔥', '❤️', '💙', '💚', '💜', '🖤',
];

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// Définition des permissions admin
const ADMIN_PERMISSIONS = [
  { id: 'manage_users', name: 'Gérer les utilisateurs', description: 'Modifier et supprimer des comptes utilisateurs', icon: '👥' },
  { id: 'manage_admins', name: 'Gérer les admins', description: 'Ajouter ou retirer des administrateurs', icon: '👑' },
  { id: 'manage_backups', name: 'Gérer les sauvegardes', description: 'Créer, restaurer et supprimer des sauvegardes', icon: '💾' },
  { id: 'manage_categories', name: 'Gérer les catégories', description: 'Ajouter, modifier et supprimer des catégories', icon: '🏷️' },
  { id: 'manage_brands', name: 'Gérer les marques', description: 'Ajouter, modifier et supprimer des marques', icon: '🏪' },
];

// Définition des badges et succès
  const ALL_ACHIEVEMENTS = [
    // Premiers pas
    { id: 'first_transaction', name: 'Premier pas', description: 'Ajouter votre première transaction', icon: '🎯', points: 10, category: 'beginner' },
    { id: 'first_income', name: 'Cha-ching!', description: 'Enregistrer votre premier revenu', icon: '💵', points: 10, category: 'beginner' },
    { id: 'first_expense', name: 'Première dépense', description: 'Enregistrer votre première dépense', icon: '🛒', points: 10, category: 'beginner' },
    { id: 'first_savings', name: 'Écureuil', description: 'Ajouter de l\'argent à votre épargne', icon: '🐿️', points: 15, category: 'beginner' },
    { id: 'first_budget', name: 'Planificateur', description: 'Définir votre premier budget', icon: '📊', points: 15, category: 'beginner' },
    { id: 'first_goal', name: 'Rêveur', description: 'Créer votre premier objectif d\'épargne', icon: '🌟', points: 15, category: 'beginner' },
    
    // Régularité (Streaks)
    { id: 'streak_3', name: 'Régulier', description: '3 jours consécutifs d\'activité', icon: '🔥', points: 20, category: 'streak' },
    { id: 'streak_7', name: 'Semaine parfaite', description: '7 jours consécutifs d\'activité', icon: '⚡', points: 50, category: 'streak' },
    { id: 'streak_14', name: 'Deux semaines!', description: '14 jours consécutifs d\'activité', icon: '💪', points: 100, category: 'streak' },
    { id: 'streak_30', name: 'Mois complet', description: '30 jours consécutifs d\'activité', icon: '🏆', points: 200, category: 'streak' },
    { id: 'streak_100', name: 'Centurion', description: '100 jours consécutifs d\'activité', icon: '👑', points: 500, category: 'streak' },
    
    // Épargne
    { id: 'savings_100', name: 'Petit pécule', description: 'Atteindre 100€ d\'épargne', icon: '💰', points: 25, category: 'savings' },
    { id: 'savings_500', name: 'Belle cagnotte', description: 'Atteindre 500€ d\'épargne', icon: '🏦', points: 50, category: 'savings' },
    { id: 'savings_1000', name: 'Millionnaire en herbe', description: 'Atteindre 1000€ d\'épargne', icon: '💎', points: 100, category: 'savings' },
    { id: 'savings_5000', name: 'Coffre-fort', description: 'Atteindre 5000€ d\'épargne', icon: '🔐', points: 200, category: 'savings' },
    { id: 'savings_10000', name: 'Épargnant d\'élite', description: 'Atteindre 10000€ d\'épargne', icon: '🌟', points: 500, category: 'savings' },
    { id: 'goal_reached', name: 'Objectif atteint!', description: 'Atteindre un objectif d\'épargne', icon: '🎯', points: 100, category: 'savings' },
    
    // Budget
    { id: 'budget_respected', name: 'Discipliné', description: 'Respecter tous vos budgets pendant 1 mois', icon: '✅', points: 75, category: 'budget' },
    { id: 'budget_master', name: 'Maître du budget', description: 'Respecter vos budgets 3 mois de suite', icon: '🎖️', points: 200, category: 'budget' },
    { id: 'under_budget', name: 'Économe', description: 'Dépenser 20% de moins que le budget prévu', icon: '📉', points: 50, category: 'budget' },
    
    // Transactions
    { id: 'transactions_10', name: 'Comptable débutant', description: 'Enregistrer 10 transactions', icon: '📝', points: 20, category: 'transactions' },
    { id: 'transactions_50', name: 'Comptable confirmé', description: 'Enregistrer 50 transactions', icon: '📒', points: 50, category: 'transactions' },
    { id: 'transactions_100', name: 'Comptable expert', description: 'Enregistrer 100 transactions', icon: '📚', points: 100, category: 'transactions' },
    { id: 'transactions_500', name: 'Archiviste', description: 'Enregistrer 500 transactions', icon: '🗄️', points: 250, category: 'transactions' },
    { id: 'no_expense_day', name: 'Jour sans dépense', description: 'Passer une journée sans dépenser', icon: '🧘', points: 15, category: 'transactions' },
    { id: 'no_expense_week', name: 'Semaine frugale', description: 'Passer 7 jours avec moins de 5 dépenses', icon: '🌿', points: 50, category: 'transactions' },
    
    // Catégories
    { id: 'category_king', name: 'Roi de la catégorie', description: 'Utiliser toutes les catégories', icon: '👑', points: 50, category: 'categories' },
    { id: 'no_restaurant_month', name: 'Chef à domicile', description: 'Aucune dépense restaurant pendant 1 mois', icon: '👨‍🍳', points: 75, category: 'categories' },
    { id: 'transport_saver', name: 'Éco-mobile', description: 'Réduire les dépenses transport de 30%', icon: '🚲', points: 50, category: 'categories' },
    
    // Spéciaux
    { id: 'positive_month', name: 'Mois positif', description: 'Terminer un mois avec un solde positif', icon: '📈', points: 50, category: 'special' },
    { id: 'positive_3months', name: 'Trimestre gagnant', description: '3 mois consécutifs avec solde positif', icon: '🚀', points: 150, category: 'special' },
    { id: 'debt_paid', name: 'Libéré!', description: 'Rembourser entièrement une dette', icon: '🎉', points: 200, category: 'special' },
    { id: 'early_bird', name: 'Lève-tôt', description: 'Ajouter une transaction avant 7h', icon: '🌅', points: 15, category: 'special' },
    { id: 'night_owl', name: 'Oiseau de nuit', description: 'Ajouter une transaction après 23h', icon: '🦉', points: 15, category: 'special' },
    { id: 'weekend_warrior', name: 'Guerrier du weekend', description: 'Gérer vos finances un dimanche', icon: '⚔️', points: 20, category: 'special' },
  ];

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

// ============================================
// COMPOSANT MODAL TRANSACTION
// ============================================

const TransactionModal = React.memo(({ 
  showModal, setShowModal, modalType, editingTransaction, onSubmit, onReset, darkMode, allCategories, allBrands
}) => {
  const [localForm, setLocalForm] = useState({
    name: '', amount: '', date: new Date().toISOString().split('T')[0],
    category: '', brand: '', recurring: false, recurringFrequency: 'monthly', isFixedExpense: false, notes: ''
  });
  useEffect(() => {
    if (editingTransaction) {
      setLocalForm({
        name: editingTransaction.name,
        amount: editingTransaction.amount.toString(),
        date: editingTransaction.date,
        category: editingTransaction.category,
        brand: editingTransaction.brand || '',
        recurring: editingTransaction.recurring || false,
        recurringFrequency: editingTransaction.recurringFrequency || 'monthly',
        isFixedExpense: editingTransaction.isFixedExpense || false,
        notes: editingTransaction.notes || ''
      });
    } else {
      setLocalForm({
        name: '', amount: '', date: new Date().toISOString().split('T')[0],
        category: modalType === 'income' ? 'other_income' : 'other_expense', brand: '', recurring: false, recurringFrequency: 'monthly', isFixedExpense: false, notes: ''
      });
    }
  }, [editingTransaction, showModal, modalType]);

  if (!showModal) return null;

  const filteredCategories = allCategories.filter(c => 
    modalType === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(localForm);
  };

  const handleClose = () => {
    setShowModal(false);
    onReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className={`w-full max-w-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {editingTransaction ? 'Modifier' : 'Ajouter'} {modalType === 'income' ? 'un revenu' : 'une dépense'}
            </h3>
            <button onClick={handleClose} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} transition-all`}>✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Description</label>
              <input
                type="text"
                value={localForm.name}
                onChange={(e) => setLocalForm({...localForm, name: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500`}
                placeholder="Ex: Salaire janvier"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Montant (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={localForm.amount}
                onChange={(e) => setLocalForm({...localForm, amount: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500`}
                placeholder="0.00"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Date</label>
              <input
                type="date"
                value={localForm.date}
                onChange={(e) => setLocalForm({...localForm, date: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Catégorie</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                {filteredCategories.map(cat => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setLocalForm({...localForm, category: cat.id})}
                    className={`p-3 rounded-xl text-center transition-all ${
                      localForm.category === cat.id
                        ? 'ring-2 ring-emerald-500 bg-emerald-500/20'
                        : darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-2xl block">{cat.icon}</span>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {modalType === 'expense' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Marque (optionnel)</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  <button
                    type="button"
                    onClick={() => setLocalForm({...localForm, brand: ''})}
                    className={`px-3 py-2 rounded-xl text-sm transition-all ${
                      !localForm.brand ? 'ring-2 ring-emerald-500 bg-emerald-500/20' : darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    Aucune
                  </button>
                 {allBrands.map(brand => (
                    <button
                      type="button"
                      key={brand.id}
                      onClick={() => setLocalForm({...localForm, brand: brand.id})}
                      className={`px-3 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all ${
                        localForm.brand === brand.id ? 'ring-2 ring-emerald-500 bg-emerald-500/20' : darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span>{brand.logo}</span>
                      <span className={darkMode ? 'text-slate-300' : 'text-gray-700'}>{brand.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localForm.recurring}
                  onChange={(e) => setLocalForm({...localForm, recurring: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                />
          <span className={darkMode ? 'text-slate-300' : 'text-gray-700'}>Transaction récurrente</span>
            </label>
            {localForm.recurring && (
              <div className="ml-8 mt-2">
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Fréquence</label>
                <div className="flex gap-2">
                  {[
                    { value: 'monthly', label: '📅 Mensuelle' },
                    { value: 'quarterly', label: '📆 Trimestrielle' },
                    { value: 'yearly', label: '🗓️ Annuelle' },
                  ].map(freq => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setLocalForm({...localForm, recurringFrequency: freq.value})}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        localForm.recurringFrequency === freq.value
                          ? 'bg-emerald-500 text-white'
                          : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {modalType === 'expense' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localForm.isFixedExpense || false}
                    onChange={(e) => setLocalForm({...localForm, isFixedExpense: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className={darkMode ? 'text-slate-300' : 'text-gray-700'}>
                    📌 Dépense fixe <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>(compte dans l'objectif 1 an)</span>
                  </span>
                </label>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Notes (optionnel)</label>
              <textarea
                value={localForm.notes}
                onChange={(e) => setLocalForm({...localForm, notes: e.target.value})}
                rows={2}
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 resize-none`}
                placeholder="Ajouter une note..."
                autoComplete="off"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose} className={`flex-1 py-3 rounded-xl ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} font-medium transition-all`}>
                Annuler
              </button>
              <button
                type="submit"
                className={`flex-1 py-3 rounded-xl font-semibold text-white shadow-lg transition-all ${
                  modalType === 'income'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50'
                    : 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-500/30 hover:shadow-rose-500/50'
                }`}
              >
                {editingTransaction ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function BudgetApp() {
  // États auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login, register, forgot, reset
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUser, setForgotUser] = useState(null);

  // États app
  const [transactions, setTransactions] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem('budgetflow_currentView');
    return saved || 'dashboard';
  });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('income');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [periodFilter, setPeriodFilter] = useState(() => {
    const saved = localStorage.getItem('budgetflow_periodFilter');
    return saved ? parseInt(saved) : 1;
  });
  const [goalPeriod, setGoalPeriod] = useState(() => {
    const saved = localStorage.getItem('budgetflow_goalPeriod');
    return saved ? parseInt(saved) : 12;
  }); // 3, 6 ou 12 mois
// Sauvegarder les préférences
  useEffect(() => {
    localStorage.setItem('budgetflow_currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('budgetflow_periodFilter', periodFilter.toString());
  }, [periodFilter]);

  useEffect(() => {
    localStorage.setItem('budgetflow_goalPeriod', goalPeriod.toString());
  }, [goalPeriod]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Détecter le redimensionnement
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);  
  const [darkMode, setDarkMode] = useState(true);

  // Emoji picker
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [savings, setSavings] = useState(0);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [savingsAction, setSavingsAction] = useState('add');
  const [sharedBudgets, setSharedBudgets] = useState(() => {
  const saved = SecurityManager.loadSecure('sharedBudgets');
    return saved || [];
  });
  const [currentSharedBudget, setCurrentSharedBudget] = useState(null);
  const [showSharedBudgetModal, setShowSharedBudgetModal] = useState(false);
  const [showCreateSharedBudget, setShowCreateSharedBudget] = useState(false);
  const [showJoinSharedBudget, setShowJoinSharedBudget] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickTemplates, setQuickTemplates] = useState(() => {
    const saved = localStorage.getItem('budgetflow_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [autoTheme, setAutoTheme] = useState(() => {
    return localStorage.getItem('budgetflow_autoTheme') === 'true';
  });
  const [analysisTab, setAnalysisTab] = useState('overview');
  const [categoryBudgets, setCategoryBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem('budgetflow_categoryBudgets');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      // Nettoyer les valeurs pour s'assurer que ce sont des nombres
      const cleaned = {};
      Object.entries(parsed).forEach(([key, value]) => {
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
          cleaned[key] = num;
        }
      });
      return cleaned;
    } catch {
      return {};
    }
  });
  const [savingsGoals, setSavingsGoals] = useState(() => {
    const saved = localStorage.getItem('budgetflow_savingsGoals');
    return saved ? JSON.parse(saved) : [];
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [debts, setDebts] = useState(() => {
    const saved = localStorage.getItem('budgetflow_debts');
    return saved ? JSON.parse(saved) : [];
  });
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [plannedBudget, setPlannedBudget] = useState(() => {
    const saved = localStorage.getItem('budgetflow_plannedBudget');
    return saved ? JSON.parse(saved) : {};
  });
  const [showPlannedBudgetModal, setShowPlannedBudgetModal] = useState(false);
  const [achievements, setAchievements] = useState(() => {
    const saved = localStorage.getItem('budgetflow_achievements');
    return saved ? JSON.parse(saved) : { unlocked: [], streak: 0, lastActivity: null, points: 0 };
  });
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);
  const [adminList, setAdminList] = useState(() => {
    const saved = localStorage.getItem('budgetflow_adminList');
    return saved ? JSON.parse(saved) : [{ email: ADMIN_EMAIL, permissions: ['all'], addedAt: new Date().toISOString() }];
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [inputDialog, setInputDialog] = useState({ show: false, title: '', fields: [], onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ show: false, title: '', message: '', type: 'success' });
  const [showNotificationsSettings, setShowNotificationsSettings] = useState(false);
  const [backupSettings, setBackupSettings] = useState(() => {
    const saved = localStorage.getItem('budgetflow_backupSettings');
    return saved ? JSON.parse(saved) : {
      autoBackupHour: 12,
      autoBackupEnabled: true
    };
  });
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const saved = localStorage.getItem('budgetflow_notifications');
    return saved ? JSON.parse(saved) : {
      lowBalanceAlert: true,
      lowBalanceThreshold: 100,
      weeklyReminder: true,
      monthlyReport: true,
      upcomingPayments: true
    };
  });
  const [customBrands, setCustomBrands] = useState([]);

  // Sauvegarder l'épargne
  useEffect(() => {
    if (currentUser && savings !== undefined) {
      SecurityManager.saveSecure(`savings_${currentUser.id}`, savings);
    }
  }, [savings, currentUser]);

  // Sauvegarder les paramètres de notifications
  useEffect(() => {
    localStorage.setItem('budgetflow_notifications', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  // Sauvegarder les paramètres de backup
  useEffect(() => {
    localStorage.setItem('budgetflow_backupSettings', JSON.stringify(backupSettings));
  }, [backupSettings]);

    // Sauvegarder les budgets partagés
  useEffect(() => {
    SecurityManager.saveSecure('sharedBudgets', sharedBudgets);
  }, [sharedBudgets]);

  // Sauvegarder les templates
  useEffect(() => {
    localStorage.setItem('budgetflow_templates', JSON.stringify(quickTemplates));
  }, [quickTemplates]);

    // Sauvegarder les budgets par catégorie
  useEffect(() => {
    localStorage.setItem('budgetflow_categoryBudgets', JSON.stringify(categoryBudgets));
  }, [categoryBudgets]);

  // Sauvegarder les objectifs d'épargne
  useEffect(() => {
    localStorage.setItem('budgetflow_savingsGoals', JSON.stringify(savingsGoals));
  }, [savingsGoals]);

  // Sauvegarder les dettes
  useEffect(() => {
    localStorage.setItem('budgetflow_debts', JSON.stringify(debts));
  }, [debts]);

  // Sauvegarder le budget prévisionnel
  useEffect(() => {
    localStorage.setItem('budgetflow_plannedBudget', JSON.stringify(plannedBudget));
  }, [plannedBudget]);

  // Sauvegarder les achievements
  useEffect(() => {
    localStorage.setItem('budgetflow_achievements', JSON.stringify(achievements));
  }, [achievements]);

  // Sauvegarder la liste des admins
  useEffect(() => {
    localStorage.setItem('budgetflow_adminList', JSON.stringify(adminList));
  }, [adminList]);
  
  // Sauvegarder le mode auto theme
  useEffect(() => {
    localStorage.setItem('budgetflow_autoTheme', autoTheme.toString());
  }, [autoTheme]);

  // Thème automatique selon les préférences système
  useEffect(() => {
    if (!autoTheme) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(mediaQuery.matches);
    
    const handler = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [autoTheme]);

  // Charger le budget partagé actif
  useEffect(() => {
    if (currentUser) {
      const savedCurrentShared = localStorage.getItem(`budgetflow_currentShared_${currentUser.id}`);
      if (savedCurrentShared) {
        const budget = sharedBudgets.find(b => b.id === savedCurrentShared);
        if (budget) setCurrentSharedBudget(budget);
      }
    }
  }, [currentUser, sharedBudgets]);

// Sauvegarde automatique périodique
  useEffect(() => {
    if (!currentUser || !isAuthenticated || !backupSettings.autoBackupEnabled) return;
    
    const performAutoBackup = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Vérifie si c'est l'heure programmée
      if (currentHour !== backupSettings.autoBackupHour) return;
      
      const lastBackup = localStorage.getItem('budgetflow_lastAutoBackup');
      const lastBackupDate = lastBackup ? new Date(parseInt(lastBackup)) : null;
      
      // Vérifie si on a déjà fait une sauvegarde aujourd'hui
      if (lastBackupDate && lastBackupDate.toDateString() === now.toDateString()) return;
      
      const backup = {
        version: '1.0',
        date: now.toISOString(),
        type: 'auto',
        users: SecurityManager.loadSecure('users') || [],
        data: {}
      };
      
      const users = SecurityManager.loadSecure('users') || [];
      users.forEach(user => {
        backup.data[user.id] = {
          transactions: SecurityManager.loadSecure(`transactions_${user.id}`) || [],
          categories: SecurityManager.loadSecure(`categories_${user.id}`) || [],
          brands: SecurityManager.loadSecure(`brands_${user.id}`) || [],
          savings: SecurityManager.loadSecure(`savings_${user.id}`) || 0
        };
      });
      
      const autoBackups = JSON.parse(localStorage.getItem('budgetflow_autoBackups') || '[]');
      autoBackups.unshift(backup);
      if (autoBackups.length > 5) autoBackups.pop();
      localStorage.setItem('budgetflow_autoBackups', JSON.stringify(autoBackups));
      localStorage.setItem('budgetflow_lastAutoBackup', now.getTime().toString());
      localStorage.setItem('budgetflow_lastBackup', now.toISOString());
      
      console.log('✅ Sauvegarde automatique effectuée à ' + now.toLocaleTimeString('fr-FR'));
    };
    
    // Vérification immédiate
    performAutoBackup();
    
    // Vérification toutes les minutes pour ne pas rater l'heure
    const interval = setInterval(performAutoBackup, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [currentUser, isAuthenticated, backupSettings]);

  const allCategories = useMemo(() => [...CATEGORIES, ...customCategories], [customCategories]);
  const allBrands = useMemo(() => [...POPULAR_BRANDS, ...customBrands], [customBrands]);
  const isAdmin = currentUser?.email === ADMIN_EMAIL || adminList.some(a => a.email === currentUser?.email);
  const isSuperAdmin = currentUser?.email === ADMIN_EMAIL;
  const currentAdminPermissions = currentUser?.email === ADMIN_EMAIL 
    ? ['all'] 
    : (adminList.find(a => a.email === currentUser?.email)?.permissions || []);

  const showConfirm = useCallback((title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
  }, []);

  const showInput = useCallback((title, fields, onConfirm) => {
    setInputDialog({ show: true, title, fields, onConfirm });
  }, []);

  const closeInput = useCallback(() => {
    setInputDialog({ show: false, title: '', fields: [], onConfirm: null });
  }, []);

  const showAlert = useCallback((title, message, type = 'success') => {
    setAlertDialog({ show: true, title, message, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertDialog({ show: false, title: '', message: '', type: 'success' });
  }, []);
  
  const hasPermission = (permission) => {
    if (currentUser?.email === ADMIN_EMAIL) return true;
    if (currentAdminPermissions.includes('all')) return true;
    return currentAdminPermissions.includes(permission);
  };

  // Charger session
  useEffect(() => {
    const session = SecurityManager.loadSecure('session');
    if (session && session.userId) {
      const users = SecurityManager.loadSecure('users') || [];
      const user = users.find(u => u.id === session.userId);
      if (user && session.token === SecurityManager.hashPassword(user.id + user.email, 'SESSION')) {
        setCurrentUser({ id: user.id, email: user.email, name: user.name });
        setIsAuthenticated(true);
        loadUserData(user.id);
      } else {
        SecurityManager.removeSecure('session');
      }
    }
  }, []);

  // Sauvegarder données
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      SecurityManager.saveSecure(`transactions_${currentUser.id}`, transactions);
      SecurityManager.saveSecure(`categories_${currentUser.id}`, customCategories);
      SecurityManager.saveSecure(`brands_${currentUser.id}`, customBrands);

    }
  }, [transactions, customCategories, currentUser, isAuthenticated]);

    const loadUserData = (userId) => {
    const savedTransactions = SecurityManager.loadSecure(`transactions_${userId}`);
    const savedCategories = SecurityManager.loadSecure(`categories_${userId}`);
    const savedBrands = SecurityManager.loadSecure(`brands_${userId}`);
    const savedSavings = SecurityManager.loadSecure(`savings_${userId}`);
    if (savedTransactions) setTransactions(savedTransactions);
    if (savedCategories) setCustomCategories(savedCategories);
    if (savedBrands) setCustomBrands(savedBrands);
    if (savedSavings !== null) setSavings(savedSavings);
  };


  // ============================================
  // AUTHENTIFICATION
  // ============================================

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const formData = new FormData(e.target);
    const email = formData.get('email')?.trim().toLowerCase();
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const name = formData.get('name')?.trim();
    const secretQuestion = formData.get('secretQuestion');
    const secretAnswer = formData.get('secretAnswer')?.trim();

    // Validations
    if (!email || !password || !name || !secretQuestion || !secretAnswer) {
      setAuthError('Tous les champs sont requis');
      setAuthLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setAuthError('Les mots de passe ne correspondent pas');
      setAuthLoading(false);
      return;
    }

    if (password.length < 8) {
      setAuthError('Le mot de passe doit contenir au moins 8 caractères');
      setAuthLoading(false);
      return;
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setAuthError('Le mot de passe doit contenir au moins une majuscule et un chiffre');
      setAuthLoading(false);
      return;
    }

    if (secretAnswer.length < 2) {
      setAuthError('La réponse secrète est trop courte');
      setAuthLoading(false);
      return;
    }

    const users = SecurityManager.loadSecure('users') || [];
    if (users.find(u => u.email === email)) {
      setAuthError('Cet email est déjà utilisé');
      setAuthLoading(false);
      return;
    }

    const userId = generateId();
    const salt = generateId();
    
    const newUser = {
      id: userId,
      email,
      name,
      password: SecurityManager.hashPassword(password, salt),
      salt,
      secretQuestion,
      secretAnswer: SecurityManager.hashSecretAnswer(secretAnswer),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(newUser);
    SecurityManager.saveSecure('users', users);

    // Créer session
    const sessionToken = SecurityManager.hashPassword(userId + email, 'SESSION');
    SecurityManager.saveSecure('session', { userId, token: sessionToken });

    setCurrentUser({ id: userId, email, name });
    setIsAuthenticated(true);
    setAuthLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const formData = new FormData(e.target);
    const email = formData.get('email')?.trim().toLowerCase();
    const password = formData.get('password');

    const users = SecurityManager.loadSecure('users') || [];
    const user = users.find(u => u.email === email);

    if (!user) {
      setAuthError('Email ou mot de passe incorrect');
      setAuthLoading(false);
      return;
    }

    const hashedPassword = SecurityManager.hashPassword(password, user.salt);
    if (user.password !== hashedPassword) {
      setAuthError('Email ou mot de passe incorrect');
      setAuthLoading(false);
      return;
    }

    // Mettre à jour lastLogin
    user.lastLogin = new Date().toISOString();
    SecurityManager.saveSecure('users', users);

    // Créer session
    const sessionToken = SecurityManager.hashPassword(user.id + email, 'SESSION');
    SecurityManager.saveSecure('session', { userId: user.id, token: sessionToken });

    setCurrentUser({ id: user.id, email: user.email, name: user.name });
    setIsAuthenticated(true);
    loadUserData(user.id);
    setAuthLoading(false);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const email = forgotEmail.trim().toLowerCase();
    const users = SecurityManager.loadSecure('users') || [];
    const user = users.find(u => u.email === email);

    if (!user) {
      setAuthError('Aucun compte trouvé avec cet email');
      return;
    }

    setForgotUser(user);
    setAuthMode('reset');
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const formData = new FormData(e.target);
    const secretAnswer = formData.get('secretAnswer')?.trim();
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (!secretAnswer || !newPassword || !confirmPassword) {
      setAuthError('Tous les champs sont requis');
      return;
    }

    const hashedAnswer = SecurityManager.hashSecretAnswer(secretAnswer);
    if (hashedAnswer !== forgotUser.secretAnswer) {
      setAuthError('Réponse secrète incorrecte');
      return;
    }

    if (newPassword !== confirmPassword) {
      setAuthError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setAuthError('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre');
      return;
    }

    // Mettre à jour le mot de passe
    const users = SecurityManager.loadSecure('users') || [];
    const userIndex = users.findIndex(u => u.id === forgotUser.id);
    
    if (userIndex !== -1) {
      const newSalt = generateId();
      users[userIndex].password = SecurityManager.hashPassword(newPassword, newSalt);
      users[userIndex].salt = newSalt;
      SecurityManager.saveSecure('users', users);

      setAuthSuccess('Mot de passe modifié avec succès ! Vous pouvez maintenant vous connecter.');
      setAuthMode('login');
      setForgotUser(null);
      setForgotEmail('');
    }
  };

  const handleLogout = () => {
    SecurityManager.removeSecure('session');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTransactions([]);
    setCustomCategories([]);
  };

  // ============================================
  // TRANSACTIONS
  // ============================================

  const handleSubmitTransaction = useCallback((formData) => {
    const transaction = {
      id: editingTransaction ? editingTransaction.id : generateId(),
      ...formData,
      amount: parseFloat(formData.amount),
      type: modalType,
      createdAt: editingTransaction ? editingTransaction.createdAt : new Date().toISOString()
    };

    if (editingTransaction) {
      setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
    } else {
      setTransactions(prev => [...prev, transaction]);
    }

    setShowModal(false);
    setEditingTransaction(null);
  }, [editingTransaction, modalType]);

  const deleteTransaction = useCallback((id) => {
    const transaction = transactions.find(t => t.id === id);
    showConfirm(
      'Supprimer la transaction',
      `Voulez-vous vraiment supprimer "${transaction?.name || 'cette transaction'}" ?`,
      () => setTransactions(prev => prev.filter(t => t.id !== id))
    );
  }, [transactions, showConfirm]);

  const handleEditTransaction = useCallback((transaction) => {
    setEditingTransaction(transaction);
    setModalType(transaction.type);
    setShowModal(true);
  }, []);

  const resetForm = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  const openModal = useCallback((type) => {
    setModalType(type);
    setEditingTransaction(null);
    setShowModal(true);
  }, []);

 

// Calcul des prélèvements à venir (30 prochains jours)
  const getUpcomingPayments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    
    const recurringExpenses = transactions.filter(t => t.type === 'expense' && t.recurring);
    const upcoming = [];
    
    recurringExpenses.forEach(t => {
      const transactionDate = new Date(t.date);
      const dayOfMonth = transactionDate.getDate();
      const frequency = t.recurringFrequency || 'monthly';
      
      // Calculer les prochaines dates selon la fréquence
      if (frequency === 'monthly') {
        for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
          const checkDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, dayOfMonth);
          if (checkDate >= today && checkDate <= in30Days) {
            const daysUntil = Math.ceil((checkDate - today) / (1000 * 60 * 60 * 24));
            upcoming.push({ ...t, nextDate: checkDate, daysUntil });
          }
        }
      } else if (frequency === 'quarterly') {
        const originalMonth = transactionDate.getMonth();
        for (let i = 0; i < 4; i++) {
          const quarterMonth = (originalMonth + i * 3) % 12;
          const yearOffset = Math.floor((originalMonth + i * 3) / 12);
          const checkDate = new Date(today.getFullYear() + yearOffset, quarterMonth, dayOfMonth);
          if (checkDate >= today && checkDate <= in30Days) {
            const daysUntil = Math.ceil((checkDate - today) / (1000 * 60 * 60 * 24));
            upcoming.push({ ...t, nextDate: checkDate, daysUntil });
          }
        }
      } else if (frequency === 'yearly') {
        const checkDateThisYear = new Date(today.getFullYear(), transactionDate.getMonth(), dayOfMonth);
        const checkDateNextYear = new Date(today.getFullYear() + 1, transactionDate.getMonth(), dayOfMonth);
        
        [checkDateThisYear, checkDateNextYear].forEach(checkDate => {
          if (checkDate >= today && checkDate <= in30Days) {
            const daysUntil = Math.ceil((checkDate - today) / (1000 * 60 * 60 * 24));
            upcoming.push({ ...t, nextDate: checkDate, daysUntil });
          }
        });
      }
    });
    
    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [transactions]);

   // Calcul des alertes actives
  const getActiveAlerts = useMemo(() => {
    const alerts = [];
    
    // Calcul du solde actuel
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const currentBalance = totalIncome - totalExpenses;
    
    // Alerte solde bas
    if (notificationSettings.lowBalanceAlert && currentBalance < notificationSettings.lowBalanceThreshold) {
      alerts.push({
        type: 'danger',
        icon: '🚨',
        title: 'Solde bas',
        message: `Votre solde (${formatCurrency(currentBalance)}) est inférieur à ${formatCurrency(notificationSettings.lowBalanceThreshold)}`
      });
    }
    
    // Alerte solde négatif
    if (currentBalance < 0) {
      alerts.push({
        type: 'danger',
        icon: '⛔',
        title: 'Solde négatif',
        message: `Attention ! Vous êtes à découvert de ${formatCurrency(Math.abs(currentBalance))}`
      });
    }
    
    // Alerte épargne faible vs objectif
    const fixedExpenses = transactions.filter(t => t.type === 'expense' && t.isFixedExpense);
    const monthlyFixedTotal = fixedExpenses.reduce((sum, t) => {
      const freq = t.recurringFrequency || 'monthly';
      if (freq === 'yearly') return sum + (t.amount / 12);
      if (freq === 'quarterly') return sum + (t.amount / 3);
      return sum + t.amount;
    }, 0);
    if (monthlyFixedTotal > 0 && savings < monthlyFixedTotal) {
      alerts.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Épargne insuffisante',
        message: `Votre épargne ne couvre pas 1 mois de dépenses fixes (${formatCurrency(monthlyFixedTotal)})`
      });
    }
    
    // Rappel hebdomadaire (si pas de transaction depuis 7 jours)
    if (notificationSettings.weeklyReminder && transactions.length > 0) {
      const lastTransaction = transactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const daysSinceLastTransaction = Math.floor((new Date() - new Date(lastTransaction.date)) / (1000 * 60 * 60 * 24));
      if (daysSinceLastTransaction >= 7) {
        alerts.push({
          type: 'info',
          icon: '📝',
          title: 'Rappel',
          message: `Vous n'avez pas ajouté de transaction depuis ${daysSinceLastTransaction} jours`
        });
      }
    }
    
    // Rapport mensuel (début de mois)
    if (notificationSettings.monthlyReport) {
      const today = new Date();
      if (today.getDate() <= 3) {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getMonth() === lastMonth.getMonth() && tDate.getFullYear() === lastMonth.getFullYear();
        });
        const lastMonthIncome = lastMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const lastMonthExpenses = lastMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const lastMonthBalance = lastMonthIncome - lastMonthExpenses;
        
        if (lastMonthTransactions.length > 0) {
          alerts.push({
            type: lastMonthBalance >= 0 ? 'success' : 'warning',
            icon: '📊',
            title: `Bilan ${MONTHS_FR[lastMonth.getMonth()]}`,
            message: lastMonthBalance >= 0 
              ? `Vous avez économisé ${formatCurrency(lastMonthBalance)} le mois dernier !`
              : `Vous avez dépensé ${formatCurrency(Math.abs(lastMonthBalance))} de plus que vos revenus`
          });
        }
      }
    }

    // Prélèvements à venir
    if (notificationSettings.upcomingPayments && getUpcomingPayments.length > 0) {
      const todayPayments = getUpcomingPayments.filter(p => p.daysUntil === 0);
      if (todayPayments.length > 0) {
        const total = todayPayments.reduce((s, t) => s + t.amount, 0);
        alerts.push({
          type: 'warning',
          icon: '💳',
          title: 'Prélèvements aujourd\'hui',
          message: `${todayPayments.length} prélèvement(s) prévu(s) : ${formatCurrency(total)}`
        });
      }
    }
    
    return alerts;
  }, [transactions, savings, notificationSettings, getUpcomingPayments]);
  
    // Fonctions budget partagé
  const createSharedBudget = (name) => {
    const newBudget = {
      id: generateId(),
      name: name,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      members: [{
        userId: currentUser.id,
        userName: currentUser.name,
        email: currentUser.email,
        role: 'owner',
        joinedAt: new Date().toISOString()
      }],
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      transactions: [],
      categories: [],
      savings: 0
    };
    setSharedBudgets(prev => [...prev, newBudget]);
    setCurrentSharedBudget(newBudget);
    localStorage.setItem(`budgetflow_currentShared_${currentUser.id}`, newBudget.id);
    return newBudget;
  };

  const joinSharedBudget = (inviteCode) => {
    const budget = sharedBudgets.find(b => b.inviteCode === inviteCode);
    if (!budget) return { success: false, message: 'Code invalide' };
    if (budget.members.find(m => m.userId === currentUser.id)) {
      return { success: false, message: 'Vous êtes déjà membre' };
    }
    
    const updatedBudget = {
      ...budget,
      members: [...budget.members, {
        userId: currentUser.id,
        userName: currentUser.name,
        email: currentUser.email,
        role: 'member',
        joinedAt: new Date().toISOString()
      }]
    };
    
    setSharedBudgets(prev => prev.map(b => b.id === budget.id ? updatedBudget : b));
    setCurrentSharedBudget(updatedBudget);
    localStorage.setItem(`budgetflow_currentShared_${currentUser.id}`, updatedBudget.id);
    return { success: true, budget: updatedBudget };
  };

  const leaveSharedBudget = (budgetId) => {
    const budget = sharedBudgets.find(b => b.id === budgetId);
    if (!budget) return;
    
    if (budget.createdBy === currentUser.id) {
      // Si c'est le créateur, supprimer le budget
      setSharedBudgets(prev => prev.filter(b => b.id !== budgetId));
    } else {
      // Sinon, retirer le membre
      const updatedBudget = {
        ...budget,
        members: budget.members.filter(m => m.userId !== currentUser.id)
      };
      setSharedBudgets(prev => prev.map(b => b.id === budgetId ? updatedBudget : b));
    }
    
    if (currentSharedBudget?.id === budgetId) {
      setCurrentSharedBudget(null);
      localStorage.removeItem(`budgetflow_currentShared_${currentUser.id}`);
    }
  };

  const addSharedTransaction = (transaction) => {
    if (!currentSharedBudget) return;
    
    const newTransaction = {
      ...transaction,
      id: generateId(),
      addedBy: currentUser.id,
      addedByName: currentUser.name,
      createdAt: new Date().toISOString()
    };
    
    const updatedBudget = {
      ...currentSharedBudget,
      transactions: [...currentSharedBudget.transactions, newTransaction]
    };
    
    setSharedBudgets(prev => prev.map(b => b.id === currentSharedBudget.id ? updatedBudget : b));
    setCurrentSharedBudget(updatedBudget);
  };

  const deleteSharedTransaction = (transactionId) => {
    if (!currentSharedBudget) return;
    
    const updatedBudget = {
      ...currentSharedBudget,
      transactions: currentSharedBudget.transactions.filter(t => t.id !== transactionId)
    };
    
    setSharedBudgets(prev => prev.map(b => b.id === currentSharedBudget.id ? updatedBudget : b));
    setCurrentSharedBudget(updatedBudget);
  };

      // Calcul des budgets par catégorie
  const getBudgetStatus = useMemo(() => {
    const now = new Date();
    const currentMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear() && t.type === 'expense';
    });
    
    const status = {};
    Object.entries(categoryBudgets).forEach(([categoryId, budgetValue]) => {
      const budget = parseFloat(budgetValue) || 0;
      if (budget <= 0) return;
      
      const spent = currentMonthTransactions
        .filter(t => t.category === categoryId)
        .reduce((s, t) => s + t.amount, 0);
      
      const percentage = (spent / budget) * 100;
      const remaining = budget - spent;
      
      status[categoryId] = {
        budget,
        spent,
        remaining,
        percentage,
        isOver: spent > budget,
        isWarning: percentage >= 80 && percentage < 100
      };
    });
    
    return status;
  }, [transactions, categoryBudgets]);

  // Fonction pour débloquer un achievement
  const unlockAchievement = useCallback((achievementId) => {
    if (achievements.unlocked.includes(achievementId)) return;
    
    const achievement = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;
    
    setAchievements(prev => ({
      ...prev,
      unlocked: [...prev.unlocked, achievementId],
      points: prev.points + achievement.points
    }));
    
    setNewAchievement(achievement);
    setTimeout(() => setNewAchievement(null), 4000);
  }, [achievements.unlocked]);

  // Mettre à jour le streak
  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    const lastActivity = achievements.lastActivity;
    
    if (lastActivity === today) return; // Déjà compté aujourd'hui
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let newStreak = achievements.streak;
    
    if (lastActivity === yesterday.toDateString()) {
      newStreak = achievements.streak + 1;
    } else if (lastActivity !== today) {
      newStreak = 1; // Reset du streak
    }
    
    setAchievements(prev => ({
      ...prev,
      streak: newStreak,
      lastActivity: today
    }));
    
    // Vérifier les badges de streak
    if (newStreak >= 3) unlockAchievement('streak_3');
    if (newStreak >= 7) unlockAchievement('streak_7');
    if (newStreak >= 14) unlockAchievement('streak_14');
    if (newStreak >= 30) unlockAchievement('streak_30');
    if (newStreak >= 100) unlockAchievement('streak_100');
    
    // Badge weekend
    if (new Date().getDay() === 0) unlockAchievement('weekend_warrior');
    
    // Badge heure
    const hour = new Date().getHours();
    if (hour < 7) unlockAchievement('early_bird');
    if (hour >= 23) unlockAchievement('night_owl');
    
  }, [achievements, unlockAchievement]);

  // Vérifier les achievements
  const checkAchievements = useCallback(() => {
    // Premiers pas
    if (transactions.length >= 1) unlockAchievement('first_transaction');
    if (transactions.some(t => t.type === 'income')) unlockAchievement('first_income');
    if (transactions.some(t => t.type === 'expense')) unlockAchievement('first_expense');
    if (savings > 0) unlockAchievement('first_savings');
    if (Object.keys(categoryBudgets).length > 0) unlockAchievement('first_budget');
    if (savingsGoals.length > 0) unlockAchievement('first_goal');
    
    // Épargne
    if (savings >= 100) unlockAchievement('savings_100');
    if (savings >= 500) unlockAchievement('savings_500');
    if (savings >= 1000) unlockAchievement('savings_1000');
    if (savings >= 5000) unlockAchievement('savings_5000');
    if (savings >= 10000) unlockAchievement('savings_10000');
    
    // Objectifs atteints
    if (savingsGoals.some(g => g.current >= g.target)) unlockAchievement('goal_reached');
    
    // Transactions
    if (transactions.length >= 10) unlockAchievement('transactions_10');
    if (transactions.length >= 50) unlockAchievement('transactions_50');
    if (transactions.length >= 100) unlockAchievement('transactions_100');
    if (transactions.length >= 500) unlockAchievement('transactions_500');
    
    // Catégories utilisées
    const usedCategories = [...new Set(transactions.map(t => t.category))];
    if (usedCategories.length >= 10) unlockAchievement('category_king');
    
    // Mois positif
    const now = new Date();
    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthIncome = currentMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense = currentMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    if (monthIncome > monthExpense && currentMonthTx.length > 0) unlockAchievement('positive_month');
    
    // Dette remboursée
    if (debts.some(d => {
      const paid = d.schedule?.filter(s => s.paid).reduce((sum, s) => sum + s.amount, 0) || 0;
      const total = d.schedule?.reduce((sum, s) => sum + s.amount, 0) || d.totalAmount;
      return paid >= total;
    })) unlockAchievement('debt_paid');
    
    // Budget respecté
    const budgetStatus = Object.values(getBudgetStatus);
    if (budgetStatus.length > 0 && budgetStatus.every(b => !b.isOver)) {
      unlockAchievement('budget_respected');
    }
    if (budgetStatus.length > 0 && budgetStatus.some(b => b.percentage <= 80)) {
      unlockAchievement('under_budget');
    }
    
  }, [transactions, savings, savingsGoals, categoryBudgets, debts, getBudgetStatus, unlockAchievement]);

  // Appeler checkAchievements quand les données changent
  useEffect(() => {
    if (currentUser) {
      checkAchievements();
    }
  }, [checkAchievements, currentUser]);

  // Mettre à jour le streak à chaque transaction
  useEffect(() => {
    if (currentUser && transactions.length > 0) {
      updateStreak();
    }
  }, [transactions.length, currentUser]);



  // Calcul des alertes budget
  const getBudgetAlerts = useMemo(() => {
    const alerts = [];
    Object.entries(getBudgetStatus).forEach(([categoryId, status]) => {
      const category = allCategories.find(c => c.id === categoryId) || { id: categoryId, name: 'Inconnu', icon: '❓' };
      if (status.isOver) {
        alerts.push({
          type: 'danger',
          icon: '🚨',
          category: category,
          message: `${category.name} : dépassement de ${formatCurrency(Math.abs(status.remaining))}`
        });
      } else if (status.isWarning) {
        alerts.push({
          type: 'warning',
          icon: '⚠️',
          category: category,
          message: `${category.name} : ${status.percentage.toFixed(0)}% du budget utilisé`
        });
      }
    });
    return alerts;
  }, [getBudgetStatus, allCategories]);

  // Analyse des données sur 12 mois
  const getAnalysisData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    // Données des 12 derniers mois
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === monthDate.getMonth() && tDate.getFullYear() === monthDate.getFullYear();
      });
      
      const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      months.push({
        date: monthDate,
        label: MONTHS_FR[monthDate.getMonth()].substring(0, 3),
        fullLabel: MONTHS_FR[monthDate.getMonth()] + ' ' + monthDate.getFullYear(),
        income,
        expenses,
        balance: income - expenses,
        transactionCount: monthTransactions.length
      });
    }
    
    // Calcul du solde cumulé
    let cumulative = 0;
    months.forEach(m => {
      cumulative += m.balance;
      m.cumulative = cumulative;
    });
    
    // Mois actuel vs mois précédent
    const currentMonth = months[months.length - 1];
    const previousMonth = months[months.length - 2];
    
    const comparison = {
      incomeChange: previousMonth.income > 0 ? ((currentMonth.income - previousMonth.income) / previousMonth.income * 100) : 0,
      expensesChange: previousMonth.expenses > 0 ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses * 100) : 0,
      balanceChange: currentMonth.balance - previousMonth.balance
    };
    
    // Catégories du mois actuel vs précédent
    const currentMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    });
    
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === previousMonthDate.getMonth() && tDate.getFullYear() === previousMonthDate.getFullYear();
    });
    
    // Analyse par catégorie
    const categoryAnalysis = {};
    allCategories.filter(c => c.type === 'expense').forEach(cat => {
      const currentAmount = currentMonthTransactions.filter(t => t.category === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const previousAmount = previousMonthTransactions.filter(t => t.category === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      if (currentAmount > 0 || previousAmount > 0) {
        categoryAnalysis[cat.id] = {
          category: cat,
          current: currentAmount,
          previous: previousAmount,
          change: previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount * 100) : (currentAmount > 0 ? 100 : 0),
          diff: currentAmount - previousAmount
        };
      }
    });
    
    // Moyenne des 6 derniers mois
    const last6Months = months.slice(-6);
    const avgIncome = last6Months.reduce((s, m) => s + m.income, 0) / 6;
    const avgExpenses = last6Months.reduce((s, m) => s + m.expenses, 0) / 6;
    
    // Tendances
    const trends = [];
    
    // Tendance revenus
    if (currentMonth.income > avgIncome * 1.1) {
      trends.push({ type: 'positive', icon: '📈', message: `Revenus ce mois : +${((currentMonth.income / avgIncome - 1) * 100).toFixed(0)}% par rapport à la moyenne` });
    } else if (currentMonth.income < avgIncome * 0.9) {
      trends.push({ type: 'warning', icon: '📉', message: `Revenus ce mois : ${((currentMonth.income / avgIncome - 1) * 100).toFixed(0)}% par rapport à la moyenne` });
    }
    
    // Tendance dépenses
    if (currentMonth.expenses > avgExpenses * 1.2) {
      trends.push({ type: 'danger', icon: '🚨', message: `Dépenses élevées ce mois : +${((currentMonth.expenses / avgExpenses - 1) * 100).toFixed(0)}% par rapport à la moyenne` });
    } else if (currentMonth.expenses < avgExpenses * 0.8) {
      trends.push({ type: 'positive', icon: '💪', message: `Dépenses maîtrisées : ${((1 - currentMonth.expenses / avgExpenses) * 100).toFixed(0)}% de moins que la moyenne` });
    }
    
    // Catégories en hausse
    const increasingCategories = Object.values(categoryAnalysis)
      .filter(c => c.change > 20 && c.current > 50)
      .sort((a, b) => b.change - a.change)
      .slice(0, 3);
    
    increasingCategories.forEach(c => {
      trends.push({ type: 'warning', icon: c.category.icon, message: `${c.category.name} : +${c.change.toFixed(0)}% vs mois dernier (+${formatCurrency(c.diff)})` });
    });
    
    // Prédiction fin de mois
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedExpenses = (currentMonth.expenses / dayOfMonth) * daysInMonth;
    const projectedBalance = currentMonth.income - projectedExpenses;
    
    return {
      months,
      currentMonth,
      previousMonth,
      comparison,
      categoryAnalysis,
      avgIncome,
      avgExpenses,
      trends,
      projectedExpenses,
      projectedBalance
    };
  }, [transactions, allCategories]);

  const getSharedBudgetStats = useMemo(() => {
    if (!currentSharedBudget) return null;
    
    const transactions = currentSharedBudget.transactions;
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    const byMember = {};
    transactions.forEach(t => {
      if (!byMember[t.addedBy]) {
        byMember[t.addedBy] = { name: t.addedByName, income: 0, expenses: 0 };
      }
      if (t.type === 'income') byMember[t.addedBy].income += t.amount;
      else byMember[t.addedBy].expenses += t.amount;
    });
    
    return { income, expenses, balance: income - expenses, byMember };
  }, [currentSharedBudget]);

  const getCategoryInfo = useCallback((categoryId) => {
    return allCategories.find(c => c.id === categoryId) || { name: 'Autre', icon: '📌', color: '#6B7280' };
  }, [allCategories]);

  const getBrandInfo = useCallback((brandId) => allBrands.find(b => b.id === brandId), [allBrands]);

  // ============================================
  // CALCULS
  // ============================================

  const getMonthlyData = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });

    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, balance: income - expenses, transactions: monthTransactions };
  }, [transactions, selectedDate]);

    const getFilteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Filtre par période
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - periodFilter + 1, 1);
    filtered = filtered.filter(t => new Date(t.date) >= startDate);
    
    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        getCategoryInfo(t.category).name.toLowerCase().includes(query) ||
        (getBrandInfo(t.brand)?.name || '').toLowerCase().includes(query)
      );
    }
    
    // Filtre par catégorie
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    
    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    // Filtre par montant min
    if (filterMinAmount !== '') {
      filtered = filtered.filter(t => t.amount >= parseFloat(filterMinAmount));
    }
    
    // Filtre par montant max
    if (filterMaxAmount !== '') {
      filtered = filtered.filter(t => t.amount <= parseFloat(filterMaxAmount));
    }
    
    return filtered;
  }, [transactions, periodFilter, searchQuery, filterCategory, filterType, filterMinAmount, filterMaxAmount]);

  const getPeriodStats = useMemo(() => {
    const income = getFilteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = getFilteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown = {};
    getFilteredTransactions.forEach(t => {
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { income: 0, expenses: 0 };
      }
      if (t.type === 'income') {
        categoryBreakdown[t.category].income += t.amount;
      } else {
        categoryBreakdown[t.category].expenses += t.amount;
      }
    });

    return { income, expenses, balance: income - expenses, categoryBreakdown };
  }, [getFilteredTransactions]);

  // ============================================
  // RENDU AUTH
  // ============================================

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'}`}>
        <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-gray-200'} backdrop-blur-xl rounded-3xl shadow-2xl border p-8`}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mb-4 shadow-lg shadow-emerald-500/30">
              <span className="text-3xl">💎</span>
            </div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>BudgetFlow</h1>
            <p className={`${darkMode ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
              {authMode === 'forgot' ? 'Récupération de compte' : 
               authMode === 'reset' ? 'Réinitialiser le mot de passe' :
               'Gérez votre argent intelligemment'}
            </p>
          </div>

          {/* Tabs (seulement pour login/register) */}
          {(authMode === 'login' || authMode === 'register') && (
            <div className="flex mb-6 p-1 rounded-xl bg-slate-700/50">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${authMode === 'login' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Connexion
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${authMode === 'register' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Inscription
              </button>
            </div>
          )}

          {/* Messages */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
              ⚠️ {authError}
            </div>
          )}
          {authSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm">
              ✅ {authSuccess}
            </div>
          )}

          {/* LOGIN */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Email</label>
                <input type="email" name="email" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} placeholder="votre@email.com" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Mot de passe</label>
                <input type="password" name="password" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} placeholder="••••••••" />
              </div>
              <button type="submit" disabled={authLoading} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-50">
                {authLoading ? '⏳ Connexion...' : '🔓 Se connecter'}
              </button>
              <button 
                type="button" 
                onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }}
                className={`w-full text-sm ${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-gray-500 hover:text-emerald-600'} transition-all`}
              >
                Mot de passe oublié ?
              </button>
            </form>
          )}

          {/* REGISTER */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nom</label>
                <input type="text" name="name" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} placeholder="Votre nom" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Email</label>
                <input type="email" name="email" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} placeholder="votre@email.com" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Mot de passe <span className="text-xs text-slate-500">(min. 8 car., 1 maj., 1 chiffre)</span>
                </label>
                <input type="password" name="password" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} placeholder="••••••••" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Confirmer</label>
                <input type="password" name="confirmPassword" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} placeholder="••••••••" />
              </div>
              
              {/* Question secrète */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/30 border border-slate-600' : 'bg-gray-50 border border-gray-200'}`}>
                <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  🔐 Question de récupération
                </p>
                <select name="secretQuestion" required className={`w-full px-4 py-3 rounded-xl border mb-3 ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500`}>
                  <option value="">Choisir une question...</option>
                  {SECRET_QUESTIONS.map(q => (
                    <option key={q.id} value={q.id}>{q.question}</option>
                  ))}
                </select>
                <input type="text" name="secretAnswer" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500`} placeholder="Votre réponse" />
              </div>

              <button type="submit" disabled={authLoading} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-50">
                {authLoading ? '⏳ Création...' : '✨ Créer mon compte'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Email de votre compte</label>
                <input 
                  type="email" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required 
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} 
                  placeholder="votre@email.com" 
                />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all">
                🔍 Rechercher mon compte
              </button>
              <button 
                type="button" 
                onClick={() => { setAuthMode('login'); setAuthError(''); setForgotEmail(''); }}
                className={`w-full text-sm ${darkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-all`}
              >
                ← Retour à la connexion
              </button>
            </form>
          )}

          {/* RESET PASSWORD */}
          {authMode === 'reset' && forgotUser && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Compte trouvé : <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{forgotUser.name}</strong>
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {SECRET_QUESTIONS.find(q => q.id === forgotUser.secretQuestion)?.question}
                </label>
                <input 
                  type="text" 
                  name="secretAnswer"
                  required 
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} 
                  placeholder="Votre réponse" 
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nouveau mot de passe</label>
                <input type="password" name="newPassword" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} placeholder="••••••••" />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Confirmer</label>
                <input type="password" name="confirmPassword" required className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} placeholder="••••••••" />
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all">
                🔐 Réinitialiser le mot de passe
              </button>
              <button 
                type="button" 
                onClick={() => { setAuthMode('login'); setForgotUser(null); setForgotEmail(''); setAuthError(''); }}
                className={`w-full text-sm ${darkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-all`}
              >
                ← Retour à la connexion
              </button>
            </form>
          )}

          {/* Footer sécurité */}
          <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'} text-center`}>
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              🔒 Données chiffrées et sécurisées
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDU APP
  // ============================================

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Bouton menu mobile */}
              {isMobile && (
                <button 
                  onClick={() => setMobileMenuOpen(true)}
                  className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <span className="text-xl">☰</span>
                </button>
              )}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <span className="text-xl">💎</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>BudgetFlow</h1>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Bonjour, {currentUser?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAlerts(true)} 
                className={`p-2.5 rounded-xl relative ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'} transition-all`}
              >
                🔔
                {(getUpcomingPayments.length > 0 || getActiveAlerts.length > 0) && (
                  <span className={`absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold ${getActiveAlerts.some(a => a.type === 'danger') ? 'bg-rose-500' : 'bg-amber-500'}`}>
                    {getUpcomingPayments.length + getActiveAlerts.length}
                  </span>
                )}
              </button>
              {/* Bouton Achievements */}
              <button
                onClick={() => setShowAchievementsModal(true)}
                className={`relative p-2.5 rounded-xl ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-yellow-500 hover:bg-gray-200'} transition-all`}
                title="Succès et badges"
              >
                🏆
                {achievements.streak > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {achievements.streak}
                  </span>
                )}
              </button>
              
              {/* Bouton Thème */}
              <div className="relative group">
                <button 
                  onClick={() => !autoTheme && setDarkMode(!darkMode)} 
                  onContextMenu={(e) => { e.preventDefault(); setAutoTheme(!autoTheme); }}
                  className={`p-2.5 rounded-xl ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-all ${autoTheme ? 'ring-2 ring-purple-500' : ''}`}
                  title={autoTheme ? 'Mode auto (clic droit pour désactiver)' : 'Clic droit = mode auto'}
                >
                  {autoTheme ? '🔄' : (darkMode ? '☀️' : '🌙')}
                </button>
              </div>
              {!isMobile && (
                <button onClick={handleLogout} className={`px-4 py-2.5 rounded-xl ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-all text-sm font-medium`}>
                  Déconnexion
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation (desktop seulement) */}
      {!isMobile && (
      <nav className={`sticky top-[73px] z-30 backdrop-blur-xl ${darkMode ? 'bg-slate-900/60' : 'bg-white/60'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
              { id: 'calendar', label: 'Calendrier', icon: '📅' },
              { id: 'transactions', label: 'Transactions', icon: '💳' },
              { id: 'statistics', label: 'Statistiques', icon: '📈' },
              { id: 'budgets', label: 'Budgets', icon: '🎯' },
              { id: 'planning', label: 'Planification', icon: '📋' },
              { id: 'shared', label: 'Budget Partagé', icon: '👨‍👩‍👧‍👦' },
              ...(isAdmin ? [{ id: 'admin', label: 'Administration', icon: '⚙️' }] : []),
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  currentView === view.id
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30'
                    : darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{view.icon}</span>
                <span>{view.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
      )}
      {/* Main content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 py-6 ${isMobile ? 'pb-24' : ''}`}>
        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => openModal('income')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all">
            <span className="text-lg">➕</span><span>Revenu</span>
          </button>
          <button onClick={() => openModal('expense')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition-all">
            <span className="text-lg">➖</span><span>Dépense</span>
          </button>
          <button 
            onClick={() => setShowTemplatesModal(true)} 
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} font-medium transition-all`}
            title="Transactions rapides"
          >
            <span className="text-lg">⚡</span>
            <span className="hidden sm:inline">Rapide</span>
          </button>
        </div>

        {/* DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Revenus du mois</span>
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">💰</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(getMonthlyData.income)}</p>
              </div>
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses du mois</span>
                  <span className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">💸</span>
                </div>
                <p className="text-2xl font-bold text-rose-400">{formatCurrency(getMonthlyData.expenses)}</p>
              </div>
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Solde</span>
                  <span className={`w-10 h-10 rounded-xl ${getMonthlyData.balance >= 0 ? 'bg-cyan-500/20' : 'bg-orange-500/20'} flex items-center justify-center`}>
                    {getMonthlyData.balance >= 0 ? '✨' : '⚠️'}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${getMonthlyData.balance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>{formatCurrency(getMonthlyData.balance)}</p>
              </div>
              
              {/* Carte Streak */}
              <div 
                onClick={() => setShowAchievementsModal(true)}
                className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50'} border backdrop-blur-sm cursor-pointer transition-all`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>🔥 Streak</span>
                  <span className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">🏆</span>
                </div>
                <p className="text-2xl font-bold text-orange-400">{achievements.streak} jour{achievements.streak > 1 ? 's' : ''}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{achievements.points} points • {achievements.unlocked.length} badges</p>
              </div>

              {/* Carte Épargne */}
              <div 
                onClick={() => setShowSavingsModal(true)}
                className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50'} border backdrop-blur-sm cursor-pointer transition-all`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>💰 Mon épargne</span>
                  <span className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">🏦</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">{formatCurrency(savings)}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Cliquez pour gérer</p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dernières transactions</h3>
              {transactions.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span className="text-4xl block mb-3">📭</span>
                  <p>Aucune transaction pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(-5).reverse().map(transaction => {
                    const category = getCategoryInfo(transaction.category);
                    const brand = getBrandInfo(transaction.brand);
                    return (
                      <div key={transaction.id} className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} transition-all cursor-pointer group`} onClick={() => handleEditTransaction(transaction)}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${category.color}20` }}>
                            {brand?.logo || category.icon}
                          </div>
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{transaction.name}</p>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{category.name} • {formatDate(transaction.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <button onClick={(e) => { e.stopPropagation(); deleteTransaction(transaction.id); }} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {currentView === 'calendar' && (
          <div className="space-y-4">
            {/* Header du calendrier */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/30' : 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))} 
                    className={`p-3 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/50 hover:bg-white/80'} transition-all`}
                  >
                    ◀
                  </button>
                  <div className="text-center">
                    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {MONTHS_FR[selectedDate.getMonth()]}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                      {selectedDate.getFullYear()}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))} 
                    className={`p-3 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/50 hover:bg-white/80'} transition-all`}
                  >
                    ▶
                  </button>
                </div>
                <button 
                  onClick={() => setSelectedDate(new Date())}
                  className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/50 hover:bg-white/80 text-purple-700'} transition-all`}
                >
                  📍 Aujourd'hui
                </button>
              </div>
              
              {/* Stats du mois */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>Revenus</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>+{formatCurrency(getMonthlyData.income)}</p>
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>Dépenses</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>-{formatCurrency(getMonthlyData.expenses)}</p>
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>Solde</p>
                  <p className={`text-lg font-bold ${getMonthlyData.income - getMonthlyData.expenses >= 0 ? (darkMode ? 'text-cyan-400' : 'text-cyan-600') : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>
                    {formatCurrency(getMonthlyData.income - getMonthlyData.expenses)}
                  </p>
                </div>
              </div>
            </div>

            {/* Grille du calendrier */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
                  <div 
                    key={day} 
                    className={`text-center py-2 rounded-lg text-sm font-semibold ${
                      index >= 5 
                        ? (darkMode ? 'text-purple-400 bg-purple-500/10' : 'text-purple-600 bg-purple-50') 
                        : (darkMode ? 'text-slate-400' : 'text-gray-500')
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Jours du mois */}
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const daysInMonth = getDaysInMonth(year, month);
                  const firstDay = getFirstDayOfMonth(year, month);
                  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
                  const cells = [];
                  
                  for (let i = 0; i < adjustedFirstDay; i++) {
                    cells.push(
                      <div key={`empty-${i}`} className={`aspect-square rounded-xl ${darkMode ? 'bg-slate-800/30' : 'bg-gray-50'}`} />
                    );
                  }
                  
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dayTransactions = transactions.filter(t => {
                      const tDate = new Date(t.date);
                      return tDate.getFullYear() === year && tDate.getMonth() === month && tDate.getDate() === day;
                    });
                    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                    const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
                    const hasTransactions = dayTransactions.length > 0;
                    
                    cells.push(
                      <div 
                        key={day} 
                        onClick={() => {
                          setSelectedDay({ day, month, year, transactions: dayTransactions, income: dayIncome, expense: dayExpense });
                          setShowDayModal(true);
                        }}
                        className={`aspect-square p-1.5 rounded-xl relative cursor-pointer transition-all group
                          ${isToday 
                            ? 'ring-2 ring-cyan-500 bg-cyan-500/20' 
                            : isWeekend
                              ? (darkMode ? 'bg-purple-500/10 hover:bg-purple-500/20' : 'bg-purple-50 hover:bg-purple-100')
                              : (darkMode ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-gray-50 hover:bg-gray-100')
                          }
                          ${hasTransactions ? (darkMode ? 'border border-slate-600' : 'border border-gray-200') : ''}
                        `}
                      >
                        {/* Numéro du jour */}
                        <span className={`text-sm font-medium ${
                          isToday 
                            ? 'text-cyan-400 font-bold' 
                            : isWeekend
                              ? (darkMode ? 'text-purple-400' : 'text-purple-600')
                              : (darkMode ? 'text-slate-300' : 'text-gray-700')
                        }`}>
                          {day}
                        </span>
                        
                        {/* Montants */}
                        {hasTransactions && (
                          <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                            {dayIncome > 0 && (
                              <div className="text-[9px] font-medium text-emerald-400 bg-emerald-500/20 rounded px-1 truncate">
                                +{dayIncome >= 1000 ? `${(dayIncome/1000).toFixed(1)}k` : dayIncome.toFixed(0)}
                              </div>
                            )}
                            {dayExpense > 0 && (
                              <div className="text-[9px] font-medium text-rose-400 bg-rose-500/20 rounded px-1 truncate">
                                -{dayExpense >= 1000 ? `${(dayExpense/1000).toFixed(1)}k` : dayExpense.toFixed(0)}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Badge nombre de transactions */}
                        {dayTransactions.length > 0 && (
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                            darkMode ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {dayTransactions.length}
                          </div>
                        )}
                        
                        {/* Tooltip au survol */}
                        {hasTransactions && (
                          <div className={`absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none ${
                            darkMode ? 'bg-slate-900 text-white shadow-lg' : 'bg-gray-900 text-white shadow-lg'
                          }`}>
                            <p className="font-semibold">{day} {MONTHS_FR[month]}</p>
                            <p className="text-emerald-400">+{formatCurrency(dayIncome)}</p>
                            <p className="text-rose-400">-{formatCurrency(dayExpense)}</p>
                            <p className="text-slate-400">{dayTransactions.length} transaction(s)</p>
                            <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${darkMode ? 'border-t-slate-900' : 'border-t-gray-900'}`} />
                          </div>
                        )}
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
              
              {/* Légende */}
              <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'} flex flex-wrap gap-4 text-xs`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-cyan-500/50 ring-2 ring-cyan-500" />
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Aujourd'hui</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${darkMode ? 'bg-purple-500/30' : 'bg-purple-100'}`} />
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Weekend</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500/30" />
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Revenu</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-rose-500/30" />
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Dépense</span>
                </div>
              </div>
            </div>

            {/* Liste des transactions du mois */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <h4 className={`font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <span>📋</span>
                Transactions de {MONTHS_FR[selectedDate.getMonth()]}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
                  {getMonthlyData.transactions.length}
                </span>
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getMonthlyData.transactions.length === 0 ? (
                  <p className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    📭 Aucune transaction ce mois
                  </p>
                ) : (
                  getMonthlyData.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
                    const category = getCategoryInfo(t.category);
                    return (
                      <div key={t.id} className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} transition-all group`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                            t.type === 'income' 
                              ? (darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100') 
                              : (darkMode ? 'bg-rose-500/20' : 'bg-rose-100')
                          }`}>
                            {category.icon}
                          </div>
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                            <div className="flex items-center gap-2">
                              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{formatDate(t.date)}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                                {category.name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-lg ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </span>
                          <button 
                            onClick={() => deleteTransaction(t.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        {currentView === 'transactions' && (
          <div className="space-y-4">
            {/* Barre de recherche et filtres */}
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Recherche */}
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une transaction..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* Bouton filtres */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    showFilters || filterCategory !== 'all' || filterType !== 'all' || filterMinAmount || filterMaxAmount
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  🎛️ Filtres
                  {(filterCategory !== 'all' || filterType !== 'all' || filterMinAmount || filterMaxAmount) && (
                    <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                      {[filterCategory !== 'all', filterType !== 'all', filterMinAmount, filterMaxAmount].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Panneau de filtres */}
              {showFilters && (
                <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Type */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      >
                        <option value="all">Tous</option>
                        <option value="income">Revenus</option>
                        <option value="expense">Dépenses</option>
                      </select>
                    </div>
                    
                    {/* Catégorie */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Catégorie</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      >
                        <option value="all">Toutes</option>
                        {allCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Montant min */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Min (€)</label>
                      <input
                        type="number"
                        value={filterMinAmount}
                        onChange={(e) => setFilterMinAmount(e.target.value)}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'}`}
                      />
                    </div>
                    
                    {/* Montant max */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Max (€)</label>
                      <input
                        type="number"
                        value={filterMaxAmount}
                        onChange={(e) => setFilterMaxAmount(e.target.value)}
                        placeholder="∞"
                        className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'}`}
                      />
                    </div>
                  </div>
                  
                  {/* Réinitialiser */}
                  <button
                    onClick={() => {
                      setFilterCategory('all');
                      setFilterType('all');
                      setFilterMinAmount('');
                      setFilterMaxAmount('');
                      setSearchQuery('');
                    }}
                    className={`mt-3 text-sm ${darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    ↺ Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>
            
            {/* Liste des transactions */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Transactions ({getFilteredTransactions.length})
                </h3>
                {getFilteredTransactions.length !== transactions.length && (
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    sur {transactions.length} au total
                  </span>
                )}
              </div>
              
              {getFilteredTransactions.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span className="text-4xl block mb-3">🔍</span>
                  <p>Aucune transaction trouvée</p>
                  {(searchQuery || filterCategory !== 'all' || filterType !== 'all') && (
                    <button
                      onClick={() => {
                        setFilterCategory('all');
                        setFilterType('all');
                        setFilterMinAmount('');
                        setFilterMaxAmount('');
                        setSearchQuery('');
                      }}
                      className="mt-2 text-sm text-emerald-400 hover:underline"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {getFilteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(transaction => {
                    const category = getCategoryInfo(transaction.category);
                    const brand = getBrandInfo(transaction.brand);
                    return (
                      <div key={transaction.id} className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} transition-all cursor-pointer group`} onClick={() => handleEditTransaction(transaction)}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${category.color}20` }}>
                            {brand?.logo || category.icon}
                          </div>
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{transaction.name}</p>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              {category.name} • {formatDate(transaction.date)}
                              {transaction.recurring && ` • 🔄${transaction.recurringFrequency === 'quarterly' ? 'trim.' : transaction.recurringFrequency === 'yearly' ? 'an' : ''}`}
                              {transaction.isFixedExpense && ' • 📌'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const template = {
                                  id: generateId(),
                                  name: transaction.name,
                                  amount: transaction.amount,
                                  type: transaction.type,
                                  category: transaction.category,
                                  brand: transaction.brand || '',
                                  recurring: transaction.recurring,
                                  isFixedExpense: transaction.isFixedExpense
                                };
                                setQuickTemplates(prev => [...prev, template]);
                                showAlert('Template créé', 'Le template a été créé avec succès.', 'success');
                              }}
                              className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                              title="Créer un template"
                            >
                              ⚡
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteTransaction(transaction.id); }} 
                              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

{/* STATISTICS */}
        {currentView === 'statistics' && (
          <div className="space-y-6">
            {/* Onglets d'analyse */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'overview', label: '📊 Vue d\'ensemble', },
                { id: 'charts', label: '📈 Graphiques' },
                { id: 'comparison', label: '🔄 Comparaison' },
                { id: 'trends', label: '🎯 Tendances' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAnalysisTab(tab.id)}
                  className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                    analysisTab === tab.id
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white'
                      : darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* VUE D'ENSEMBLE */}
            {analysisTab === 'overview' && (
              <div className="space-y-6">
                {/* Sélecteur de période */}
                <div className="flex gap-2">
                  {[1, 3, 6, 12].map(months => (
                    <button key={months} onClick={() => setPeriodFilter(months)} className={`px-4 py-2 rounded-xl font-medium transition-all ${periodFilter === months ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white' : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'}`}>
                      {months === 1 ? 'Ce mois' : `${months} mois`}
                    </button>
                  ))}
                </div>
                
                {/* Cartes statistiques */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Total revenus</p>
                    <p className="text-3xl font-bold text-emerald-400">{formatCurrency(getPeriodStats.income)}</p>
                  </div>
                  <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Total dépenses</p>
                    <p className="text-3xl font-bold text-rose-400">{formatCurrency(getPeriodStats.expenses)}</p>
                  </div>
                  <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Économies</p>
                    <p className={`text-3xl font-bold ${getPeriodStats.balance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>{formatCurrency(getPeriodStats.balance)}</p>
                  </div>
                  <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>💰 Mon épargne</p>
                    <p className="text-3xl font-bold text-purple-400">{formatCurrency(savings)}</p>
                  </div>
                </div>

                {/* Objectif épargne */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>🎯 Objectif dépenses fixes</p>
                      <button
                        onClick={() => setShowSavingsModal(true)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${darkMode ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'} transition-all`}
                      >
                        💰 Gérer épargne
                      </button>
                    </div>
                    <div className="flex gap-1">
                      {[{ value: 3, label: '3 mois' }, { value: 6, label: '6 mois' }, { value: 12, label: '1 an' }].map(p => (
                        <button key={p.value} onClick={() => setGoalPeriod(p.value)} className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${goalPeriod === p.value ? 'bg-amber-500 text-white' : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const fixedExpenses = transactions.filter(t => t.type === 'expense' && t.isFixedExpense);
                    const monthlyFixedTotal = fixedExpenses.reduce((sum, t) => {
                      const freq = t.recurringFrequency || 'monthly';
                      if (freq === 'yearly') return sum + (t.amount / 12);
                      if (freq === 'quarterly') return sum + (t.amount / 3);
                      return sum + t.amount;
                    }, 0);
                    const periodTotal = monthlyFixedTotal * goalPeriod;
                    const currentSavings = savings;
                    const percentComplete = periodTotal > 0 ? Math.min((currentSavings / periodTotal) * 100, 100) : 0;
                    const remaining = Math.max(0, periodTotal - currentSavings);
                    const periodLabel = goalPeriod === 3 ? '3 mois' : goalPeriod === 6 ? '6 mois' : '1 an';
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-3xl font-bold text-amber-400">{formatCurrency(periodTotal)}</p>
                          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>pour {periodLabel} de sécurité</p>
                          <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden mt-3`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${percentComplete >= 100 ? 'bg-emerald-500' : percentComplete >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${percentComplete}%` }} />
                          </div>
                          <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {percentComplete >= 100 ? '✅ Objectif atteint !' : `${percentComplete.toFixed(0)}% • Reste ${formatCurrency(remaining)}`}
                          </p>
                        </div>
                        <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                          <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses fixes ({fixedExpenses.length})</p>
                          {fixedExpenses.length === 0 ? (
                            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Cochez "📌 Dépense fixe" lors de l'ajout</p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {fixedExpenses.slice(0, 4).map(t => (
                                <span key={t.id} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                                  {t.name}: {formatCurrency(t.amount)}
                                </span>
                              ))}
                              {fixedExpenses.length > 4 && <span className={`text-xs px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>+{fixedExpenses.length - 4}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Répartition des dépenses */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                  <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Répartition des dépenses</h3>
                  {getPeriodStats.expenses === 0 ? (
                    <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      <span className="text-4xl block mb-3">📊</span>
                      <p>Aucune dépense sur cette période</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(getPeriodStats.categoryBreakdown).filter(([_, data]) => data.expenses > 0).sort((a, b) => b[1].expenses - a[1].expenses).map(([categoryId, data]) => {
                        const category = getCategoryInfo(categoryId);
                        const percentage = (data.expenses / getPeriodStats.expenses) * 100;
                        return (
                          <div key={categoryId}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{category.icon}</span>
                                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{category.name}</span>
                              </div>
                              <div className="text-right">
                                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(data.expenses)}</span>
                                <span className={`text-sm ml-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>({percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden`}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: category.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GRAPHIQUES */}
            {analysisTab === 'charts' && (
              <div className="space-y-6">
                {/* Graphique Revenus vs Dépenses */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                  <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Revenus vs Dépenses (12 mois)</h3>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {getAnalysisData.months.map((month, i) => {
                      const maxValue = Math.max(...getAnalysisData.months.map(m => Math.max(m.income, m.expenses))) || 1;
                      const incomeHeight = (month.income / maxValue) * 100;
                      const expenseHeight = (month.expenses / maxValue) * 100;
                      
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="w-full flex gap-0.5 items-end h-48">
                            <div className="flex-1 bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-400" style={{ height: `${incomeHeight}%` }} title={`Revenus: ${formatCurrency(month.income)}`}></div>
                            <div className="flex-1 bg-rose-500 rounded-t-sm transition-all hover:bg-rose-400" style={{ height: `${expenseHeight}%` }} title={`Dépenses: ${formatCurrency(month.expenses)}`}></div>
                          </div>
                          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{month.label}</span>
                          
                          {/* Tooltip */}
                          <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-800'} text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-10`}>
                            <p className="font-medium">{month.fullLabel}</p>
                            <p className="text-emerald-400">+{formatCurrency(month.income)}</p>
                            <p className="text-rose-400">-{formatCurrency(month.expenses)}</p>
                            <p className={month.balance >= 0 ? 'text-cyan-400' : 'text-orange-400'}>{month.balance >= 0 ? '+' : ''}{formatCurrency(month.balance)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Revenus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses</span>
                    </div>
                  </div>
                </div>

                {/* Graphique Évolution du solde */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                  <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📈 Évolution du solde cumulé</h3>
                  <div className="h-48 relative">
                    {(() => {
                      const values = getAnalysisData.months.map(m => m.cumulative);
                      const minValue = Math.min(...values, 0);
                      const maxValue = Math.max(...values, 0);
                      const range = maxValue - minValue || 1;
                      
                      const points = getAnalysisData.months.map((month, i) => {
                        const x = (i / (getAnalysisData.months.length - 1)) * 100;
                        const y = 100 - ((month.cumulative - minValue) / range) * 100;
                        return `${x},${y}`;
                      }).join(' ');
                      
                      const areaPoints = `0,100 ${points} 100,100`;
                      
                      return (
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          {/* Zone de remplissage */}
                          <polygon fill={`url(#gradient-${darkMode ? 'dark' : 'light'})`} points={areaPoints} opacity="0.3" />
                          
                          {/* Ligne */}
                          <polyline
                            fill="none"
                            stroke={values[values.length - 1] >= 0 ? '#10b981' : '#f43f5e'}
                            strokeWidth="2"
                            points={points}
                            vectorEffect="non-scaling-stroke"
                          />
                          
                          {/* Points */}
                          {getAnalysisData.months.map((month, i) => {
                            const x = (i / (getAnalysisData.months.length - 1)) * 100;
                            const y = 100 - ((month.cumulative - minValue) / range) * 100;
                            return (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="1.5"
                                fill={month.cumulative >= 0 ? '#10b981' : '#f43f5e'}
                                className="hover:r-3 transition-all"
                              />
                            );
                          })}
                          
                          {/* Gradient definition */}
                          <defs>
                            <linearGradient id={`gradient-${darkMode ? 'dark' : 'light'}`} x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor={values[values.length - 1] >= 0 ? '#10b981' : '#f43f5e'} />
                              <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                          </defs>
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between mt-2">
                    {getAnalysisData.months.filter((_, i) => i % 3 === 0 || i === 11).map((month, i) => (
                      <span key={i} className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{month.label}</span>
                    ))}
                  </div>
                  <div className="text-center mt-4">
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Solde cumulé actuel</p>
                    <p className={`text-2xl font-bold ${getAnalysisData.months[11].cumulative >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(getAnalysisData.months[11].cumulative)}
                    </p>
                  </div>
                </div>

                {/* Camembert des catégories */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                  <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🥧 Répartition par catégorie (ce mois)</h3>
                  {getAnalysisData.currentMonth.expenses === 0 ? (
                    <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      <span className="text-4xl block mb-2">📊</span>
                      <p>Aucune dépense ce mois</p>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      {/* Cercle */}
                      <div className="relative w-48 h-48">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          {(() => {
                            const categories = Object.values(getAnalysisData.categoryAnalysis)
                              .filter(c => c.current > 0)
                              .sort((a, b) => b.current - a.current);
                            const total = categories.reduce((s, c) => s + c.current, 0);
                            let cumulative = 0;
                            
                            return categories.map((cat, i) => {
                              const percentage = (cat.current / total) * 100;
                              const offset = cumulative;
                              cumulative += percentage;
                              
                              return (
                                <circle
                                  key={i}
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="transparent"
                                  stroke={cat.category.color}
                                  strokeWidth="20"
                                  strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                                  strokeDashoffset={-offset * 2.51}
                                  className="transition-all hover:opacity-80"
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total</p>
                            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(getAnalysisData.currentMonth.expenses)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Légende */}
                      <div className="flex-1 space-y-2">
                        {Object.values(getAnalysisData.categoryAnalysis)
                          .filter(c => c.current > 0)
                          .sort((a, b) => b.current - a.current)
                          .slice(0, 6)
                          .map((cat, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.category.color }}></div>
                                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{cat.category.icon} {cat.category.name}</span>
                              </div>
                              <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(cat.current)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* COMPARAISON */}
            {analysisTab === 'comparison' && (
              <div className="space-y-6">
                {/* Résumé comparaison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Revenus vs mois dernier</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(getAnalysisData.currentMonth.income)}</p>
                    <p className={`text-sm mt-1 ${getAnalysisData.comparison.incomeChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {getAnalysisData.comparison.incomeChange >= 0 ? '↑' : '↓'} {Math.abs(getAnalysisData.comparison.incomeChange).toFixed(1)}%
                    </p>
                  </div>
                  <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Dépenses vs mois dernier</p>
                    <p className="text-2xl font-bold text-rose-400">{formatCurrency(getAnalysisData.currentMonth.expenses)}</p>
                    <p className={`text-sm mt-1 ${getAnalysisData.comparison.expensesChange <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {getAnalysisData.comparison.expensesChange >= 0 ? '↑' : '↓'} {Math.abs(getAnalysisData.comparison.expensesChange).toFixed(1)}%
                    </p>
                  </div>
                  <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Économies vs mois dernier</p>
                    <p className={`text-2xl font-bold ${getAnalysisData.currentMonth.balance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>{formatCurrency(getAnalysisData.currentMonth.balance)}</p>
                    <p className={`text-sm mt-1 ${getAnalysisData.comparison.balanceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {getAnalysisData.comparison.balanceChange >= 0 ? '+' : ''}{formatCurrency(getAnalysisData.comparison.balanceChange)}
                    </p>
                  </div>
                </div>

                {/* Comparaison par catégorie */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
                  <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔄 Comparaison par catégorie</h3>
                  <div className="space-y-4">
                    {Object.values(getAnalysisData.categoryAnalysis)
                      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
                      .slice(0, 8)
                      .map((cat, i) => (
                        <div key={i} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{cat.category.icon}</span>
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cat.category.name}</span>
                            </div>
                            <span className={`text-sm font-semibold ${cat.change > 0 ? 'text-rose-400' : cat.change < 0 ? 'text-emerald-400' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}>
                              {cat.change > 0 ? '+' : ''}{cat.change.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Mois dernier</p>
                              <p className={`font-medium ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{formatCurrency(cat.previous)}</p>
                            </div>
                            <span className={`text-lg ${cat.diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>→</span>
                            <div className="flex-1">
                              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Ce mois</p>
                              <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(cat.current)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Différence</p>
                              <p className={`font-semibold ${cat.diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {cat.diff > 0 ? '+' : ''}{formatCurrency(cat.diff)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* TENDANCES */}
            {analysisTab === 'trends' && (
              <div className="space-y-6">
                {/* Prédiction fin de mois */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔮 Prédiction fin de mois</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses actuelles</p>
                      <p className="text-xl font-bold text-rose-400">{formatCurrency(getAnalysisData.currentMonth.expenses)}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses projetées</p>
                      <p className="text-xl font-bold text-amber-400">{formatCurrency(getAnalysisData.projectedExpenses)}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Solde projeté</p>
                      <p className={`text-xl font-bold ${getAnalysisData.projectedBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(getAnalysisData.projectedBalance)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xs mt-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    * Basé sur votre rythme de dépenses actuel ({new Date().getDate()} jours écoulés)
                  </p>
                </div>

                {/* Moyennes */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Moyennes (6 derniers mois)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Revenus moyens</p>
                      <p className="text-xl font-bold text-emerald-400">{formatCurrency(getAnalysisData.avgIncome)}</p>
                      <p className={`text-xs mt-1 ${getAnalysisData.currentMonth.income >= getAnalysisData.avgIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Ce mois : {getAnalysisData.currentMonth.income >= getAnalysisData.avgIncome ? '+' : ''}{formatCurrency(getAnalysisData.currentMonth.income - getAnalysisData.avgIncome)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses moyennes</p>
                      <p className="text-xl font-bold text-rose-400">{formatCurrency(getAnalysisData.avgExpenses)}</p>
                      <p className={`text-xs mt-1 ${getAnalysisData.currentMonth.expenses <= getAnalysisData.avgExpenses ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Ce mois : {getAnalysisData.currentMonth.expenses >= getAnalysisData.avgExpenses ? '+' : ''}{formatCurrency(getAnalysisData.currentMonth.expenses - getAnalysisData.avgExpenses)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alertes et tendances */}
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🎯 Analyses et tendances</h3>
                  {getAnalysisData.trends.length === 0 ? (
                    <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      <span className="text-4xl block mb-2">✨</span>
                      <p>Tout est normal ce mois-ci</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getAnalysisData.trends.map((trend, i) => (
                        <div key={i} className={`p-4 rounded-xl ${
                          trend.type === 'danger' ? (darkMode ? 'bg-rose-500/20 border-rose-500/30' : 'bg-rose-50 border-rose-200') :
                          trend.type === 'warning' ? (darkMode ? 'bg-amber-500/20 border-amber-500/30' : 'bg-amber-50 border-amber-200') :
                          (darkMode ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')
                        } border`}>
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{trend.icon}</span>
                            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{trend.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BUDGETS & OBJECTIFS */}
        {currentView === 'budgets' && (
          <div className="space-y-6">
            {/* Header */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🎯 Budgets & Objectifs</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Définissez vos limites de dépenses et vos objectifs d'épargne
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBudgetModal(true)}
                    className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} text-sm font-medium`}
                  >
                    💰 Gérer budgets
                  </button>
                  <button
                    onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium"
                  >
                    + Nouvel objectif
                  </button>
                </div>
              </div>
            </div>

            {/* Alertes budgets */}
            {getBudgetAlerts.length > 0 && (
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'} border`}>
                <h4 className={`font-semibold mb-3 ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>⚠️ Alertes budgets</h4>
                <div className="space-y-2">
                  {getBudgetAlerts.map((alert, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl">{alert.category.icon}</span>
                      <span className={darkMode ? 'text-rose-300' : 'text-rose-700'}>{alert.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budgets par catégorie */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Budgets mensuels par catégorie</h4>
                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {MONTHS_FR[new Date().getMonth()]} {new Date().getFullYear()}
                </span>
              </div>
              
              {Object.keys(categoryBudgets).length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span className="text-4xl block mb-2">💰</span>
                  <p className="mb-2">Aucun budget défini</p>
                  <button
                    onClick={() => setShowBudgetModal(true)}
                    className="text-emerald-400 hover:underline text-sm"
                  >
                    Définir des budgets par catégorie
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(getBudgetStatus)
                    .sort((a, b) => b[1].percentage - a[1].percentage)
                    .map(([categoryId, status]) => {
                      const category = getCategoryInfo(categoryId);
                      return (
                        <div key={categoryId} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{category.icon}</span>
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{category.name}</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-semibold ${status.isOver ? 'text-rose-400' : status.isWarning ? 'text-amber-400' : (darkMode ? 'text-white' : 'text-gray-900')}`}>
                                {formatCurrency(status.spent)}
                              </span>
                              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}> / {formatCurrency(status.budget)}</span>
                            </div>
                          </div>
                          <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${status.isOver ? 'bg-rose-500' : status.isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(status.percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2">
                            <span className={`text-xs ${status.isOver ? 'text-rose-400' : status.isWarning ? 'text-amber-400' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}>
                              {status.percentage.toFixed(0)}% utilisé
                            </span>
                            <span className={`text-xs ${status.isOver ? 'text-rose-400' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}>
                              {status.isOver ? `Dépassé de ${formatCurrency(Math.abs(status.remaining))}` : `Reste ${formatCurrency(status.remaining)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Objectifs d'épargne */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🎯 Objectifs d'épargne</h4>
              </div>
              
              {savingsGoals.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span className="text-4xl block mb-2">🎯</span>
                  <p className="mb-2">Aucun objectif défini</p>
                  <button
                    onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
                    className="text-emerald-400 hover:underline text-sm"
                  >
                    Créer votre premier objectif
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savingsGoals.map(goal => {
                    const percentage = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                    const remaining = goal.target - goal.current;
                    const daysLeft = goal.targetDate ? Math.max(0, Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;
                    const monthlyNeeded = daysLeft && daysLeft > 0 ? (remaining / (daysLeft / 30)).toFixed(2) : null;
                    
                    return (
                      <div key={goal.id} className={`p-5 rounded-xl ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'} group`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{goal.icon || '🎯'}</span>
                              <h5 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{goal.name}</h5>
                            </div>
                            {goal.targetDate && (
                              <p className={`text-xs mt-1 ${daysLeft <= 30 ? 'text-amber-400' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}>
                                📅 {daysLeft === 0 ? 'Échéance aujourd\'hui' : daysLeft === 1 ? 'Échéance demain' : `${daysLeft} jours restants`}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => { setEditingGoal(goal); setShowGoalModal(true); }}
                              className={`p-2 rounded-lg ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => {
                                showConfirm(
                                  'Supprimer l\'objectif',
                                  `Voulez-vous vraiment supprimer "${goal.name}" ?`,
                                  () => setSavingsGoals(prev => prev.filter(g => g.id !== goal.id))
                                );
                              }}
                              className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex justify-between mb-1">
                            <span className={`text-2xl font-bold ${percentage >= 100 ? 'text-emerald-400' : (darkMode ? 'text-white' : 'text-gray-900')}`}>
                              {formatCurrency(goal.current)}
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              / {formatCurrency(goal.target)}
                            </span>
                          </div>
                          <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-cyan-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${percentage >= 100 ? 'text-emerald-400' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}>
                            {percentage >= 100 ? '✅ Objectif atteint !' : `${percentage.toFixed(0)}% • Reste ${formatCurrency(remaining)}`}
                          </span>
                        </div>
                        
                        {monthlyNeeded && remaining > 0 && (
                          <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                            💡 Épargnez {formatCurrency(parseFloat(monthlyNeeded))}/mois pour atteindre l'objectif
                          </p>
                        )}
                        
                        {/* Boutons d'action rapide */}
                        {percentage < 100 && (
                          <div className="flex gap-2 mt-3">
                            {[10, 50, 100].map(amount => (
                              <button
                                key={amount}
                                onClick={() => {
                                  setSavingsGoals(prev => prev.map(g => 
                                    g.id === goal.id ? {...g, current: Math.min(g.current + amount, g.target)} : g
                                  ));
                                }}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium ${darkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} transition-all`}
                              >
                                +{amount}€
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Résumé global */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30' : 'bg-gradient-to-r from-emerald-50 to-cyan-50 border-emerald-200'} border`}>
              <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Résumé</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Budgets définis</p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{Object.keys(categoryBudgets).length}</p>
                </div>
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Budget total mensuel</p>
                  <p className="text-xl font-bold text-amber-400">{formatCurrency(Object.values(categoryBudgets).reduce((s, b) => s + (parseFloat(b) || 0), 0))}</p>
                </div>
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Objectifs en cours</p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{savingsGoals.filter(g => g.current < g.target).length}</p>
                </div>
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total objectifs</p>
                  <p className="text-xl font-bold text-emerald-400">{formatCurrency(savingsGoals.reduce((s, g) => s + g.target, 0))}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PLANIFICATION */}
        {currentView === 'planning' && (
          <div className="space-y-6">
            {/* Header */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📋 Planification financière</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Simulez, planifiez et gérez vos finances futures
              </p>
            </div>

            {/* Grille des outils */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Simulateur */}
              <div 
                onClick={() => setShowSimulator(true)}
                className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50'} border backdrop-blur-sm cursor-pointer transition-all`}
              >
                <div className="text-4xl mb-3">🧮</div>
                <h4 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Simulateur d'épargne</h4>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Calculez combien de temps pour atteindre vos objectifs
                </p>
              </div>

              {/* Dettes */}
              <div 
                onClick={() => setShowDebtModal(true)}
                className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50'} border backdrop-blur-sm cursor-pointer transition-all`}
              >
                <div className="text-4xl mb-3">💳</div>
                <h4 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Gestion des dettes</h4>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Suivez vos crédits et remboursements
                </p>
                {debts.length > 0 && (
                  <div className={`mt-2 text-xs ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    {debts.length} dette(s) en cours
                  </div>
                )}
              </div>

              {/* Budget prévisionnel */}
              <div 
                onClick={() => setShowPlannedBudgetModal(true)}
                className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50'} border backdrop-blur-sm cursor-pointer transition-all`}
              >
                <div className="text-4xl mb-3">📅</div>
                <h4 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Budget prévisionnel</h4>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Planifiez vos dépenses du mois prochain
                </p>
              </div>
            </div>

            {/* Résumé des dettes */}
            {debts.length > 0 && (
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>💳 Mes dettes et crédits</h4>
                  <button
                    onClick={() => { setEditingDebt(null); setShowDebtModal(true); }}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium"
                  >
                    + Ajouter
                  </button>
                </div>
                
                <div className="space-y-3">
                  {debts.map(debt => {
                    const paidAmount = debt.schedule?.filter(s => s.paid).reduce((sum, s) => sum + s.amount, 0) || 0;
                    const totalScheduled = debt.schedule?.reduce((sum, s) => sum + s.amount, 0) || debt.totalAmount;
                    const remainingAmount = totalScheduled - paidAmount;
                    const percentage = (paidAmount / totalScheduled) * 100;
                    const nextPayment = debt.schedule?.find(s => !s.paid);
                    const paidCount = debt.schedule?.filter(s => s.paid).length || 0;
                    const totalCount = debt.schedule?.length || 0;
                    
                    return (
                      <div key={debt.id} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'} group`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{debt.icon || '💳'}</span>
                              <h5 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{debt.name}</h5>
                            </div>
                            {debt.creditor && (
                              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{debt.creditor}</p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => { setEditingDebt(debt); setShowDebtModal(true); }}
                              className={`p-2 rounded-lg ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => {
                                showConfirm(
                                  'Supprimer la dette',
                                  `Voulez-vous vraiment supprimer "${debt.name}" ?`,
                                  () => setDebts(prev => prev.filter(d => d.id !== debt.id))
                                );
                              }}
                              className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <div>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total</p>
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(totalScheduled)}</p>
                          </div>
                          <div>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Remboursé</p>
                            <p className="font-semibold text-emerald-400">{formatCurrency(paidAmount)}</p>
                          </div>
                          <div>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Reste</p>
                            <p className="font-semibold text-rose-400">{formatCurrency(remainingAmount)}</p>
                          </div>
                          <div>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Échéances</p>
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{paidCount}/{totalCount}</p>
                          </div>
                        </div>
                        
                        <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between mt-2">
                          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {percentage.toFixed(0)}% remboursé
                            {debt.payments?.some(p => p.auto) && ` (${debt.payments.filter(p => p.auto).length} auto)`}
                          </span>
                          {remainingAmount <= 0 ? (
                            <span className="text-xs text-emerald-400 font-medium">✅ Crédit remboursé !</span>
                          ) : (totalCount - paidCount) > 0 && (
                            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              {totalCount - paidCount} échéance(s) restante(s)
                            </span>
                          )}
                        </div>
                        
                        {/* Bouton de paiement rapide */}
                        {/* Prochaine échéance et paiement rapide */}
                        {nextPayment ? (
                          <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`text-xs ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Prochaine échéance</p>
                                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {new Date(nextPayment.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-lg font-bold text-amber-400">{formatCurrency(nextPayment.amount)}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setDebts(prev => prev.map(d => {
                                    if (d.id === debt.id) {
                                      return {
                                        ...d,
                                        schedule: d.schedule.map(s => 
                                          s.id === nextPayment.id ? {...s, paid: true, paidDate: new Date().toISOString()} : s
                                        )
                                      };
                                    }
                                    return d;
                                  }));
                                }}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm"
                              >
                                ✓ Marquer payé
                              </button>
                            </div>
                          </div>
                        ) : remainingAmount <= 0 && (
                          <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'} text-center`}>
                            <p className="text-emerald-400 font-semibold">🎉 Crédit entièrement remboursé !</p>
                          </div>
                        )}

                        {/* Voir l'échéancier */}
                        {debt.schedule && debt.schedule.length > 0 && (
                          <details className={`mt-3 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            <summary className="text-xs cursor-pointer hover:text-emerald-400">
                              📋 Voir l'échéancier complet ({paidCount}/{totalCount} payées)
                            </summary>
                            <div className={`mt-2 p-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'} max-h-48 overflow-y-auto`}>
                              {debt.schedule.map((row, index) => (
                                <div key={row.id} className={`flex items-center justify-between text-xs py-2 border-b ${darkMode ? 'border-slate-600/30' : 'border-gray-200'} last:border-0`}>
                                  <div className="flex items-center gap-2">
                                    <span className={`w-6 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>#{index + 1}</span>
                                    <span>{new Date(row.date).toLocaleDateString('fr-FR')}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${row.paid ? 'text-emerald-400' : (darkMode ? 'text-white' : 'text-gray-900')}`}>
                                      {formatCurrency(row.amount)}
                                    </span>
                                    {row.paid ? (
                                      <span className="text-emerald-400">✓</span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setDebts(prev => prev.map(d => {
                                            if (d.id === debt.id) {
                                              return {
                                                ...d,
                                                schedule: d.schedule.map(s => 
                                                  s.id === row.id ? {...s, paid: true, paidDate: new Date().toISOString()} : s
                                                )
                                              };
                                            }
                                            return d;
                                          }));
                                        }}
                                        className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                                      >
                                        Payer
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Total des dettes */}
                <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total des crédits</p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(debts.reduce((s, d) => s + (d.schedule?.reduce((sum, r) => sum + r.amount, 0) || d.totalAmount), 0))}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total remboursé</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {formatCurrency(debts.reduce((s, d) => s + (d.schedule?.filter(r => r.paid).reduce((sum, r) => sum + r.amount, 0) || 0), 0))}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Reste à payer</p>
                      <p className="text-lg font-bold text-rose-400">
                        {formatCurrency(debts.reduce((s, d) => {
                          const total = d.schedule?.reduce((sum, r) => sum + r.amount, 0) || d.totalAmount;
                          const paid = d.schedule?.filter(r => r.paid).reduce((sum, r) => sum + r.amount, 0) || 0;
                          return s + (total - paid);
                        }, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Budget prévisionnel du mois prochain */}
            {Object.keys(plannedBudget).length > 0 && (
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    📅 Budget prévisionnel - {MONTHS_FR[(new Date().getMonth() + 1) % 12]} {new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()}
                  </h4>
                  <button
                    onClick={() => setShowPlannedBudgetModal(true)}
                    className={`px-3 py-1 rounded-lg ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm`}
                  >
                    ✏️ Modifier
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Revenus prévus</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(plannedBudget.expectedIncome || 0)}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses prévues</p>
                    <p className="text-lg font-bold text-rose-400">{formatCurrency(plannedBudget.expectedExpenses || 0)}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Épargne prévue</p>
                    <p className="text-lg font-bold text-purple-400">{formatCurrency(plannedBudget.plannedSavings || 0)}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Solde prévu</p>
                    <p className={`text-lg font-bold ${(plannedBudget.expectedIncome || 0) - (plannedBudget.expectedExpenses || 0) - (plannedBudget.plannedSavings || 0) >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                      {formatCurrency((plannedBudget.expectedIncome || 0) - (plannedBudget.expectedExpenses || 0) - (plannedBudget.plannedSavings || 0))}
                    </p>
                  </div>
                </div>
                
                {/* Dépenses planifiées par catégorie */}
                {plannedBudget.categories && Object.keys(plannedBudget.categories).length > 0 && (
                  <div>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Répartition par catégorie</p>
                    <div className="space-y-2">
                      {Object.entries(plannedBudget.categories)
                        .filter(([_, amount]) => amount > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([categoryId, amount]) => {
                          const category = getCategoryInfo(categoryId);
                          const totalExpenses = plannedBudget.expectedExpenses || 1;
                          const percentage = (amount / totalExpenses) * 100;
                          return (
                            <div key={categoryId} className="flex items-center gap-3">
                              <span className="text-lg w-6">{category.icon}</span>
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{category.name}</span>
                                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(amount)}</span>
                                </div>
                                <div className={`h-1.5 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                                  <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: category.color }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BUDGET PARTAGÉ */}
        {currentView === 'shared' && (
          <div className="space-y-6">
            {/* Header */}
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>👨‍👩‍👧‍👦 Budget Partagé</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Gérez un budget commun avec votre famille ou colocataires
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateSharedBudget(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium"
                  >
                    + Créer
                  </button>
                  <button
                    onClick={() => setShowJoinSharedBudget(true)}
                    className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} text-sm font-medium`}
                  >
                    🔗 Rejoindre
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des budgets partagés de l'utilisateur */}
            {(() => {
              const userBudgets = sharedBudgets.filter(b => b.members.some(m => m.userId === currentUser.id));
              
              if (userBudgets.length === 0) {
                return (
                  <div className={`p-12 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm text-center`}>
                    <span className="text-5xl block mb-4">👨‍👩‍👧‍👦</span>
                    <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Aucun budget partagé</h4>
                    <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      Créez un budget familial ou rejoignez-en un existant
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userBudgets.map(budget => {
                    const isActive = currentSharedBudget?.id === budget.id;
                    const isOwner = budget.createdBy === currentUser.id;
                    const budgetIncome = budget.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                    const budgetExpenses = budget.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                    
                    return (
                      <div
                        key={budget.id}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/50'
                            : darkMode ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setCurrentSharedBudget(budget);
                          localStorage.setItem(`budgetflow_currentShared_${currentUser.id}`, budget.id);
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {budget.name}
                              {isActive && <span className="ml-2 text-emerald-400">✓</span>}
                            </h4>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              {isOwner ? '👑 Propriétaire' : '👤 Membre'} • {budget.members.length} membre(s)
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentSharedBudget(budget);
                              setShowSharedBudgetModal(true);
                            }}
                            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                          >
                            ⚙️
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Revenus</p>
                            <p className="text-sm font-semibold text-emerald-400">{formatCurrency(budgetIncome)}</p>
                          </div>
                          <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses</p>
                            <p className="text-sm font-semibold text-rose-400">{formatCurrency(budgetExpenses)}</p>
                          </div>
                          <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Solde</p>
                            <p className={`text-sm font-semibold ${budgetIncome - budgetExpenses >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                              {formatCurrency(budgetIncome - budgetExpenses)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex -space-x-2">
                          {budget.members.slice(0, 5).map((member, i) => (
                            <div
                              key={member.userId}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${darkMode ? 'border-slate-800 bg-slate-600' : 'border-white bg-gray-300'}`}
                              title={member.userName}
                            >
                              {member.userName.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {budget.members.length > 5 && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${darkMode ? 'border-slate-800 bg-slate-700' : 'border-white bg-gray-200'}`}>
                              +{budget.members.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Détails du budget actif */}
            {currentSharedBudget && (
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    📊 Transactions de "{currentSharedBudget.name}"
                  </h4>
                  <button
                    onClick={() => {
                      const name = prompt('Description :');
                      if (!name) return;
                      const amount = parseFloat(prompt('Montant (€) :'));
                      if (isNaN(amount) || amount <= 0) return;
                      const isIncome = confirm('Est-ce un REVENU ? (OK = Revenu, Annuler = Dépense)');
                      
                      addSharedTransaction({
                        name,
                        amount,
                        type: isIncome ? 'income' : 'expense',
                        date: new Date().toISOString().split('T')[0],
                        category: isIncome ? 'other_income' : 'other_expense'
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium"
                  >
                    + Ajouter
                  </button>
                </div>

                {/* Stats par membre */}
                {getSharedBudgetStats && Object.keys(getSharedBudgetStats.byMember).length > 0 && (
                  <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                    <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Contributions par membre</p>
                    <div className="space-y-2">
                      {Object.entries(getSharedBudgetStats.byMember).map(([userId, data]) => (
                        <div key={userId} className="flex items-center justify-between">
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{data.name}</span>
                          <div className="flex gap-4 text-sm">
                            <span className="text-emerald-400">+{formatCurrency(data.income)}</span>
                            <span className="text-rose-400">-{formatCurrency(data.expenses)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Liste des transactions */}
                {currentSharedBudget.transactions.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <span className="text-4xl block mb-2">📭</span>
                    <p>Aucune transaction</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {currentSharedBudget.transactions.slice().reverse().map(t => {
                      const category = getCategoryInfo(t.category);
                      return (
                        <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'} group`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${category.color}20` }}>
                              {category.icon}
                            </div>
                            <div>
                              <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                Par {t.addedByName} • {formatDate(t.date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </p>
                            <button
                              onClick={() => {
                                showConfirm(
                                  'Supprimer la transaction',
                                  `Voulez-vous vraiment supprimer "${t.name}" ?`,
                                  () => deleteSharedTransaction(t.id)
                                );
                              }}
                              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ADMIN */}
        {currentView === 'admin' && isAdmin && (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>⚙️ Panneau d'administration</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Gérez les catégories et marques personnalisées.</p>
            </div>

            {/* Catégories personnalisées */}
            {hasPermission('manage_categories') && (
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏷️ Catégories personnalisées</h4>
                <button onClick={() => {
                  showInput('Nouvelle catégorie', [
                    { name: 'name', label: 'Nom de la catégorie', type: 'text', placeholder: 'Ex: Loisirs', required: true },
                    { name: 'type', label: 'Type', type: 'select', options: [
                      { value: 'expense', label: '💸 Dépense' },
                      { value: 'income', label: '💵 Revenu' }
                    ], required: true }
                  ], (values) => {
                    if (values.name) {
                      setShowEmojiPicker({ type: 'category', name: values.name, catType: values.type });
                    }
                  });
                }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium">
                  + Ajouter
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {customCategories.map(cat => (
                  <div key={cat.id} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'} flex items-center justify-between group`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cat.name}</p>
                        <p className={`text-xs ${cat.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{cat.type === 'income' ? 'Revenu' : 'Dépense'}</p>
                      </div>
                    </div>
                    <button onClick={() => { 
                      showConfirm(
                        'Supprimer la catégorie',
                        `Voulez-vous vraiment supprimer "${cat.name}" ?`,
                        () => setCustomCategories(prev => prev.filter(c => c.id !== cat.id))
                      );
                    }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded bg-red-500/20 text-red-400 text-xs">✕</button>
                  </div>
                ))}
                {customCategories.length === 0 && <p className={`col-span-full text-center py-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Aucune catégorie personnalisée</p>}
              </div>
            </div>
            )}

            {/* Marques personnalisées */}
            {hasPermission('manage_brands') && (
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏢 Marques personnalisées</h4>
                <button onClick={() => {
                  showInput('Nouvelle marque', [
                    { name: 'name', label: 'Nom de la marque', type: 'text', placeholder: 'Ex: Amazon', required: true }
                  ], (values) => {
                    if (values.name) {
                      setShowEmojiPicker({ type: 'brand', name: values.name });
                    }
                  });
                }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium">
                  + Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customBrands.map(brand => (
                  <div key={brand.id} className={`px-3 py-2 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'} flex items-center gap-2 group`}>
                    <span>{brand.logo}</span>
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{brand.name}</span>
                    <button onClick={() => { 
                      showConfirm(
                        'Supprimer la marque',
                        `Voulez-vous vraiment supprimer "${brand.name}" ?`,
                        () => setCustomBrands(prev => prev.filter(b => b.id !== brand.id))
                      );
                    }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded bg-red-500/20 text-red-400 text-xs">✕</button>
                  </div>
                ))}
                {customBrands.length === 0 && <p className={`w-full text-center py-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Aucune marque personnalisée</p>}
              </div>
            </div>
            )}

            {/* Sauvegarde et Restauration */}
            {hasPermission('manage_backups') && (
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>💾 Sauvegarde & Restauration</h4>
              </div>
              
              <div className="space-y-4">
                {/* Paramètres sauvegarde auto */}
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔄 Sauvegarde automatique</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        Dernière : {(() => {
                          const lastBackup = localStorage.getItem('budgetflow_lastBackup');
                          return lastBackup ? new Date(lastBackup).toLocaleString('fr-FR') : 'Jamais';
                        })()}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={backupSettings.autoBackupEnabled}
                      onChange={(e) => setBackupSettings({...backupSettings, autoBackupEnabled: e.target.checked})}
                      className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  
                  {backupSettings.autoBackupEnabled && (
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Heure :</span>
                      <select
                        value={backupSettings.autoBackupHour}
                        onChange={(e) => setBackupSettings({...backupSettings, autoBackupHour: parseInt(e.target.value)})}
                        className={`flex-1 px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-600 text-white border-slate-500' : 'bg-white text-gray-900 border-gray-300'} border`}
                      >
                        {Array.from({length: 24}, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Sauvegarde manuelle */}
                  <button
                    onClick={() => {
                      const backup = {
                        version: '1.0',
                        date: new Date().toISOString(),
                        type: 'manual',
                        users: SecurityManager.loadSecure('users') || [],
                        data: {}
                      };
                      
                      const users = SecurityManager.loadSecure('users') || [];
                      users.forEach(user => {
                        backup.data[user.id] = {
                          transactions: SecurityManager.loadSecure(`transactions_${user.id}`) || [],
                          categories: SecurityManager.loadSecure(`categories_${user.id}`) || [],
                          brands: SecurityManager.loadSecure(`brands_${user.id}`) || [],
                          savings: SecurityManager.loadSecure(`savings_${user.id}`) || 0
                        };
                      });
                      
                      const autoBackups = JSON.parse(localStorage.getItem('budgetflow_autoBackups') || '[]');
                      autoBackups.unshift(backup);
                      if (autoBackups.length > 5) autoBackups.pop();
                      localStorage.setItem('budgetflow_autoBackups', JSON.stringify(autoBackups));
                      localStorage.setItem('budgetflow_lastBackup', new Date().toISOString());
                      
                      showAlert('Sauvegarde effectuée', 'La sauvegarde manuelle a été créée avec succès.', 'success');
                      setTimeout(() => window.location.reload(), 1500);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl ${darkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} transition-all`}
                  >
                    <span className="text-xl">💾</span>
                    <span className="text-xs font-medium">Sauvegarder</span>
                  </button>
                  
                  {/* Exporter */}
                  <button
                    onClick={() => {
                      const backup = {
                        version: '1.0',
                        date: new Date().toISOString(),
                        type: 'export',
                        users: SecurityManager.loadSecure('users') || [],
                        data: {}
                      };
                      
                      const users = SecurityManager.loadSecure('users') || [];
                      users.forEach(user => {
                        backup.data[user.id] = {
                          transactions: SecurityManager.loadSecure(`transactions_${user.id}`) || [],
                          categories: SecurityManager.loadSecure(`categories_${user.id}`) || [],
                          brands: SecurityManager.loadSecure(`brands_${user.id}`) || [],
                          savings: SecurityManager.loadSecure(`savings_${user.id}`) || 0
                        };
                      });
                      
                      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `budgetflow_backup_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      
                      localStorage.setItem('budgetflow_lastBackup', new Date().toISOString());
                      showAlert('Exportation réussie', 'Le fichier de sauvegarde a été téléchargé.', 'success');
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl ${darkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'} transition-all`}
                  >
                    <span className="text-xl">📥</span>
                    <span className="text-xs font-medium">Exporter</span>
                  </button>
                  
                  {/* Importer */}
                  <label className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl ${darkMode ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'} transition-all cursor-pointer`}>
                    <span className="text-xl">📤</span>
                    <span className="text-xs font-medium">Importer</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const backup = JSON.parse(event.target.result);
                            
                            if (!backup.version || !backup.users || !backup.data) {
                              showAlert('Erreur', 'Fichier de sauvegarde invalide.', 'error');
                              return;
                            }
                            
                            showConfirm(
                              'Restaurer la sauvegarde',
                              `Restaurer la sauvegarde du ${new Date(backup.date).toLocaleString('fr-FR')} ? ⚠️ Cela écrasera toutes les données actuelles !`,
                              () => {
                                SecurityManager.saveSecure('users', backup.users);
                            
                                Object.keys(backup.data).forEach(userId => {
                                  const userData = backup.data[userId];
                                  SecurityManager.saveSecure(`transactions_${userId}`, userData.transactions);
                                  SecurityManager.saveSecure(`categories_${userId}`, userData.categories);
                                  SecurityManager.saveSecure(`brands_${userId}`, userData.brands);
                                  SecurityManager.saveSecure(`savings_${userId}`, userData.savings);
                                });
                            
                                showAlert('Restauration réussie', 'Les données ont été restaurées. La page va se recharger.', 'success');
                                setTimeout(() => window.location.reload(), 1500);
                              }
                            );
                            return;
                          } catch (err) {
                            showAlert('Erreur', 'Erreur lors de la lecture du fichier.', 'error');
                          }
                        };
                        reader.readAsText(file);
                      }}
                            
                    
                    />
                  </label>
                </div>
                
                {/* Liste des sauvegardes */}
                {(() => {
                  const autoBackups = JSON.parse(localStorage.getItem('budgetflow_autoBackups') || '[]');
                  if (autoBackups.length === 0) return (
                    <p className={`text-center py-4 text-sm ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      Aucune sauvegarde disponible
                    </p>
                  );
                  
                  return (
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                      <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        🕐 Sauvegardes disponibles ({autoBackups.length}/5)
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {autoBackups.map((backup, index) => (
                          <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                            <div>
                              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {new Date(backup.date).toLocaleDateString('fr-FR')} à {new Date(backup.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}
                              </p>
                              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {backup.type === 'auto' ? '🔄 Auto' : backup.type === 'manual' ? '💾 Manuelle' : '📤 Export'}
                                {' • '}{Object.keys(backup.data || {}).length} utilisateur(s)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `budgetflow_backup_${new Date(backup.date).toISOString().split('T')[0]}.json`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                title="Télécharger"
                              >
                                📥
                              </button>
                              <button
                                onClick={() => {
                                  showConfirm(
                                    'Restaurer la sauvegarde',
                                    '⚠️ Les données actuelles seront écrasées ! Voulez-vous continuer ?',
                                    () => {
                                      SecurityManager.saveSecure('users', backup.users);
                                      Object.keys(backup.data).forEach(userId => {
                                        const userData = backup.data[userId];
                                        SecurityManager.saveSecure(`transactions_${userId}`, userData.transactions);
                                        SecurityManager.saveSecure(`categories_${userId}`, userData.categories);
                                        SecurityManager.saveSecure(`brands_${userId}`, userData.brands);
                                        SecurityManager.saveSecure(`savings_${userId}`, userData.savings);
                                      });
                                      
                                      alert('✅ Restauration réussie !');
                                      window.location.reload();
                                    }
                                  );
                                }}
                                className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                                title="Restaurer"
                              >
                                ♻️
                              </button>
                              <button
                                onClick={() => {
                                  showConfirm(
                                    'Supprimer la sauvegarde',
                                    'Voulez-vous vraiment supprimer cette sauvegarde ?',
                                    () => {
                                      const backups = JSON.parse(localStorage.getItem('budgetflow_autoBackups') || '[]');
                                      backups.splice(index, 1);
                                      localStorage.setItem('budgetflow_autoBackups', JSON.stringify(backups));
                                      window.location.reload();
                                    }
                                  );
                                }}
                                className={`p-2 rounded-lg ${darkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                title="Supprimer"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            )}

            {/* Gestion des administrateurs */}
            {hasPermission('manage_admins') && (
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>👑 Gestion des administrateurs</h3>
                  <button
                    onClick={() => { setEditingAdmin(null); setShowAdminModal(true); }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
                  >
                    + Ajouter admin
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Super Admin */}
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30' : 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${darkMode ? 'bg-amber-500/30' : 'bg-amber-200'}`}>
                          👑
                        </div>
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{ADMIN_EMAIL}</p>
                          <p className={`text-xs ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Super Administrateur</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                        Tous les droits
                      </span>
                    </div>
                  </div>
                  
                  {/* Autres admins */}
                  {adminList.filter(a => a.email !== ADMIN_EMAIL).map(admin => (
                    <div key={admin.email} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'} group`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${darkMode ? 'bg-purple-500/30' : 'bg-purple-100'}`}>
                            🛡️
                          </div>
                          <div>
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{admin.email}</p>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              Ajouté le {new Date(admin.addedAt).toLocaleDateString('fr-FR')}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {admin.permissions.includes('all') ? (
                                <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                                  Tous les droits
                                </span>
                              ) : (
                                admin.permissions.slice(0, 3).map(p => {
                                  const perm = ADMIN_PERMISSIONS.find(ap => ap.id === p);
                                  return perm && (
                                    <span key={p} className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                                      {perm.icon} {perm.name}
                                    </span>
                                  );
                                })
                              )}
                              {!admin.permissions.includes('all') && admin.permissions.length > 3 && (
                                <span className={`text-xs px-2 py-0.5 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                  +{admin.permissions.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => { setEditingAdmin(admin); setShowAdminModal(true); }}
                            className={`p-2 rounded-lg ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              showConfirm(
                                'Retirer les droits admin',
                                `Voulez-vous vraiment retirer les droits admin de "${admin.email}" ?`,
                                () => setAdminList(prev => prev.filter(a => a.email !== admin.email))
                              );
                            }}
                            className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {adminList.filter(a => a.email !== ADMIN_EMAIL).length === 0 && (
                    <p className={`text-center py-4 text-sm ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      Aucun administrateur supplémentaire
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Gestion des utilisateurs */}
            {hasPermission('manage_users') && (
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>👥 Gestion des utilisateurs</h4>
              </div>
              <div className="space-y-3">
                {(() => {
                  const users = SecurityManager.loadSecure('users') || [];
                  return users.map(user => (
                    <div key={user.id} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'} flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${user.email === ADMIN_EMAIL ? 'bg-amber-500/20' : 'bg-slate-600'}`}>
                          {user.email === ADMIN_EMAIL ? '👑' : '👤'}
                        </div>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{user.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newEmail = prompt('Nouvel email :', user.email);
                            if (!newEmail || newEmail === user.email) return;
                            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                              alert('Email invalide');
                              return;
                            }
                            const users = SecurityManager.loadSecure('users') || [];
                            if (users.find(u => u.email === newEmail.toLowerCase() && u.id !== user.id)) {
                              alert('Cet email est déjà utilisé');
                              return;
                            }
                            const idx = users.findIndex(u => u.id === user.id);
                            if (idx !== -1) {
                              users[idx].email = newEmail.toLowerCase();
                              SecurityManager.saveSecure('users', users);
                              alert('Email modifié !');
                              window.location.reload();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm ${darkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} transition-all`}
                        >
                          ✏️ Email
                        </button>
                        <button
                          onClick={() => {
                            const newPassword = prompt('Nouveau mot de passe (min 8 car., 1 maj., 1 chiffre) :');
                            if (!newPassword) return;
                            if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                              alert('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre');
                              return;
                            }
                            const users = SecurityManager.loadSecure('users') || [];
                            const idx = users.findIndex(u => u.id === user.id);
                            if (idx !== -1) {
                              const newSalt = generateId();
                              users[idx].password = SecurityManager.hashPassword(newPassword, newSalt);
                              users[idx].salt = newSalt;
                              SecurityManager.saveSecure('users', users);
                              alert('Mot de passe modifié !');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm ${darkMode ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'} transition-all`}
                        >
                          🔑 MDP
                        </button>
                        {user.email !== ADMIN_EMAIL && (
                          <button
                            onClick={() => {
                              showConfirm(
                                'Supprimer l\'utilisateur',
                                `Voulez-vous vraiment supprimer "${user.name}" ? Toutes ses données seront perdues.`,
                                () => {
                                  const users = SecurityManager.loadSecure('users') || [];
                                  const filtered = users.filter(u => u.id !== user.id);
                                  SecurityManager.saveSecure('users', filtered);
                                  SecurityManager.removeSecure(`transactions_${user.id}`);
                                  SecurityManager.removeSecure(`categories_${user.id}`);
                                  SecurityManager.removeSecure(`brands_${user.id}`);
                                  alert('Utilisateur supprimé');
                                  window.location.reload();
                                }
                              );
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm ${darkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'} transition-all`}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      <TransactionModal
        allBrands={allBrands}
        showModal={showModal}
        setShowModal={setShowModal}
        modalType={modalType}
        editingTransaction={editingTransaction}
        onSubmit={handleSubmitTransaction}
        onReset={resetForm}
        darkMode={darkMode}
        allCategories={allCategories}
      />
      {/* Modal Détail du jour */}
      {showDayModal && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowDayModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📅 {selectedDay.day} {MONTHS_FR[selectedDay.month]} {selectedDay.year}
                </h3>
                <button onClick={() => setShowDayModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'} transition-all`}>✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>Revenus</p>
                  <p className="text-lg font-bold text-emerald-500">{formatCurrency(selectedDay.income)}</p>
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-rose-500/20' : 'bg-rose-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>Dépenses</p>
                  <p className="text-lg font-bold text-rose-500">{formatCurrency(selectedDay.expense)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {selectedDay.transactions.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span className="text-4xl block mb-2">📭</span>
                  <p>Aucune transaction ce jour</p>
                  <button onClick={() => { setShowDayModal(false); openModal('expense'); }}
                    className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium">
                    + Ajouter une transaction
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDay.transactions.map(t => {
                    const category = getCategoryInfo(t.category);
                    const brand = getBrandInfo(t.brand);
                    return (
                      <div key={t.id} onClick={() => { setShowDayModal(false); handleEditTransaction(t); }}
                        className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} cursor-pointer transition-all`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${category.color}20` }}>
                            {brand?.logo || category.icon}
                          </div>
                          <div>
                            <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{category.name}</p>
                          </div>
                        </div>
                        <p className={`font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedDay.transactions.length > 0 && (
              <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <button onClick={() => { setShowDayModal(false); openModal('expense'); }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium">
                  + Ajouter une transaction
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal d'alerte personnalisé */}
      {alertDialog.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeAlert}>
          <div 
            className={`w-full max-w-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl transform transition-all`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 ${
                alertDialog.type === 'success' ? (darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100') :
                alertDialog.type === 'error' ? (darkMode ? 'bg-rose-500/20' : 'bg-rose-100') :
                (darkMode ? 'bg-amber-500/20' : 'bg-amber-100')
              }`}>
                {alertDialog.type === 'success' ? '✅' : alertDialog.type === 'error' ? '❌' : '⚠️'}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {alertDialog.title}
              </h3>
              <p className={`mb-6 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                {alertDialog.message}
              </p>
              <button
                onClick={closeAlert}
                className={`w-full py-3 rounded-xl font-medium ${
                  alertDialog.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' :
                  alertDialog.type === 'error' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                  'bg-gradient-to-r from-amber-500 to-orange-500'
                } text-white`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'input personnalisé */}
      {inputDialog.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeInput}>
          <div 
            className={`w-full max-w-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {inputDialog.title}
              </h3>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const values = {};
              inputDialog.fields.forEach(field => {
                values[field.name] = field.type === 'number' ? parseFloat(formData.get(field.name)) : formData.get(field.name);
              });
              if (inputDialog.onConfirm) inputDialog.onConfirm(values);
              closeInput();
            }} className="p-4 space-y-4">
              {inputDialog.fields.map(field => (
                <div key={field.name}>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      defaultValue={field.defaultValue || ''}
                      required={field.required}
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                    >
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      name={field.name}
                      defaultValue={field.defaultValue || ''}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={4}
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      defaultValue={field.defaultValue || ''}
                      placeholder={field.placeholder}
                      required={field.required}
                      min={field.min}
                      step={field.step}
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeInput}
                  className={`flex-1 py-3 rounded-xl font-medium ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation personnalisé */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeConfirm}>
          <div 
            className={`w-full max-w-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl transform transition-all`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {confirmDialog.title}
                  </h3>
                </div>
              </div>
              
              <p className={`mb-6 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                {confirmDialog.message}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={closeConfirm}
                  className={`flex-1 py-3 rounded-xl font-medium ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-all`}
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                    closeConfirm();
                  }}
                  className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transition-all"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestion Admin */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAdminModal(false); setEditingAdmin(null); }}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingAdmin ? '✏️ Modifier les droits' : '👑 Ajouter un administrateur'}
                </h3>
                <button onClick={() => { setShowAdminModal(false); setEditingAdmin(null); }} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const email = formData.get('email')?.trim().toLowerCase();
              
              if (!email) return;
              
              if (email === ADMIN_EMAIL) {
                alert('Impossible de modifier le super administrateur');
                return;
              }
              
              const permissions = [];
              ADMIN_PERMISSIONS.forEach(p => {
                if (formData.get(`perm_${p.id}`)) {
                  permissions.push(p.id);
                }
              });
              
              if (formData.get('perm_all')) {
                permissions.length = 0;
                permissions.push('all');
              }
              
              if (permissions.length === 0) {
                alert('Veuillez sélectionner au moins une permission');
                return;
              }
              
              const adminData = {
                email,
                permissions,
                addedAt: editingAdmin?.addedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              if (editingAdmin) {
                setAdminList(prev => prev.map(a => a.email === editingAdmin.email ? adminData : a));
              } else {
                if (adminList.some(a => a.email === email)) {
                  alert('Cet utilisateur est déjà administrateur');
                  return;
                }
                setAdminList(prev => [...prev, adminData]);
              }
              
              setShowAdminModal(false);
              setEditingAdmin(null);
            }} className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Email de l'utilisateur</label>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={editingAdmin?.email || ''}
                  readOnly={!!editingAdmin}
                  placeholder="exemple@email.com"
                  className={`w-full px-4 py-3 rounded-xl border ${editingAdmin ? 'opacity-50 cursor-not-allowed' : ''} ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Permissions</label>
                
                <label className={`flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer ${darkMode ? 'bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20' : 'bg-purple-50 border border-purple-200 hover:bg-purple-100'}`}>
                  <input
                    type="checkbox"
                    name="perm_all"
                    defaultChecked={editingAdmin?.permissions?.includes('all')}
                    className="w-5 h-5 rounded text-purple-500"
                    onChange={(e) => {
                      const checkboxes = e.target.closest('form').querySelectorAll('input[name^="perm_"]:not([name="perm_all"])');
                      checkboxes.forEach(cb => {
                        cb.disabled = e.target.checked;
                        if (e.target.checked) cb.checked = false;
                      });
                    }}
                  />
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>👑 Tous les droits</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Accès complet</p>
                  </div>
                </label>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ADMIN_PERMISSIONS.map(perm => (
                    <label key={perm.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                      <input
                        type="checkbox"
                        name={`perm_${perm.id}`}
                        defaultChecked={editingAdmin?.permissions?.includes(perm.id)}
                        disabled={editingAdmin?.permissions?.includes('all')}
                        className="w-5 h-5 rounded text-emerald-500"
                      />
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{perm.icon} {perm.name}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{perm.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                {editingAdmin ? '✓ Enregistrer' : '+ Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Menu mobile slide-in */}
      {isMobile && mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className={`fixed inset-y-0 left-0 w-72 z-50 ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-2xl transform transition-transform duration-300`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                    <span className="text-xl">💎</span>
                  </div>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>BudgetFlow</span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-2">
                {[
                  { id: 'dashboard', icon: '🏠', label: 'Tableau de bord' },
                  { id: 'transactions', icon: '💳', label: 'Transactions' },
                  { id: 'budgets', icon: '💰', label: 'Budget' },
                  { id: 'calendar', icon: '📅', label: 'Calendrier' },
                  { id: 'statistics', icon: '📊', label: 'Analyse' },
                  { id: 'planning', icon: '🎯', label: 'Planification' },
                  { id: 'shared', icon: '👥', label: 'Budget partagé' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentView(item.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentView === item.id 
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white' 
                        : (darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700')
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
                
                {isAdmin && (
                  <button
                    onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentView === 'admin' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                        : (darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700')
                    }`}
                  >
                    <span className="text-xl">⚙️</span>
                    <span className="font-medium">Administration</span>
                  </button>
                )}
              </div>
              
              <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <button 
                  onClick={() => { setDarkMode(!darkMode); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
                  <span className="font-medium">{darkMode ? 'Mode clair' : 'Mode sombre'}</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <span className="text-xl">🚪</span>
                  <span className="font-medium">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation mobile en bas */}
      {isMobile && (
        <div className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-gray-200'} border-t backdrop-blur-xl z-40`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex justify-around items-center py-2">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`flex flex-col items-center p-2 ${currentView === 'dashboard' ? 'text-emerald-500' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}
            >
              <span className="text-xl">🏠</span>
              <span className="text-[10px] mt-0.5">Accueil</span>
            </button>
            <button 
              onClick={() => setCurrentView('transactions')}
              className={`flex flex-col items-center p-2 ${currentView === 'transactions' ? 'text-emerald-500' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}
            >
              <span className="text-xl">💳</span>
              <span className="text-[10px] mt-0.5">Transactions</span>
            </button>
            <button 
              onClick={() => openModal('expense')}
              className="flex flex-col items-center -mt-5"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/30">
                +
              </div>
            </button>
            <button 
              onClick={() => setCurrentView('budgets')}
              className={`flex flex-col items-center p-2 ${currentView === 'budgets' ? 'text-emerald-500' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}
            >
              <span className="text-xl">💰</span>
              <span className="text-[10px] mt-0.5">Budget</span>
            </button>
            <button 
              onClick={() => setCurrentView('statistics')}
              className={`flex flex-col items-center p-2 ${currentView === 'statistics' ? 'text-emerald-500' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}
            >
              <span className="text-xl">📊</span>
              <span className="text-[10px] mt-0.5">Stats</span>
            </button>
          </div>
        </div>
      )}

      {/* Notification nouveau badge */}
      {newAchievement && (
        <div className="fixed top-4 right-4 z-[100] animate-bounce">
          <div className={`p-4 rounded-2xl shadow-2xl ${darkMode ? 'bg-gradient-to-r from-amber-600 to-yellow-500' : 'bg-gradient-to-r from-amber-400 to-yellow-300'} text-white max-w-sm`}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{newAchievement.icon}</span>
              <div>
                <p className="font-bold text-lg">🎉 Nouveau badge !</p>
                <p className="font-semibold">{newAchievement.name}</p>
                <p className="text-sm opacity-90">{newAchievement.description}</p>
                <p className="text-xs mt-1">+{newAchievement.points} points</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Achievements */}
      {showAchievementsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAchievementsModal(false)}>
          <div className={`w-full max-w-2xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏆 Succès et Badges</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {achievements.unlocked.length} / {ALL_ACHIEVEMENTS.length} débloqués
                  </p>
                </div>
                <button onClick={() => setShowAchievementsModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20' : 'bg-gradient-to-br from-orange-100 to-red-100'}`}>
                  <p className="text-3xl mb-1">🔥</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{achievements.streak}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Jours de streak</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20' : 'bg-gradient-to-br from-yellow-100 to-amber-100'}`}>
                  <p className="text-3xl mb-1">⭐</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{achievements.points}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Points totaux</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20' : 'bg-gradient-to-br from-emerald-100 to-cyan-100'}`}>
                  <p className="text-3xl mb-1">🏅</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{achievements.unlocked.length}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Badges obtenus</p>
                </div>
              </div>
              
              {/* Barre de progression globale */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Progression</span>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {Math.round((achievements.unlocked.length / ALL_ACHIEVEMENTS.length) * 100)}%
                  </span>
                </div>
                <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden`}>
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                    style={{ width: `${(achievements.unlocked.length / ALL_ACHIEVEMENTS.length) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Liste par catégorie */}
              {['beginner', 'streak', 'savings', 'budget', 'transactions', 'categories', 'special'].map(category => {
                const categoryAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === category);
                const categoryNames = {
                  beginner: '🌱 Premiers pas',
                  streak: '🔥 Régularité',
                  savings: '💰 Épargne',
                  budget: '📊 Budget',
                  transactions: '📝 Transactions',
                  categories: '🏷️ Catégories',
                  special: '⭐ Spéciaux'
                };
                
                return (
                  <div key={category} className="mb-6">
                    <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {categoryNames[category]}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categoryAchievements.map(achievement => {
                        const isUnlocked = achievements.unlocked.includes(achievement.id);
                        return (
                          <div 
                            key={achievement.id} 
                            className={`p-3 rounded-xl transition-all ${
                              isUnlocked 
                                ? (darkMode ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200')
                                : (darkMode ? 'bg-slate-700/30 opacity-50' : 'bg-gray-100 opacity-50')
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className={`text-2xl ${!isUnlocked && 'grayscale'}`}>{achievement.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {achievement.name}
                                </p>
                                <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                  {achievement.description}
                                </p>
                                <p className={`text-xs mt-1 ${isUnlocked ? 'text-amber-400' : (darkMode ? 'text-slate-500' : 'text-gray-400')}`}>
                                  {isUnlocked ? '✓ Débloqué' : `${achievement.points} pts`}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Simulateur d'épargne */}
      {showSimulator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSimulator(false)}>
          <div className={`w-full max-w-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🧮 Simulateur d'épargne</h3>
                <button onClick={() => setShowSimulator(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <div className="p-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const goal = parseFloat(formData.get('goal')) || 0;
                const monthly = parseFloat(formData.get('monthly')) || 0;
                const initial = parseFloat(formData.get('initial')) || 0;
                const rate = parseFloat(formData.get('rate')) || 0;
                
                if (goal <= 0 || monthly <= 0) return;
                
                let current = initial;
                let months = 0;
                const monthlyRate = rate / 100 / 12;
                
                while (current < goal && months < 600) {
                  current = current * (1 + monthlyRate) + monthly;
                  months++;
                }
                
                const years = Math.floor(months / 12);
                const remainingMonths = months % 12;
                const totalSaved = initial + (monthly * months);
                const interestEarned = current - totalSaved;
                
                const resultDiv = e.target.querySelector('#simulatorResult');
                resultDiv.innerHTML = `
                  <div class="p-4 rounded-xl ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-50'} space-y-2">
                    <p class="${darkMode ? 'text-emerald-400' : 'text-emerald-600'} font-semibold text-lg">
                      ✅ Objectif atteint en ${years > 0 ? `${years} an(s) et ` : ''}${remainingMonths} mois
                    </p>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p class="${darkMode ? 'text-slate-400' : 'text-gray-500'}">Total épargné</p>
                        <p class="${darkMode ? 'text-white' : 'text-gray-900'} font-medium">${formatCurrency(totalSaved)}</p>
                      </div>
                      <div>
                        <p class="${darkMode ? 'text-slate-400' : 'text-gray-500'}">Intérêts gagnés</p>
                        <p class="text-emerald-400 font-medium">${formatCurrency(interestEarned)}</p>
                      </div>
                      <div>
                        <p class="${darkMode ? 'text-slate-400' : 'text-gray-500'}">Montant final</p>
                        <p class="text-cyan-400 font-medium">${formatCurrency(current)}</p>
                      </div>
                      <div>
                        <p class="${darkMode ? 'text-slate-400' : 'text-gray-500'}">Date estimée</p>
                        <p class="${darkMode ? 'text-white' : 'text-gray-900'} font-medium">${MONTHS_FR[(new Date().getMonth() + months) % 12]} ${new Date().getFullYear() + Math.floor((new Date().getMonth() + months) / 12)}</p>
                      </div>
                    </div>
                  </div>
                `;
              }} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>🎯 Objectif à atteindre (€)</label>
                  <input type="number" name="goal" required min="1" placeholder="10000" className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>💰 Épargne mensuelle (€)</label>
                  <input type="number" name="monthly" required min="1" placeholder="200" className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>💵 Capital initial (€)</label>
                    <input type="number" name="initial" defaultValue={savings} min="0" className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>📈 Taux annuel (%)</label>
                    <input type="number" name="rate" defaultValue="2" min="0" max="20" step="0.1" className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                </div>
                
                <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold">
                  🧮 Calculer
                </button>
                
                <div id="simulatorResult"></div>
              </form>
            </div>
          </div>
        </div>
      )}

    {/* Modal Gestion des dettes */}
      {showDebtModal && (
        <div key={editingDebt?.id || 'new'} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowDebtModal(false); setEditingDebt(null); }}>
          <div className={`w-full max-w-2xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingDebt ? '✏️ Modifier la dette' : '💳 Ajouter une dette/crédit'}
                </h3>
                <button onClick={() => { setShowDebtModal(false); setEditingDebt(null); }} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              
              // Récupérer l'échéancier
              const scheduleRows = e.target.querySelectorAll('[data-schedule-row]');
              const schedule = [];
              scheduleRows.forEach((row, index) => {
                const date = row.querySelector('[name="schedule_date"]')?.value;
                const amount = parseFloat(row.querySelector('[name="schedule_amount"]')?.value) || 0;
                const paid = row.querySelector('[name="schedule_paid"]')?.checked || false;
                if (date && amount > 0) {
                  schedule.push({
                    id: editingDebt?.schedule?.[index]?.id || generateId(),
                    month: index + 1,
                    date,
                    amount,
                    paid,
                    paidDate: paid ? (editingDebt?.schedule?.[index]?.paidDate || new Date().toISOString()) : null
                  });
                }
              });
              
              const debt = {
                id: editingDebt?.id || generateId(),
                name: formData.get('name'),
                icon: formData.get('icon') || '💳',
                creditor: formData.get('creditor'),
                totalAmount: parseFloat(formData.get('totalAmount')),
                interestRate: parseFloat(formData.get('interestRate')) || 0,
                startDate: formData.get('startDate'),
                duration: parseInt(formData.get('duration')) || 12,
                schedule: schedule,
                notes: formData.get('notes'),
                createdAt: editingDebt?.createdAt || new Date().toISOString()
              };
              
              if (editingDebt) {
                setDebts(prev => prev.map(d => d.id === editingDebt.id ? debt : d));
              } else {
                setDebts(prev => [...prev, debt]);
              }
              
              setShowDebtModal(false);
              setEditingDebt(null);
            }} className="p-4 overflow-y-auto max-h-[75vh]">
              <div className="space-y-4">
                {/* Infos de base */}
                <div className="flex gap-3">
                  <div className="w-20">
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Icône</label>
                    <select name="icon" defaultValue={editingDebt?.icon || '💳'} className={`w-full px-3 py-3 rounded-xl border text-center text-xl ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      {['💳', '🏠', '🚗', '📱', '💻', '🎓', '🏥', '✈️', '🛒', '💰', '🏦', '📺'].map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nom du crédit</label>
                    <input type="text" name="name" required defaultValue={editingDebt?.name || ''} placeholder="Crédit voiture, Prêt immobilier..." className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Créancier / Banque</label>
                  <input type="text" name="creditor" defaultValue={editingDebt?.creditor || ''} placeholder="BNP, Crédit Agricole, Cetelem..." className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Montant total (€)</label>
                    <input type="number" name="totalAmount" required min="1" step="0.01" defaultValue={editingDebt?.totalAmount || ''} placeholder="15000" className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Taux (%)</label>
                    <input type="number" name="interestRate" min="0" max="100" step="0.01" defaultValue={editingDebt?.interestRate || ''} placeholder="4.5" className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Date 1ère échéance</label>
                    <input type="date" name="startDate" defaultValue={editingDebt?.startDate || new Date().toISOString().split('T')[0]} className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Durée (mois)</label>
                    <input type="number" name="duration" min="1" max="360" defaultValue={editingDebt?.duration || 12} id="debtDuration" className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                </div>
                
                {/* Boutons échéancier */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      const form = e.target.closest('form');
                      const totalAmount = parseFloat(form.querySelector('[name="totalAmount"]').value) || 0;
                      const duration = parseInt(form.querySelector('[name="duration"]').value) || 12;
                      const startDate = form.querySelector('[name="startDate"]').value;
                      const interestRate = parseFloat(form.querySelector('[name="interestRate"]').value) || 0;
                      
                      if (!totalAmount || !startDate) {
                        alert('Veuillez remplir le montant total et la date de début');
                        return;
                      }
                      
                      // Calcul mensualité avec intérêts
                      let monthlyPayment;
                      if (interestRate > 0) {
                        const monthlyRate = interestRate / 100 / 12;
                        monthlyPayment = (totalAmount * monthlyRate * Math.pow(1 + monthlyRate, duration)) / (Math.pow(1 + monthlyRate, duration) - 1);
                      } else {
                        monthlyPayment = totalAmount / duration;
                      }
                      
                      const scheduleContainer = form.querySelector('#scheduleContainer');
                      const start = new Date(startDate);
                      
                      let html = '';
                      for (let i = 0; i < duration; i++) {
                        const paymentDate = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
                        const isPast = paymentDate < new Date();
                        
                        html += `
                          <div data-schedule-row class="flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}">
                            <span class="w-8 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}">#${i + 1}</span>
                            <input type="date" name="schedule_date" value="${paymentDate.toISOString().split('T')[0]}" class="flex-1 px-2 py-1 rounded-lg border text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}" />
                            <input type="number" name="schedule_amount" value="${monthlyPayment.toFixed(2)}" step="0.01" min="0" class="w-24 px-2 py-1 rounded-lg border text-sm text-right ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}" />
                            <span class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-400'}">€</span>
                            <label class="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" name="schedule_paid" ${isPast ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-500" />
                              <span class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}">Payé</span>
                            </label>
                          </div>
                        `;
                      }
                      
                      scheduleContainer.innerHTML = html;
                      
                      // Afficher le résumé
                      const totalWithInterest = monthlyPayment * duration;
                      const totalInterest = totalWithInterest - totalAmount;
                      form.querySelector('#scheduleInfo').innerHTML = `
                        <div class="grid grid-cols-3 gap-2 text-center">
                          <div class="${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'} p-2 rounded-lg">
                            <p class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}">Mensualité</p>
                            <p class="font-bold ${darkMode ? 'text-white' : 'text-gray-900'}">${formatCurrency(monthlyPayment)}</p>
                          </div>
                          <div class="${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'} p-2 rounded-lg">
                            <p class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}">Coût total</p>
                            <p class="font-bold text-amber-400">${formatCurrency(totalWithInterest)}</p>
                          </div>
                          <div class="${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'} p-2 rounded-lg">
                            <p class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}">Intérêts</p>
                            <p class="font-bold text-rose-400">${formatCurrency(totalInterest)}</p>
                          </div>
                        </div>
                      `;
                    }}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm"
                  >
                    🧮 Générer
                  </button>
                  
                  {/* Import PDF/CSV */}
                  <label className={`flex-1 py-2 rounded-xl ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} font-medium text-sm cursor-pointer text-center`}>
                    📄 Importer
                    <input
                      type="file"
                      accept=".pdf,.csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        const form = e.target.closest('form');
                        const scheduleContainer = form.querySelector('#scheduleContainer');
                        
                        const reader = new FileReader();
                        
                        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                          reader.onload = (event) => {
                            const text = event.target.result;
                            const lines = text.split('\n').filter(l => l.trim());
                            const schedule = [];
                            
                            lines.forEach(line => {
                              // Format attendu: date;montant ou date,montant
                              const parts = line.split(/[;,\t]/).map(p => p.trim());
                              if (parts.length >= 2) {
                                const dateStr = parts[0];
                                const amount = parseFloat(parts[1].replace(',', '.').replace(/[^\d.-]/g, ''));
                                
                                if (!isNaN(amount) && amount > 0) {
                                  // Essayer de parser la date
                                  let date;
                                  if (dateStr.includes('/')) {
                                    const [d, m, y] = dateStr.split('/');
                                    date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                                  } else {
                                    date = dateStr;
                                  }
                                  schedule.push({ date, amount });
                                }
                              }
                            });
                            
                            if (schedule.length > 0) {
                              let html = '';
                              const now = new Date();
                              schedule.forEach((row, i) => {
                                const isPast = new Date(row.date) < now;
                                html += `
                                  <div data-schedule-row class="flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}">
                                    <span class="w-8 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}">#${i + 1}</span>
                                    <input type="date" name="schedule_date" value="${row.date}" class="flex-1 px-2 py-1 rounded-lg border text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}" />
                                    <input type="number" name="schedule_amount" value="${row.amount.toFixed(2)}" step="0.01" min="0" class="w-24 px-2 py-1 rounded-lg border text-sm text-right ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}" />
                                    <span class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-400'}">€</span>
                                    <label class="flex items-center gap-1 cursor-pointer">
                                      <input type="checkbox" name="schedule_paid" ${isPast ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-500" />
                                      <span class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}">Payé</span>
                                    </label>
                                  </div>
                                `;
                              });
                              scheduleContainer.innerHTML = html;
                              
                              // Mettre à jour les champs
                              const totalAmount = schedule.reduce((s, r) => s + r.amount, 0);
                              form.querySelector('[name="totalAmount"]').value = totalAmount.toFixed(2);
                              form.querySelector('[name="duration"]').value = schedule.length;
                              form.querySelector('[name="startDate"]').value = schedule[0].date;
                              
                              alert(`✅ ${schedule.length} échéances importées !`);
                            } else {
                              alert('❌ Aucune échéance trouvée dans le fichier');
                            }
                          };
                          reader.readAsText(file);
                        } else if (file.name.endsWith('.pdf')) {
                          alert('📋 Pour importer un PDF, copiez le tableau d\'amortissement et collez-le ci-dessous.\n\nFormat attendu:\nDate;Montant (une ligne par échéance)\n\nExemple:\n05/09/2023;325.41\n05/10/2023;325.41');
                        }
                        
                        e.target.value = '';
                      }}
                    />
                  </label>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      const form = e.target.closest('form');
                      const scheduleContainer = form.querySelector('#scheduleContainer');
                      const currentRows = scheduleContainer.querySelectorAll('[data-schedule-row]').length;
                      const lastRow = scheduleContainer.querySelector('[data-schedule-row]:last-child');
                      const lastDate = lastRow?.querySelector('[name="schedule_date"]')?.value || new Date().toISOString().split('T')[0];
                      const nextDate = new Date(lastDate);
                      nextDate.setMonth(nextDate.getMonth() + 1);
                      
                      const newRow = document.createElement('div');
                      newRow.setAttribute('data-schedule-row', '');
                      newRow.className = `flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`;
                      newRow.innerHTML = `
                        <span class="w-8 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}">#${currentRows + 1}</span>
                        <input type="date" name="schedule_date" value="${nextDate.toISOString().split('T')[0]}" class="flex-1 px-2 py-1 rounded-lg border text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}" />
                        <input type="number" name="schedule_amount" value="" step="0.01" min="0" placeholder="0.00" class="w-24 px-2 py-1 rounded-lg border text-sm text-right ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}" />
                        <span class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-400'}">€</span>
                        <label class="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" name="schedule_paid" class="w-4 h-4 rounded text-emerald-500" />
                          <span class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}">Payé</span>
                        </label>
                        <button type="button" onclick="this.parentElement.remove()" class="p-1 rounded text-rose-400 hover:bg-rose-500/20">✕</button>
                      `;
                      scheduleContainer.appendChild(newRow);
                    }}
                    className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} text-sm`}
                  >
                    + Ligne
                  </button>
                </div>
                
                {/* Zone de collage pour PDF */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    📋 Coller un tableau d'amortissement (depuis PDF)
                  </label>
                  <textarea
                    placeholder="Copiez le tableau depuis votre PDF et collez-le ici...&#10;Format accepté: ECHEANCE 05/09/2023 3,7200 325,41..."
                    rows="3"
                    className={`w-full px-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 placeholder-gray-400'}`}
                    onPaste={(e) => {
                      setTimeout(() => {
                        const text = e.target.value;
                        const form = e.target.closest('form');
                        const scheduleContainer = form.querySelector('#scheduleContainer');
                        
                        // Parser le format Crédit Agricole
                        const lines = text.split('\n').filter(l => l.includes('ECHEANCE'));
                        const schedule = [];
                        
                        lines.forEach(line => {
                          // Format: ECHEANCE 05/09/2023 3,7200 325,41 186,41 107,61 44 651,59
                          const match = line.match(/ECHEANCE\s+(\d{2}\/\d{2}\/\d{4})\s+[\d,]+\s+([\d,]+)/);
                          if (match) {
                            const [d, m, y] = match[1].split('/');
                            const date = `${y}-${m}-${d}`;
                            const amount = parseFloat(match[2].replace(',', '.'));
                            if (!isNaN(amount)) {
                              schedule.push({ date, amount });
                            }
                          }
                        });
                        
                        if (schedule.length > 0) {
                          let html = '';
                          const now = new Date();
                          schedule.forEach((row, i) => {
                            const isPast = new Date(row.date) < now;
                            html += `
                              <div data-schedule-row class="flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}">
                                <span class="w-8 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}">#${i + 1}</span>
                                <input type="date" name="schedule_date" value="${row.date}" class="flex-1 px-2 py-1 rounded-lg border text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}" />
                                <input type="number" name="schedule_amount" value="${row.amount.toFixed(2)}" step="0.01" min="0" class="w-24 px-2 py-1 rounded-lg border text-sm text-right ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}" />
                                <span class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-400'}">€</span>
                                <label class="flex items-center gap-1 cursor-pointer">
                                  <input type="checkbox" name="schedule_paid" ${isPast ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-500" />
                                  <span class="text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}">Payé</span>
                                </label>
                              </div>
                            `;
                          });
                          scheduleContainer.innerHTML = html;
                          
                          // Mettre à jour les champs
                          const totalAmount = schedule.reduce((s, r) => s + r.amount, 0);
                          form.querySelector('[name="totalAmount"]').value = totalAmount.toFixed(2);
                          form.querySelector('[name="duration"]').value = schedule.length;
                          form.querySelector('[name="startDate"]').value = schedule[0].date;
                          
                          // Vider le textarea
                          e.target.value = '';
                          
                          // Info
                          const paidCount = schedule.filter(r => new Date(r.date) < now).length;
                          form.querySelector('#scheduleInfo').innerHTML = `
                            <div class="p-3 rounded-lg ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-50'} text-center">
                              <p class="${darkMode ? 'text-emerald-400' : 'text-emerald-600'} font-medium">
                                ✅ ${schedule.length} échéances importées (${paidCount} déjà payées)
                              </p>
                            </div>
                          `;
                        } else if (text.trim()) {
                          alert('❌ Format non reconnu. Assurez-vous de copier les lignes "ECHEANCE" du tableau.');
                        }
                      }, 100);
                    }}
                  />
                </div>
                
                {/* Info échéancier */}
                <div id="scheduleInfo">
                  {editingDebt?.schedule && editingDebt.schedule.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className={`${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'} p-2 rounded-lg`}>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Mensualité moy.</p>
                        <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(editingDebt.schedule.reduce((s, r) => s + r.amount, 0) / editingDebt.schedule.length)}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'} p-2 rounded-lg`}>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total échéances</p>
                        <p className="font-bold text-amber-400">{formatCurrency(editingDebt.schedule.reduce((s, r) => s + r.amount, 0))}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'} p-2 rounded-lg`}>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Payé</p>
                        <p className="font-bold text-emerald-400">{formatCurrency(editingDebt.schedule.filter(r => r.paid).reduce((s, r) => s + r.amount, 0))}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Échéancier */}
                <div>
                  <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>📋 Échéancier</p>
                  <div id="scheduleContainer" className="space-y-1 max-h-64 overflow-y-auto">
                    {editingDebt?.schedule?.map((row, index) => (
                      <div key={row.id} data-schedule-row className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                        <span className={`w-8 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>#{index + 1}</span>
                        <input type="date" name="schedule_date" defaultValue={row.date} className={`flex-1 px-2 py-1 rounded-lg border text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`} />
                        <input type="number" name="schedule_amount" defaultValue={row.amount} step="0.01" min="0" className={`w-24 px-2 py-1 rounded-lg border text-sm text-right ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`} />
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>€</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" name="schedule_paid" defaultChecked={row.paid} className="w-4 h-4 rounded text-emerald-500" />
                          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Payé</span>
                        </label>
                      </div>
                    )) || (
                      <p className={`text-center py-4 text-sm ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        Cliquez sur "Générer l'échéancier" ou "+ Ligne"
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Notes */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>📝 Notes</label>
                  <textarea name="notes" rows="2" defaultValue={editingDebt?.notes || ''} placeholder="Infos complémentaires..." className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                </div>
                
                <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold">
                  {editingDebt ? '✓ Enregistrer les modifications' : '+ Ajouter le crédit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Budget prévisionnel */}
      {showPlannedBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlannedBudgetModal(false)}>
          <div className={`w-full max-w-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📅 Budget prévisionnel - {MONTHS_FR[(new Date().getMonth() + 1) % 12]}
                </h3>
                <button onClick={() => setShowPlannedBudgetModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const budget = {
                expectedIncome: parseFloat(formData.get('expectedIncome')) || 0,
                expectedExpenses: parseFloat(formData.get('expectedExpenses')) || 0,
                plannedSavings: parseFloat(formData.get('plannedSavings')) || 0,
                categories: {},
                notes: formData.get('notes') || '',
                month: (new Date().getMonth() + 1) % 12,
                year: new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()
              };
              
              allCategories.filter(c => c.type === 'expense').forEach(cat => {
                const value = parseFloat(formData.get(`cat_${cat.id}`)) || 0;
                if (value > 0) budget.categories[cat.id] = value;
              });
              
              setPlannedBudget(budget);
              setShowPlannedBudgetModal(false);
            }} className="p-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                {/* Revenus et dépenses globaux */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>💵 Revenus prévus</label>
                    <input type="number" name="expectedIncome" min="0" step="0.01" defaultValue={plannedBudget.expectedIncome || ''} placeholder="2500" className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>💸 Dépenses prévues</label>
                    <input type="number" name="expectedExpenses" min="0" step="0.01" defaultValue={plannedBudget.expectedExpenses || ''} placeholder="1800" className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>🏦 Épargne prévue</label>
                    <input type="number" name="plannedSavings" min="0" step="0.01" defaultValue={plannedBudget.plannedSavings || ''} placeholder="300" className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
                  </div>
                </div>
                
                {/* Répartition par catégorie */}
                <div>
                  <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Répartition par catégorie (optionnel)</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allCategories.filter(c => c.type === 'expense').map(cat => (
                      <div key={cat.id} className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                        <span className="text-lg w-6">{cat.icon}</span>
                        <span className={`flex-1 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{cat.name}</span>
                        <input
                          type="number"
                          name={`cat_${cat.id}`}
                          min="0"
                          step="0.01"
                          defaultValue={plannedBudget.categories?.[cat.id] || ''}
                          placeholder="0"
                          className={`w-20 px-2 py-1 rounded-lg border text-right text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                        />
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>€</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Notes */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>📝 Notes</label>
                  <textarea
                    name="notes"
                    rows="2"
                    defaultValue={plannedBudget.notes || ''}
                    placeholder="Dépenses exceptionnelles prévues, objectifs..."
                    className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      showConfirm(
                        'Réinitialiser le budget',
                        'Voulez-vous vraiment réinitialiser le budget prévisionnel ?',
                        () => {
                          setPlannedBudget({});
                          setShowPlannedBudgetModal(false);
                        }
                      );
                    }}
                    className={`flex-1 py-3 rounded-xl ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  >
                    Réinitialiser
                  </button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold">
                    ✓ Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gérer Budgets */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowBudgetModal(false)}>
          <div className={`w-full max-w-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Budgets par catégorie</h3>
                <button onClick={() => setShowBudgetModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Définissez une limite mensuelle pour chaque catégorie
              </p>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {allCategories.filter(c => c.type === 'expense').map(category => (
                  <div key={category.id} className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <span className="text-xl w-8">{category.icon}</span>
                    <span className={`flex-1 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{category.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={categoryBudgets[category.id] || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (e.target.value === '' || isNaN(value)) {
                            setCategoryBudgets(prev => {
                              const newBudgets = {...prev};
                              delete newBudgets[category.id];
                              return newBudgets;
                            });
                          } else {
                            setCategoryBudgets(prev => ({...prev, [category.id]: value}));
                          }
                        }}
                        placeholder="0"
                        className={`w-24 px-3 py-2 rounded-lg border text-right ${darkMode ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900'}`}
                      />
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>€</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Boutons rapides */}
              <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <p className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Actions rapides</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      showInput('Budget par défaut', [
                        { name: 'budget', label: 'Montant pour toutes les catégories (€)', type: 'number', placeholder: '100', required: true, min: 0, step: '0.01' }
                      ], (values) => {
                        if (values.budget && !isNaN(values.budget)) {
                          const newBudgets = {};
                          allCategories.filter(c => c.type === 'expense').forEach(c => {
                            newBudgets[c.id] = values.budget;
                          });
                          setCategoryBudgets(newBudgets);
                        }
                      });
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  >
                    Appliquer à toutes
                  </button>
                  <button
                    onClick={() => {
                      showConfirm(
                        'Effacer tous les budgets',
                        'Voulez-vous vraiment supprimer tous les budgets par catégorie ?',
                        () => setCategoryBudgets({})
                      );
                    }}
                    className="flex-1 py-2 rounded-lg text-sm bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                  >
                    Tout effacer
                  </button>
                </div>
              </div>
            </div>
            
            <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Budget total mensuel</span>
                <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(Object.values(categoryBudgets).reduce((s, b) => s + (parseFloat(b) || 0), 0))}
                </span>
              </div>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
              >
                ✓ Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Objectif d'épargne */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowGoalModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingGoal ? '✏️ Modifier l\'objectif' : '🎯 Nouvel objectif'}
                </h3>
                <button onClick={() => setShowGoalModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const goal = {
                id: editingGoal?.id || generateId(),
                name: formData.get('name'),
                icon: formData.get('icon') || '🎯',
                target: parseFloat(formData.get('target')),
                current: parseFloat(formData.get('current')) || editingGoal?.current || 0,
                targetDate: formData.get('targetDate') || null,
                createdAt: editingGoal?.createdAt || new Date().toISOString()
              };
              
              if (editingGoal) {
                setSavingsGoals(prev => prev.map(g => g.id === editingGoal.id ? goal : g));
              } else {
                setSavingsGoals(prev => [...prev, goal]);
              }
              
              setShowGoalModal(false);
              setEditingGoal(null);
            }} className="p-4 space-y-4">
              {/* Icône et Nom */}
              <div className="flex gap-3">
                <div className="w-20">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Icône</label>
                  <select
                    name="icon"
                    defaultValue={editingGoal?.icon || '🎯'}
                    className={`w-full px-3 py-3 rounded-xl border text-center text-xl ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                  >
                    {['🎯', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '👶', '🏖️', '🎸', '📷', '🎮', '💪', '🎁', '💎'].map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nom de l'objectif</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingGoal?.name || ''}
                    placeholder="Ex: Vacances été 2025"
                    className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
              </div>
              
              {/* Montant cible */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Montant cible (€)</label>
                <input
                  type="number"
                  name="target"
                  required
                  min="1"
                  step="0.01"
                  defaultValue={editingGoal?.target || ''}
                  placeholder="5000"
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
              
              {/* Montant actuel (si édition) */}
              {editingGoal && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Montant actuel (€)</label>
                  <input
                    type="number"
                    name="current"
                    min="0"
                    step="0.01"
                    defaultValue={editingGoal?.current || 0}
                    className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
              )}
              
              {/* Date cible */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Date cible <span className={`font-normal ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>(optionnel)</span>
                </label>
                <input
                  type="date"
                  name="targetDate"
                  defaultValue={editingGoal?.targetDate || ''}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
              >
                {editingGoal ? '✓ Modifier' : '+ Créer l\'objectif'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Templates / Transactions Rapides */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowTemplatesModal(false); setShowNewTemplateForm(false); setEditingTemplate(null); }}>
          <div className={`w-full max-w-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>⚡ Transactions rapides</h3>
                <button onClick={() => { setShowTemplatesModal(false); setShowNewTemplateForm(false); setEditingTemplate(null); }} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Ajoutez une transaction en un clic
              </p>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[65vh]">
              {/* Formulaire nouveau/édition template */}
              {(showNewTemplateForm || editingTemplate) ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const template = {
                    id: editingTemplate?.id || generateId(),
                    name: formData.get('name'),
                    amount: parseFloat(formData.get('amount')),
                    type: formData.get('type'),
                    category: formData.get('category'),
                    brand: formData.get('brand') || '',
                    recurring: formData.get('recurring') === 'on',
                    isFixedExpense: formData.get('isFixedExpense') === 'on'
                  };
                  
                  if (editingTemplate) {
                    setQuickTemplates(prev => prev.map(t => t.id === editingTemplate.id ? template : t));
                  } else {
                    setQuickTemplates(prev => [...prev, template]);
                  }
                  
                  setShowNewTemplateForm(false);
                  setEditingTemplate(null);
                }} className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {editingTemplate ? '✏️ Modifier le template' : '➕ Nouveau template'}
                    </h4>
                    <button 
                      type="button"
                      onClick={() => { setShowNewTemplateForm(false); setEditingTemplate(null); }}
                      className={`text-sm ${darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      ← Retour
                    </button>
                  </div>
                  
                  {/* Nom */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nom</label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={editingTemplate?.name || ''}
                      placeholder="Ex: Courses Carrefour"
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`}
                    />
                  </div>
                  
                  {/* Montant et Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Montant (€)</label>
                      <input
                        type="number"
                        name="amount"
                        required
                        min="0.01"
                        step="0.01"
                        defaultValue={editingTemplate?.amount || ''}
                        placeholder="0.00"
                        className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Type</label>
                      <select
                        name="type"
                        defaultValue={editingTemplate?.type || 'expense'}
                        className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                        onChange={(e) => {
                          const categorySelect = e.target.form.querySelector('[name="category"]');
                          const firstOption = e.target.value === 'income' ? 'salary' : 'food';
                          categorySelect.value = firstOption;
                        }}
                      >
                        <option value="expense">💸 Dépense</option>
                        <option value="income">💵 Revenu</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Catégorie */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Catégorie</label>
                    <select
                      name="category"
                      defaultValue={editingTemplate?.category || 'food'}
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <optgroup label="📥 Revenus">
                        {allCategories.filter(c => c.type === 'income').map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="📤 Dépenses">
                        {allCategories.filter(c => c.type === 'expense').map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  
                  {/* Marque */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Marque (optionnel)</label>
                    <select
                      name="brand"
                      defaultValue={editingTemplate?.brand || ''}
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <option value="">Aucune marque</option>
                      {allBrands.map(brand => (
                        <option key={brand.id} value={brand.id}>{brand.logo} {brand.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Options */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="recurring"
                        defaultChecked={editingTemplate?.recurring || false}
                        className="w-4 h-4 rounded text-emerald-500"
                      />
                      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>🔄 Récurrent</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isFixedExpense"
                        defaultChecked={editingTemplate?.isFixedExpense || false}
                        className="w-4 h-4 rounded text-emerald-500"
                      />
                      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>📌 Charge fixe</span>
                    </label>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
                  >
                    {editingTemplate ? '✓ Enregistrer' : '+ Créer le template'}
                  </button>
                </form>
              ) : (
                <>
                  {/* Liste des templates */}
                  {quickTemplates.length === 0 ? (
                    <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      <span className="text-4xl block mb-2">⚡</span>
                      <p className="mb-2">Aucun template</p>
                      <p className="text-xs">Créez un template pour ajouter des transactions rapidement</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quickTemplates.map(template => {
                        const category = getCategoryInfo(template.category);
                        const brand = getBrandInfo(template.brand);
                        return (
                          <div key={template.id} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} transition-all group`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                                  template.type === 'income' 
                                    ? (darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100')
                                    : (darkMode ? 'bg-rose-500/20' : 'bg-rose-100')
                                }`}>
                                  {brand?.logo || category.icon}
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{template.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm font-semibold ${template.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {template.type === 'income' ? '+' : '-'}{formatCurrency(template.amount)}
                                    </p>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                                      {category.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const newTransaction = {
                                      id: generateId(),
                                      name: template.name,
                                      amount: template.amount,
                                      type: template.type,
                                      category: template.category,
                                      brand: template.brand,
                                      recurring: template.recurring,
                                      isFixedExpense: template.isFixedExpense,
                                      date: new Date().toISOString().split('T')[0],
                                      createdAt: new Date().toISOString()
                                    };
                                    setTransactions(prev => [...prev, newTransaction]);
                                    setShowTemplatesModal(false);
                                  }}
                                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium"
                                >
                                  + Ajouter
                                </button>
                                <button
                                  onClick={() => setEditingTemplate(template)}
                                  className={`p-2 rounded-lg ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'} opacity-0 group-hover:opacity-100 transition-all`}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => {
                                    showConfirm(
                                      'Supprimer le template',
                                      `Voulez-vous supprimer "${template.name}" ?`,
                                      () => setQuickTemplates(prev => prev.filter(t => t.id !== template.id))
                                    );
                                  }}
                                  className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Bouton créer */}
                  <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    <button
                      onClick={() => setShowNewTemplateForm(true)}
                      className={`w-full py-3 rounded-xl ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} font-medium transition-all flex items-center justify-center gap-2`}
                    >
                      <span>➕</span> Créer un template
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer Budget Partagé */}
      {showCreateSharedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateSharedBudget(false)}>
          <div className={`w-full max-w-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>✨ Créer un budget partagé</h3>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const name = e.target.budgetName.value.trim();
              if (!name) return;
              const budget = createSharedBudget(name);
              setShowCreateSharedBudget(false);
              showAlert('Budget créé', `Le budget "${name}" a été créé.\n\nCode d'invitation : ${budget.inviteCode}`, 'success');
            }} className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nom du budget</label>
                <input
                  type="text"
                  name="budgetName"
                  required
                  placeholder="Ex: Budget Famille"
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold">
                Créer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rejoindre Budget Partagé */}
      {showJoinSharedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowJoinSharedBudget(false)}>
          <div className={`w-full max-w-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔗 Rejoindre un budget</h3>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const code = e.target.inviteCode.value.trim().toUpperCase();
              if (!code) return;
              const result = joinSharedBudget(code);
              if (result.success) {
                setShowJoinSharedBudget(false);
                showAlert('Succès', `Vous avez rejoint "${result.budget.name}" !`, 'success');
              } else {
                showAlert('Erreur', result.message, 'error');
              }
            }} className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Code d'invitation</label>
                <input
                  type="text"
                  name="inviteCode"
                  required
                  placeholder="Ex: ABC123"
                  maxLength={6}
                  className={`w-full px-4 py-3 rounded-xl border text-center text-xl tracking-widest uppercase ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                Rejoindre
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gérer Budget Partagé */}
      {showSharedBudgetModal && currentSharedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSharedBudgetModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>⚙️ {currentSharedBudget.name}</h3>
                <button onClick={() => setShowSharedBudgetModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Code d'invitation */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Code d'invitation</p>
                <div className="flex items-center gap-2">
                  <code className={`flex-1 text-center text-2xl font-mono tracking-widest py-2 rounded-lg ${darkMode ? 'bg-slate-600 text-emerald-400' : 'bg-white text-emerald-600'}`}>
                    {currentSharedBudget.inviteCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentSharedBudget.inviteCode);
                      showAlert('Copié', 'Le code d\'invitation a été copié.', 'success');
                    }}
                    className={`p-3 rounded-lg ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    📋
                  </button>
                </div>
              </div>
              
              {/* Membres */}
              <div>
                <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Membres ({currentSharedBudget.members.length})
                </p>
                <div className="space-y-2">
                  {currentSharedBudget.members.map(member => (
                    <div key={member.userId} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`}>
                          {member.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {member.userName}
                            {member.userId === currentUser.id && <span className="text-slate-400 text-sm"> (vous)</span>}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {member.role === 'owner' ? '👑 Propriétaire' : '👤 Membre'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className={`pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => {
                    const isOwner = currentSharedBudget.createdBy === currentUser.id;
                    showConfirm(
                      isOwner ? 'Supprimer le budget' : 'Quitter le budget',
                      isOwner 
                        ? 'Supprimer ce budget ? Tous les membres perdront l\'accès.'
                        : 'Voulez-vous vraiment quitter ce budget partagé ?',
                      () => {
                        leaveSharedBudget(currentSharedBudget.id);
                        setShowSharedBudgetModal(false);
                      }
                    );
                  }}
                  className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all"
                >
                  {currentSharedBudget.createdBy === currentUser.id ? '🗑️ Supprimer le budget' : '🚪 Quitter le budget'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestion Épargne */}
      {showSavingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSavingsModal(false)}>
          <div className={`w-full max-w-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏦 Gérer mon épargne</h3>
                <button onClick={() => setShowSavingsModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Solde actuel */}
              <div className={`text-center p-4 rounded-xl mb-6 ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Épargne actuelle</p>
                <p className="text-3xl font-bold text-purple-400">{formatCurrency(savings)}</p>
              </div>
              
              {/* Toggle Ajouter/Retirer */}
              <div className="flex mb-4 p-1 rounded-xl bg-slate-700/50">
                <button
                  onClick={() => setSavingsAction('add')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${savingsAction === 'add' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ➕ Ajouter
                </button>
                <button
                  onClick={() => setSavingsAction('withdraw')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${savingsAction === 'withdraw' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ➖ Retirer
                </button>
              </div>
              
              {/* Formulaire */}
              <form onSubmit={(e) => {
                e.preventDefault();
                const amount = parseFloat(e.target.amount.value);
                if (isNaN(amount) || amount <= 0) return;
                
                if (savingsAction === 'add') {
                  setSavings(prev => prev + amount);
                } else {
                  setSavings(prev => Math.max(0, prev - amount));
                }
                
                e.target.reset();
                setShowSavingsModal(false);
              }}>
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Montant (€)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:ring-2 focus:ring-purple-500 text-lg`}
                  />
                </div>
                
                {/* Boutons rapides */}
                <div className="flex gap-2 mb-4">
                  {[50, 100, 200, 500].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const input = e.target.closest('form').querySelector('input[name="amount"]');
                        input.value = amount;
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} transition-all`}
                    >
                      {amount}€
                    </button>
                  ))}
                </div>
                
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${savingsAction === 'add' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-rose-500 to-rose-600'}`}
                >
                  {savingsAction === 'add' ? '➕ Ajouter à l\'épargne' : '➖ Retirer de l\'épargne'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
{/* Modal Alertes & Notifications */}
      {showAlerts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAlerts(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔔 Notifications</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowNotificationsSettings(true); setShowAlerts(false); }}
                    className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  >
                    ⚙️
                  </button>
                  <button onClick={() => setShowAlerts(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
                </div>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[65vh]">
              {/* Alertes actives */}
              {getActiveAlerts.length > 0 && (
                <div className="mb-6">
                  <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>⚡ Alertes</h4>
                  <div className="space-y-2">
                    {getActiveAlerts.map((alert, index) => (
                      <div key={index} className={`p-3 rounded-xl ${
                        alert.type === 'danger' ? (darkMode ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200') :
                        alert.type === 'warning' ? (darkMode ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-200') :
                        alert.type === 'success' ? (darkMode ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200') :
                        (darkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200')
                      }`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{alert.icon}</span>
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{alert.title}</p>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Prélèvements à venir */}
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>📅 Prélèvements à venir (7 jours)</h4>
                {getUpcomingPayments.length === 0 ? (
                  <div className={`text-center py-6 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <span className="text-3xl block mb-2">✅</span>
                    <p className="text-sm">Aucun prélèvement prévu</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getUpcomingPayments.map((t, index) => {
                      const category = getCategoryInfo(t.category);
                      const brand = getBrandInfo(t.brand);
                      const isToday = t.daysUntil === 0;
                      const isTomorrow = t.daysUntil === 1;
                      
                      return (
                        <div key={`${t.id}-${index}`} className={`p-3 rounded-xl ${isToday ? (darkMode ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200') : (darkMode ? 'bg-slate-700/50' : 'bg-gray-50')}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: `${category.color}20` }}>
                                {brand?.logo || category.icon}
                              </div>
                              <div>
                                <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                                <p className={`text-xs ${isToday ? 'text-rose-400' : isTomorrow ? 'text-amber-400' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}>
                                  {isToday ? 'Aujourd\'hui' : isTomorrow ? 'Demain' : `Dans ${t.daysUntil} jours`}
                                </p>
                              </div>
                            </div>
                            <p className="font-bold text-rose-400">{formatCurrency(t.amount)}</p>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-100'} mt-3`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total à prévoir</span>
                        <span className="font-bold text-rose-400">{formatCurrency(getUpcomingPayments.reduce((sum, t) => sum + t.amount, 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {getActiveAlerts.length === 0 && getUpcomingPayments.length === 0 && (
                <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span className="text-4xl block mb-2">🎉</span>
                  <p>Tout est en ordre !</p>
                  <p className="text-xs mt-1">Aucune notification pour le moment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Paramètres Notifications */}
      {showNotificationsSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotificationsSettings(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>⚙️ Paramètres notifications</h3>
                <button onClick={() => setShowNotificationsSettings(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Alerte solde bas */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>🚨 Alerte solde bas</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Notifier quand le solde est faible</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.lowBalanceAlert}
                    onChange={(e) => setNotificationSettings({...notificationSettings, lowBalanceAlert: e.target.checked})}
                    className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                </label>
                {notificationSettings.lowBalanceAlert && (
                  <div className="mt-3">
                    <label className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Seuil d'alerte (€)</label>
                    <input
                      type="number"
                      value={notificationSettings.lowBalanceThreshold}
                      onChange={(e) => setNotificationSettings({...notificationSettings, lowBalanceThreshold: parseFloat(e.target.value) || 0})}
                      className={`w-full mt-1 px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-600 text-white border-slate-500' : 'bg-white text-gray-900 border-gray-300'} border`}
                    />
                  </div>
                )}
              </div>
              
              {/* Rappel hebdomadaire */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>📝 Rappel de saisie</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Si aucune transaction depuis 7 jours</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.weeklyReminder}
                    onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReminder: e.target.checked})}
                    className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                </label>
              </div>
              
              {/* Rapport mensuel */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Bilan mensuel</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Résumé en début de mois</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.monthlyReport}
                    onChange={(e) => setNotificationSettings({...notificationSettings, monthlyReport: e.target.checked})}
                    className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                </label>
              </div>
              
              {/* Prélèvements à venir */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>💳 Prélèvements du jour</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Alerte pour les prélèvements imminents</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.upcomingPayments}
                    onChange={(e) => setNotificationSettings({...notificationSettings, upcomingPayments: e.target.checked})}
                    className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>
            
            <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowNotificationsSettings(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
              >
                ✓ Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Emoji Picker */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEmojiPicker(null)}>
          <div className={`w-full max-w-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl p-6`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Choisir un emoji pour "{showEmojiPicker.name}"
            </h3>
            <div className="grid grid-cols-10 gap-1 max-h-64 overflow-y-auto p-2">
              {EMOJI_PICKER.map((emoji, i) => (
                <button key={i} onClick={() => {
                  if (showEmojiPicker.type === 'category') {
                    const newCat = {
                      id: generateId(),
                      name: showEmojiPicker.name,
                      icon: emoji,
                      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
                      type: showEmojiPicker.catType
                    };
                    setCustomCategories(prev => [...prev, newCat]);
                  } else {
                    const newBrand = {
                      id: generateId(),
                      name: showEmojiPicker.name,
                      logo: emoji,
                      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
                    };
                    setCustomBrands(prev => [...prev, newBrand]);
                  }
                  setShowEmojiPicker(null);
                }} className={`p-2 text-2xl rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} transition-all hover:scale-110`}>
                  {emoji}
                </button>
              ))}
            </div>
            <button onClick={() => setShowEmojiPicker(null)} className={`w-full mt-4 py-3 rounded-xl ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} font-medium`}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
