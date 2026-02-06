import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';

const SimulatorModal = ({ onClose }) => {
  const { darkMode } = useApp();

  const [target, setTarget] = useState('');
  const [monthly, setMonthly] = useState('');
  const [current, setCurrent] = useState('0');
  const [interestRate, setInterestRate] = useState('');

  const calculate = () => {
    const targetAmount = parseFloat(target) || 0;
    const monthlyAmount = parseFloat(monthly) || 0;
    const currentAmount = parseFloat(current) || 0;
    const rate = parseFloat(interestRate) || 0;

    if (!targetAmount || !monthlyAmount) return null;

    const remaining = targetAmount - currentAmount;
    if (remaining <= 0) return { months: 0, years: 0, totalSaved: currentAmount, interest: 0 };

    let months = 0;
    let totalSaved = currentAmount;
    let totalInterest = 0;
    const monthlyRate = rate / 100 / 12;

    while (totalSaved < targetAmount && months < 600) {
      const interest = totalSaved * monthlyRate;
      totalInterest += interest;
      totalSaved += monthlyAmount + interest;
      months++;
    }

    return {
      months,
      years: Math.floor(months / 12),
      remainingMonths: months % 12,
      totalSaved: Math.min(totalSaved, targetAmount),
      interest: totalInterest,
      endDate: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
    };
  };

  const result = calculate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🧮 Simulateur d'épargne</h3>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Objectif */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              🎯 Objectif à atteindre (€)
            </label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="10000"
              min="0"
              className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          {/* Épargne mensuelle */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              💰 Épargne mensuelle (€)
            </label>
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="500"
              min="0"
              className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          {/* Déjà épargné */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              📊 Déjà épargné (€)
            </label>
            <input
              type="number"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="0"
              min="0"
              className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          {/* Taux d'intérêt */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              📈 Taux d'intérêt annuel (%)
            </label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="3"
              min="0"
              step="0.1"
              className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          {/* Résultat */}
          {result && target && monthly && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20' : 'bg-gradient-to-br from-emerald-50 to-cyan-50'}`}>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Résultat</h4>
              
              {result.months === 0 ? (
                <p className="text-emerald-400 font-semibold">🎉 Objectif déjà atteint !</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Durée estimée</span>
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {result.years > 0 && `${result.years} an${result.years > 1 ? 's' : ''} `}
                      {result.remainingMonths > 0 && `${result.remainingMonths} mois`}
                      {result.years === 0 && result.remainingMonths === 0 && '< 1 mois'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Date estimée</span>
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {result.endDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {result.interest > 0 && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Intérêts gagnés</span>
                      <span className="font-semibold text-emerald-400">+{formatCurrency(result.interest)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-600/30">
                    <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Total versé</span>
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(result.months * parseFloat(monthly))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-medium ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulatorModal;