import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { MONTHS_FR } from '../constants';

const Budgets = () => {
  const {
    darkMode,
    transactions,
    savingsGoals,
    categoryBudgets,
    allCategories,
    setShowGoalModal,
    setEditingGoal,
    showAlert,
    setShowBudgetModal
  } = useApp();

  const getCategoryInfo = (categoryId) => {
    return allCategories.find(c => c.id === categoryId) || {
      id: categoryId,
      name: 'Autre',
      icon: '📌',
      color: '#6B7280'
    };
  };

  // Status des budgets
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
        isOver: percentage > 100,
        isWarning: percentage >= 80 && percentage <= 100
      };
    });

    return status;
  }, [transactions, categoryBudgets]);

  // Alertes budgets
  const getBudgetAlerts = useMemo(() => {
    const alerts = [];
    Object.entries(getBudgetStatus).forEach(([categoryId, status]) => {
      const category = getCategoryInfo(categoryId);
      if (status.isOver) {
        alerts.push({
          category,
          message: `${category.name} : Dépassé de ${formatCurrency(Math.abs(status.remaining))}`
        });
      } else if (status.isWarning) {
        alerts.push({
          category,
          message: `${category.name} : ${status.percentage.toFixed(0)}% utilisé`
        });
      }
    });
    return alerts;
  }, [getBudgetStatus, allCategories]);

  return (
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
          <button
            onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium"
          >
            + Nouvel objectif
          </button>
        </div>
      </div>

      {/* Alertes */}
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
            <div className="flex items-center gap-3">
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {MONTHS_FR[new Date().getMonth()]} {new Date().getFullYear()}
              </span>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium"
              >
                ✏️ Modifier
              </button>
            </div>
        </div>

        {Object.keys(categoryBudgets).length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <span className="text-4xl block mb-2">💰</span>
            <p className="mb-2">Aucun budget défini</p>
            <p className={`text-xs ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>
              Les budgets peuvent être définis dans les paramètres
            </p>
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
                    <button
                      onClick={() => { setEditingGoal(goal); setShowGoalModal(true); }}
                      className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'} transition-all`}
                    >
                      ✏️
                    </button>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>{formatCurrency(goal.current)}</span>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatCurrency(goal.target)}</span>
                    </div>
                    <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${percentage >= 100 ? 'text-emerald-400' : (darkMode ? 'text-slate-400' : 'text-gray-500')}`}>
                      {percentage >= 100 ? '✅ Objectif atteint !' : `${percentage.toFixed(0)}% • Reste ${formatCurrency(remaining)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Résumé */}
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
        <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Résumé</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Budget total mensuel</p>
            <p className="text-xl font-bold text-amber-400">
              {formatCurrency(Object.values(categoryBudgets).reduce((s, b) => s + (parseFloat(b) || 0), 0))}
            </p>
          </div>
          <div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Objectifs en cours</p>
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {savingsGoals.filter(g => g.current < g.target).length}
            </p>
          </div>
          <div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total objectifs</p>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(savingsGoals.reduce((s, g) => s + g.target, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budgets;
