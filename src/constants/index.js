export const CATEGORIES = [
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

export const POPULAR_BRANDS = [
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
  { id: 'lidl', name: 'Lidl', logo: '🪺', color: '#0050AA' },
  { id: 'total', name: 'Total', logo: '⛽', color: '#FF0000' },
  { id: 'ikea', name: 'IKEA', logo: '🪑', color: '#0051BA' },
  { id: 'decathlon', name: 'Decathlon', logo: '🏃', color: '#0082C3' },
  { id: 'gym', name: 'Salle de sport', logo: '🏋️', color: '#FF4500' },
  { id: 'disney', name: 'Disney+', logo: '🏰', color: '#113CCF' },
  { id: 'prime', name: 'Prime Video', logo: '🎥', color: '#00A8E1' },
  { id: 'playstation', name: 'PlayStation', logo: '🎮', color: '#003791' },
];

export const SECRET_QUESTIONS = [
  { id: 'pet', question: 'Quel est le nom de votre premier animal de compagnie ?' },
  { id: 'city', question: 'Dans quelle ville êtes-vous né(e) ?' },
  { id: 'mother', question: 'Quel est le nom de jeune fille de votre mère ?' },
  { id: 'school', question: 'Quel est le nom de votre école primaire ?' },
  { id: 'friend', question: 'Quel est le prénom de votre meilleur(e) ami(e) d\'enfance ?' },
  { id: 'car', question: 'Quelle était la marque de votre première voiture ?' },
  { id: 'movie', question: 'Quel est votre film préféré ?' },
  { id: 'food', question: 'Quel est votre plat préféré ?' },
];

export const EMOJI_PICKER = [
  '🎯', '💰', '🏠', '🚗', '🍔', '🎮', '📱', '💻', '🎬', '🎵',
  '✈️', '🏥', '📚', '🛒', '⚡', '🎁', '💎', '🌟', '🔥', '💪',
  '🎉', '🏦', '💳', '📊', '🎨', '🍕', '☕', '🏋️', '🎸', '📷',
  '🐕', '🌴', '🎂', '💐', '🏆', '⭐', '❤️', '🔑', '🎓', '💼'
];

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const ADMIN_PERMISSIONS = [
  { id: 'all', name: 'Super Admin', description: 'Tous les droits', icon: '👑' },
  { id: 'manage_users', name: 'Gérer utilisateurs', description: 'Modifier, supprimer, reset password', icon: '👥' },
  { id: 'manage_admins', name: 'Gérer admins', description: 'Ajouter/retirer des admins', icon: '🛡️' },
  { id: 'manage_categories', name: 'Gérer catégories', description: 'Ajouter/modifier/supprimer catégories', icon: '🏷️' },
  { id: 'manage_brands', name: 'Gérer marques', description: 'Ajouter/modifier/supprimer marques', icon: '🏪' },
  { id: 'view_logs', name: 'Voir les logs', description: 'Consulter les logs et statistiques', icon: '📋' },
  { id: 'manage_logs', name: 'Gérer les logs', description: 'Supprimer les logs', icon: '🗑️' },
];

export const ALL_ACHIEVEMENTS = [
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