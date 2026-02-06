import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Dashboard, Transactions, Statistics, Calendar, Budgets, Debts, Shared, Admin } from './pages';
import { AlertDialog, ConfirmDialog } from './components/common';
import { TransactionModal } from './components/transactions';
import { SavingsModal, GoalModal, DebtModal, SimulatorModal, PlannedBudgetModal, BudgetModal, CreateSharedBudgetModal, JoinSharedBudgetModal, SharedBudgetDetailsModal } from './components/modals';
import OfflineIndicator from './components/OfflineIndicator';
import NotificationSettings from './components/NotificationSettings';
import AchievementsModal from './components/modals/AchievementsModal';
import AchievementToast from './components/AchievementToast';
import api from './api';

function App() {
  const {
    // Auth
    isAuthenticated,
    currentUser,
    authLoading,
    authError,
    setAuthError,
    authView,
    setAuthView,
    
    // Forgot password
    forgotPasswordStep,
    setForgotPasswordStep,
    forgotPasswordEmail,
    setForgotPasswordEmail,
    securityQuestion,
    setSecurityQuestion,
    
    // UI
    darkMode,
    setDarkMode,
    currentView,
    setCurrentView,
    mobileMenuOpen,
    setMobileMenuOpen,
    isConnected,
    
    // Data
    transactions,
    setTransactions,
    savings,
    setSavings,
    debts,
    setDebts,
    savingsGoals,
    setSavingsGoals,
    sharedBudgets,
    setSharedBudgets,
    currentSharedBudget,
    setCurrentSharedBudget,
    
    // Modals
    showModal,
    setShowModal,
    modalType,
    setModalType,
    editingTransaction,
    setEditingTransaction,
    showSavingsModal,
    setShowSavingsModal,
    showGoalModal,
    setShowGoalModal,
    editingGoal,
    setEditingGoal,
    showDebtModal,
    setShowDebtModal,
    editingDebt,
    setEditingDebt,
    showSimulator,
    setShowSimulator,
    showCreateSharedBudget,
    setShowCreateSharedBudget,
    showJoinSharedBudget,
    setShowJoinSharedBudget,
    showSharedBudgetModal,
    setShowSharedBudgetModal,
    showPlannedBudgetModal,
    setShowPlannedBudgetModal,
    showBudgetModal,
    setShowBudgetModal,
    showNotificationsSettings,
    setShowNotificationsSettings,
    
    // Achievements
    showAchievementsModal,
    setShowAchievementsModal,
    newAchievement,
    achievements,
    
    // Dialogs
    alertDialog,
    setAlertDialog,
    confirmDialog,
    setConfirmDialog,
    
    // Functions
    showAlert,
    showConfirm,
    closeConfirm,
    isAdmin,
    loadUserData,

    // Offline
    isOnline,
    pendingCount,
    isSyncing,
    addPendingAction
  } = useApp();

  // Auth form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerSecretQuestion, setRegisterSecretQuestion] = useState('');
  const [registerSecretAnswer, setRegisterSecretAnswer] = useState('');
  const [forgotSecretAnswer, setForgotSecretAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);

  // Secret questions
  const SECRET_QUESTIONS = [
    "Quel est le nom de votre premier animal ?",
    "Quelle est votre ville de naissance ?",
    "Quel est le prénom de votre meilleur ami d'enfance ?",
    "Quel est le nom de votre école primaire ?",
    "Quelle est la marque de votre première voiture ?",
    "Quel est le plat préféré de votre enfance ?",
    "Quel est le nom de jeune fille de votre mère ?",
    "Quelle est votre destination de vacances préférée ?"
  ];

  // Nav items
    const navItems = [
    { id: 'dashboard', label: 'Accueil', icon: '🏠' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'calendar', label: 'Calendrier', icon: '📅' },
    { id: 'statistics', label: 'Statistiques', icon: '📊' },
    { id: 'budgets', label: 'Budgets', icon: '🎯' },
    { id: 'planning', label: 'Dettes', icon: '💳' },
    { id: 'shared', label: 'Partagé', icon: '👨‍👩‍👧‍👦' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: '⚙️' }] : []),
  ];

  // === AUTH HANDLERS ===
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading2(true);
    setAuthError('');
    try {
      const data = await api.login(loginEmail, loginPassword);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading2(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerSecretQuestion || !registerSecretAnswer) {
      setAuthError('Veuillez choisir une question secrète et sa réponse');
      return;
    }
    setAuthLoading2(true);
    setAuthError('');
    try {
      const data = await api.register(
        registerName,
        registerEmail,
        registerPassword,
        registerSecretQuestion,
        registerSecretAnswer
      );
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading2(false);
    }
  };

  const handleForgotPasswordStep1 = async (e) => {
    e.preventDefault();
    setAuthLoading2(true);
    setAuthError('');
    try {
      const data = await api.forgotPassword(forgotPasswordEmail);
      setSecurityQuestion(data.securityQuestion);
      setForgotPasswordStep(2);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading2(false);
    }
  };

  const handleForgotPasswordStep2 = async (e) => {
    e.preventDefault();
    setAuthLoading2(true);
    setAuthError('');
    try {
      await api.resetPassword(forgotPasswordEmail, forgotSecretAnswer, newPassword);
      showAlert('Succès', 'Mot de passe réinitialisé ! Vous pouvez vous connecter.', 'success');
      setAuthView('login');
      setForgotPasswordStep(1);
      setForgotPasswordEmail('');
      setForgotSecretAnswer('');
      setNewPassword('');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading2(false);
    }
  };

  const handleLogout = async () => {
  await api.logout();
  window.location.href = '/';
  };

  // === TRANSACTION HANDLERS ===
  const handleAddTransaction = async (transactionData) => {
    try {
      await api.addTransaction(transactionData);
      setShowModal(false);
      showAlert('Succès', 'Transaction ajoutée', 'success');
    } catch (error) {
      // Mode hors-ligne : sauvegarder localement
      if (!isOnline || error.message?.includes('offline')) {
        const success = await addPendingAction({
          type: 'ADD_TRANSACTION',
          endpoint: '/transactions',
          method: 'POST',
          body: transactionData
        });
        if (success) {
          setShowModal(false);
          showAlert('Hors-ligne', 'Transaction sauvegardée localement', 'warning');
        } else {
          showAlert('Erreur', 'Impossible de sauvegarder', 'error');
        }
      } else {
        showAlert('Erreur', error.message, 'error');
      }
    }
  };

  const handleUpdateTransaction = async (transactionData) => {
  try {
    await api.updateTransaction(transactionData.id, transactionData);
    setShowModal(false);
    setEditingTransaction(null);
    showAlert('Succès', 'Transaction modifiée', 'success');
  } catch (error) {
    // Mode hors-ligne : sauvegarder localement
    if (!isOnline || error.message?.includes('offline')) {
      const success = await addPendingAction({
        type: 'UPDATE_TRANSACTION',
        endpoint: `/transactions/${transactionData.id}`,
        method: 'PUT',
        body: transactionData
      });
      if (success) {
        setShowModal(false);
        setEditingTransaction(null);
        showAlert('Hors-ligne', 'Modification sauvegardée localement', 'warning');
      } else {
        showAlert('Erreur', 'Impossible de sauvegarder', 'error');
      }
    } else {
      showAlert('Erreur', error.message, 'error');
    }
  }
};

  const handleDeleteTransaction = (transactionId) => {
    showConfirm(
      'Supprimer la transaction',
      'Êtes-vous sûr de vouloir supprimer cette transaction ?',
      async () => {
        try {
          await api.deleteTransaction(transactionId);
          setTransactions(prev => prev.filter(t => t.id !== transactionId));
          showAlert('Succès', 'Transaction supprimée', 'success');
          closeConfirm();
        } catch (error) {
          showAlert('Erreur', error.message, 'error');
        }
      }
    );
  };

  // === RENDER ===

  // Loading
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Chargement...</p>
        </div>
      </div>
    );
  }

  // Auth screens
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-emerald-50 to-cyan-50'}`}>
        <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              💰 BudgetFlow
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {authView === 'login' ? 'Connexion' : authView === 'register' ? 'Inscription' : 'Mot de passe oublié'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-400 text-sm">{authError}</div>
          )}

          {/* LOGIN */}
          {authView === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email"
                required
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
              <button
                type="submit"
                disabled={authLoading2}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold disabled:opacity-50"
              >
                {authLoading2 ? 'Connexion...' : 'Se connecter'}
              </button>
              <div className="flex justify-between text-sm">
                <button type="button" onClick={() => setAuthView('register')} className="text-emerald-400 hover:underline">
                  Créer un compte
                </button>
                <button type="button" onClick={() => setAuthView('forgot')} className="text-slate-400 hover:underline">
                  Mot de passe oublié ?
                </button>
              </div>
            </form>
          )}

          {/* REGISTER */}
          {authView === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Nom"
                required
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="Email"
                required
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
              <select
                value={registerSecretQuestion}
                onChange={(e) => setRegisterSecretQuestion(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              >
                <option value="">Choisir une question secrète...</option>
                {SECRET_QUESTIONS.map((q, i) => (
                  <option key={i} value={q}>{q}</option>
                ))}
              </select>
              <input
                type="text"
                value={registerSecretAnswer}
                onChange={(e) => setRegisterSecretAnswer(e.target.value)}
                placeholder="Réponse secrète"
                required
                className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
              />
              <button
                type="submit"
                disabled={authLoading2}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold disabled:opacity-50"
              >
                {authLoading2 ? 'Inscription...' : "S'inscrire"}
              </button>
              <button type="button" onClick={() => setAuthView('login')} className="w-full text-sm text-emerald-400 hover:underline">
                Déjà un compte ? Se connecter
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {authView === 'forgot' && (
            <>
              {forgotPasswordStep === 1 ? (
                <form onSubmit={handleForgotPasswordStep1} className="space-y-4">
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="Votre email"
                    required
                    className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <button
                    type="submit"
                    disabled={authLoading2}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold disabled:opacity-50"
                  >
                    {authLoading2 ? 'Vérification...' : 'Continuer'}
                  </button>
                  <button type="button" onClick={() => setAuthView('login')} className="w-full text-sm text-slate-400 hover:underline">
                    Retour à la connexion
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotPasswordStep2} className="space-y-4">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{securityQuestion}</p>
                  </div>
                  <input
                    type="text"
                    value={forgotSecretAnswer}
                    onChange={(e) => setForgotSecretAnswer(e.target.value)}
                    placeholder="Votre réponse"
                    required
                    className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    required
                    className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <button
                    type="submit"
                    disabled={authLoading2}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold disabled:opacity-50"
                  >
                    {authLoading2 ? 'Réinitialisation...' : 'Réinitialiser'}
                  </button>
                  <button type="button" onClick={() => { setForgotPasswordStep(1); setAuthView('login'); }} className="w-full text-sm text-slate-400 hover:underline">
                    Annuler
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 ${darkMode ? 'bg-slate-800/90' : 'bg-white/90'} backdrop-blur-lg border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-700/50"
            >
              ☰
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              💰 BudgetFlow
            </h1>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentView === item.id
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white'
                    : darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* WebSocket indicator */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} title={isConnected ? 'Connecté' : 'Déconnecté'} />
            <button
              onClick={() => setShowNotificationsSettings(true)}
              className={`p-2 rounded-xl ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              title="Notifications"
            >
              🔔
            </button>
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <span className={`text-sm hidden sm:block ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {currentUser?.name}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30"
                title="Déconnexion"
              >
                🚪
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="p-4 grid grid-cols-3 gap-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentView(item.id); setMobileMenuOpen(false); }}
                  className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                    currentView === item.id
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white'
                      : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-xl block mb-1">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto p-4 pb-24">
        {currentView === 'dashboard' && (
          <Dashboard
            onEditTransaction={(t) => { setEditingTransaction(t); setModalType(t.type); setShowModal(true); }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
        {currentView === 'transactions' && (
          <Transactions
            onEditTransaction={(t) => { setEditingTransaction(t); setModalType(t.type); setShowModal(true); }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
        {currentView === 'calendar' && (
          <Calendar onDeleteTransaction={handleDeleteTransaction} />
        )}
        {currentView === 'statistics' && <Statistics />}
        {currentView === 'budgets' && <Budgets />}
        {currentView === 'planning' && <Debts />}
        {currentView === 'shared' && <Shared />}
        {currentView === 'admin' && <Admin />}
      </main>

      {/* Quick actions FAB */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-30">
        <button
          onClick={() => { setModalType('income'); setEditingTransaction(null); setShowModal(true); }}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center text-2xl hover:scale-110 transition-transform"
          title="Ajouter un revenu"
        >
          +
        </button>
        <button
          onClick={() => { setModalType('expense'); setEditingTransaction(null); setShowModal(true); }}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 flex items-center justify-center text-2xl hover:scale-110 transition-transform"
          title="Ajouter une dépense"
        >
          −
        </button>
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        darkMode={darkMode}
      />

      {/* Modals */}
      {showModal && (
        <TransactionModal
          onSubmit={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
          onReset={() => setEditingTransaction(null)}
        />
      )}

      {/* Dialogs */}
      {alertDialog.show && (
        <AlertDialog
          title={alertDialog.title}
          message={alertDialog.message}
          type={alertDialog.type}
          onClose={() => setAlertDialog({ show: false })}
        />
      )}

      {confirmDialog.show && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      {/* Savings Modal */}
      {showSavingsModal && (
        <SavingsModal onClose={() => setShowSavingsModal(false)} />
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <GoalModal
          goal={editingGoal}
          onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
        />
      )}

      {/* Debt Modal */}
      {showDebtModal && (
        <DebtModal
          debt={editingDebt}
          onClose={() => { setShowDebtModal(false); setEditingDebt(null); }}
        />
      )}

      {/* Simulator Modal */}
      {showSimulator && (
        <SimulatorModal onClose={() => setShowSimulator(false)} />
      )}

      {/* Planned Budget Modal */}
      {showPlannedBudgetModal && (
        <PlannedBudgetModal onClose={() => setShowPlannedBudgetModal(false)} />
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <BudgetModal onClose={() => setShowBudgetModal(false)} />
      )}

      {/* Shared Budget Modals */}
      {showCreateSharedBudget && (
        <CreateSharedBudgetModal onClose={() => setShowCreateSharedBudget(false)} />
      )}

      {showJoinSharedBudget && (
        <JoinSharedBudgetModal onClose={() => setShowJoinSharedBudget(false)} />
      )}

      {showNotificationsSettings && (
        <NotificationSettings onClose={() => setShowNotificationsSettings(false)} />
      )}

      {showAchievementsModal && (
        <AchievementsModal onClose={() => setShowAchievementsModal(false)} />
      )}

      <AchievementToast achievement={newAchievement} darkMode={darkMode} />

      {showSharedBudgetModal && currentSharedBudget && (
        <SharedBudgetDetailsModal
          budget={currentSharedBudget}
          onClose={() => setShowSharedBudgetModal(false)}
        />
      )}
    </div>
  );
}

export default App;