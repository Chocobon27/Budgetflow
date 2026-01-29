import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import api from '../../api';

const BudgetModal = ({ onClose }) => {
  const { darkMode, categoryBudgets, setCategoryBudgets, allCategories, showAlert } = useApp();
  const [budgets, setBudgets] = useState({});

  useEffect(() => {
    setBudgets(categoryBudgets || {});
  }, [categoryBudgets]);

  const handleChange = (categoryId, value) => {
    setBudgets(prev => ({
      ...prev,
      [categoryId]: value
    }));
  };

  const handleSave = async () => {
    try {
      await api.updateCategoryBudgets(budgets);
      setCategoryBudgets(budgets);
      showAlert('Succès', 'Budgets enregistrés', 'success');
      onClose();
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleClear = (categoryId) => {
    setBudgets(prev => {
      const newBudgets = { ...prev };
      delete newBudgets[categoryId];
      return newBudgets;
    });
  };

  const total = Object.values(budgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const expenseCategories = allCategories.filter(c => c.type === 'expense' || !c.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Budgets par Catégorie</h3>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
          </div>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Définissez une limite mensuelle par catégorie
          </p>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {expenseCategories.map(category => (
              <div key={category.id} className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <span className="text-xl">{category.icon}</span>
                <span className={`flex-1 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{category.name}</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      value={budgets[category.id] || ''}
                      onChange={(e) => handleChange(category.id, e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className={`w-28 px-3 py-2 rounded-lg border text-right ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>€</span>
                  </div>
                  {budgets[category.id] && (
                    <button
                      onClick={() => handleClear(category.id)}
                      className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Budget total mensuel</span>
            <span className="text-xl font-bold text-amber-400">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
          >
            💾 Enregistrer les budgets
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;