import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api';
import { EMOJI_PICKER } from '../constants';

const ADMIN_PERMISSION_LIST = [
  { id: 'all', name: 'Super Admin', description: 'Tous les droits', icon: '👑' },
  { id: 'manage_users', name: 'Gérer utilisateurs', description: 'Modifier, supprimer, reset password', icon: '👥' },
  { id: 'manage_admins', name: 'Gérer admins', description: 'Ajouter/retirer des admins', icon: '🛡️' },
  { id: 'manage_categories', name: 'Gérer catégories', description: 'Ajouter/modifier/supprimer catégories', icon: '🏷️' },
  { id: 'manage_brands', name: 'Gérer marques', description: 'Ajouter/modifier/supprimer marques', icon: '🏪' },
];

const Admin = () => {
  const {
    darkMode,
    currentUser,
    isAdmin,
    adminUsers,
    loadingAdmin,
    loadAdminUsers,
    isConnected,
    showAlert,
    showConfirm,
    closeConfirm
  } = useApp();

  const [activeTab, setActiveTab] = useState('users');
  const [globalCategories, setGlobalCategories] = useState([]);
  const [globalBrands, setGlobalBrands] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingBrand, setEditingBrand] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  
  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '📌', color: '#6B7280', type: 'expense' });
  const [brandForm, setBrandForm] = useState({ name: '', logo: '🏪', color: '#6B7280' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Logs
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFilter, setLogsFilter] = useState('all');
  const [logsPage, setLogsPage] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [serverStats, setServerStats] = useState(null);

  // Charger les données admin
  useEffect(() => {
  if (isAdmin) {
    loadCategories();
    loadBrands();
    if (activeTab === 'logs') loadLogs();
    if (activeTab === 'stats') loadStats();
  }
}, [isAdmin, activeTab]);

  const loadCategories = async () => {
    try {
      const data = await api.getAdminCategories();
      setGlobalCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const data = await api.getAdminBrands();
      setGlobalBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  // === USERS ===
  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      await api.setUserAdmin(userId, !currentStatus);
      loadAdminUsers();
      showAlert('Succès', 'Statut admin modifié', 'success');
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleDeleteUser = (userId, userName) => {
    showConfirm(
      'Supprimer utilisateur',
      `Êtes-vous sûr de vouloir supprimer "${userName}" ? Cette action est irréversible.`,
      async () => {
        try {
          await api.deleteUser(userId);
          loadAdminUsers();
          showAlert('Succès', 'Utilisateur supprimé', 'success');
          closeConfirm();
        } catch (error) {
          showAlert('Erreur', error.message, 'error');
        }
      }
    );
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    try {
      await api.resetUserPassword(selectedUser.id, newPassword);
      showAlert('Succès', 'Mot de passe réinitialisé', 'success');
      setShowResetPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      await api.updateUserPermissions(selectedUser.id, selectedPermissions);
      loadAdminUsers();
      showAlert('Succès', 'Permissions mises à jour', 'success');
      setShowPermissionsModal(false);
      setSelectedUser(null);
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const openUserDetails = async (user) => {
    try {
      const details = await api.getAdminUser(user.id);
      setSelectedUser(details);
      setShowUserModal(true);
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const openPermissionsModal = (user) => {
    setSelectedUser(user);
    setSelectedPermissions(user.admin_permissions || []);
    setShowPermissionsModal(true);
  };

  const openResetPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  // === CATEGORIES ===
  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await api.updateAdminCategory(editingCategory.id, categoryForm);
        showAlert('Succès', 'Catégorie modifiée', 'success');
      } else {
        await api.addAdminCategory(categoryForm);
        showAlert('Succès', 'Catégorie ajoutée', 'success');
      }
      loadCategories();
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', icon: '📌', color: '#6B7280', type: 'expense' });
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleDeleteCategory = (id, name) => {
    showConfirm('Supprimer', `Supprimer la catégorie "${name}" ?`, async () => {
      try {
        await api.deleteAdminCategory(id);
        loadCategories();
        showAlert('Succès', 'Catégorie supprimée', 'success');
        closeConfirm();
      } catch (error) {
        showAlert('Erreur', error.message, 'error');
      }
    });
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
    setShowCategoryModal(true);
  };

  // === BRANDS ===
  const handleSaveBrand = async () => {
    try {
      if (editingBrand) {
        await api.updateAdminBrand(editingBrand.id, brandForm);
        showAlert('Succès', 'Marque modifiée', 'success');
      } else {
        await api.addAdminBrand(brandForm);
        showAlert('Succès', 'Marque ajoutée', 'success');
      }
      loadBrands();
      setShowBrandModal(false);
      setEditingBrand(null);
      setBrandForm({ name: '', logo: '🏪', color: '#6B7280' });
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  };

  const handleDeleteBrand = (id, name) => {
    showConfirm('Supprimer', `Supprimer la marque "${name}" ?`, async () => {
      try {
        await api.deleteAdminBrand(id);
        loadBrands();
        showAlert('Succès', 'Marque supprimée', 'success');
        closeConfirm();
      } catch (error) {
        showAlert('Erreur', error.message, 'error');
      }
    });
  };

  const openEditBrand = (brand) => {
    setEditingBrand(brand);
    setBrandForm({ name: brand.name, logo: brand.logo, color: brand.color });
    setShowBrandModal(true);
  };

  if (!isAdmin) {
    return (
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border text-center`}>
        <span className="text-4xl block mb-3">🔒</span>
        <p className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Accès non autorisé</p>
      </div>
    );
  }

  // === LOGS ===
const loadLogs = async (filter = logsFilter, page = 0) => {
  setLoadingLogs(true);
  try {
    const data = await api.getAdminLogs(filter, 50, page * 50);
    setLogs(data.logs || []);
    setLogsTotal(data.total || 0);
    setLogsPage(page);
  } catch (error) {
    showAlert('Erreur', error.message, 'error');
  }
  setLoadingLogs(false);
};

const loadStats = async () => {
  try {
    const data = await api.getAdminStats();
    setServerStats(data);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};

const handleClearLogs = () => {
  showConfirm('Supprimer les logs', 'Supprimer tous les logs ?', async () => {
    try {
      await api.deleteAdminLogs();
      loadLogs();
      showAlert('Succès', 'Logs supprimés', 'success');
      closeConfirm();
    } catch (error) {
      showAlert('Erreur', error.message, 'error');
    }
  });
};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/30' : 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200'} border backdrop-blur-sm`}>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>⚙️ Administration</h2>
        <p className={`mt-1 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>Gérez les utilisateurs, catégories et marques</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Utilisateurs</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{adminUsers.length}</p>
        </div>
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Admins</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{adminUsers.filter(u => u.is_admin).length}</p>
        </div>
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Catégories</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{globalCategories.length}</p>
        </div>
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Marques</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{globalBrands.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'users', label: '👥 Utilisateurs' },
          { id: 'categories', label: '🏷️ Catégories' },
          { id: 'brands', label: '🏪 Marques' },
          { id: 'logs', label: '📋 Logs' },
          { id: 'stats', label: '📊 Stats' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>👥 Gestion des utilisateurs</h3>
            <button
              onClick={loadAdminUsers}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              🔄 Actualiser
            </button>
          </div>

          {loadingAdmin ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {adminUsers.map(user => (
                <div key={user.id} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${darkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                          {user.is_admin && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Admin</span>}
                          {user.admin_permissions?.includes('all') && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">👑 Super</span>}
                          {user.id === currentUser?.id && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">Vous</span>}
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{user.email}</p>
                      </div>
                    </div>

                    {user.id !== currentUser?.id && (
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        <button
                          onClick={() => openUserDetails(user)}
                          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
                          title="Détails"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(user)}
                          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
                          title="Reset password"
                        >
                          🔑
                        </button>
                        {user.is_admin && (
                          <button
                            onClick={() => openPermissionsModal(user)}
                            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
                            title="Permissions"
                          >
                            🛡️
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          className={`p-2 rounded-lg ${user.is_admin ? 'bg-amber-500/20 text-amber-400' : darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
                          title={user.is_admin ? 'Retirer admin' : 'Rendre admin'}
                        >
                          {user.is_admin ? '👑' : '➕'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏷️ Catégories globales</h3>
            <button
              onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', icon: '📌', color: '#6B7280', type: 'expense' }); setShowCategoryModal(true); }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
            >
              + Ajouter
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {['income', 'expense'].map(type => (
              <div key={type}>
                <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {type === 'income' ? '💰 Revenus' : '💸 Dépenses'}
                </h4>
                <div className="space-y-2">
                  {globalCategories.filter(c => c.type === type).map(cat => (
                    <div key={cat.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl" style={{ color: cat.color }}>{cat.icon}</span>
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditCategory(cat)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}>✏️</button>
                        <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400">🗑️</button>
                      </div>
                    </div>
                  ))}
                  {globalCategories.filter(c => c.type === type).length === 0 && (
                    <p className={`text-sm text-center py-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Aucune catégorie</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'brands' && (
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏪 Marques globales</h3>
            <button
              onClick={() => { setEditingBrand(null); setBrandForm({ name: '', logo: '🏪', color: '#6B7280' }); setShowBrandModal(true); }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
            >
              + Ajouter
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {globalBrands.map(brand => (
              <div key={brand.id} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{brand.logo}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEditBrand(brand)} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}>✏️</button>
                    <button onClick={() => handleDeleteBrand(brand.id, brand.name)} className="p-1 rounded bg-red-500/20 text-red-400">🗑️</button>
                  </div>
                </div>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{brand.name}</p>
              </div>
            ))}
            {globalBrands.length === 0 && (
              <p className={`col-span-full text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Aucune marque</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
  <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📋 Logs API ({logsTotal})</h3>
      <div className="flex items-center gap-2">
        <select
          value={logsFilter}
          onChange={e => { setLogsFilter(e.target.value); loadLogs(e.target.value, 0); }}
          className={`px-3 py-2 rounded-xl text-sm ${darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-gray-100 border-gray-200'} border`}
        >
          <option value="all">Tous</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <button
          onClick={() => loadLogs()}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          🔄
        </button>
        <button
          onClick={handleClearLogs}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
        >
          🗑️ Vider
        </button>
      </div>
    </div>

    {loadingLogs ? (
      <div className="text-center py-12">
        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
      </div>
    ) : logs.length === 0 ? (
      <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
        <span className="text-4xl block mb-3">📋</span>
        <p>Aucun log</p>
      </div>
    ) : (
      <>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {logs.map(log => (
            <div
              key={log.id}
              className={`p-3 rounded-xl text-sm ${
                log.level === 'error' ? 'bg-red-500/10 border border-red-500/30' :
                log.level === 'warn' ? 'bg-amber-500/10 border border-amber-500/30' :
                darkMode ? 'bg-slate-700/50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.level === 'error' ? 'bg-red-500 text-white' :
                    log.level === 'warn' ? 'bg-amber-500 text-white' :
                    'bg-emerald-500 text-white'
                  }`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className={`font-mono ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    {log.method} {log.endpoint}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    log.status_code >= 500 ? 'bg-red-500/20 text-red-400' :
                    log.status_code >= 400 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {log.status_code}
                  </span>
                </div>
                <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {log.response_time}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {log.user_email || 'Anonyme'}
                </span>
                <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {new Date(log.timestamp).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => loadLogs(logsFilter, logsPage - 1)}
            disabled={logsPage === 0}
            className={`px-4 py-2 rounded-xl text-sm ${logsPage === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
          >
            ← Précédent
          </button>
          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Page {logsPage + 1} / {Math.ceil(logsTotal / 50)}
          </span>
          <button
            onClick={() => loadLogs(logsFilter, logsPage + 1)}
            disabled={(logsPage + 1) * 50 >= logsTotal}
            className={`px-4 py-2 rounded-xl text-sm ${(logsPage + 1) * 50 >= logsTotal ? 'opacity-50 cursor-not-allowed' : ''} ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
          >
            Suivant →
          </button>
        </div>
      </>
    )}
  </div>
)}

{activeTab === 'stats' && (
  <div className="space-y-6">
    {/* Stats générales */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Utilisateurs total</p>
        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{serverStats?.totalUsers || 0}</p>
      </div>
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Transactions total</p>
        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{serverStats?.totalTransactions || 0}</p>
      </div>
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Actifs aujourd'hui</p>
        <p className={`text-2xl font-bold text-emerald-400`}>{serverStats?.activeUsersToday || 0}</p>
      </div>
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Temps réponse moy.</p>
        <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{serverStats?.avgResponseTime || 0}ms</p>
      </div>
    </div>

    {/* Erreurs */}
    <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>⚠️ Erreurs (24h)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {serverStats?.logsPerLevel?.map(item => (
          <div key={item.level} className={`p-4 rounded-xl ${
            item.level === 'error' ? 'bg-red-500/10' :
            item.level === 'warn' ? 'bg-amber-500/10' :
            'bg-emerald-500/10'
          }`}>
            <p className={`text-sm font-medium ${
              item.level === 'error' ? 'text-red-400' :
              item.level === 'warn' ? 'text-amber-400' :
              'text-emerald-400'
            }`}>{item.level.toUpperCase()}</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.count}</p>
          </div>
        )) || <p className={darkMode ? 'text-slate-500' : 'text-gray-400'}>Aucune donnée</p>}
      </div>
    </div>

    {/* Top endpoints */}
    <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border`}>
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔥 Top Endpoints (24h)</h3>
      <div className="space-y-2">
        {serverStats?.topEndpoints?.map((ep, i) => (
          <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
            <span className={`font-mono text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{ep.endpoint}</span>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{ep.avg_time}ms</span>
              <span className={`px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400`}>{ep.count} appels</span>
            </div>
          </div>
        )) || <p className={darkMode ? 'text-slate-500' : 'text-gray-400'}>Aucune donnée</p>}
      </div>
    </div>

    <button
      onClick={loadStats}
      className={`w-full py-3 rounded-xl ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}
    >
      🔄 Actualiser les stats
    </button>
  </div>
)}

      {/* Modal Catégorie */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingCategory ? '✏️ Modifier catégorie' : '➕ Nouvelle catégorie'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nom</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Icône</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-14 h-14 rounded-xl text-3xl flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}
                  >
                    {categoryForm.icon}
                  </button>
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-14 h-14 rounded-xl cursor-pointer"
                  />
                </div>
                {showEmojiPicker && (
                  <div className={`mt-2 p-2 rounded-xl border max-h-40 overflow-y-auto ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_PICKER.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => { setCategoryForm({ ...categoryForm, icon: emoji }); setShowEmojiPicker(false); }}
                          className={`p-2 rounded hover:bg-slate-600 text-xl`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Type</label>
                <div className="flex gap-2">
                  {['expense', 'income'].map(t => (
                    <button
                      key={t}
                      onClick={() => setCategoryForm({ ...categoryForm, type: t })}
                      className={`flex-1 py-3 rounded-xl font-medium ${
                        categoryForm.type === t
                          ? t === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t === 'income' ? '💰 Revenu' : '💸 Dépense'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryForm.name}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50"
              >
                💾 Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Marque */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowBrandModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingBrand ? '✏️ Modifier marque' : '➕ Nouvelle marque'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nom</label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Logo</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-14 h-14 rounded-xl text-3xl flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}
                  >
                    {brandForm.logo}
                  </button>
                  <input
                    type="color"
                    value={brandForm.color}
                    onChange={e => setBrandForm({ ...brandForm, color: e.target.value })}
                    className="w-14 h-14 rounded-xl cursor-pointer"
                  />
                </div>
                {showEmojiPicker && (
                  <div className={`mt-2 p-2 rounded-xl border max-h-40 overflow-y-auto ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_PICKER.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => { setBrandForm({ ...brandForm, logo: emoji }); setShowEmojiPicker(false); }}
                          className={`p-2 rounded hover:bg-slate-600 text-xl`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleSaveBrand}
                disabled={!brandForm.name}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50"
              >
                💾 Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails Utilisateur */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowUserModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>👤 {selectedUser.name}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Email</p>
                <p className={darkMode ? 'text-white' : 'text-gray-900'}>{selectedUser.email}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedUser.stats?.transactions || 0}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Transactions</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold text-emerald-400`}>{selectedUser.stats?.savings || 0}€</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Épargne</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedUser.stats?.debts || 0}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dettes</p>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Inscrit le</p>
                <p className={darkMode ? 'text-white' : 'text-gray-900'}>{new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dernière connexion</p>
                <p className={darkMode ? 'text-white' : 'text-gray-900'}>
                  {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString('fr-FR') : 'Jamais'}
                </p>
              </div>
              <button onClick={() => setShowUserModal(false)} className={`w-full py-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetPasswordModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔑 Reset password - {selectedUser.name}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Entrez le nouveau mot de passe"
                  className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowResetPasswordModal(false)} className={`flex-1 py-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  Annuler
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={!newPassword || newPassword.length < 4}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Permissions */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPermissionsModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🛡️ Permissions - {selectedUser.name}</h3>
            </div>
            <div className="p-4 space-y-3">
              {ADMIN_PERMISSION_LIST.map(perm => (
                <label
                  key={perm.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedPermissions.includes(perm.id)
                      ? 'bg-purple-500/20 border border-purple-500/50'
                      : darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (perm.id === 'all') {
                          setSelectedPermissions(['all']);
                        } else {
                          setSelectedPermissions(prev => [...prev.filter(p => p !== 'all'), perm.id]);
                        }
                      } else {
                        setSelectedPermissions(prev => prev.filter(p => p !== perm.id));
                      }
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{perm.icon}</span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{perm.name}</span>
                    </div>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{perm.description}</p>
                  </div>
                </label>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowPermissionsModal(false)} className={`flex-1 py-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  Annuler
                </button>
                <button
                  onClick={handleSavePermissions}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
                >
                  💾 Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;