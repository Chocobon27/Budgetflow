-- ============================================
-- BudgetFlow - Schéma de base de données
-- PostgreSQL 14+
-- ============================================

-- ============================================
-- UTILISATEURS & AUTHENTIFICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  secret_question VARCHAR(255),
  secret_answer VARCHAR(255),
  is_admin BOOLEAN DEFAULT false,
  admin_permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DONNÉES FINANCIÈRES PERSONNELLES
-- ============================================

CREATE TABLE IF NOT EXISTS savings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  brand VARCHAR(50),
  date DATE NOT NULL,
  next_occurrence DATE,
  last_generated DATE,
  parent_recurring_id INTEGER,
  recurring BOOLEAN DEFAULT false,
  recurring_frequency VARCHAR(20) DEFAULT 'monthly',
  is_fixed_expense BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10) DEFAULT '🎯',
  target NUMERIC(12,2) NOT NULL,
  current NUMERIC(12,2) DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS category_budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category_id VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  UNIQUE(user_id, category_id)
);

-- ============================================
-- OBJECTIFS LONG TERME
-- ============================================

CREATE TABLE IF NOT EXISTS long_term_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10) DEFAULT '🎯',
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  monthly_contribution NUMERIC(12,2) DEFAULT 0,
  target_date DATE,
  priority VARCHAR(20) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CATÉGORIES & MARQUES PERSONNALISÉES
-- ============================================

CREATE TABLE IF NOT EXISTS custom_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280',
  type VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_brands (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  logo VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280'
);

-- ============================================
-- DETTES & ÉCHÉANCIERS
-- ============================================

CREATE TABLE IF NOT EXISTS debts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10) DEFAULT '💳',
  creditor VARCHAR(255) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  start_date DATE NOT NULL,
  duration INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debt_schedule (
  id SERIAL PRIMARY KEY,
  debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_date DATE
);

-- ============================================
-- MODÈLES RAPIDES
-- ============================================

CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  brand VARCHAR(50),
  recurring BOOLEAN DEFAULT false,
  is_fixed_expense BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GAMIFICATION
-- ============================================

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  unlocked JSONB DEFAULT '[]',
  points INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_activity DATE
);

-- ============================================
-- BUDGET PLANIFIÉ
-- ============================================

CREATE TABLE IF NOT EXISTS planned_budget (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  expected_income NUMERIC(12,2) DEFAULT 0,
  expected_expenses NUMERIC(12,2) DEFAULT 0,
  planned_savings NUMERIC(12,2) DEFAULT 0,
  categories JSONB DEFAULT '{}',
  notes TEXT,
  month INTEGER,
  year INTEGER
);

-- ============================================
-- BUDGETS PARTAGÉS
-- ============================================

CREATE TABLE IF NOT EXISTS shared_budgets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shared_budget_members (
  id SERIAL PRIMARY KEY,
  shared_budget_id INTEGER REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shared_budget_id, user_id)
);

CREATE TABLE IF NOT EXISTS shared_transactions (
  id SERIAL PRIMARY KEY,
  shared_budget_id INTEGER REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  brand VARCHAR(50),
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shared_savings (
  id SERIAL PRIMARY KEY,
  shared_budget_id INTEGER UNIQUE REFERENCES shared_budgets(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shared_budget_history (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS PUSH
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  debt_reminders BOOLEAN DEFAULT true,
  budget_alerts BOOLEAN DEFAULT true,
  goal_achieved BOOLEAN DEFAULT true,
  recurring_transactions BOOLEAN DEFAULT true,
  reminder_days INTEGER DEFAULT 3,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADMIN - CATÉGORIES & MARQUES GLOBALES
-- ============================================

CREATE TABLE IF NOT EXISTS global_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280',
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOGS API
-- ============================================

CREATE TABLE IF NOT EXISTS api_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  level VARCHAR(20) NOT NULL,
  method VARCHAR(10),
  endpoint VARCHAR(255),
  user_id INTEGER,
  user_email VARCHAR(255),
  status_code INTEGER,
  response_time INTEGER,
  message TEXT,
  details JSONB
);

-- ============================================
-- INDEX DE PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON api_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON api_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_long_term_goals_user ON long_term_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_history_budget ON shared_budget_history(budget_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
