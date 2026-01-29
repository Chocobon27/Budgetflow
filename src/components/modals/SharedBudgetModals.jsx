import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../utils/helpers';
import api from '../../api';

// Modal création budget partagé
export const CreateSharedBudgetModal = ({ onClose }) => {
  const { darkMode, currentUser, setSharedBudgets, setCurrentSharedBudget, showAlert } = useApp();
  const [name, setName] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await api.createSharedBudget(name);
      setSharedBudgets(prev => [...prev, created]);
      setCurrentSharedBudget(created);
      localStorage.setItem(`budgetflow_currentShared_${currentUser.id}`, created.id);
      showAlert('Succès', 'Budget partagé créé !', 'success');
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
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>👨‍👩‍👧‍👦 Créer un budget partagé</h3>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
          </div>
        </div>

        <form onSubmit={handleCreate} className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Nom du budget
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Budget familial, Colocation..."
              required
              className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
          >
            ✨ Créer le budget
          </button>
        </form>
      </div>
    </div>
  );
};

// Modal rejoindre budget partagé
export const JoinSharedBudgetModal = ({ onClose }) => {
  const { darkMode, currentUser, setSharedBudgets, setCurrentSharedBudget, showAlert } = useApp();
  const [inviteCode, setInviteCode] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const budget = await api.joinSharedBudget(inviteCode.toUpperCase(), currentUser.id, currentUser.name);
      setSharedBudgets(prev => {
        const exists = prev.find(b => b.id === budget.id);
        if (exists) {
          return prev.map(b => b.id === budget.id ? budget : b);
        }
        return [...prev, budget];
      });
      setCurrentSharedBudget(budget);
      localStorage.setItem(`budgetflow_currentShared_${currentUser.id}`, budget.id);
      showAlert('Succès', 'Vous avez rejoint le budget !', 'success');
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
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔗 Rejoindre un budget</h3>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
          </div>
        </div>

        <form onSubmit={handleJoin} className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Code d'invitation
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Ex: ABC123"
              required
              maxLength={6}
              className={`w-full px-4 py-3 rounded-xl border text-center text-2xl font-mono tracking-widest ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold"
          >
            🔗 Rejoindre
          </button>
        </form>
      </div>
    </div>
  );
};

// Modal détails budget partagé
export const SharedBudgetDetailsModal = ({ budget, onClose }) => {
  const { darkMode, currentUser, setSharedBudgets, setCurrentSharedBudget, showAlert, showConfirm, closeConfirm } = useApp();

  if (!budget) return null;

  const isOwner = budget.createdBy === currentUser?.id;

  const handleLeave = () => {
    showConfirm(
      'Quitter le budget',
      'Êtes-vous sûr de vouloir quitter ce budget partagé ?',
      async () => {
        try {
          await api.leaveSharedBudget(budget.id, currentUser.id);
          setSharedBudgets(prev => prev.filter(b => b.id !== budget.id));
          setCurrentSharedBudget(null);
          localStorage.removeItem(`budgetflow_currentShared_${currentUser.id}`);
          showAlert('Succès', 'Vous avez quitté le budget', 'success');
          closeConfirm();
          onClose();
        } catch (error) {
          showAlert('Erreur', error.message, 'error');
        }
      }
    );
  };

  const handleDelete = () => {
    showConfirm(
      'Supprimer le budget',
      'Êtes-vous sûr de vouloir supprimer ce budget ? Toutes les transactions seront perdues.',
      async () => {
        try {
          await api.deleteSharedBudget(budget.id);
          setSharedBudgets(prev => prev.filter(b => b.id !== budget.id));
          setCurrentSharedBudget(null);
          localStorage.removeItem(`budgetflow_currentShared_${currentUser.id}`);
          showAlert('Succès', 'Budget supprimé', 'success');
          closeConfirm();
          onClose();
        } catch (error) {
          showAlert('Erreur', error.message, 'error');
        }
      }
    );
  };

  const handleRemoveMember = (memberId, memberName) => {
    showConfirm(
      'Retirer le membre',
      `Voulez-vous retirer ${memberName} du budget ?`,
      async () => {
        try {
          await api.removeSharedMember(budget.id, memberId);
          setSharedBudgets(prev => prev.map(b => {
            if (b.id === budget.id) {
              return { ...b, members: b.members.filter(m => m.userId !== memberId) };
            }
            return b;
          }));
          showAlert('Succès', 'Membre retiré', 'success');
          closeConfirm();
        } catch (error) {
          showAlert('Erreur', error.message, 'error');
        }
      }
    );
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(budget.inviteCode);
    showAlert('Copié !', 'Code d\'invitation copié', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>⚙️ {budget.name}</h3>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>✕</button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Code d'invitation */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
            <p className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Code d'invitation</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-mono font-bold tracking-widest ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {budget.inviteCode}
              </span>
              <button
                onClick={copyInviteCode}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                📋
              </button>
            </div>
          </div>

          {/* Membres */}
          <div>
            <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              👥 Membres ({budget.members?.length || 0})
            </p>
            <div className="space-y-2">
              {budget.members?.map(member => (
                <div key={member.userId} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-slate-600' : 'bg-gray-300'}`}>
                      {member.userName?.charAt(0).toUpperCase()}
                    </div>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>{member.userName}</span>
                    {member.userId === budget.createdBy && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">👑 Créateur</span>
                    )}
                    {member.userId === currentUser?.id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">Vous</span>
                    )}
                  </div>
                  {isOwner && member.userId !== currentUser?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.userId, member.userName)}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quitter ou Supprimer */}
          {!isOwner ? (
            <button
              onClick={handleLeave}
              className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30"
            >
              🚪 Quitter ce budget
            </button>
          ) : (
            <button
              onClick={handleDelete}
              className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30"
            >
              🗑️ Supprimer ce budget
            </button>
          )}
        </div>
      </div>
    </div>
  );
};