import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';

const Transactions = ({ onEditTransaction, onDeleteTransaction }) => {
  const {
    darkMode,
    transactions,
    allCategories,
    allBrands
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const getCategoryInfo = (categoryId) => {
    return allCategories.find(c => c.id === categoryId) || {
      id: categoryId,
      name: 'Autre',
      icon: '📌',
      color: '#6B7280'
    };
  };

  const getBrandInfo = (brandId) => {
    return allBrands.find(b => b.id === brandId) || null;
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Filtre par catégorie
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date) - new Date(b.date);
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [transactions, searchTerm, filterType, filterCategory, sortBy, sortOrder]);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
        <div className="flex flex-wrap gap-3">
          {/* Recherche */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          {/* Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
          >
            <option value="all">Tous types</option>
            <option value="income">💰 Revenus</option>
            <option value="expense">💸 Dépenses</option>
          </select>

          {/* Catégorie */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
          >
            <option value="all">Toutes catégories</option>
            {allCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>

          {/* Tri */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(order);
            }}
            className={`px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
          >
            <option value="date-desc">Date ↓</option>
            <option value="date-asc">Date ↑</option>
            <option value="amount-desc">Montant ↓</option>
            <option value="amount-asc">Montant ↑</option>
            <option value="name-asc">Nom A-Z</option>
            <option value="name-desc">Nom Z-A</option>
          </select>
        </div>

        {/* Stats filtrées */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-medium">+{formatCurrency(totalIncome)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-medium">-{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Liste des transactions */}
      <div className={`rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border overflow-hidden`}>
        {filteredTransactions.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <span className="text-4xl block mb-3">🔍</span>
            <p>Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredTransactions.map(transaction => {
              const category = getCategoryInfo(transaction.category);
              const brand = getBrandInfo(transaction.brand);
              return (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between p-4 ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'} transition-all cursor-pointer group`}
                  onClick={() => onEditTransaction(transaction)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      {brand?.logo || category.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{transaction.name}</p>
                        {transaction.recurring && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">🔄</span>}
                        {transaction.isFixedExpense && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">📌</span>}
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {category.name} • {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTransaction(transaction.id); }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
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
    </div>
  );
};

export default Transactions;