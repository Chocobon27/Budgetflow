import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { MONTHS_FR } from '../constants';

const Statistics = () => {
  const {
    darkMode,
    transactions,
    savings,
    allCategories,
    goalPeriod,
    setGoalPeriod,
    setShowSavingsModal
  } = useApp();

  const [analysisTab, setAnalysisTab] = useState('overview');
  const [periodFilter, setPeriodFilter] = useState(() => {
    const saved = localStorage.getItem('budgetflow_periodFilter');
    return saved ? parseInt(saved) : 1;
  });
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [detailFilter, setDetailFilter] = useState({ type: null, value: null, label: '' });

  // Sauvegarder le filtre de période
  React.useEffect(() => {
    localStorage.setItem('budgetflow_periodFilter', periodFilter.toString());
  }, [periodFilter]);

  const getCategoryInfo = (categoryId) => {
    return allCategories.find(c => c.id === categoryId) || {
      id: categoryId,
      name: 'Autre',
      icon: '📌',
      color: '#6B7280'
    };
  };

  // Obtenir les transactions filtrées pour le modal de détail
  const getFilteredTransactions = () => {
    if (!detailFilter.type) return [];
    let filtered = [...transactions];
    const now = new Date();

    switch (detailFilter.type) {
      case 'month': {
        const [year, month] = detailFilter.value.split('-').map(Number);
        filtered = filtered.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
        break;
      }
      case 'category': {
        const startDate = new Date(now.getFullYear(), now.getMonth() - periodFilter + 1, 1);
        filtered = filtered.filter(t =>
          t.category === detailFilter.value &&
          new Date(t.date) >= startDate
        );
        break;
      }
      case 'period': {
        const startDate = new Date(now.getFullYear(), now.getMonth() - periodFilter + 1, 1);
        filtered = filtered.filter(t => new Date(t.date) >= startDate);
        if (detailFilter.value === 'income') {
          filtered = filtered.filter(t => t.type === 'income');
        } else if (detailFilter.value === 'expense') {
          filtered = filtered.filter(t => t.type === 'expense');
        }
        break;
      }
      default:
        break;
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Ouvrir le modal de détail
  const openDetail = (type, value, label) => {
    setDetailFilter({ type, value, label });
    setShowTransactionDetail(true);
  };

  // Calcul des stats par période
  const getPeriodStats = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - periodFilter + 1, 1);

    const periodTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= now;
    });

    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown = {};
    periodTransactions.forEach(t => {
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { income: 0, expenses: 0 };
      }
      if (t.type === 'income') {
        categoryBreakdown[t.category].income += t.amount;
      } else {
        categoryBreakdown[t.category].expenses += t.amount;
      }
    });

    return {
      income,
      expenses,
      balance: income - expenses,
      transactions: periodTransactions,
      categoryBreakdown
    };
  }, [transactions, periodFilter]);

  // Données d'analyse sur 12 mois
  const getAnalysisData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
      });

      const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      // Breakdown par catégorie pour ce mois
      const categoryBreakdown = {};
      monthTransactions.filter(t => t.type === 'expense').forEach(t => {
        if (!categoryBreakdown[t.category]) {
          categoryBreakdown[t.category] = 0;
        }
        categoryBreakdown[t.category] += t.amount;
      });

      months.push({
        date,
        label: MONTHS_FR[date.getMonth()].substring(0, 3),
        fullLabel: `${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`,
        income,
        expenses,
        balance: income - expenses,
        categoryBreakdown
      });
    }

    const currentMonth = months[months.length - 1];
    const previousMonth = months[months.length - 2];

    // Calcul des moyennes sur 6 mois
    const last6Months = months.slice(-6);
    const avgIncome = last6Months.reduce((s, m) => s + m.income, 0) / 6;
    const avgExpenses = last6Months.reduce((s, m) => s + m.expenses, 0) / 6;

    // Projection fin de mois
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyExpenseRate = currentMonth.expenses / dayOfMonth;
    const projectedExpenses = dailyExpenseRate * daysInMonth;
    const projectedBalance = currentMonth.income - projectedExpenses;

    // Comparaison par catégorie
    const categoryComparison = [];
    const allCategoryIds = new Set([
      ...Object.keys(currentMonth.categoryBreakdown || {}),
      ...Object.keys(previousMonth.categoryBreakdown || {})
    ]);

    allCategoryIds.forEach(catId => {
      const current = currentMonth.categoryBreakdown?.[catId] || 0;
      const previous = previousMonth.categoryBreakdown?.[catId] || 0;
      if (current > 0 || previous > 0) {
        const change = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
        categoryComparison.push({
          category: getCategoryInfo(catId),
          current,
          previous,
          diff: current - previous,
          change
        });
      }
    });

    categoryComparison.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    // Tendances et alertes
    const trends = [];
    
    if (currentMonth.expenses > avgExpenses * 1.2) {
      trends.push({
        type: 'danger',
        icon: '🚨',
        message: `Dépenses ${((currentMonth.expenses / avgExpenses - 1) * 100).toFixed(0)}% au-dessus de la moyenne`
      });
    }
    
    if (currentMonth.income < avgIncome * 0.8 && currentMonth.income > 0) {
      trends.push({
        type: 'warning',
        icon: '⚠️',
        message: `Revenus ${((1 - currentMonth.income / avgIncome) * 100).toFixed(0)}% en-dessous de la moyenne`
      });
    }
    
    if (projectedBalance < 0) {
      trends.push({
        type: 'danger',
        icon: '📉',
        message: `Projection négative de ${formatCurrency(Math.abs(projectedBalance))} en fin de mois`
      });
    }
    
    if (currentMonth.balance > previousMonth.balance && currentMonth.balance > 0) {
      trends.push({
        type: 'success',
        icon: '📈',
        message: `Amélioration de ${formatCurrency(currentMonth.balance - previousMonth.balance)} vs mois dernier`
      });
    }

    // Top 3 catégories en hausse
    const topIncreases = categoryComparison.filter(c => c.change > 20).slice(0, 3);
    topIncreases.forEach(cat => {
      trends.push({
        type: 'warning',
        icon: cat.category.icon,
        message: `${cat.category.name} : +${cat.change.toFixed(0)}% vs mois dernier`
      });
    });

    return {
      months,
      currentMonth,
      previousMonth,
      incomeChange: previousMonth.income > 0 ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 : 0,
      expensesChange: previousMonth.expenses > 0 ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100 : 0,
      avgIncome,
      avgExpenses,
      projectedExpenses,
      projectedBalance,
      categoryComparison,
      trends
    };
  }, [transactions, allCategories]);

  // Évolution du solde cumulé
  const getBalanceEvolution = useMemo(() => {
    let cumulative = 0;
    return getAnalysisData.months.map(month => {
      cumulative += month.balance;
      return { ...month, cumulative };
    });
  }, [getAnalysisData]);

  // Dépenses fixes
  const fixedExpenses = transactions.filter(t => t.type === 'expense' && t.isFixedExpense);
  const monthlyFixedTotal = fixedExpenses.reduce((sum, t) => {
    const freq = t.recurringFrequency || 'monthly';
    if (freq === 'yearly') return sum + (t.amount / 12);
    if (freq === 'quarterly') return sum + (t.amount / 3);
    return sum + t.amount;
  }, 0);

  const periodTotal = monthlyFixedTotal * goalPeriod;
  const percentComplete = periodTotal > 0 ? Math.min((savings / periodTotal) * 100, 100) : 0;
  const remaining = Math.max(0, periodTotal - savings);
  const periodLabel = goalPeriod === 3 ? '3 mois' : goalPeriod === 6 ? '6 mois' : '1 an';

  return (
  <>
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: '📊 Vue d\'ensemble' },
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
              <button
                key={months}
                onClick={() => setPeriodFilter(months)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  periodFilter === months
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white'
                    : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {months === 1 ? 'Ce mois' : `${months} mois`}
              </button>
            ))}
          </div>

          {/* Cartes statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div
              onClick={() => openDetail('period', 'income', 'Revenus')}
              className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50'} border backdrop-blur-sm cursor-pointer transition-all`}
            >
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Total revenus</p>
              <p className="text-3xl font-bold text-emerald-400">{formatCurrency(getPeriodStats.income)}</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Cliquer pour détails</p>
            </div>
            <div
              onClick={() => openDetail('period', 'expense', 'Dépenses')}
              className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50'} border backdrop-blur-sm cursor-pointer transition-all`}
            >
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Total dépenses</p>
              <p className="text-3xl font-bold text-rose-400">{formatCurrency(getPeriodStats.expenses)}</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Cliquer pour détails</p>
            </div>
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-2`}>Solde restant</p>
              <p className={`text-3xl font-bold ${getPeriodStats.balance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                {formatCurrency(getPeriodStats.balance)}
              </p>
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
                  <button
                    key={p.value}
                    onClick={() => setGoalPeriod(p.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      goalPeriod === p.value ? 'bg-amber-500 text-white' : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-bold text-amber-400">{formatCurrency(periodTotal)}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>pour {periodLabel} de sécurité</p>
                <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden mt-3`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentComplete >= 100 ? 'bg-emerald-500' : percentComplete >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${percentComplete}%` }}
                  />
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
                    {fixedExpenses.length > 4 && (
                      <span className={`text-xs px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>+{fixedExpenses.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
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
                {Object.entries(getPeriodStats.categoryBreakdown)
                  .filter(([_, data]) => data.expenses > 0)
                  .sort((a, b) => b[1].expenses - a[1].expenses)
                  .map(([categoryId, data]) => {
                    const category = getCategoryInfo(categoryId);
                    const percentage = (data.expenses / getPeriodStats.expenses) * 100;
                    return (
                      <div key={categoryId} onClick={() => openDetail('category', categoryId, category.name)} className="cursor-pointer hover:opacity-80 transition-all">
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
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                    onClick={() => openDetail('month', `${month.date.getFullYear()}-${month.date.getMonth()}`, month.fullLabel)}
                  >
                    <div className="w-full flex gap-0.5 items-end h-48">
                      <div
                        className="flex-1 bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-400"
                        style={{ height: `${incomeHeight}%` }}
                        title={`Revenus: ${formatCurrency(month.income)}`}
                      />
                      <div
                        className="flex-1 bg-rose-500 rounded-t-sm transition-all hover:bg-rose-400"
                        style={{ height: `${expenseHeight}%` }}
                        title={`Dépenses: ${formatCurrency(month.expenses)}`}
                      />
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{month.label}</span>

                    <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-800'} text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-10`}>
                      <p className="font-medium">{month.fullLabel}</p>
                      <p className="text-emerald-400">+{formatCurrency(month.income)}</p>
                      <p className="text-rose-400">-{formatCurrency(month.expenses)}</p>
                      <p className={month.balance >= 0 ? 'text-cyan-400' : 'text-orange-400'}>
                        {month.balance >= 0 ? '+' : ''}{formatCurrency(month.balance)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Revenus</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-rose-500" />
                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses</span>
              </div>
            </div>
          </div>

          {/* Graphique Évolution du solde */}
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
            <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📈 Évolution du solde cumulé</h3>
            <div className="h-48 flex items-end justify-between gap-2">
              {(() => {
                const maxAbs = Math.max(...getBalanceEvolution.map(m => Math.abs(m.cumulative))) || 1;
                const minVal = Math.min(...getBalanceEvolution.map(m => m.cumulative));
                const maxVal = Math.max(...getBalanceEvolution.map(m => m.cumulative));
                const range = maxVal - minVal || 1;

                return getBalanceEvolution.map((month, i) => {
                  const normalizedHeight = ((month.cumulative - minVal) / range) * 100;
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full flex items-end h-40">
                        <div
                          className={`w-full rounded-t-sm transition-all ${month.cumulative >= 0 ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-orange-500 hover:bg-orange-400'}`}
                          style={{ height: `${Math.max(normalizedHeight, 5)}%` }}
                        />
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{month.label}</span>

                      <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-800'} text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-10`}>
                        <p className="font-medium">{month.fullLabel}</p>
                        <p className={month.cumulative >= 0 ? 'text-cyan-400' : 'text-orange-400'}>
                          Cumulé: {formatCurrency(month.cumulative)}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* COMPARAISON */}
      {analysisTab === 'comparison' && (
        <div className="space-y-6">
          {/* Comparaison globale */}
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
            <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔄 Ce mois vs Mois dernier</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1`}>Revenus</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(getAnalysisData.currentMonth?.income || 0)}</p>
                <p className={`text-sm ${getAnalysisData.incomeChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {getAnalysisData.incomeChange >= 0 ? '↑' : '↓'} {Math.abs(getAnalysisData.incomeChange).toFixed(1)}%
                </p>
              </div>
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1`}>Dépenses</p>
                <p className="text-2xl font-bold text-rose-400">{formatCurrency(getAnalysisData.currentMonth?.expenses || 0)}</p>
                <p className={`text-sm ${getAnalysisData.expensesChange <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {getAnalysisData.expensesChange >= 0 ? '↑' : '↓'} {Math.abs(getAnalysisData.expensesChange).toFixed(1)}%
                </p>
              </div>
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1`}>Solde restant</p>
                <p className={`text-2xl font-bold ${(getAnalysisData.currentMonth?.balance || 0) >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                  {formatCurrency(getAnalysisData.currentMonth?.balance || 0)}
                </p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  vs {formatCurrency(getAnalysisData.previousMonth?.balance || 0)} le mois dernier
                </p>
              </div>
            </div>
          </div>

          {/* Comparaison par catégorie */}
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
            <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Évolution par catégorie</h3>
            {getAnalysisData.categoryComparison.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                <p>Pas assez de données pour comparer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getAnalysisData.categoryComparison.slice(0, 8).map((cat, i) => (
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
            )}
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
                <p className="text-xl font-bold text-rose-400">{formatCurrency(getAnalysisData.currentMonth?.expenses || 0)}</p>
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
                <p className={`text-xs mt-1 ${(getAnalysisData.currentMonth?.income || 0) >= getAnalysisData.avgIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Ce mois : {(getAnalysisData.currentMonth?.income || 0) >= getAnalysisData.avgIncome ? '+' : ''}{formatCurrency((getAnalysisData.currentMonth?.income || 0) - getAnalysisData.avgIncome)}
                </p>
              </div>
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dépenses moyennes</p>
                <p className="text-xl font-bold text-rose-400">{formatCurrency(getAnalysisData.avgExpenses)}</p>
                <p className={`text-xs mt-1 ${(getAnalysisData.currentMonth?.expenses || 0) <= getAnalysisData.avgExpenses ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Ce mois : {(getAnalysisData.currentMonth?.expenses || 0) >= getAnalysisData.avgExpenses ? '+' : ''}{formatCurrency((getAnalysisData.currentMonth?.expenses || 0) - getAnalysisData.avgExpenses)}
                </p>
              </div>
            </div>
          </div>

          {/* Alertes et tendances */}
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🎯 Analyses et alertes</h3>
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

          {/* Meilleur/Pire mois */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'} border`}>
              <p className={`text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-600'} mb-1`}>🏆 Meilleur mois</p>
              {(() => {
                const best = getAnalysisData.months.reduce((best, m) => m.balance > best.balance ? m : best, getAnalysisData.months[0]);
                return (
                  <>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{best.fullLabel}</p>
                    <p className="text-emerald-400 font-bold">+{formatCurrency(best.balance)}</p>
                  </>
                );
              })()}
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'} border`}>
              <p className={`text-sm ${darkMode ? 'text-rose-400' : 'text-rose-600'} mb-1`}>📉 Pire mois</p>
              {(() => {
                const worst = getAnalysisData.months.reduce((worst, m) => m.balance < worst.balance ? m : worst, getAnalysisData.months[0]);
                return (
                  <>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{worst.fullLabel}</p>
                    <p className="text-rose-400 font-bold">{formatCurrency(worst.balance)}</p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Modal Détail des transactions */}
    {showTransactionDetail && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTransactionDetail(false)}>
        <div className={`w-full max-w-2xl max-h-[80vh] ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden`} onClick={e => e.stopPropagation()}>
          <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📋 {detailFilter.label}
              </h3>
              <button onClick={() => setShowTransactionDetail(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
            </div>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {getFilteredTransactions().length} transaction(s)
            </p>
          </div>
          <div className="overflow-y-auto max-h-[60vh] p-4">
            {getFilteredTransactions().length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                <span className="text-4xl block mb-2">📭</span>
                <p>Aucune transaction</p>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredTransactions().map(t => {
                  const cat = getCategoryInfo(t.category);
                  return (
                    <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${cat.color}20` }}>
                          {cat.icon}
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {cat.name} • {formatDate(t.date)}
                          </p>
                        </div>
                      </div>
                      <p className={`font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  );
                })}
                {/* Total */}
                <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'} flex justify-between`}>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(getFilteredTransactions().reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default Statistics;