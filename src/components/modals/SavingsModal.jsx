import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import api from '../../api';

const SavingsModal = ({ onClose }) => {
  const { darkMode, savings, setSavings, showAlert } = useApp();
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('add');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      showAlert('Erreur', 'Montant invalide', 'error');
      return;
    }

    const newSavings = action === 'add' ? savings + value : Math.max(0, savings - value);
    
    try {
      await api.updateSavings(newSavings);
      setSavings(newSavings);
      showAlert('Succès', `Épargne ${action === 'add' ? 'ajoutée' : 'retirée'}`, 'success');
      onClose();
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Gérer mon épargne</h3>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Épargne actuelle */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-500/20' : 'bg-purple-50'} text-center`}>
            <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>Épargne actuelle</p>
            <p className="text-3xl font-bold text-purple-400">{formatCurrency(savings)}</p>
          </div>

          {/* Action */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAction('add')}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                action === 'add'
                  ? 'bg-emerald-500 text-white'
                  : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
              }`}
            >
              ➕ Ajouter
            </button>
            <button
              type="button"
              onClick={() => setAction('remove')}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                action === 'remove'
                  ? 'bg-rose-500 text-white'
                  : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
              }`}
            >
              ➖ Retirer
            </button>
          </div>

          {/* Montant */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Montant (€)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className={`w-full px-4 py-3 rounded-xl border text-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          {/* Aperçu */}
          {amount && !isNaN(parseFloat(amount)) && (
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Nouvelle épargne :</p>
              <p className={`text-xl font-bold ${action === 'add' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(action === 'add' ? savings + parseFloat(amount) : Math.max(0, savings - parseFloat(amount)))}
              </p>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-semibold text-white ${
              action === 'add'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                : 'bg-gradient-to-r from-rose-500 to-orange-500'
            }`}
          >
            {action === 'add' ? '💰 Ajouter à l\'épargne' : '💸 Retirer de l\'épargne'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SavingsModal;