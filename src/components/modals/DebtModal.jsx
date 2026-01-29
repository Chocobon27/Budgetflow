import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, generateId } from '../../utils/helpers';
import { EMOJI_PICKER } from '../../constants';
import api from '../../api';

const DebtModal = ({ debt, onClose }) => {
  const { darkMode, setDebts, showAlert } = useApp();

  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [icon, setIcon] = useState('💳');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [nbPayments, setNbPayments] = useState('');

  useEffect(() => {
    if (debt) {
      setName(debt.name || '');
      setCreditor(debt.creditor || '');
      setTotalAmount(debt.totalAmount?.toString() || '');
      setMonthlyPayment(debt.monthlyPayment?.toString() || '');
      setInterestRate(debt.interestRate?.toString() || '');
      setStartDate(debt.startDate || '');
      setIcon(debt.icon || '💳');
      setNbPayments(debt.schedule?.length?.toString() || '');
    } else {
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [debt]);

  const generateSchedule = () => {
    const total = parseFloat(totalAmount) || 0;
    const monthly = parseFloat(monthlyPayment) || 0;
    const payments = parseInt(nbPayments) || 0;
    const start = new Date(startDate);

    if (!total || !monthly || !payments || !startDate) return [];

    const schedule = [];
    for (let i = 0; i < payments; i++) {
      const paymentDate = new Date(start);
      paymentDate.setMonth(paymentDate.getMonth() + i);
      
      schedule.push({
        id: generateId(),
        date: paymentDate.toISOString().split('T')[0],
        amount: monthly,
        paid: false,
        paidDate: null
      });
    }
    return schedule;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const schedule = debt?.schedule || generateSchedule();

    const debtData = {
      id: debt?.id || generateId(),
      name,
      creditor,
      totalAmount: parseFloat(totalAmount) || 0,
      monthlyPayment: parseFloat(monthlyPayment) || 0,
      interestRate: parseFloat(interestRate) || 0,
      startDate,
      icon,
      schedule: debt ? debt.schedule : schedule
    };

    try {
      if (debt) {
        await api.updateDebt(debt.id, debtData);
        setDebts(prev => prev.map(d => d.id === debt.id ? debtData : d));
        showAlert('Succès', 'Dette modifiée', 'success');
      } else {
        await api.addDebt(debtData);
        setDebts(prev => [...prev, debtData]);
        showAlert('Succès', 'Dette ajoutée', 'success');
      }
      onClose();
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const previewSchedule = generateSchedule();
  const previewTotal = previewSchedule.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {debt ? '✏️ Modifier la dette' : '💳 Nouvelle dette'}
            </h3>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Icon + Nom */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-14 h-14 rounded-xl text-2xl ${darkMode ? 'bg-slate-700' : 'bg-gray-100'} flex items-center justify-center`}
            >
              {icon}
            </button>
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Nom du crédit
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Crédit auto, Prêt immo..."
                required
                className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>
          </div>

          {showEmojiPicker && (
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-100'} grid grid-cols-8 gap-2`}>
              {EMOJI_PICKER.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setIcon(emoji); setShowEmojiPicker(false); }}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Créancier */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Créancier (optionnel)
            </label>
            <input
              type="text"
              value={creditor}
              onChange={(e) => setCreditor(e.target.value)}
              placeholder="Ex: Banque, Organisme..."
              className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          {/* Montants */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Montant total (€)
              </label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                required
                className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Mensualité (€)
              </label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                required
                className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>
          </div>

          {/* Détails */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Taux (%)
              </label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Nb échéances
              </label>
              <input
                type="number"
                value={nbPayments}
                onChange={(e) => setNbPayments(e.target.value)}
                placeholder="12"
                min="1"
                required={!debt}
                disabled={!!debt}
                className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'} ${debt ? 'opacity-50' : ''}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required={!debt}
                disabled={!!debt}
                className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'} ${debt ? 'opacity-50' : ''}`}
              />
            </div>
          </div>

          {/* Aperçu */}
          {!debt && previewSchedule.length > 0 && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
              <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                📋 Aperçu de l'échéancier
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Nombre d'échéances : </span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>{previewSchedule.length}</span>
                </div>
                <div>
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Total : </span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatCurrency(previewTotal)}</span>
                </div>
                <div>
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Première : </span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>{new Date(previewSchedule[0]?.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div>
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Dernière : </span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>{new Date(previewSchedule[previewSchedule.length - 1]?.date).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
          >
            {debt ? '💾 Enregistrer' : '✨ Créer la dette'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DebtModal;