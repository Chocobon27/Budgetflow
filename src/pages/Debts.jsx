import React from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import api from '../api';

const Debts = () => {
  const {
    darkMode,
    debts,
    setDebts,
    setShowDebtModal,
    setEditingDebt,
    setShowSimulator,
    setShowPlannedBudgetModal,
    showConfirm,
    closeConfirm,
    showAlert
  } = useApp();

  const handleMarkPaid = async (debt, paymentId) => {
    const updatedSchedule = debt.schedule.map(s =>
      s.id === paymentId ? { ...s, paid: true, paidDate: new Date().toISOString() } : s
    );
    const updatedDebt = { ...debt, schedule: updatedSchedule };
    try {
      await api.updateDebt(debt.id, updatedDebt);
      setDebts(prev => prev.map(d => d.id === debt.id ? updatedDebt : d));
      showAlert('Succès', 'Échéance marquée comme payée', 'success');
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleDeleteDebt = (debt) => {
    showConfirm(
      'Supprimer la dette',
      `Voulez-vous vraiment supprimer "${debt.name}" ?`,
      async () => {
        try {
          await api.deleteDebt(debt.id);
          setDebts(prev => prev.filter(d => d.id !== debt.id));
          showAlert('Succès', 'Dette supprimée', 'success');
          closeConfirm();
        } catch (error) {
          showAlert('Erreur', error.message, 'error');
        }
      }
    );
  };

  return (
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

        <div
          onClick={() => { setEditingDebt(null); setShowDebtModal(true); }}
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

      {/* Liste des dettes */}
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
                        onClick={() => handleDeleteDebt(debt)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
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
                    </span>
                    {remainingAmount <= 0 ? (
                      <span className="text-xs text-emerald-400 font-medium">✅ Crédit remboursé !</span>
                    ) : (totalCount - paidCount) > 0 && (
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {totalCount - paidCount} échéance(s) restante(s)
                      </span>
                    )}
                  </div>

                  {/* Prochaine échéance */}
                  {nextPayment && (
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
                          onClick={() => handleMarkPaid(debt, nextPayment.id)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm"
                        >
                          ✓ Marquer payé
                        </button>
                      </div>
                    </div>
                  )}

                  {remainingAmount <= 0 && (
                    <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'} text-center`}>
                      <p className="text-emerald-400 font-semibold">🎉 Crédit entièrement remboursé !</p>
                    </div>
                  )}

                  {/* Échéancier */}
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
                                  onClick={() => handleMarkPaid(debt, row.id)}
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
        </div>
      )}

      {/* État vide */}
      {debts.length === 0 && (
        <div className={`p-12 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm text-center`}>
          <span className="text-5xl block mb-4">💳</span>
          <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Aucune dette enregistrée</h4>
          <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Ajoutez vos crédits et suivez vos remboursements
          </p>
          <button
            onClick={() => { setEditingDebt(null); setShowDebtModal(true); }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium"
          >
            + Ajouter une dette
          </button>
        </div>
      )}
    </div>
  );
};

export default Debts;