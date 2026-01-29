// Génère un ID unique
export const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

// Formate un montant en devise EUR
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Formate une date en format français lisible
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Formate une date pour un input type="date" (YYYY-MM-DD)
export const formatDateForInput = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Retourne le nombre de jours dans un mois
export const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Retourne le premier jour du mois (0 = Dimanche, 1 = Lundi, etc.)
export const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

// Calcule le pourcentage
export const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Tronque un texte avec "..."
export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Vérifie si deux dates sont le même jour
export const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Retourne la date d'aujourd'hui en format YYYY-MM-DD
export const getTodayDate = () => {
  const today = new Date();
  return formatDateForInput(today);
};

// Parse un montant (string ou number) en float
export const parseAmount = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

// Classe CSS conditionnelle (utilitaire)
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};