import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import { CATEGORIES, POPULAR_BRANDS } from '../constants';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // ============================================
  // ÉTATS - Authentification
  // ============================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authView, setAuthView] = useState('login');
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [secretQuestion, setSecretQuestion] = useState('');

  // ============================================
  // ÉTATS - WebSocket
  // ============================================
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // ============================================
  // ÉTATS - UI
  // ============================================
  const [currentView, setCurrentView] = useState(() => {
  return localStorage.getItem('budgetflow_currentView') || 'dashboard';
});
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('budgetflow_darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [goalPeriod, setGoalPeriod] = useState(() => {
  const saved = localStorage.getItem('budgetflow_goalPeriod');
  return saved ? parseInt(saved) : 6;
  });
  // ============================================
  // ÉTATS - Données principales
  // ============================================
  const [transactions, setTransactions] = useState([]);
  const [savings, setSavings] = useState(0);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [customCategories, setCustomCategories] = useState([]);
  const [customBrands, setCustomBrands] = useState([]);
  const [debts, setDebts] = useState([]);
  const [quickTemplates, setQuickTemplates] = useState([]);
  const [achievements, setAchievements] = useState({ unlocked: [], streak: 0, lastActivity: null, points: 0 });
  const [plannedBudget, setPlannedBudget] = useState({});

  // ============================================
  // ÉTATS - Budgets partagés
  // ============================================
  const [sharedBudgets, setSharedBudgets] = useState([]);
  const [currentSharedBudget, setCurrentSharedBudget] = useState(null);
  const [showCreateSharedBudget, setShowCreateSharedBudget] = useState(false);
  const [showJoinSharedBudget, setShowJoinSharedBudget] = useState(false);
  const [showSharedBudgetModal, setShowSharedBudgetModal] = useState(false);

  // ============================================
  // ÉTATS - Admin
  // ============================================
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const currentAdminPermissions = ['all'];

  // ============================================
  // ÉTATS - Modals et Dialogs
  // ============================================
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showPlannedBudgetModal, setShowPlannedBudgetModal] = useState(false);
  
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNotificationsSettings, setShowNotificationsSettings] = useState(false);

  // ============================================
  // ÉTATS - Dialogs génériques
  // ============================================
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [inputDialog, setInputDialog] = useState({ show: false, title: '', fields: [], onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ show: false, title: '', message: '', type: 'success' });

  // ============================================
  // ÉTATS - Settings
  // ============================================
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const saved = localStorage.getItem('budgetflow_notifications');
    return saved ? JSON.parse(saved) : {
      lowBalanceAlert: true,
      lowBalanceThreshold: 100,
      weeklyReminder: true,
      monthlyReport: true,
      upcomingPayments: true
    };
  });

  const [backupSettings, setBackupSettings] = useState(() => {
    const saved = localStorage.getItem('budgetflow_backupSettings');
    return saved ? JSON.parse(saved) : {
      autoBackupHour: 12,
      autoBackupEnabled: true
    };
  });

  // ============================================
  // MÉMOS - Catégories et marques combinées
  // ============================================
  const allCategories = [...CATEGORIES, ...customCategories];
  const allBrands = [...POPULAR_BRANDS, ...customBrands];

  // ============================================
  // FONCTIONS - Dialogs
  // ============================================
  const showAlert = useCallback((title, message, type = 'success') => {
    setAlertDialog({ show: true, title, message, type });
  }, []);

  const showConfirm = useCallback((title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
  }, []);

  const hasPermission = useCallback((permission) => {
    if (isAdmin) return true;
    if (currentAdminPermissions.includes('all')) return true;
    return currentAdminPermissions.includes(permission);
  }, [isAdmin]);

  // ============================================
  // FONCTIONS - Chargement données
  // ============================================
  const loadUserData = useCallback(async () => {
    try {
      const data = await api.sync();
      if (data) {
        setTransactions(data.transactions || []);
        setCustomCategories(data.customCategories || []);
        setCustomBrands(data.customBrands || []);
        setSavings(data.savings || 0);
        setSavingsGoals(data.savingsGoals || []);
        setCategoryBudgets(data.categoryBudgets || {});
        setDebts(data.debts || []);
        setQuickTemplates(data.templates || []);
        setAchievements(data.achievements || { unlocked: [], streak: 0, lastActivity: null, points: 0 });
        setPlannedBudget(data.plannedBudget || {});
        
        const sharedData = await api.getSharedBudgets();
        if (sharedData) setSharedBudgets(sharedData);
      }
      
      try {
        const adminData = await api.checkAdmin();
        setIsAdmin(adminData.isAdmin || false);
      } catch (e) {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  }, []);

  const loadAdminUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAdmin(true);
    try {
      const users = await api.getAdminUsers();
      setAdminUsers(users || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
    setLoadingAdmin(false);
  }, [isAdmin]);

  // ============================================
  // EFFETS - Dark mode
  // ============================================
  useEffect(() => {
    localStorage.setItem('budgetflow_darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  // Sauvegarder la vue courante
  useEffect(() => {
    localStorage.setItem('budgetflow_currentView', currentView);
  }, [currentView]);
  // Sauvegarder goalPeriod
  useEffect(() => {
    localStorage.setItem('budgetflow_goalPeriod', goalPeriod.toString());
  }, [goalPeriod]);
  // ============================================
  // EFFETS - Notification settings
  // ============================================
  useEffect(() => {
    localStorage.setItem('budgetflow_notifications', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    localStorage.setItem('budgetflow_backupSettings', JSON.stringify(backupSettings));
  }, [backupSettings]);

  // ============================================
  // EFFETS - Auth check
  // ============================================
  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const data = await api.verify();
          if (data && data.user) {
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            await loadUserData();
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          api.removeToken();
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [loadUserData]);

  // ============================================
  // EFFETS - WebSocket
  // ============================================
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = api.getToken();
    if (!token) return;

    console.log('🔌 Initializing WebSocket...');
    
    const newSocket = io('https://fin.yugary-esport.fr', {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 WebSocket connection error:', error.message);
      setIsConnected(false);
    });

    // === TRANSACTIONS ===
    newSocket.on('transaction:created', (transaction) => {
      console.log('📥 Transaction created:', transaction);
      setTransactions(prev => [transaction, ...prev]);
    });

    newSocket.on('transaction:updated', (transaction) => {
      console.log('📥 Transaction updated:', transaction);
      setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
    });

    newSocket.on('transaction:deleted', (data) => {
      console.log('📥 Transaction deleted:', data);
      setTransactions(prev => prev.filter(t => t.id !== data.id));
    });

    // === SAVINGS ===
    newSocket.on('savings:updated', (data) => {
      console.log('📥 Savings updated:', data);
      setSavings(data.amount);
    });

    // === SAVINGS GOALS ===
    newSocket.on('savingsGoal:created', (goal) => {
      console.log('📥 Savings goal created:', goal);
      setSavingsGoals(prev => [...prev, goal]);
    });

    newSocket.on('savingsGoal:updated', (goal) => {
      console.log('📥 Savings goal updated:', goal);
      setSavingsGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
    });

    newSocket.on('savingsGoal:deleted', (data) => {
      console.log('📥 Savings goal deleted:', data);
      setSavingsGoals(prev => prev.filter(g => g.id !== data.id));
    });

    // === CATEGORY BUDGETS ===
    newSocket.on('categoryBudgets:updated', (budgets) => {
      console.log('📥 Category budgets updated:', budgets);
      setCategoryBudgets(budgets);
    });

    // === CUSTOM CATEGORIES ===
    newSocket.on('customCategory:created', (category) => {
      console.log('📥 Custom category created:', category);
      setCustomCategories(prev => [...prev, category]);
    });

    newSocket.on('customCategory:deleted', (data) => {
      console.log('📥 Custom category deleted:', data);
      setCustomCategories(prev => prev.filter(c => c.id !== data.id));
    });

    // === CUSTOM BRANDS ===
    newSocket.on('customBrand:created', (brand) => {
      console.log('📥 Custom brand created:', brand);
      setCustomBrands(prev => [...prev, brand]);
    });

    newSocket.on('customBrand:deleted', (data) => {
      console.log('📥 Custom brand deleted:', data);
      setCustomBrands(prev => prev.filter(b => b.id !== data.id));
    });

    // === DEBTS ===
    newSocket.on('debt:created', (debt) => {
      console.log('📥 Debt created:', debt);
      setDebts(prev => [...prev, debt]);
    });

    newSocket.on('debt:updated', (debt) => {
      console.log('📥 Debt updated:', debt);
      setDebts(prev => prev.map(d => d.id === debt.id ? debt : d));
    });

    newSocket.on('debt:deleted', (data) => {
      console.log('📥 Debt deleted:', data);
      setDebts(prev => prev.filter(d => d.id !== data.id));
    });

    // === TEMPLATES ===
    newSocket.on('template:created', (template) => {
      console.log('📥 Template created:', template);
      setQuickTemplates(prev => [...prev, template]);
    });

    newSocket.on('template:updated', (template) => {
      console.log('📥 Template updated:', template);
      setQuickTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    });

    newSocket.on('template:deleted', (data) => {
      console.log('📥 Template deleted:', data);
      setQuickTemplates(prev => prev.filter(t => t.id !== data.id));
    });

    // === ACHIEVEMENTS ===
    newSocket.on('achievements:updated', (data) => {
      console.log('📥 Achievements updated:', data);
      setAchievements(data);
    });

    // === PLANNED BUDGET ===
    newSocket.on('plannedBudget:updated', (budget) => {
      console.log('📥 Planned budget updated:', budget);
      setPlannedBudget(budget);
    });

    // === SHARED BUDGETS ===
    newSocket.on('sharedTransaction:created', (data) => {
      console.log('📥 Shared transaction created:', data);
      setSharedBudgets(prev => prev.map(b => {
        if (b.id === data.budgetId) {
          return { ...b, transactions: [data.transaction, ...b.transactions] };
        }
        return b;
      }));
      setCurrentSharedBudget(prev => {
        if (prev && prev.id === data.budgetId) {
          return { ...prev, transactions: [data.transaction, ...prev.transactions] };
        }
        return prev;
      });
    });

    newSocket.on('sharedTransaction:deleted', (data) => {
      console.log('📥 Shared transaction deleted:', data);
      setSharedBudgets(prev => prev.map(b => {
        if (b.id === data.budgetId) {
          return { ...b, transactions: b.transactions.filter(t => t.id !== data.transactionId) };
        }
        return b;
      }));
      setCurrentSharedBudget(prev => {
        if (prev && prev.id === data.budgetId) {
          return { ...prev, transactions: prev.transactions.filter(t => t.id !== data.transactionId) };
        }
        return prev;
      });
    });

    newSocket.on('sharedSavings:updated', (data) => {
      console.log('📥 Shared savings updated:', data);
      setSharedBudgets(prev => prev.map(b => {
        if (b.id === data.budgetId) {
          return { ...b, savings: data.amount };
        }
        return b;
      }));
      setCurrentSharedBudget(prev => {
        if (prev && prev.id === data.budgetId) {
          return { ...prev, savings: data.amount };
        }
        return prev;
      });
    });

    newSocket.on('sharedBudget:memberJoined', (data) => {
      console.log('📥 Member joined shared budget:', data);
      setSharedBudgets(prev => prev.map(b => {
        if (b.id === data.budgetId) {
          return { ...b, members: [...b.members, data.member] };
        }
        return b;
      }));
      setCurrentSharedBudget(prev => {
        if (prev && prev.id === data.budgetId) {
          return { ...prev, members: [...prev.members, data.member] };
        }
        return prev;
      });
    });

    newSocket.on('sharedBudget:memberLeft', (data) => {
      console.log('📥 Member left shared budget:', data);
      setSharedBudgets(prev => prev.map(b => {
        if (b.id === data.budgetId) {
          return { ...b, members: b.members.filter(m => m.userId !== data.userId) };
        }
        return b;
      }));
      setCurrentSharedBudget(prev => {
        if (prev && prev.id === data.budgetId) {
          return { ...prev, members: prev.members.filter(m => m.userId !== data.userId) };
        }
        return prev;
      });
    });

    newSocket.on('sharedBudget:memberRemoved', (data) => {
      console.log('📥 Member removed from shared budget:', data);
      setSharedBudgets(prev => prev.map(b => {
        if (b.id === data.budgetId) {
          return { ...b, members: b.members.filter(m => m.userId !== data.userId) };
        }
        return b;
      }));
      setCurrentSharedBudget(prev => {
        if (prev && prev.id === data.budgetId) {
          return { ...prev, members: prev.members.filter(m => m.userId !== data.userId) };
        }
        return prev;
      });
    });

    newSocket.on('sharedBudget:deleted', (data) => {
      console.log('📥 Shared budget deleted:', data);
      setSharedBudgets(prev => prev.filter(b => b.id !== data.budgetId));
      setCurrentSharedBudget(prev => {
        if (prev && prev.id === data.budgetId) {
          return null;
        }
        return prev;
      });
    });

    socketRef.current = newSocket;

    return () => {
      console.log('🔌 Cleaning up WebSocket...');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // Déconnecter WebSocket au logout
  useEffect(() => {
    if (!isAuthenticated && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  // Charger admin users
  useEffect(() => {
    if ((showAdminModal || currentView === 'admin') && isAdmin) {
      loadAdminUsers();
    }
  }, [showAdminModal, isAdmin, currentView, loadAdminUsers]);

  // ============================================
  // VALEUR DU CONTEXTE
  // ============================================
  const value = {
    // Auth
    isAuthenticated, setIsAuthenticated,
    currentUser, setCurrentUser,
    authLoading, setAuthLoading,
    authError, setAuthError,
    authView, setAuthView,
    forgotPasswordStep, setForgotPasswordStep,
    forgotPasswordEmail, setForgotPasswordEmail,
    secretQuestion, setSecretQuestion,

    // WebSocket
    socketRef, isConnected,

    // UI
    currentView, setCurrentView,
    darkMode, setDarkMode,
    mobileMenuOpen, setMobileMenuOpen,
    showModal, setShowModal,
    modalType, setModalType,
    editingTransaction, setEditingTransaction,
    selectedPeriod, setSelectedPeriod,
    goalPeriod, setGoalPeriod,

    // Data
    transactions, setTransactions,
    savings, setSavings,
    savingsGoals, setSavingsGoals,
    categoryBudgets, setCategoryBudgets,
    customCategories, setCustomCategories,
    customBrands, setCustomBrands,
    debts, setDebts,
    quickTemplates, setQuickTemplates,
    achievements, setAchievements,
    plannedBudget, setPlannedBudget,

    // Shared budgets
    sharedBudgets, setSharedBudgets,
    currentSharedBudget, setCurrentSharedBudget,
    showCreateSharedBudget, setShowCreateSharedBudget,
    showJoinSharedBudget, setShowJoinSharedBudget,
    showSharedBudgetModal, setShowSharedBudgetModal,

    // Admin
    isAdmin, setIsAdmin,
    adminUsers, setAdminUsers,
    loadingAdmin, setLoadingAdmin,
    showAdminModal, setShowAdminModal,
    currentAdminPermissions,
    loadAdminUsers,

    // Modals
    showSavingsModal, setShowSavingsModal,
    showGoalModal, setShowGoalModal,
    editingGoal, setEditingGoal,
    showDebtModal, setShowDebtModal,
    editingDebt, setEditingDebt,
    showTemplateModal, setShowTemplateModal,
    editingTemplate, setEditingTemplate,
    showCategoryModal, setShowCategoryModal,
    showBrandModal, setShowBrandModal,
    showAchievementsModal, setShowAchievementsModal,
    newAchievement, setNewAchievement,
    showSimulator, setShowSimulator,
    showPlannedBudgetModal, setShowPlannedBudgetModal,
    showExportModal, setShowExportModal,
    showNotificationsSettings, setShowNotificationsSettings,
    showBudgetModal, setShowBudgetModal,

    // Dialogs
    confirmDialog, setConfirmDialog,
    inputDialog, setInputDialog,
    alertDialog, setAlertDialog,
    showAlert, showConfirm, closeConfirm,

    // Settings
    notificationSettings, setNotificationSettings,
    backupSettings, setBackupSettings,

    // Computed
    allCategories, allBrands,

    // Functions
    hasPermission, loadUserData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;