import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import api from '../api';

const Shared = () => {
  const {
    darkMode,
    currentUser,
    sharedBudgets,
    currentSharedBudget,
    setCurrentSharedBudget,
    setShowCreateSharedBudget,
    setShowJoinSharedBudget,
    setShowSharedBudgetModal,
    allCategories,
    showConfirm,
    closeConfirm,
    showAlert
  } = useApp();

  // État local pour le modal de transaction partagée
  const [showSharedTransactionModal, setShowSharedTransactionModal] = useState(false);
  const [sharedModalType, setSharedModalType] = useState('expense');
  const [sharedFormData, setSharedFormData] = useState({
    name: '',
    amount: '',
    category: ''
  });

  // État pour l'historique
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const getCategoryInfo = (categoryId) => {
    return allCategories.find(c => c.id === categoryId) || {
      id: categoryId,
      name: 'Autre',
      icon: '📌',
      color: '#6B7280'
    };
  };

  const userBudgets = sharedBudgets.filter(b => b.members?.some(m => m.userId === currentUser?.id));

  const addSharedTransaction = async (transactionData) => {
    if (!currentSharedBudget) return;
    try {
      const newTransaction = {
        ...transactionData,
        id: `shared_${Date.now()}`,
        addedBy: currentUser.id,
        addedByName: currentUser.name
      };
      await api.addSharedTransaction(currentSharedBudget.id, newTransaction);
      showAlert('Succès', 'Transaction ajoutée', 'success');
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const deleteSharedTransaction = async (transactionId) => {
    if (!currentSharedBudget) return;
    try {
      await api.deleteSharedTransaction(currentSharedBudget.id, transactionId);
      showAlert('Succès', 'Transaction supprimée', 'success');
      closeConfirm();
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleSubmitSharedTransaction = () => {
    if (!sharedFormData.name || !sharedFormData.amount) return;
    addSharedTransaction({
      name: sharedFormData.name,
      amount: parseFloat(sharedFormData.amount),
      type: sharedModalType,
      date: new Date().toISOString().split('T')[0],
      category: sharedFormData.category || (sharedModalType === 'income' ? 'other_income' : 'other_expense')
    });
    setSharedFormData({ name: '', amount: '', category: '' });
    setShowSharedTransactionModal(false);
  };

  // Charger l'historique du budget partagé
  const loadHistory = async () => {
    if (!currentSharedBudget) return;
    setHistoryLoading(true);
    try {
      const data = await api.getSharedBudgetHistory(currentSharedBudget.id);
      setHistoryData(data.history || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      showAlert('Erreur', 'Impossible de charger l\'historique', 'error');
    }
    setHistoryLoading(false);
  };

  // Formater l'action pour l'affichage
  const formatHistoryAction = (item) => {
    const icons = {
      'BUDGET_CREATED': '🎉', 'MEMBER_JOINED': '👋', 'MEMBER_LEFT': '🚪',
      'MEMBER_REMOVED': '❌', 'TRANSACTION_ADDED': '➕', 'TRANSACTION_DELETED': '🗑️',
      'SAVINGS_UPDATED': '💰'
    };
    const icon = icons[item.actionType] || '📝';
    let description = '';
    switch (item.actionType) {
      case 'BUDGET_CREATED': description = `a créé le budget "${item.details?.name || ''}"`; break;
      case 'MEMBER_JOINED': description = 'a rejoint le budget'; break;
      case 'MEMBER_LEFT': description = 'a quitté le budget'; break;
      case 'MEMBER_REMOVED': description = 'a retiré un membre du budget'; break;
      case 'TRANSACTION_ADDED':
        description = `a ajouté ${item.details?.type === 'income' ? 'un revenu' : 'une dépense'} : ${item.details?.name} (${formatCurrency(item.details?.amount || 0)})`;
        break;
      case 'TRANSACTION_DELETED':
        description = `a supprimé : ${item.details?.name} (${formatCurrency(item.details?.amount || 0)})`;
        break;
      case 'SAVINGS_UPDATED':
        description = `a modifié l'épargne : ${formatCurrency(item.details?.oldAmount || 0)} → ${formatCurrency(item.details?.newAmount || 0)}`;
        break;
      default: description = item.actionType;
    }
    return { icon, description };
  };

  // Stats du budget partagé actif
  const getSharedBudgetStats = currentSharedBudget ? (() => {
    const byMember = {};
    currentSharedBudget.transactions?.forEach(t => {
      if (!byMember[t.addedBy]) {
        byMember[t.addedBy] = { name: t.addedByName, income: 0, expenses: 0 };
      }
      if (t.type === 'income') {
        byMember[t.addedBy].income += t.amount;
      } else {
        byMember[t.addedBy].expenses += t.amount;
      }
    });
    return { byMember };
  })() : null;

  return (
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

      {/* Liste des budgets */}
      {userBudgets.length === 0 ? (
        <div className={`p-12 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm text-center`}>
          <span className="text-5xl block mb-4">👨‍👩‍👧‍👦</span>
          <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Aucun budget partagé</h4>
          <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Créez un budget familial ou rejoignez-en un existant
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userBudgets.map(budget => {
            const isActive = currentSharedBudget?.id === budget.id;
            const isOwner = budget.createdBy === currentUser?.id;
            const budgetIncome = budget.transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) || 0;
            const budgetExpenses = budget.transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) || 0;

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
                      {isOwner ? '👑 Propriétaire' : '👤 Membre'} • {budget.members?.length || 0} membre(s)
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
                  {budget.members?.slice(0, 5).map((member) => (
                    <div
                      key={member.userId}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${darkMode ? 'border-slate-800 bg-slate-600' : 'border-white bg-gray-300'}`}
                      title={member.userName}
                    >
                      {member.userName?.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {(budget.members?.length || 0) > 5 && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${darkMode ? 'border-slate-800 bg-slate-700' : 'border-white bg-gray-200'}`}>
                      +{budget.members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Détails du budget actif */}
      {currentSharedBudget && (
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              📊 Transactions de "{currentSharedBudget.name}"
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSharedModalType('income');
                  setShowSharedTransactionModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium"
              >
                + Revenu
              </button>
              <button
                onClick={() => {
                  setSharedModalType('expense');
                  setShowSharedTransactionModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium"
              >
                + Dépense
              </button>
              <button
                onClick={() => { loadHistory(); setShowHistoryModal(true); }}
                className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm font-medium`}
              >
                📜 Historique
              </button>
            </div>
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
          {(!currentSharedBudget.transactions || currentSharedBudget.transactions.length === 0) ? (
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

      {/* Modal transaction partagée */}
      {showSharedTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSharedTransactionModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {sharedModalType === 'income' ? '💰 Nouveau revenu' : '💸 Nouvelle dépense'}
                </h3>
                <button onClick={() => setShowSharedTransactionModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Description</label>
                <input
                  type="text"
                  value={sharedFormData.name}
                  onChange={(e) => setSharedFormData({...sharedFormData, name: e.target.value})}
                  placeholder="Ex: Courses"
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Montant (€)</label>
                <input
                  type="number"
                  value={sharedFormData.amount}
                  onChange={(e) => setSharedFormData({...sharedFormData, amount: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Catégorie</label>
                <select
                  value={sharedFormData.category}
                  onChange={(e) => setSharedFormData({...sharedFormData, category: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                >
                  <option value="">Sélectionner...</option>
                  {allCategories.filter(c => c.type === sharedModalType).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSubmitSharedTransaction}
                disabled={!sharedFormData.name || !sharedFormData.amount}
                className={`w-full py-3 rounded-xl font-semibold text-white ${
                  sharedFormData.name && sharedFormData.amount
                    ? sharedModalType === 'income'
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                + Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
          <div className={`w-full max-w-lg max-h-[80vh] ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} flex-shrink-0`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    📜 Historique des modifications
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {currentSharedBudget?.name}
                  </p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {historyLoading ? (
                <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span className="text-4xl block mb-2 animate-spin">⏳</span>
                  <p>Chargement...</p>
                </div>
              ) : historyData.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span className="text-4xl block mb-2">📭</span>
                  <p>Aucun historique disponible</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.map((item, i) => {
                    const { icon, description } = formatHistoryAction(item);
                    return (
                      <div key={item.id || i} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl mt-0.5">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              <span className="font-medium">{item.userName || 'Utilisateur'}</span>{' '}
                              {description}
                            </p>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                              {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shared;