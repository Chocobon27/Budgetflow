import React from 'react';
import { useApp } from '../context/AppContext';
import { useCalculations } from '../hooks';
import { formatCurrency, formatDate } from '../utils/helpers';
import { getLevel, getXpInLevel, getXpForNextLevel, getLevelTitle } from '../hooks/useAchievements';

const Dashboard = ({ onEditTransaction, onDeleteTransaction }) => {
  const {
    darkMode,
    transactions,
    savings,
    achievements,
    setShowSavingsModal,
    setShowAchievementsModal,
    allCategories,
    allBrands
  } = useApp();

  const { getMonthlyData } = useCalculations();

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

  // Gamification data
  const points = achievements.points || 0;
  const level = getLevel(points);
  const xpInLevel = getXpInLevel(points);
  const xpNeeded = getXpForNextLevel();
  const levelTitle = getLevelTitle(level);

  return (
    <div className="space-y-6">
      {/* Cards principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Revenus */}
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Revenus du mois</span>
            <span className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">💰</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(getMonthlyData.income)}</p>
        </div>

        {/* Dépenses */}
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses du mois</span>
            <span className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">💸</span>
          </div>
          <p className="text-2xl font-bold text-rose-400">{formatCurrency(getMonthlyData.expenses)}</p>
        </div>

        {/* Solde */}
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Solde restant du mois</span>
            <span className={`w-10 h-10 rounded-xl ${getMonthlyData.balance >= 0 ? 'bg-cyan-500/20' : 'bg-orange-500/20'} flex items-center justify-center`}>
              {getMonthlyData.balance >= 0 ? '✨' : '⚠️'}
            </span>
          </div>
          <p className={`text-2xl font-bold ${getMonthlyData.balance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
            {formatCurrency(getMonthlyData.balance)}
          </p>
        </div>

        {/* Carte Gamification - Niveau & Streak */}
        <div
          onClick={() => setShowAchievementsModal(true)}
          className={`p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
            darkMode
              ? 'bg-gradient-to-br from-slate-800/80 to-slate-800/50 border-amber-500/20 hover:border-amber-500/40'
              : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Niveau {level}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                {levelTitle}
              </span>
            </div>
            <span className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">🏆</span>
          </div>

          {/* Barre XP */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={darkMode ? 'text-slate-500' : 'text-gray-400'}>{xpInLevel}/{xpNeeded} XP</span>
              <span className="text-amber-500 font-medium">{points} pts</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-amber-100'}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
                style={{ width: `${(xpInLevel / xpNeeded) * 100}%` }}
              />
            </div>
          </div>

          {/* Streak & Badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-lg">🔥</span>
              <span className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-500'}`}>
                {achievements.streak || 0}
              </span>
              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                jour{(achievements.streak || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {achievements.unlocked?.length || 0} badges débloqués
            </div>
          </div>
        </div>

        {/* Épargne */}
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

      {/* Dernières transactions */}
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dernières transactions</h3>
        
        {transactions.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <span className="text-4xl block mb-3">🔭</span>
            <p>Aucune transaction pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map(transaction => {
              const category = getCategoryInfo(transaction.category);
              const brand = getBrandInfo(transaction.brand);
              return (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} transition-all cursor-pointer group`}
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
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{transaction.name}</p>
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

export default Dashboard;
