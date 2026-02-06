import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { MONTHS_FR } from '../constants';
import api from '../api';

const GOAL_ICONS = [
  { icon: '🚗', label: 'Voiture' },
  { icon: '🏠', label: 'Maison' },
  { icon: '✈️', label: 'Voyage' },
  { icon: '💻', label: 'Tech' },
  { icon: '🎓', label: 'Études' },
  { icon: '💍', label: 'Mariage' },
  { icon: '🏖️', label: 'Vacances' },
  { icon: '🎸', label: 'Loisir' },
  { icon: '👶', label: 'Bébé' },
  { icon: '🏥', label: 'Santé' },
  { icon: '📱', label: 'Mobile' },
  { icon: '🎁', label: 'Autre' }
];

const PRIORITIES = [
  { value: 'high', label: 'Haute', color: 'rose' },
  { value: 'medium', label: 'Moyenne', color: 'amber' },
  { value: 'low', label: 'Basse', color: 'emerald' }
];

const Budgets = () => {
  const {
    darkMode,
    transactions,
    categoryBudgets,
    allCategories,
    showAlert,
    setShowBudgetModal,
    longTermGoals,
    showLongTermGoalModal,
    setShowLongTermGoalModal,
    editingLongTermGoal,
    setEditingLongTermGoal,
    showConfirm,
    closeConfirm
  } = useApp();

  // États pour les objectifs
  const [formData, setFormData] = useState({
    name: '',
    icon: '🎯',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    priority: 'medium',
    notes: ''
  });

  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [addAmount, setAddAmount] = useState('');

  // État pour basculer entre les vues
  const [activeTab, setActiveTab] = useState('budgets');

  const getCategoryInfo = (categoryId) => {
    return allCategories.find(c => c.id === categoryId) || {
      id: categoryId,
      name: 'Autre',
      icon: '📌',
      color: '#6B7280'
    };
  };

  // ============================================
  // LOGIQUE BUDGETS
  // ============================================
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

  // ============================================
  // LOGIQUE OBJECTIFS
  // ============================================
  const openCreateModal = () => {
    setFormData({
      name: '',
      icon: '🎯',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      priority: 'medium',
      notes: ''
    });
    setEditingLongTermGoal(null);
    setShowLongTermGoalModal(true);
  };

  const openEditModal = (goal) => {
    setFormData({
      name: goal.name,
      icon: goal.icon,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
      priority: goal.priority,
      notes: goal.notes || ''
    });
    setEditingLongTermGoal(goal);
    setShowLongTermGoalModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.targetAmount) {
      showAlert('Erreur', 'Veuillez remplir le nom et le montant cible', 'error');
      return;
    }

    try {
      const goalData = {
        name: formData.name,
        icon: formData.icon,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount) || 0,
        targetDate: formData.targetDate || null,
        priority: formData.priority,
        notes: formData.notes
      };

      if (editingLongTermGoal) {
        await api.updateLongTermGoal(editingLongTermGoal.id, goalData);
        showAlert('Succès', 'Objectif modifié', 'success');
      } else {
        await api.addLongTermGoal(goalData);
        showAlert('Succès', 'Objectif créé', 'success');
      }

      setShowLongTermGoalModal(false);
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleDelete = (goal) => {
    showConfirm(
      'Supprimer l\'objectif',
      `Voulez-vous vraiment supprimer "${goal.name}" ?`,
      async () => {
        try {
          await api.deleteLongTermGoal(goal.id);
          showAlert('Succès', 'Objectif supprimé', 'success');
          closeConfirm();
        } catch (error) {
          showAlert('Erreur', error.message, 'error');
        }
      }
    );
  };

  const handleAddFunds = async () => {
    if (!addAmount || !selectedGoal) return;

    try {
      const newAmount = selectedGoal.currentAmount + parseFloat(addAmount);
      await api.updateLongTermGoal(selectedGoal.id, {
        ...selectedGoal,
        currentAmount: newAmount
      });
      showAlert('Succès', `${formatCurrency(parseFloat(addAmount))} ajoutés à "${selectedGoal.name}"`, 'success');
      setShowAddFundsModal(false);
      setAddAmount('');
      setSelectedGoal(null);
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const calculateMonthlySavings = (goal) => {
    if (!goal.targetDate) return null;
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return 0;

    const today = new Date();
    const target = new Date(goal.targetDate);
    const monthsLeft = Math.max(1, Math.ceil((target - today) / (1000 * 60 * 60 * 24 * 30)));
    
    return remaining / monthsLeft;
  };

  const calculateProgress = (goal) => {
    if (goal.targetAmount <= 0) return 0;
    return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  };

  const getDaysRemaining = (targetDate) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate);
    const days = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getPriorityColor = (priority) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    return p ? p.color : 'gray';
  };

  const sortedGoals = [...(longTermGoals || [])].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (a.targetDate && b.targetDate) {
      return new Date(a.targetDate) - new Date(b.targetDate);
    }
    return 0;
  });

  const totalTarget = (longTermGoals || []).reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = (longTermGoals || []).reduce((sum, g) => sum + g.currentAmount, 0);
  const totalRemaining = totalTarget - totalCurrent;

  return (
    <div className="space-y-6">
      {/* Header avec onglets */}
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              💰 Budgets & Objectifs
            </h3>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Gérez vos limites de dépenses et vos projets d'épargne
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('budgets')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'budgets'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            💵 Budgets mensuels
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'goals'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🎯 Objectifs ({longTermGoals?.length || 0})
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* CONTENU ONGLET BUDGETS */}
      {/* ============================================ */}
      {activeTab === 'budgets' && (
        <>
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
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📊 Suivi du mois de {MONTHS_FR[new Date().getMonth()]}
              </h4>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium"
              >
                ✏️ Modifier
              </button>
            </div>

            {Object.keys(categoryBudgets).length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                <span className="text-4xl block mb-2">💰</span>
                <p className="mb-2">Aucun budget défini</p>
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="text-amber-400 hover:underline text-sm"
                >
                  Définir vos budgets par catégorie
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

          {/* Résumé Budgets */}
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
            <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📈 Résumé</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Budget total</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatCurrency(Object.values(categoryBudgets).reduce((s, b) => s + (parseFloat(b) || 0), 0))}
                </p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Catégories suivies</p>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {Object.keys(categoryBudgets).length}
                </p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Alertes actives</p>
                <p className={`text-xl font-bold ${getBudgetAlerts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {getBudgetAlerts.length}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* CONTENU ONGLET OBJECTIFS */}
      {/* ============================================ */}
      {activeTab === 'goals' && (
        <>
          {/* Stats globales objectifs */}
          {longTermGoals && longTermGoals.length > 0 && (
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Vue d'ensemble</h4>
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium"
                >
                  + Nouvel objectif
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total à atteindre</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(totalTarget)}</p>
                </div>
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Déjà épargné</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalCurrent)}</p>
                </div>
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Reste à épargner</p>
                  <p className="text-lg font-bold text-violet-400">{formatCurrency(totalRemaining)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Liste des objectifs */}
          {(!longTermGoals || sortedGoals.length === 0) ? (
            <div className={`p-12 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm text-center`}>
              <span className="text-5xl block mb-4">🎯</span>
              <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Aucun objectif à long terme
              </h4>
              <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Créez votre premier projet : voiture, voyage, maison...
              </p>
              <button
                onClick={openCreateModal}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium"
              >
                + Créer un objectif
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedGoals.map(goal => {
                const progress = calculateProgress(goal);
                const monthlySavings = calculateMonthlySavings(goal);
                const daysRemaining = getDaysRemaining(goal.targetDate);
                const priorityColor = getPriorityColor(goal.priority);
                const isCompleted = progress >= 100;

                return (
                  <div
                    key={goal.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/50'
                        : darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{goal.icon}</span>
                        <div>
                          <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {goal.name}
                            {isCompleted && <span className="ml-2 text-emerald-400">✓</span>}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              priorityColor === 'rose' ? 'bg-rose-500/20 text-rose-400' :
                              priorityColor === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {PRIORITIES.find(p => p.value === goal.priority)?.label}
                            </span>
                            {daysRemaining !== null && (
                              <span className={`text-xs ${daysRemaining < 30 ? 'text-rose-400' : darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {daysRemaining > 0 ? `${daysRemaining}j restants` : 'Échéance passée'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(goal)}
                          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(goal)}
                          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} text-rose-400`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Progression */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </span>
                        <span className={`font-medium ${isCompleted ? 'text-emerald-400' : 'text-violet-400'}`}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                              : 'bg-gradient-to-r from-violet-500 to-purple-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Simulation */}
                    {!isCompleted && monthlySavings !== null && (
                      <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'} mb-3`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            💡 Épargne mensuelle suggérée
                          </span>
                          <span className="text-sm font-bold text-violet-400">
                            {formatCurrency(monthlySavings)}/mois
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {goal.notes && (
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'} mb-3`}>
                        📝 {goal.notes}
                      </p>
                    )}

                    {/* Actions */}
                    {!isCompleted && (
                      <button
                        onClick={() => {
                          setSelectedGoal(goal);
                          setShowAddFundsModal(true);
                        }}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 text-sm font-medium hover:from-violet-500/30 hover:to-purple-500/30 transition-all"
                      >
                        + Ajouter des fonds
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* MODAL CRÉATION/ÉDITION OBJECTIF */}
      {/* ============================================ */}
      {showLongTermGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLongTermGoalModal(false)}>
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingLongTermGoal ? '✏️ Modifier l\'objectif' : '🎯 Nouvel objectif'}
                </h3>
                <button onClick={() => setShowLongTermGoalModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Icône */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Icône</label>
                <div className="grid grid-cols-6 gap-2">
                  {GOAL_ICONS.map(({ icon, label }) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-3 rounded-xl text-2xl transition-all ${
                        formData.icon === icon
                          ? 'bg-violet-500/20 ring-2 ring-violet-500'
                          : darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      title={label}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nom du projet *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Nouvelle voiture"
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Montant cible */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Montant cible (€) *</label>
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  placeholder="15000"
                  min="0"
                  step="100"
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Montant actuel */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Déjà épargné (€)</label>
                <input
                  type="number"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="100"
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Date cible */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Date cible (optionnel)</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Simulation */}
              {formData.targetAmount && formData.targetDate && (
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-violet-500/10 border-violet-500/30' : 'bg-violet-50 border-violet-200'} border`}>
                  <p className={`text-sm font-medium ${darkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                    💡 Simulation d'épargne
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                    {(() => {
                      const remaining = parseFloat(formData.targetAmount) - (parseFloat(formData.currentAmount) || 0);
                      const target = new Date(formData.targetDate);
                      const today = new Date();
                      const months = Math.max(1, Math.ceil((target - today) / (1000 * 60 * 60 * 24 * 30)));
                      return formatCurrency(remaining / months);
                    })()}/mois
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-violet-400/70' : 'text-violet-500'}`}>
                    pour atteindre votre objectif à temps
                  </p>
                </div>
              )}

              {/* Priorité */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Priorité</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: value })}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        formData.priority === value
                          ? color === 'rose' ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500' :
                            color === 'amber' ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500' :
                            'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500'
                          : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Notes (optionnel)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Détails supplémentaires..."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Bouton */}
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.targetAmount}
                className={`w-full py-3 rounded-xl font-semibold text-white ${
                  formData.name && formData.targetAmount
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:opacity-90'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {editingLongTermGoal ? 'Enregistrer' : 'Créer l\'objectif'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL AJOUTER DES FONDS */}
      {/* ============================================ */}
      {showAddFundsModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddFundsModal(false)}>
          <div className={`w-full max-w-sm ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  💰 Ajouter des fonds
                </h3>
                <button onClick={() => setShowAddFundsModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
              </div>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {selectedGoal.icon} {selectedGoal.name}
              </p>
            </div>

            <div className="p-4 space-y-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Actuel</span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatCurrency(selectedGoal.currentAmount)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Objectif</span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatCurrency(selectedGoal.targetAmount)}</span>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Montant à ajouter (€)</label>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="100"
                  min="0"
                  step="10"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {addAmount && (
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Nouveau total : <strong>{formatCurrency(selectedGoal.currentAmount + parseFloat(addAmount || 0))}</strong>
                  </p>
                </div>
              )}

              <button
                onClick={handleAddFunds}
                disabled={!addAmount || parseFloat(addAmount) <= 0}
                className={`w-full py-3 rounded-xl font-semibold text-white ${
                  addAmount && parseFloat(addAmount) > 0
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Ajouter {addAmount ? formatCurrency(parseFloat(addAmount)) : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
