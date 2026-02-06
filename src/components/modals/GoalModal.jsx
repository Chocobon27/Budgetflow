import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, generateId } from '../../utils/helpers';
import { EMOJI_PICKER } from '../../constants';
import api from '../../api';

const GoalModal = ({ goal, onClose }) => {
  const { darkMode, savingsGoals, setSavingsGoals, showAlert } = useApp();
  
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (goal) {
      setName(goal.name || '');
      setTarget(goal.target?.toString() || '');
      setCurrent(goal.current?.toString() || '');
      setTargetDate(goal.targetDate || '');
      setIcon(goal.icon || '🎯');
    }
  }, [goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const goalData = {
      id: goal?.id || generateId(),
      name,
      target: parseFloat(target) || 0,
      current: parseFloat(current) || 0,
      targetDate: targetDate || null,
      icon
    };

    try {
      if (goal) {
        await api.updateSavingsGoal(goal.id, goalData);
        setSavingsGoals(prev => prev.map(g => g.id === goal.id ? goalData : g));
        showAlert('Succès', 'Objectif modifié', 'success');
      } else {
        await api.addSavingsGoal(goalData);
        setSavingsGoals(prev => [...prev, goalData]);
        showAlert('Succès', 'Objectif créé', 'success');
      }
      onClose();
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!goal) return;
    try {
      await api.deleteSavingsGoal(goal.id);
      setSavingsGoals(prev => prev.filter(g => g.id !== goal.id));
      showAlert('Succès', 'Objectif supprimé', 'success');
      onClose();
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const percentage = target ? ((parseFloat(current) || 0) / parseFloat(target)) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {goal ? '✏️ Modifier l\'objectif' : '🎯 Nouvel objectif'}
            </h3>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Icon picker */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-16 h-16 rounded-xl text-3xl ${darkMode ? 'bg-slate-700' : 'bg-gray-100'} flex items-center justify-center`}
            >
              {icon}
            </button>
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Nom de l'objectif
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vacances, Voiture..."
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

          {/* Montants */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Objectif (€)
              </label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                required
                className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Déjà épargné (€)
              </label>
              <input
                type="number"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Date cible (optionnel)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          {/* Aperçu */}
          {target && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
              <div className="flex justify-between mb-2">
                <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>{formatCurrency(parseFloat(current) || 0)}</span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatCurrency(parseFloat(target))}</span>
              </div>
              <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                <div
                  className={`h-full rounded-full transition-all ${percentage >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className={`text-sm mt-2 text-center ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {percentage.toFixed(0)}% atteint
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {goal && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30"
              >
                🗑️
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
            >
              {goal ? '💾 Enregistrer' : '✨ Créer l\'objectif'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalModal;