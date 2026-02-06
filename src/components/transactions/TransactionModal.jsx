import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateForInput } from '../../utils/helpers';

const TransactionModal = ({ onSubmit, onReset }) => {
  const {
    showModal,
    setShowModal,
    modalType,
    editingTransaction,
    allCategories,
    allBrands,
    darkMode,
    quickTemplates
  } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    brand: '',
    date: formatDateForInput(new Date()),
    recurring: false,
    recurringFrequency: 'monthly',
    isFixedExpense: false
});

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  useEffect(() => {
  if (showModal) {
    if (editingTransaction) {
      setFormData({
        name: editingTransaction.name || '',
        amount: editingTransaction.amount?.toString() || '',
        category: editingTransaction.category || '',
        brand: editingTransaction.brand || '',
        date: formatDateForInput(editingTransaction.date) || formatDateForInput(new Date()),
        recurring: editingTransaction.recurring || false,
        recurringFrequency: editingTransaction.recurringFrequency || 'monthly',
        isFixedExpense: editingTransaction.isFixedExpense || false
      });
    } else {
      setFormData({
        name: '',
        amount: '',
        category: modalType === 'income' ? 'other_income' : 'other_expense',
        brand: '',
        date: formatDateForInput(new Date()),
        recurring: false,
        recurringFrequency: 'monthly',
        isFixedExpense: false
      });
    }
  }
}, [showModal, editingTransaction, modalType]);

  const handleClose = () => {
    setShowModal(false);
    setShowCategoryPicker(false);
    setShowBrandPicker(false);
    setShowTemplatePicker(false);
    if (onReset) onReset();
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.amount || !formData.category) return;

    const transactionData = {
      ...formData,
      amount: parseFloat(formData.amount),
      type: modalType
    };

    if (editingTransaction) {
      transactionData.id = editingTransaction.id;
    }

    if (typeof onSubmit === 'function') {
      onSubmit(transactionData);
    }

    handleClose();
  };

  const applyTemplate = (template) => {
  setFormData({
    name: template.name,
    amount: template.amount?.toString() || '',
    category: template.category || '',
    brand: template.brand || '',
    date: formatDateForInput(new Date()),
    recurring: template.recurring || false,
    recurringFrequency: template.recurringFrequency || 'monthly',
    isFixedExpense: template.isFixedExpense || false
  });
  setShowTemplatePicker(false);
};

  const filteredCategories = allCategories.filter(c => c.type === modalType);
  const selectedCategory = allCategories.find(c => c.id === formData.category);
  const selectedBrand = allBrands.find(b => b.id === formData.brand);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className={`w-full sm:max-w-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} flex items-center justify-between`}>
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {editingTransaction ? '✏️ Modifier' : modalType === 'income' ? '💰 Nouveau revenu' : '💸 Nouvelle dépense'}
          </h2>
          <button onClick={handleClose} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>
            ✕
          </button>
        </div>

        {/* Quick Templates */}
        {!editingTransaction && quickTemplates && quickTemplates.filter(t => t.type === modalType).length > 0 && (
          <div className={`p-3 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className={`w-full py-2 px-4 rounded-xl text-sm font-medium ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ⚡ Utiliser un modèle rapide
            </button>
            {showTemplatePicker && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {quickTemplates.filter(t => t.type === modalType).map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`p-3 rounded-xl text-left ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{template.name}</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{template.amount}€</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Description *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Courses Carrefour"
              required
              className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </div>

          {/* Amount */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Montant (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
              className={`w-full px-4 py-3 rounded-xl border text-xl font-semibold ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </div>

          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Catégorie *
            </label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className={`w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {selectedCategory ? (
                <span className="flex items-center gap-2">
                  <span>{selectedCategory.icon}</span>
                  <span>{selectedCategory.name}</span>
                </span>
              ) : (
                <span className={darkMode ? 'text-slate-500' : 'text-gray-400'}>Sélectionner une catégorie</span>
              )}
              <span>▼</span>
            </button>
            {showCategoryPicker && (
              <div className={`mt-2 p-2 rounded-xl border max-h-48 overflow-y-auto ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'}`}>
                <div className="grid grid-cols-2 gap-2">
                  {filteredCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: cat.id });
                        setShowCategoryPicker(false);
                      }}
                      className={`p-2 rounded-lg text-left flex items-center gap-2 ${formData.category === cat.id ? 'bg-emerald-500 text-white' : darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}
                    >
                      <span>{cat.icon}</span>
                      <span className="text-sm truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Brand (optional) */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Marque (optionnel)
            </label>
            <button
              type="button"
              onClick={() => setShowBrandPicker(!showBrandPicker)}
              className={`w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {selectedBrand ? (
                <span className="flex items-center gap-2">
                  <span>{selectedBrand.logo}</span>
                  <span>{selectedBrand.name}</span>
                </span>
              ) : (
                <span className={darkMode ? 'text-slate-500' : 'text-gray-400'}>Aucune marque</span>
              )}
              <span>▼</span>
            </button>
            {showBrandPicker && (
              <div className={`mt-2 p-2 rounded-xl border max-h-48 overflow-y-auto ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, brand: '' });
                    setShowBrandPicker(false);
                  }}
                  className={`w-full p-2 rounded-lg text-left mb-2 ${!formData.brand ? 'bg-emerald-500 text-white' : darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}
                >
                  Aucune marque
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {allBrands.map(brand => (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, brand: brand.id });
                        setShowBrandPicker(false);
                      }}
                      className={`p-2 rounded-lg text-left flex items-center gap-2 ${formData.brand === brand.id ? 'bg-emerald-500 text-white' : darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}
                    >
                      <span>{brand.logo}</span>
                      <span className="text-sm truncate">{brand.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </div>

          {/* Options */}
<div className="space-y-3">
  <div className="flex gap-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={formData.recurring}
        onChange={e => setFormData({ ...formData, recurring: e.target.checked })}
        className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
      />
      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>🔄 Récurrent</span>
    </label>
    {modalType === 'expense' && (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.isFixedExpense}
          onChange={e => setFormData({ ...formData, isFixedExpense: e.target.checked })}
          className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
        />
        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>📌 Charge fixe</span>
      </label>
    )}
  </div>
  
  {/* Fréquence de récurrence */}
  {formData.recurring && (
    <div>
      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
        Fréquence
      </label>
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'monthly', label: '📅 Mensuel' },
          { id: 'quarterly', label: '📆 Trimestriel' },
          { id: 'yearly', label: '🗓️ Annuel' }
        ].map(freq => (
          <button
            key={freq.id}
            type="button"
            onClick={() => setFormData({ ...formData, recurringFrequency: freq.id })}
            className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              formData.recurringFrequency === freq.id
                ? 'bg-emerald-500 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {freq.label}
          </button>
        ))}
      </div>
    </div>
  )}
</div>
        </form>

        {/* Footer */}
        <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={!formData.name || !formData.amount || !formData.category}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
              formData.name && formData.amount && formData.category
                ? modalType === 'income'
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {editingTransaction ? '✓ Enregistrer les modifications' : '+ Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;