// Configuration API
const API_URL = 'https://fin.yugary-esport.fr/api';

// Fonctions API
const api = {
  getToken: () => localStorage.getItem('budgetflow_token'),
  setToken: (token) => localStorage.setItem('budgetflow_token', token),
  removeToken: () => localStorage.removeItem('budgetflow_token'),
  
  headers: () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('budgetflow_token')}`
  }),
  
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: this.headers()
      });
      
      if (response.status === 401 || response.status === 403) {
        this.removeToken();
        window.location.reload();
        return null;
      }
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur serveur');
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Auth
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    this.setToken(data.token);
    return data;
  },
  
  async register(name, email, password, secretQuestion, secretAnswer) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, secretQuestion, secretAnswer })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    this.setToken(data.token);
    return data;
  },
  
  async verify() { return this.request('/auth/verify'); },
  async logout() {
  try {
    await this.request('/auth/logout', { method: 'POST' });
  } catch (e) {
    console.log('Logout request failed, clearing token anyway');
  }
  this.removeToken();
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('budgetflow_token');
},
  
  async forgotPassword(email) {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },
  
  async resetPassword(email, secretAnswer, newPassword) {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, secretAnswer, newPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },
  
  // Sync
  async sync() { return this.request('/sync'); },
  
  // Transactions
  async addTransaction(t) { return this.request('/transactions', { method: 'POST', body: JSON.stringify(t) }); },
  async updateTransaction(id, t) { return this.request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(t) }); },
  async deleteTransaction(id) { return this.request(`/transactions/${id}`, { method: 'DELETE' }); },
  
  // Savings
  async updateSavings(amount) { return this.request('/savings', { method: 'PUT', body: JSON.stringify({ amount }) }); },
  
  // Savings Goals
  async addSavingsGoal(g) { return this.request('/savings-goals', { method: 'POST', body: JSON.stringify(g) }); },
  async updateSavingsGoal(id, g) { return this.request(`/savings-goals/${id}`, { method: 'PUT', body: JSON.stringify(g) }); },
  async deleteSavingsGoal(id) { return this.request(`/savings-goals/${id}`, { method: 'DELETE' }); },
  
  // Category Budgets
  async updateCategoryBudgets(b) { return this.request('/category-budgets', { method: 'PUT', body: JSON.stringify(b) }); },
  
  // Custom Categories
  async addCustomCategory(c) { return this.request('/custom-categories', { method: 'POST', body: JSON.stringify(c) }); },
  async deleteCustomCategory(id) { return this.request(`/custom-categories/${id}`, { method: 'DELETE' }); },
  
  // Custom Brands
  async addCustomBrand(b) { return this.request('/custom-brands', { method: 'POST', body: JSON.stringify(b) }); },
  async deleteCustomBrand(id) { return this.request(`/custom-brands/${id}`, { method: 'DELETE' }); },
  
  // Debts
  async addDebt(d) { return this.request('/debts', { method: 'POST', body: JSON.stringify(d) }); },
  async updateDebt(id, d) { return this.request(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
  async deleteDebt(id) { return this.request(`/debts/${id}`, { method: 'DELETE' }); },
  
  // Templates
  async addTemplate(t) { return this.request('/templates', { method: 'POST', body: JSON.stringify(t) }); },
  async updateTemplate(id, t) { return this.request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(t) }); },
  async deleteTemplate(id) { return this.request(`/templates/${id}`, { method: 'DELETE' }); },
  
  // Achievements
  async updateAchievements(a) { return this.request('/achievements', { method: 'PUT', body: JSON.stringify(a) }); },
  
  // Planned Budget
  async updatePlannedBudget(b) { return this.request('/planned-budget', { method: 'PUT', body: JSON.stringify(b) }); },
  
  // Shared Budgets
  async getSharedBudgets() { return this.request('/shared-budgets'); },
  async createSharedBudget(name) { return this.request('/shared-budgets', { method: 'POST', body: JSON.stringify({ name }) }); },
  async joinSharedBudget(inviteCode) { return this.request('/shared-budgets/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }); },
  async leaveSharedBudget(id) { return this.request(`/shared-budgets/${id}/leave`, { method: 'POST' }); },
  async addSharedTransaction(budgetId, t) { return this.request(`/shared-budgets/${budgetId}/transactions`, { method: 'POST', body: JSON.stringify(t) }); },
  async deleteSharedTransaction(budgetId, tId) { return this.request(`/shared-budgets/${budgetId}/transactions/${tId}`, { method: 'DELETE' }); },
  async updateSharedSavings(budgetId, amount) { return this.request(`/shared-budgets/${budgetId}/savings`, { method: 'PUT', body: JSON.stringify({ amount }) }); },
  async removeSharedMember(budgetId, userId) { return this.request(`/shared-budgets/${budgetId}/members/${userId}`, { method: 'DELETE' }); },
  async deleteSharedBudget(budgetId) { return this.request(`/shared-budgets/${budgetId}`, { method: 'DELETE' }); },


  // Admin
  async checkAdmin() { return this.request('/admin/check'); },
  async getAdminUsers() { return this.request('/admin/users'); },
  async setUserAdmin(userId, isAdmin) { return this.request(`/admin/users/${userId}/admin`, { method: 'PUT', body: JSON.stringify({ isAdmin }) }); },
  async deleteUser(userId) { return this.request(`/admin/users/${userId}`, { method: 'DELETE' }); },
  
  // Admin - Catégories globales
  async getAdminCategories() { return this.request('/admin/categories'); },
  async addAdminCategory(c) { return this.request('/admin/categories', { method: 'POST', body: JSON.stringify(c) }); },
  async updateAdminCategory(id, c) { return this.request(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(c) }); },
  async deleteAdminCategory(id) { return this.request(`/admin/categories/${id}`, { method: 'DELETE' }); },

  // Admin - Marques globales
  async getAdminBrands() { return this.request('/admin/brands'); },
  async addAdminBrand(b) { return this.request('/admin/brands', { method: 'POST', body: JSON.stringify(b) }); },
  async updateAdminBrand(id, b) { return this.request(`/admin/brands/${id}`, { method: 'PUT', body: JSON.stringify(b) }); },
  async deleteAdminBrand(id) { return this.request(`/admin/brands/${id}`, { method: 'DELETE' }); },

  // Admin - Gestion utilisateurs avancée
  async getAdminUser(id) { return this.request(`/admin/users/${id}`); },
  async resetUserPassword(id, newPassword) { return this.request(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }); },
  async updateUserPermissions(id, permissions) { return this.request(`/admin/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }); },
  // Admin - Logs
  async getAdminLogs(level = 'all', limit = 100, offset = 0) { return this.request(`/admin/logs?level=${level}&limit=${limit}&offset=${offset}`); },
  async deleteAdminLogs(before = null) { return this.request('/admin/logs', { method: 'DELETE', body: JSON.stringify({ before }) }); },
  async getAdminStats() { return this.request('/admin/stats'); },
};

export default api;
export { API_URL };