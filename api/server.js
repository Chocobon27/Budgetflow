require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const hpp = require('hpp');
const webpush = require('web-push');

// Configuration VAPID pour les notifications Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || `mailto:admin@${(process.env.APP_URL || 'https://localhost').replace(/^https?:\/\//, '')}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push configured');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || process.env.APP_URL || 'https://localhost',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  path: '/socket.io',
  transports: ['polling', 'websocket'],
  allowUpgrades: true
});
const PORT = process.env.PORT || 3001;

// Construire l'URL WSS dynamiquement depuis APP_URL
const appUrl = process.env.APP_URL || 'https://localhost';
const wssUrl = appUrl.replace(/^https?/, 'wss');

// ============================================
// SÉCURITÉ - Middlewares
// ============================================

// Helmet avec configuration stricte
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", wssUrl],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS restrictif
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.APP_URL || 'https://localhost',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Protection HPP (HTTP Parameter Pollution)
app.use(hpp());

// Limite taille des requêtes JSON (protection DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Trust proxy (pour obtenir la vraie IP derrière Nginx)
app.set('trust proxy', 1);

// ============================================
// RATE LIMITING
// ============================================

// Limite globale : 100 requêtes par minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});
app.use('/api/', globalLimiter);

// Limite stricte pour login : 5 tentatives par 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Limite pour inscription : 3 par heure par IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Trop d\'inscriptions, réessayez plus tard' }
});

// Limite pour reset password : 3 par heure
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Trop de tentatives, réessayez plus tard' }
});

// ============================================
// VALIDATION HELPERS
// ============================================
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// Sanitize string (anti-XSS)
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>\"\'&]/g, (char) => {
    const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
    return entities[char];
  });
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });



// ============================================
// SYSTÈME DE LOGS
// ============================================
const logLevels = { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' };

const apiLog = async (level, message, details = {}) => {
  try {
    await pool.query(
      'INSERT INTO api_logs (level, method, endpoint, user_id, user_email, status_code, response_time, message, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [level, details.method, details.endpoint, details.userId, details.userEmail, details.statusCode, details.responseTime, message, JSON.stringify(details.extra || {})]
    );
  } catch (err) {
    console.error('Log error:', err);
  }
};

// Logger les actions sur les budgets partagés
const logSharedAction = async (budgetId, userId, actionType, details = {}) => {
  try {
    await pool.query(
      'INSERT INTO shared_budget_history (budget_id, user_id, action_type, details) VALUES ($1, $2, $3, $4)',
      [budgetId, userId, actionType, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Shared budget log error:', err);
  }
};

// Middleware de logging
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    // Ne pas logger les requêtes de health check et les logs eux-mêmes
    if (req.path === '/api/health' || req.path === '/api/admin/logs') return;
    
    await apiLog(level, `${req.method} ${req.path}`, {
      method: req.method,
      endpoint: req.path,
      userId: req.user?.id,
      userEmail: req.user?.email,
      statusCode: res.statusCode,
      responseTime,
      extra: {
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      }
    });
  });
  
  next();
};

// Appliquer le middleware
app.use(requestLogger);

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ Database connection error:', err);
  else console.log('✅ Database connected:', res.rows[0].now);
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
};

// Vérifier les permissions admin
const checkAdminPermission = async (userId, requiredPermission) => {
  const result = await pool.query('SELECT is_admin, admin_permissions FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0 || !result.rows[0].is_admin) return false;
  
  const permissions = result.rows[0].admin_permissions || [];
  if (permissions.includes('all')) return true;
  if (permissions.includes(requiredPermission)) return true;
  return false;
};

// ============================================
// WEBSOCKET
// ============================================
const connectedUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`🔌 User ${userId} connected (socket: ${socket.id})`);
  
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
  }
  connectedUsers.get(userId).add(socket.id);
  
  socket.join(`user:${userId}`);
  console.log(`📢 User ${userId} joined room: user:${userId}`);

  pool.query('SELECT shared_budget_id FROM shared_budget_members WHERE user_id = $1', [userId])
    .then(result => {
      result.rows.forEach(row => socket.join(`shared:${row.shared_budget_id}`));
    });
  
  socket.on('disconnect', () => {
    console.log(`🔌 User ${userId} disconnected`);
    const userSockets = connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) connectedUsers.delete(userId);
    }
  });
});

const emitToUser = (userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

const emitToSharedBudget = (budgetId, event, data) => {
  io.to(`shared:${budgetId}`).emit(event, data);
};

// AUTH
app.post('/api/auth/register', 
  registerLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe minimum 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Le mot de passe doit contenir majuscule, minuscule et chiffre'),
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Nom entre 2 et 50 caractères'),
    body('secretQuestion').trim().isLength({ min: 5, max: 200 }).withMessage('Question secrète requise'),
    body('secretAnswer').trim().isLength({ min: 2, max: 100 }).withMessage('Réponse secrète requise'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password, name, secretQuestion, secretAnswer } = req.body;
      
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0) return res.status(400).json({ error: 'Email déjà utilisé' });
      
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      const hashedAnswer = await bcrypt.hash(secretAnswer.toLowerCase().trim(), salt);
      
      const result = await pool.query(
        'INSERT INTO users (email, password, salt, name, secret_question, secret_answer) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name',
        [email.toLowerCase(), hashedPassword, salt, sanitizeString(name), sanitizeString(secretQuestion), hashedAnswer]
      );
      const user = result.rows[0];
      
      await pool.query('INSERT INTO savings (user_id, amount) VALUES ($1, 0)', [user.id]);
      await pool.query('INSERT INTO achievements (user_id) VALUES ($1)', [user.id]);
      await pool.query('INSERT INTO planned_budget (user_id) VALUES ($1)', [user.id]);
      
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);
      
      res.json({ user, token });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

app.post('/api/auth/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Délai anti-timing attack
      const startTime = Date.now();
      
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      
      if (result.rows.length === 0) {
        // Simuler le temps de hashing pour éviter timing attack
        await bcrypt.hash('dummy', 10);
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }
      
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }
      
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
      
      // Nettoyer les anciennes sessions de cet utilisateur (garder max 5)
      await pool.query(`
        DELETE FROM sessions WHERE user_id = $1 AND id NOT IN (
          SELECT id FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 4
        )
      `, [user.id]);
      
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);
      
      res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    res.json({ message: 'Déconnecté' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT secret_question FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Email non trouvé' });
    res.json({ secretQuestion: result.rows[0].secret_question });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, secretAnswer, newPassword } = req.body;
    const result = await pool.query('SELECT id, secret_answer FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Email non trouvé' });
    
    const user = result.rows[0];
    const validAnswer = await bcrypt.compare(secretAnswer.toLowerCase().trim(), user.secret_answer);
    if (!validAnswer) return res.status(401).json({ error: 'Réponse incorrecte' });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await pool.query('UPDATE users SET password = $1, salt = $2 WHERE id = $3', [hashedPassword, salt, user.id]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    
    res.json({ message: 'Mot de passe réinitialisé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// TRANSACTIONS
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC', [req.user.id]);
    const transactions = result.rows.map(t => ({
      id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type,
      category: t.category, brand: t.brand, date: t.date, recurring: t.recurring,
      isFixedExpense: t.is_fixed_expense, createdAt: t.created_at
    }));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { name, amount, type, category, brand, date, recurring, recurringFrequency, isFixedExpense } = req.body;
    
    // Calculer next_occurrence si récurrent
    let nextOccurrence = null;
    if (recurring) {
      const transactionDate = new Date(date);
      switch (recurringFrequency) {
        case 'quarterly':
          nextOccurrence = new Date(transactionDate.setMonth(transactionDate.getMonth() + 3));
          break;
        case 'yearly':
          nextOccurrence = new Date(transactionDate.setFullYear(transactionDate.getFullYear() + 1));
          break;
        case 'monthly':
        default:
          nextOccurrence = new Date(transactionDate.setMonth(transactionDate.getMonth() + 1));
          break;
      }
      nextOccurrence = nextOccurrence.toISOString().split('T')[0];
    }
    
    const result = await pool.query(
      'INSERT INTO transactions (user_id, name, amount, type, category, brand, date, recurring, recurring_frequency, is_fixed_expense, next_occurrence) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [req.user.id, sanitizeString(name), amount, type, sanitizeString(category), sanitizeString(brand || ''), date, recurring || false, recurringFrequency || 'monthly', isFixedExpense || false, nextOccurrence]
    );
    const t = result.rows[0];
    const transaction = { id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, date: t.date, recurring: t.recurring, recurringFrequency: t.recurring_frequency, isFixedExpense: t.is_fixed_expense, nextOccurrence: t.next_occurrence, createdAt: t.created_at };
    emitToUser(req.user.id, 'transaction:created', transaction);
    res.json(transaction);
    // Vérification automatique des achievements après ajout
    setTimeout(async () => {
      try {
        await checkAchievementsForUser(req.user.id);
      } catch (e) { /* silent */ }
    }, 1000);
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const { name, amount, type, category, brand, date, recurring, recurringFrequency, isFixedExpense } = req.body;
    
    // Calculer next_occurrence si récurrent
    let nextOccurrence = null;
    if (recurring) {
      const transactionDate = new Date(date);
      switch (recurringFrequency) {
        case 'quarterly':
          nextOccurrence = new Date(transactionDate.setMonth(transactionDate.getMonth() + 3));
          break;
        case 'yearly':
          nextOccurrence = new Date(transactionDate.setFullYear(transactionDate.getFullYear() + 1));
          break;
        case 'monthly':
        default:
          nextOccurrence = new Date(transactionDate.setMonth(transactionDate.getMonth() + 1));
          break;
      }
      nextOccurrence = nextOccurrence.toISOString().split('T')[0];
    }
    
    const result = await pool.query(
      'UPDATE transactions SET name=$1, amount=$2, type=$3, category=$4, brand=$5, date=$6, recurring=$7, recurring_frequency=$8, is_fixed_expense=$9, next_occurrence=$10 WHERE id=$11 AND user_id=$12 RETURNING *',
      [sanitizeString(name), amount, type, sanitizeString(category), sanitizeString(brand || ''), date, recurring || false, recurringFrequency || 'monthly', isFixedExpense || false, nextOccurrence, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
    const t = result.rows[0];
    const transaction = { id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, date: t.date, recurring: t.recurring, recurringFrequency: t.recurring_frequency, isFixedExpense: t.is_fixed_expense, nextOccurrence: t.next_occurrence, createdAt: t.created_at };
    emitToUser(req.user.id, 'transaction:updated', transaction);
    res.json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    emitToUser(req.user.id, 'transaction:deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// SAVINGS
app.get('/api/savings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT amount FROM savings WHERE user_id = $1', [req.user.id]);
    res.json({ amount: parseFloat(result.rows[0]?.amount) || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/savings', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    await pool.query('INSERT INTO savings (user_id, amount) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET amount = $2', [req.user.id, amount]);
    emitToUser(req.user.id, 'savings:updated', { amount });
    res.json({ amount });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// SAVINGS GOALS
app.get('/api/savings-goals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM savings_goals WHERE user_id = $1', [req.user.id]);
    res.json(result.rows.map(g => ({ id: g.id, name: g.name, icon: g.icon, target: parseFloat(g.target), current: parseFloat(g.current), deadline: g.deadline, createdAt: g.created_at })));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/savings-goals', authenticateToken, async (req, res) => {
  try {
    const { name, icon, target, current, deadline } = req.body;
    const result = await pool.query('INSERT INTO savings_goals (user_id, name, icon, target, current, deadline) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.user.id, name, icon || '🎯', target, current || 0, deadline]);
    const g = result.rows[0];
    const goal = { id: g.id, name: g.name, icon: g.icon, target: parseFloat(g.target), current: parseFloat(g.current), deadline: g.deadline, createdAt: g.created_at };
    emitToUser(req.user.id, 'savingsGoal:created', goal);
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/savings-goals/:id', authenticateToken, async (req, res) => {
  try {
    const { name, icon, target, current, deadline } = req.body;
    const result = await pool.query('UPDATE savings_goals SET name=$1, icon=$2, target=$3, current=$4, deadline=$5 WHERE id=$6 AND user_id=$7 RETURNING *', [name, icon, target, current, deadline, req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
    const g = result.rows[0];
    const goal = { id: g.id, name: g.name, icon: g.icon, target: parseFloat(g.target), current: parseFloat(g.current), deadline: g.deadline, createdAt: g.created_at };
    emitToUser(req.user.id, 'savingsGoal:updated', goal);
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/savings-goals/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM savings_goals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    emitToUser(req.user.id, 'savingsGoal:deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// CATEGORY BUDGETS
app.get('/api/category-budgets', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id, amount FROM category_budgets WHERE user_id = $1', [req.user.id]);
    const budgets = {};
    result.rows.forEach(row => { budgets[row.category_id] = parseFloat(row.amount); });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/category-budgets', authenticateToken, async (req, res) => {
  try {
    const budgets = req.body;
    await pool.query('DELETE FROM category_budgets WHERE user_id = $1', [req.user.id]);
    for (const [categoryId, amount] of Object.entries(budgets)) {
      if (amount > 0) await pool.query('INSERT INTO category_budgets (user_id, category_id, amount) VALUES ($1, $2, $3)', [req.user.id, categoryId, amount]);
    }
    emitToUser(req.user.id, 'categoryBudgets:updated', budgets);
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// CUSTOM CATEGORIES
app.get('/api/custom-categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM custom_categories WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/custom-categories', authenticateToken, async (req, res) => {
  try {
    const { name, icon, color, type } = req.body;
    const result = await pool.query('INSERT INTO custom_categories (user_id, name, icon, color, type) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.user.id, name, icon || '📁', color || '#6B7280', type]);
    const category = result.rows[0];
    emitToUser(req.user.id, 'customCategory:created', category);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/custom-categories/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM custom_categories WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    emitToUser(req.user.id, 'customCategory:deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// CUSTOM BRANDS
app.get('/api/custom-brands', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM custom_brands WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/custom-brands', authenticateToken, async (req, res) => {
  try {
    const { name, logo, color } = req.body;
    const result = await pool.query('INSERT INTO custom_brands (user_id, name, logo, color) VALUES ($1, $2, $3, $4) RETURNING *', [req.user.id, name, logo || '🏪', color || '#6B7280']);
    const brand = result.rows[0];
    emitToUser(req.user.id, 'customBrand:created', brand);
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/custom-brands/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM custom_brands WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    emitToUser(req.user.id, 'customBrand:deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DEBTS
app.get('/api/debts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM debts WHERE user_id = $1', [req.user.id]);
    for (const debt of result.rows) {
      const scheduleResult = await pool.query('SELECT * FROM debt_schedule WHERE debt_id = $1 ORDER BY date', [debt.id]);
      debt.schedule = scheduleResult.rows.map(s => ({ id: s.id, date: s.date, amount: parseFloat(s.amount), paid: s.paid, paidDate: s.paid_date }));
    }
    res.json(result.rows.map(d => ({ id: d.id, name: d.name, icon: d.icon, creditor: d.creditor, totalAmount: parseFloat(d.total_amount), interestRate: parseFloat(d.interest_rate), startDate: d.start_date, duration: d.duration, notes: d.notes, schedule: d.schedule, createdAt: d.created_at })));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/debts', authenticateToken, async (req, res) => {
  try {
    const { name, icon, creditor, totalAmount, interestRate, startDate, duration, notes, schedule } = req.body;
    const result = await pool.query('INSERT INTO debts (user_id, name, icon, creditor, total_amount, interest_rate, start_date, duration, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [req.user.id, name, icon || '💳', creditor, totalAmount, interestRate || 0, startDate, duration || 12, notes]);
    const debt = result.rows[0];
    if (schedule?.length > 0) {
      for (const s of schedule) await pool.query('INSERT INTO debt_schedule (debt_id, date, amount, paid, paid_date) VALUES ($1, $2, $3, $4, $5)', [debt.id, s.date, s.amount, s.paid || false, s.paidDate || null]);
    }
    const scheduleResult = await pool.query('SELECT * FROM debt_schedule WHERE debt_id = $1 ORDER BY date', [debt.id]);
    const debtResponse = { id: debt.id, name: debt.name, icon: debt.icon, creditor: debt.creditor, totalAmount: parseFloat(debt.total_amount), interestRate: parseFloat(debt.interest_rate), startDate: debt.start_date, duration: debt.duration, notes: debt.notes, schedule: scheduleResult.rows.map(s => ({ id: s.id, date: s.date, amount: parseFloat(s.amount), paid: s.paid, paidDate: s.paid_date })), createdAt: debt.created_at };
    emitToUser(req.user.id, 'debt:created', debtResponse);
    res.json(debtResponse);
  } catch (error) {
    console.error('Add debt error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/debts/:id', authenticateToken, async (req, res) => {
  try {
    const { name, icon, creditor, totalAmount, interestRate, startDate, duration, notes, schedule } = req.body;
    const result = await pool.query('UPDATE debts SET name=$1, icon=$2, creditor=$3, total_amount=$4, interest_rate=$5, start_date=$6, duration=$7, notes=$8 WHERE id=$9 AND user_id=$10 RETURNING *', [name, icon, creditor, totalAmount, interestRate, startDate, duration, notes, req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
    const debt = result.rows[0];
    await pool.query('DELETE FROM debt_schedule WHERE debt_id = $1', [debt.id]);
    if (schedule?.length > 0) {
      for (const s of schedule) await pool.query('INSERT INTO debt_schedule (debt_id, date, amount, paid, paid_date) VALUES ($1, $2, $3, $4, $5)', [debt.id, s.date, s.amount, s.paid || false, s.paidDate || null]);
    }
    const scheduleResult = await pool.query('SELECT * FROM debt_schedule WHERE debt_id = $1 ORDER BY date', [debt.id]);
    const debtResponse = { id: debt.id, name: debt.name, icon: debt.icon, creditor: debt.creditor, totalAmount: parseFloat(debt.total_amount), interestRate: parseFloat(debt.interest_rate), startDate: debt.start_date, duration: debt.duration, notes: debt.notes, schedule: scheduleResult.rows.map(s => ({ id: s.id, date: s.date, amount: parseFloat(s.amount), paid: s.paid, paidDate: s.paid_date })), createdAt: debt.created_at };
    emitToUser(req.user.id, 'debt:updated', debtResponse);
    res.json(debtResponse);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/debts/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM debts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    emitToUser(req.user.id, 'debt:deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// TEMPLATES
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE user_id = $1', [req.user.id]);
    res.json(result.rows.map(t => ({ id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, recurring: t.recurring, isFixedExpense: t.is_fixed_expense, createdAt: t.created_at })));
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/templates', authenticateToken, async (req, res) => {
  try {
    const { name, amount, type, category, brand, recurring, isFixedExpense } = req.body;
    const result = await pool.query('INSERT INTO templates (user_id, name, amount, type, category, brand, recurring, is_fixed_expense) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [req.user.id, name, amount, type, category, brand, recurring || false, isFixedExpense || false]);
    const t = result.rows[0];
    const template = { id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, recurring: t.recurring, isFixedExpense: t.is_fixed_expense, createdAt: t.created_at };
    emitToUser(req.user.id, 'template:created', template);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { name, amount, type, category, brand, recurring, isFixedExpense } = req.body;
    const result = await pool.query('UPDATE templates SET name=$1, amount=$2, type=$3, category=$4, brand=$5, recurring=$6, is_fixed_expense=$7 WHERE id=$8 AND user_id=$9 RETURNING *', [name, amount, type, category, brand, recurring, isFixedExpense, req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
    const t = result.rows[0];
    const template = { id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, recurring: t.recurring, isFixedExpense: t.is_fixed_expense, createdAt: t.created_at };
    emitToUser(req.user.id, 'template:updated', template);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM templates WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    emitToUser(req.user.id, 'template:deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction pour envoyer une notification push (déclarée ici car utilisée dans achievements)
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const subscriptions = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { ...data, url: process.env.APP_URL || 'https://localhost' }
    });

    const results = await Promise.allSettled(
      subscriptions.rows.map(sub => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        };
        return webpush.sendNotification(pushSubscription, payload);
      })
    );

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected' && results[i].reason?.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [subscriptions.rows[i].endpoint]);
      }
    }

    return results.filter(r => r.status === 'fulfilled').length;
  } catch (error) {
    console.error('Send push notification error:', error);
    return 0;
  }
};

// Helper : parse unlocked (gère string ou array depuis JSONB)
const parseUnlocked = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return []; }
  }
  return [];
};

// ACHIEVEMENTS
app.get('/api/achievements', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM achievements WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.json({ unlocked: [], points: 0, streak: 0, lastActivity: null });
    const a = result.rows[0];
    res.json({ unlocked: parseUnlocked(a.unlocked), points: a.points || 0, streak: a.streak || 0, lastActivity: a.last_activity });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/achievements', authenticateToken, async (req, res) => {
  try {
    const { unlocked, points, streak, lastActivity } = req.body;
    
    // Récupérer les données actuelles en DB pour éviter toute régression
    const existing = await pool.query('SELECT * FROM achievements WHERE user_id = $1', [req.user.id]);
    
    let finalUnlocked = unlocked || [];
    let finalPoints = points || 0;
    let finalStreak = streak || 0;
    
    if (existing.rows.length > 0) {
      const current = existing.rows[0];
      const currentUnlocked = parseUnlocked(current.unlocked);
      
      // Fusionner : garder tous les badges existants + ajouter les nouveaux
      const existingIds = new Set(currentUnlocked.map(a => a.id));
      const incomingParsed = Array.isArray(finalUnlocked) ? finalUnlocked : [];
      const merged = [...currentUnlocked];
      for (const badge of incomingParsed) {
        if (!existingIds.has(badge.id)) {
          merged.push(badge);
        }
      }
      finalUnlocked = merged;
      
      // Ne jamais diminuer les points
      finalPoints = Math.max(finalPoints, current.points || 0);
      
      // Ne jamais diminuer le streak (sauf reset légitime à 1)
      if (finalStreak > 0 && finalStreak < (current.streak || 0) && finalStreak !== 1) {
        finalStreak = current.streak || 0;
      }
    }
    
    await pool.query(
      'INSERT INTO achievements (user_id, unlocked, points, streak, last_activity) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO UPDATE SET unlocked=$2, points=$3, streak=$4, last_activity=$5',
      [req.user.id, JSON.stringify(finalUnlocked), finalPoints, finalStreak, lastActivity]
    );
    const achievements = { unlocked: finalUnlocked, points: finalPoints, streak: finalStreak, lastActivity };
    emitToUser(req.user.id, 'achievements:updated', achievements);
    res.json(achievements);
  } catch (error) {
    console.error('PUT achievements error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction helper pour vérifier les achievements d'un utilisateur
const checkAchievementsForUser = async (userId) => {
  try {
    const [transResult, savingsResult, goalsResult, budgetsResult, debtsResult, templatesResult, sharedResult, longTermResult, achievResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN type = \'income\' THEN 1 END) as incomes, COUNT(CASE WHEN type = \'expense\' THEN 1 END) as expenses FROM transactions WHERE user_id = $1', [userId]),
      pool.query('SELECT amount FROM savings WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM savings_goals WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as total FROM category_budgets WHERE user_id = $1 AND amount > 0', [userId]),
      pool.query('SELECT * FROM debts WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as total FROM templates WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as total FROM shared_budget_members WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as total FROM long_term_goals WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM achievements WHERE user_id = $1', [userId]),
    ]);

    const current = achievResult.rows[0] || { unlocked: [], points: 0, streak: 0 };
    const parsedUnlocked = parseUnlocked(current.unlocked);
    const unlockedIds = new Set(parsedUnlocked.map(a => a.id));
    const newUnlocks = [];
    const savingsAmount = parseFloat(savingsResult.rows[0]?.amount) || 0;
    const totalTx = parseInt(transResult.rows[0]?.total) || 0;

    const checks = [
      { id: 'first_transaction', condition: totalTx >= 1, points: 10 },
      { id: 'first_income', condition: parseInt(transResult.rows[0]?.incomes) > 0, points: 10 },
      { id: 'first_expense', condition: parseInt(transResult.rows[0]?.expenses) > 0, points: 10 },
      { id: 'first_savings', condition: savingsAmount > 0, points: 15 },
      { id: 'first_budget', condition: parseInt(budgetsResult.rows[0]?.total) > 0, points: 15 },
      { id: 'first_goal', condition: goalsResult.rows.length > 0, points: 15 },
      { id: 'savings_100', condition: savingsAmount >= 100, points: 20 },
      { id: 'savings_500', condition: savingsAmount >= 500, points: 40 },
      { id: 'savings_1000', condition: savingsAmount >= 1000, points: 60 },
      { id: 'savings_5000', condition: savingsAmount >= 5000, points: 100 },
      { id: 'savings_10000', condition: savingsAmount >= 10000, points: 200 },
      { id: 'transactions_10', condition: totalTx >= 10, points: 15 },
      { id: 'transactions_50', condition: totalTx >= 50, points: 30 },
      { id: 'transactions_100', condition: totalTx >= 100, points: 50 },
      { id: 'transactions_250', condition: totalTx >= 250, points: 100 },
      { id: 'transactions_500', condition: totalTx >= 500, points: 200 },
      { id: 'template_user', condition: parseInt(templatesResult.rows[0]?.total) >= 3, points: 20 },
      { id: 'shared_budget', condition: parseInt(sharedResult.rows[0]?.total) > 0, points: 25 },
      { id: 'long_term_goal', condition: parseInt(longTermResult.rows[0]?.total) > 0, points: 20 },
      { id: 'all_budgets_set', condition: parseInt(budgetsResult.rows[0]?.total) >= 5, points: 25 },
    ];

    const now = new Date().toISOString();
    let newPoints = current.points || 0;
    const newUnlockedList = [...parsedUnlocked];

    for (const check of checks) {
      if (check.condition && !unlockedIds.has(check.id)) {
        newUnlockedList.push({ id: check.id, unlockedAt: now });
        newPoints += check.points;
        newUnlocks.push(check.id);
      }
    }

    if (goalsResult.rows.some(g => parseFloat(g.current) >= parseFloat(g.target)) && !unlockedIds.has('goal_reached')) {
      newUnlockedList.push({ id: 'goal_reached', unlockedAt: now });
      newPoints += 75;
      newUnlocks.push('goal_reached');
    }

    for (const debt of debtsResult.rows) {
      const schedule = await pool.query('SELECT paid FROM debt_schedule WHERE debt_id = $1', [debt.id]);
      if (schedule.rows.length > 0 && schedule.rows.every(s => s.paid) && !unlockedIds.has('debt_free')) {
        newUnlockedList.push({ id: 'debt_free', unlockedAt: now });
        newPoints += 100;
        newUnlocks.push('debt_free');
        break;
      }
    }

    if (newUnlocks.length > 0) {
      await pool.query(
        'UPDATE achievements SET unlocked = $1, points = $2 WHERE user_id = $3',
        [JSON.stringify(newUnlockedList), newPoints, userId]
      );

      for (const id of newUnlocks) {
        const prefs = await pool.query('SELECT goal_achieved FROM notification_preferences WHERE user_id = $1', [userId]);
        if (prefs.rows[0]?.goal_achieved !== false) {
          await sendPushNotification(userId, '🏆 Badge débloqué !', `Vous avez débloqué un nouveau badge !`, { type: 'achievement', achievementId: id });
        }
      }

      emitToUser(userId, 'achievements:updated', {
        unlocked: newUnlockedList,
        points: newPoints,
        streak: current.streak,
        lastActivity: current.last_activity
      });
    }

    return { newUnlocks, totalPoints: newPoints, totalBadges: newUnlockedList.length };
  } catch (error) {
    console.error('Achievement check error for user', userId, ':', error);
    return { newUnlocks: [], totalPoints: 0, totalBadges: 0 };
  }
};

// Endpoint API pour vérification des achievements
app.post('/api/achievements/check', authenticateToken, async (req, res) => {
  try {
    const result = await checkAchievementsForUser(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Achievement check error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PLANNED BUDGET
app.get('/api/planned-budget', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM planned_budget WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.json({});
    const p = result.rows[0];
    res.json({ expectedIncome: parseFloat(p.expected_income) || 0, expectedExpenses: parseFloat(p.expected_expenses) || 0, plannedSavings: parseFloat(p.planned_savings) || 0, categories: p.categories || {}, notes: p.notes || '', month: p.month, year: p.year });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/planned-budget', authenticateToken, async (req, res) => {
  try {
    const { expectedIncome, expectedExpenses, plannedSavings, categories, notes, month, year } = req.body;
    await pool.query('INSERT INTO planned_budget (user_id, expected_income, expected_expenses, planned_savings, categories, notes, month, year) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id) DO UPDATE SET expected_income=$2, expected_expenses=$3, planned_savings=$4, categories=$5, notes=$6, month=$7, year=$8', [req.user.id, expectedIncome || 0, expectedExpenses || 0, plannedSavings || 0, JSON.stringify(categories || {}), notes || '', month, year]);
    const plannedBudget = { expectedIncome, expectedExpenses, plannedSavings, categories, notes, month, year };
    emitToUser(req.user.id, 'plannedBudget:updated', plannedBudget);
    res.json(plannedBudget);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// SHARED BUDGETS
app.get('/api/shared-budgets', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT sb.* FROM shared_budgets sb JOIN shared_budget_members sbm ON sb.id = sbm.shared_budget_id WHERE sbm.user_id = $1', [req.user.id]);
    const budgets = result.rows;
    for (const budget of budgets) {
      const membersResult = await pool.query('SELECT sbm.*, u.name as user_name, u.email FROM shared_budget_members sbm JOIN users u ON sbm.user_id = u.id WHERE sbm.shared_budget_id = $1', [budget.id]);
      budget.members = membersResult.rows.map(m => ({ userId: m.user_id, userName: m.user_name, email: m.email, role: m.role, joinedAt: m.joined_at }));
      const transactionsResult = await pool.query('SELECT st.*, u.name as added_by_name FROM shared_transactions st LEFT JOIN users u ON st.user_id = u.id WHERE st.shared_budget_id = $1 ORDER BY st.date DESC', [budget.id]);
      budget.transactions = transactionsResult.rows.map(t => ({ id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, date: t.date, addedBy: t.user_id, addedByName: t.added_by_name, createdAt: t.created_at }));
      const savingsResult = await pool.query('SELECT amount FROM shared_savings WHERE shared_budget_id = $1', [budget.id]);
      budget.savings = parseFloat(savingsResult.rows[0]?.amount) || 0;
      budget.createdBy = budget.created_by;
      budget.inviteCode = budget.invite_code;
      budget.createdAt = budget.created_at;
      budget.categories = [];
    }
    res.json(budgets);
  } catch (error) {
    console.error('Get shared budgets error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/shared-budgets', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const result = await pool.query('INSERT INTO shared_budgets (name, created_by, invite_code) VALUES ($1, $2, $3) RETURNING *', [name, req.user.id, inviteCode]);
    const budget = result.rows[0];
    await pool.query('INSERT INTO shared_budget_members (shared_budget_id, user_id, role) VALUES ($1, $2, $3)', [budget.id, req.user.id, 'owner']);
    await pool.query('INSERT INTO shared_savings (shared_budget_id, amount) VALUES ($1, 0)', [budget.id]);
    const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    
    // Logger l'action
    await logSharedAction(budget.id, req.user.id, 'BUDGET_CREATED', { name: budget.name });
    
    res.json({ id: budget.id, name: budget.name, createdBy: budget.created_by, inviteCode: budget.invite_code, createdAt: budget.created_at, members: [{ userId: req.user.id, userName: user.name, email: user.email, role: 'owner', joinedAt: new Date().toISOString() }], transactions: [], categories: [], savings: 0 });
  } catch (error) {
    console.error('Create shared budget error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/shared-budgets/join', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const budgetResult = await pool.query('SELECT * FROM shared_budgets WHERE invite_code = $1', [inviteCode.toUpperCase()]);
    if (budgetResult.rows.length === 0) return res.status(404).json({ error: 'Code invalide' });
    const budget = budgetResult.rows[0];
    const memberCheck = await pool.query('SELECT * FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2', [budget.id, req.user.id]);
    if (memberCheck.rows.length > 0) return res.status(400).json({ error: 'Déjà membre' });
    await pool.query('INSERT INTO shared_budget_members (shared_budget_id, user_id, role) VALUES ($1, $2, $3)', [budget.id, req.user.id, 'member']);
    
    // Logger l'action
    await logSharedAction(budget.id, req.user.id, 'MEMBER_JOINED', { userName: user.name });
    
    // Rejoindre la room WebSocket
    const userSockets = connectedUsers.get(req.user.id);
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) socket.join(`shared:${budget.id}`);
      });
    }
    
    // Notifier les autres membres
    const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    emitToSharedBudget(budget.id, 'sharedBudget:memberJoined', {
      budgetId: budget.id,
      member: { userId: req.user.id, userName: user.name, email: user.email, role: 'member', joinedAt: new Date().toISOString() }
    });
    
    // Récupérer le budget complet avec tous les membres et transactions
    const membersResult = await pool.query('SELECT sbm.*, u.name as user_name, u.email FROM shared_budget_members sbm JOIN users u ON sbm.user_id = u.id WHERE sbm.shared_budget_id = $1', [budget.id]);
    const members = membersResult.rows.map(m => ({ userId: m.user_id, userName: m.user_name, email: m.email, role: m.role, joinedAt: m.joined_at }));
    const transactionsResult = await pool.query('SELECT st.*, u.name as added_by_name FROM shared_transactions st LEFT JOIN users u ON st.user_id = u.id WHERE st.shared_budget_id = $1 ORDER BY st.date DESC', [budget.id]);
    const transactions = transactionsResult.rows.map(t => ({ id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, date: t.date, addedBy: t.user_id, addedByName: t.added_by_name, createdAt: t.created_at }));
    const savingsResult = await pool.query('SELECT amount FROM shared_savings WHERE shared_budget_id = $1', [budget.id]);
    const savings = parseFloat(savingsResult.rows[0]?.amount) || 0;

    res.json({
      id: budget.id,
      name: budget.name,
      createdBy: budget.created_by,
      inviteCode: budget.invite_code,
      createdAt: budget.created_at,
      members,
      transactions,
      savings,
      categories: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/shared-budgets/:id/leave', authenticateToken, async (req, res) => {
  try {
    const budgetId = req.params.id;
    const memberResult = await pool.query('SELECT role FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2', [budgetId, req.user.id]);
    if (memberResult.rows.length === 0) return res.status(404).json({ error: 'Non membre' });
    if (memberResult.rows[0].role === 'owner') {
      const countResult = await pool.query('SELECT COUNT(*) FROM shared_budget_members WHERE shared_budget_id = $1', [budgetId]);
      if (parseInt(countResult.rows[0].count) > 1) return res.status(400).json({ error: 'Transférez la propriété avant de quitter' });
      await pool.query('DELETE FROM shared_budgets WHERE id = $1', [budgetId]);
      emitToSharedBudget(budgetId, 'sharedBudget:deleted', { budgetId: parseInt(budgetId) });
      return res.json({ message: 'Budget supprimé' });
    }
    await pool.query('DELETE FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2', [budgetId, req.user.id]);
    
    // Logger l'action
    await logSharedAction(budgetId, req.user.id, 'MEMBER_LEFT', {});
    
    emitToSharedBudget(budgetId, 'sharedBudget:memberLeft', { budgetId: parseInt(budgetId), userId: req.user.id });
    res.json({ message: 'Vous avez quitté le budget' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un membre du budget partagé
app.delete('/api/shared-budgets/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id: budgetId, userId } = req.params;
    
    // Vérifier que l'utilisateur est owner
    const ownerCheck = await pool.query(
      'SELECT role FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2',
      [budgetId, req.user.id]
    );
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Seul le propriétaire peut retirer des membres' });
    }
    
    // Empêcher de se retirer soi-même
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Utilisez "Quitter" pour vous retirer' });
    }
    
    // Supprimer le membre
    await pool.query(
      'DELETE FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2',
      [budgetId, userId]
    );
    
    // Logger l'action
    await logSharedAction(budgetId, req.user.id, 'MEMBER_REMOVED', { removedUserId: parseInt(userId) });
    
    // Notifier via WebSocket
    emitToSharedBudget(budgetId, 'sharedBudget:memberRemoved', {
      budgetId: parseInt(budgetId),
      userId: parseInt(userId)
    });
    
    res.json({ success: true, message: 'Membre retiré' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un budget partagé (owner only)
app.delete('/api/shared-budgets/:id', authenticateToken, async (req, res) => {
  try {
    const budgetId = req.params.id;
    
    // Vérifier que l'utilisateur est owner
    const ownerCheck = await pool.query(
      'SELECT role FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2',
      [budgetId, req.user.id]
    );
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Seul le propriétaire peut supprimer le budget' });
    }
    
    // Supprimer le budget (CASCADE supprimera les membres, transactions, savings)
    await pool.query('DELETE FROM shared_budgets WHERE id = $1', [budgetId]);
    
    // Notifier via WebSocket
    emitToSharedBudget(budgetId, 'sharedBudget:deleted', { budgetId: parseInt(budgetId) });
    
    res.json({ success: true, message: 'Budget supprimé' });
  } catch (error) {
    console.error('Delete shared budget error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/shared-budgets/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const budgetId = req.params.id;
    const { name, amount, type, category, brand, date } = req.body;
    const memberCheck = await pool.query('SELECT * FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2', [budgetId, req.user.id]);
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Accès refusé' });
    const result = await pool.query('INSERT INTO shared_transactions (shared_budget_id, user_id, name, amount, type, category, brand, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [budgetId, req.user.id, name, amount, type, category, brand, date]);
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const t = result.rows[0];
    const transaction = { id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, date: t.date, addedBy: req.user.id, addedByName: userResult.rows[0]?.name, createdAt: t.created_at };
    
    // Logger l'action
    await logSharedAction(budgetId, req.user.id, 'TRANSACTION_ADDED', { transactionId: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type });
    
    emitToSharedBudget(budgetId, 'sharedTransaction:created', { budgetId: parseInt(budgetId), transaction });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/shared-budgets/:budgetId/transactions/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { budgetId, transactionId } = req.params;
    const memberCheck = await pool.query('SELECT * FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2', [budgetId, req.user.id]);
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Accès refusé' });
    
    // Récupérer les infos de la transaction avant suppression
    const txResult = await pool.query('SELECT name, amount, type FROM shared_transactions WHERE id = $1', [transactionId]);
    const txInfo = txResult.rows[0];
    
    await pool.query('DELETE FROM shared_transactions WHERE id = $1 AND shared_budget_id = $2', [transactionId, budgetId]);
    
    // Logger l'action
    await logSharedAction(budgetId, req.user.id, 'TRANSACTION_DELETED', { transactionId: parseInt(transactionId), name: txInfo?.name, amount: parseFloat(txInfo?.amount), type: txInfo?.type });
    
    emitToSharedBudget(budgetId, 'sharedTransaction:deleted', { budgetId: parseInt(budgetId), transactionId: parseInt(transactionId) });
    res.json({ message: 'Supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Historique des actions du budget partagé
app.get('/api/shared-budgets/:id/history', authenticateToken, async (req, res) => {
  try {
    const budgetId = req.params.id;
    const { limit = 50, offset = 0 } = req.query;
    
    // Vérifier que l'utilisateur est membre
    const memberCheck = await pool.query('SELECT * FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2', [budgetId, req.user.id]);
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Accès refusé' });
    
    // Récupérer l'historique avec le nom de l'utilisateur
    const result = await pool.query(`
      SELECT h.*, u.name as user_name, u.email as user_email
      FROM shared_budget_history h
      JOIN users u ON h.user_id = u.id
      WHERE h.budget_id = $1
      ORDER BY h.created_at DESC
      LIMIT $2 OFFSET $3
    `, [budgetId, parseInt(limit), parseInt(offset)]);
    
    // Compter le total
    const countResult = await pool.query('SELECT COUNT(*) FROM shared_budget_history WHERE budget_id = $1', [budgetId]);
    
    res.json({
      history: result.rows.map(h => ({
        id: h.id,
        actionType: h.action_type,
        details: h.details,
        userId: h.user_id,
        userName: h.user_name,
        userEmail: h.user_email,
        createdAt: h.created_at
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get shared budget history error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/shared-budgets/:id/savings', authenticateToken, async (req, res) => {
  try {
    const budgetId = req.params.id;
    const { amount } = req.body;
    const memberCheck = await pool.query('SELECT * FROM shared_budget_members WHERE shared_budget_id = $1 AND user_id = $2', [budgetId, req.user.id]);
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Accès refusé' });
    // Récupérer l'ancien montant
    const oldSavings = await pool.query('SELECT amount FROM shared_savings WHERE shared_budget_id = $1', [budgetId]);
    const oldAmount = parseFloat(oldSavings.rows[0]?.amount) || 0;
    
    await pool.query('INSERT INTO shared_savings (shared_budget_id, amount) VALUES ($1, $2) ON CONFLICT (shared_budget_id) DO UPDATE SET amount = $2', [budgetId, amount]);
    
    // Logger l'action
    await logSharedAction(budgetId, req.user.id, 'SAVINGS_UPDATED', { oldAmount, newAmount: amount });
    
    emitToSharedBudget(budgetId, 'sharedSavings:updated', { budgetId: parseInt(budgetId), amount });
    res.json({ amount });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// OBJECTIFS À LONG TERME
// ============================================
app.get('/api/long-term-goals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM long_term_goals WHERE user_id = $1 ORDER BY target_date ASC', [req.user.id]);
    res.json(result.rows.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      targetAmount: parseFloat(g.target_amount),
      currentAmount: parseFloat(g.current_amount),
      targetDate: g.target_date,
      priority: g.priority,
      notes: g.notes,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    })));
  } catch (error) {
    console.error('Get long term goals error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/long-term-goals', authenticateToken, async (req, res) => {
  try {
    const { name, icon, targetAmount, currentAmount, targetDate, priority, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO long_term_goals (user_id, name, icon, target_amount, current_amount, target_date, priority, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.id, name, icon || '🎯', targetAmount, currentAmount || 0, targetDate, priority || 'medium', notes]
    );
    const g = result.rows[0];
    const goal = {
      id: g.id,
      name: g.name,
      icon: g.icon,
      targetAmount: parseFloat(g.target_amount),
      currentAmount: parseFloat(g.current_amount),
      targetDate: g.target_date,
      priority: g.priority,
      notes: g.notes,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    };
    emitToUser(req.user.id, 'longTermGoal:created', goal);
    res.json(goal);
  } catch (error) {
    console.error('Create long term goal error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/long-term-goals/:id', authenticateToken, async (req, res) => {
  try {
    const { name, icon, targetAmount, currentAmount, targetDate, priority, notes } = req.body;
    const result = await pool.query(
      'UPDATE long_term_goals SET name=$1, icon=$2, target_amount=$3, current_amount=$4, target_date=$5, priority=$6, notes=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8 AND user_id=$9 RETURNING *',
      [name, icon, targetAmount, currentAmount, targetDate, priority, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
    const g = result.rows[0];
    const goal = {
      id: g.id,
      name: g.name,
      icon: g.icon,
      targetAmount: parseFloat(g.target_amount),
      currentAmount: parseFloat(g.current_amount),
      targetDate: g.target_date,
      priority: g.priority,
      notes: g.notes,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    };
    emitToUser(req.user.id, 'longTermGoal:updated', goal);
    res.json(goal);
  } catch (error) {
    console.error('Update long term goal error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/long-term-goals/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM long_term_goals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    emitToUser(req.user.id, 'longTermGoal:deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Supprimé' });
  } catch (error) {
    console.error('Delete long term goal error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// SYNC
app.get('/api/sync', authenticateToken, async (req, res) => {
  try {
    const [transactions, savings, savingsGoals, categoryBudgets, customCategories, customBrands, debts, templates, achievements, plannedBudget, longTermGoals] = await Promise.all([
      pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC', [req.user.id]),
      pool.query('SELECT amount FROM savings WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM savings_goals WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT category_id, amount FROM category_budgets WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM custom_categories WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM custom_brands WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM debts WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM templates WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM achievements WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM planned_budget WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM long_term_goals WHERE user_id = $1 ORDER BY target_date ASC', [req.user.id])
    ]);
    
    for (const debt of debts.rows) {
      const scheduleResult = await pool.query('SELECT * FROM debt_schedule WHERE debt_id = $1 ORDER BY date', [debt.id]);
      debt.schedule = scheduleResult.rows.map(s => ({ id: s.id, date: s.date, amount: parseFloat(s.amount), paid: s.paid, paidDate: s.paid_date }));
    }
    
    const budgetsObj = {};
    categoryBudgets.rows.forEach(row => { budgetsObj[row.category_id] = parseFloat(row.amount); });
    
    const a = achievements.rows[0];
    const p = plannedBudget.rows[0];
    
    res.json({
      transactions: transactions.rows.map(t => ({ id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, date: t.date, recurring: t.recurring, recurringFrequency: t.recurring_frequency, isFixedExpense: t.is_fixed_expense, nextOccurrence: t.next_occurrence, lastGenerated: t.last_generated, parentRecurringId: t.parent_recurring_id, createdAt: t.created_at })),
      savings: parseFloat(savings.rows[0]?.amount) || 0,
      savingsGoals: savingsGoals.rows.map(g => ({ id: g.id, name: g.name, icon: g.icon, target: parseFloat(g.target), current: parseFloat(g.current), deadline: g.deadline, createdAt: g.created_at })),
      categoryBudgets: budgetsObj,
      customCategories: customCategories.rows,
      customBrands: customBrands.rows,
      debts: debts.rows.map(d => ({ id: d.id, name: d.name, icon: d.icon, creditor: d.creditor, totalAmount: parseFloat(d.total_amount), interestRate: parseFloat(d.interest_rate), startDate: d.start_date, duration: d.duration, notes: d.notes, schedule: d.schedule, createdAt: d.created_at })),
      templates: templates.rows.map(t => ({ id: t.id, name: t.name, amount: parseFloat(t.amount), type: t.type, category: t.category, brand: t.brand, recurring: t.recurring, isFixedExpense: t.is_fixed_expense, createdAt: t.created_at })),
      achievements: a ? { unlocked: parseUnlocked(a.unlocked), points: a.points || 0, streak: a.streak || 0, lastActivity: a.last_activity } : { unlocked: [], points: 0, streak: 0, lastActivity: null },
      plannedBudget: p ? { expectedIncome: parseFloat(p.expected_income) || 0, expectedExpenses: parseFloat(p.expected_expenses) || 0, plannedSavings: parseFloat(p.planned_savings) || 0, categories: p.categories || {}, notes: p.notes || '', month: p.month, year: p.year } : {},
      longTermGoals: longTermGoals.rows.map(g => ({ id: g.id, name: g.name, icon: g.icon, targetAmount: parseFloat(g.target_amount), currentAmount: parseFloat(g.current_amount), targetDate: g.target_date, priority: g.priority, notes: g.notes, createdAt: g.created_at, updatedAt: g.updated_at }))
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ADMIN
// ============================================

// Vérifier si l'utilisateur est admin
app.get('/api/admin/check', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    res.json({ isAdmin: result.rows[0]?.is_admin || false });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des utilisateurs (admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!adminCheck.rows[0]?.is_admin) return res.status(403).json({ error: 'Accès refusé' });
    const result = await pool.query('SELECT id, email, name, is_admin, admin_permissions, created_at, last_login FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier le statut admin d'un utilisateur
app.put('/api/admin/users/:id/admin', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_admins');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const { isAdmin } = req.body;
    await pool.query('UPDATE users SET is_admin = $1 WHERE id = $2', [isAdmin, req.params.id]);
    if (isAdmin) {
      await pool.query('UPDATE users SET admin_permissions = $1 WHERE id = $2 AND admin_permissions IS NULL', [JSON.stringify([]), req.params.id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un utilisateur
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_users');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
    }
    
    // Empêcher de supprimer un super admin
    const targetUser = await pool.query('SELECT admin_permissions FROM users WHERE id = $1', [req.params.id]);
    if (targetUser.rows[0]?.admin_permissions?.includes('all')) {
      return res.status(403).json({ error: 'Impossible de supprimer un super admin' });
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ADMIN - Catégories globales
// ============================================
app.get('/api/admin/categories', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!adminCheck.rows[0]?.is_admin) return res.status(403).json({ error: 'Accès refusé' });
    
    const result = await pool.query('SELECT * FROM global_categories ORDER BY type, name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/categories', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_categories');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const { name, icon, color, type } = req.body;
    const result = await pool.query(
      'INSERT INTO global_categories (name, icon, color, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, icon, color || '#6B7280', type]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_categories');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const { name, icon, color, type } = req.body;
    const result = await pool.query(
      'UPDATE global_categories SET name = $1, icon = $2, color = $3, type = $4 WHERE id = $5 RETURNING *',
      [name, icon, color, type, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_categories');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    await pool.query('DELETE FROM global_categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ADMIN - Marques globales
// ============================================
app.get('/api/admin/brands', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!adminCheck.rows[0]?.is_admin) return res.status(403).json({ error: 'Accès refusé' });
    
    const result = await pool.query('SELECT * FROM global_brands ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/brands', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_categories');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const { name, logo, color } = req.body;
    const result = await pool.query(
      'INSERT INTO global_brands (name, logo, color) VALUES ($1, $2, $3) RETURNING *',
      [name, logo, color || '#6B7280']
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/brands/:id', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_categories');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const { name, logo, color } = req.body;
    const result = await pool.query(
      'UPDATE global_brands SET name = $1, logo = $2, color = $3 WHERE id = $4 RETURNING *',
      [name, logo, color, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/brands/:id', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_categories');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    await pool.query('DELETE FROM global_brands WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ADMIN - Gestion utilisateurs avancée
// ============================================
app.post('/api/admin/users/:id/reset-password', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_users');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const { newPassword } = req.body;
    const userResult = await pool.query('SELECT salt FROM users WHERE id = $1', [req.params.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await pool.query('UPDATE users SET password = $1, salt = $2 WHERE id = $3', [hashedPassword, salt, req.params.id]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
    
    res.json({ success: true, message: 'Mot de passe réinitialisé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!adminCheck.rows[0]?.is_admin) return res.status(403).json({ error: 'Accès refusé' });
    
    const result = await pool.query(
      'SELECT id, email, name, is_admin, admin_permissions, created_at, last_login FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    
    // Stats utilisateur
    const [transactions, savings, debts] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM transactions WHERE user_id = $1', [req.params.id]),
      pool.query('SELECT amount FROM savings WHERE user_id = $1', [req.params.id]),
      pool.query('SELECT COUNT(*) as count FROM debts WHERE user_id = $1', [req.params.id])
    ]);
    
    res.json({
      ...result.rows[0],
      stats: {
        transactions: parseInt(transactions.rows[0]?.count) || 0,
        savings: parseFloat(savings.rows[0]?.amount) || 0,
        debts: parseInt(debts.rows[0]?.count) || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/users/:id/permissions', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_admins');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    // Empêcher de modifier les permissions d'un super admin
    const targetUser = await pool.query('SELECT admin_permissions FROM users WHERE id = $1', [req.params.id]);
    if (targetUser.rows[0]?.admin_permissions?.includes('all') && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Impossible de modifier un super admin' });
    }
    
    const { permissions: newPermissions } = req.body;
    await pool.query('UPDATE users SET admin_permissions = $1 WHERE id = $2', [JSON.stringify(newPermissions), req.params.id]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ADMIN - LOGS
// ============================================
app.get('/api/admin/logs', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'view_logs');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const { level, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM api_logs';
    const params = [];
    
    if (level && level !== 'all') {
      query += ' WHERE level = $1';
      params.push(level);
    }
    
    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM api_logs');
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/logs', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_logs');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const { before } = req.body;
    
    if (before) {
      await pool.query('DELETE FROM api_logs WHERE timestamp < $1', [before]);
    } else {
      await pool.query('DELETE FROM api_logs');
    }
    
    res.json({ success: true, message: 'Logs supprimés' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'view_logs');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    const [
      totalUsers,
      totalTransactions,
      totalLogs,
      errorLogs,
      avgResponseTime,
      activeToday,
      logsPerLevel,
      topEndpoints
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM transactions'),
      pool.query('SELECT COUNT(*) FROM api_logs'),
      pool.query("SELECT COUNT(*) FROM api_logs WHERE level = 'error' AND timestamp > NOW() - INTERVAL '24 hours'"),
      pool.query('SELECT AVG(response_time) FROM api_logs WHERE timestamp > NOW() - INTERVAL \'1 hour\''),
      pool.query('SELECT COUNT(DISTINCT user_id) FROM api_logs WHERE timestamp > NOW() - INTERVAL \'24 hours\' AND user_id IS NOT NULL'),
      pool.query("SELECT level, COUNT(*) as count FROM api_logs WHERE timestamp > NOW() - INTERVAL '24 hours' GROUP BY level"),
      pool.query("SELECT endpoint, COUNT(*) as count, AVG(response_time)::int as avg_time FROM api_logs WHERE timestamp > NOW() - INTERVAL '24 hours' GROUP BY endpoint ORDER BY count DESC LIMIT 10")
    ]);
    
    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalTransactions: parseInt(totalTransactions.rows[0].count),
      totalLogs: parseInt(totalLogs.rows[0].count),
      errorsLast24h: parseInt(errorLogs.rows[0].count),
      avgResponseTime: Math.round(parseFloat(avgResponseTime.rows[0].avg) || 0),
      activeUsersToday: parseInt(activeToday.rows[0].count),
      logsPerLevel: logsPerLevel.rows,
      topEndpoints: topEndpoints.rows
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    websocket: true,
    connectedUsers: connectedUsers.size
  });
});

// ============================================
// TRANSACTIONS RÉCURRENTES AUTOMATIQUES
// ============================================
const processRecurringTransactions = async () => {
  console.log('🔄 Vérification des transactions récurrentes...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Récupérer toutes les transactions récurrentes dont la prochaine occurrence est <= aujourd'hui
    const result = await pool.query(`
      SELECT * FROM transactions 
      WHERE recurring = true 
        AND next_occurrence IS NOT NULL 
        AND next_occurrence <= $1
    `, [today]);
    
    console.log(`📋 ${result.rows.length} transaction(s) récurrente(s) à traiter`);
    
    for (const transaction of result.rows) {
      // Créer la nouvelle transaction
      const newTransaction = await pool.query(`
        INSERT INTO transactions (user_id, name, amount, type, category, brand, date, recurring, recurring_frequency, is_fixed_expense, parent_recurring_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9, $10)
        RETURNING *
      `, [
        transaction.user_id,
        transaction.name,
        transaction.amount,
        transaction.type,
        transaction.category,
        transaction.brand,
        transaction.next_occurrence,
        transaction.recurring_frequency,
        transaction.is_fixed_expense,
        transaction.id
      ]);
      
      // Calculer la prochaine occurrence
      let nextDate;
      const currentNext = new Date(transaction.next_occurrence);
      
      switch (transaction.recurring_frequency) {
        case 'quarterly':
          nextDate = new Date(currentNext.setMonth(currentNext.getMonth() + 3));
          break;
        case 'yearly':
          nextDate = new Date(currentNext.setFullYear(currentNext.getFullYear() + 1));
          break;
        case 'monthly':
        default:
          nextDate = new Date(currentNext.setMonth(currentNext.getMonth() + 1));
          break;
      }
      
      // Mettre à jour la transaction récurrente avec la prochaine date
      await pool.query(`
        UPDATE transactions 
        SET next_occurrence = $1, last_generated = $2 
        WHERE id = $3
      `, [nextDate.toISOString().split('T')[0], today, transaction.id]);
      
      // Notifier l'utilisateur via WebSocket
      const t = newTransaction.rows[0];
      const transactionData = {
        id: t.id,
        name: t.name,
        amount: parseFloat(t.amount),
        type: t.type,
        category: t.category,
        brand: t.brand,
        date: t.date,
        recurring: t.recurring,
        recurringFrequency: t.recurring_frequency,
        isFixedExpense: t.is_fixed_expense,
        parentRecurringId: t.parent_recurring_id,
        createdAt: t.created_at
      };
      
      emitToUser(transaction.user_id, 'transaction:created', transactionData);
      
      console.log(`✅ Transaction générée: ${transaction.name} pour user ${transaction.user_id}`);
    }
    
    if (result.rows.length > 0) {
      console.log(`🎉 ${result.rows.length} transaction(s) récurrente(s) générée(s)`);
    }
  } catch (error) {
    console.error('❌ Erreur transactions récurrentes:', error);
  }
};

// Exécuter au démarrage
setTimeout(processRecurringTransactions, 5000);

// Exécuter toutes les heures
setInterval(processRecurringTransactions, 60 * 60 * 1000);

// Endpoint pour forcer le traitement (admin)
app.post('/api/admin/process-recurring', authenticateToken, async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_users');
    if (!hasPermission) return res.status(403).json({ error: 'Permission insuffisante' });
    
    await processRecurringTransactions();
    res.json({ success: true, message: 'Transactions récurrentes traitées' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// NOTIFICATIONS PUSH
// ============================================

// S'abonner aux notifications
app.post('/api/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Données d\'abonnement invalides' });
    }

    await pool.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4
    `, [req.user.id, endpoint, keys.p256dh, keys.auth]);

    await pool.query(`
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [req.user.id]);

    res.json({ success: true, message: 'Abonnement enregistré' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Se désabonner des notifications
app.post('/api/push/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [req.user.id, endpoint]
    );
    res.json({ success: true, message: 'Désabonnement effectué' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les préférences de notifications
app.get('/api/push/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        debtReminders: true,
        budgetAlerts: true,
        goalAchieved: true,
        recurringTransactions: true,
        reminderDays: 3
      });
    }

    const p = result.rows[0];
    res.json({
      debtReminders: p.debt_reminders,
      budgetAlerts: p.budget_alerts,
      goalAchieved: p.goal_achieved,
      recurringTransactions: p.recurring_transactions,
      reminderDays: p.reminder_days
    });
  } catch (error) {
    console.error('Get push preferences error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour les préférences de notifications
app.put('/api/push/preferences', authenticateToken, async (req, res) => {
  try {
    const { debtReminders, budgetAlerts, goalAchieved, recurringTransactions, reminderDays } = req.body;

    await pool.query(`
      INSERT INTO notification_preferences (user_id, debt_reminders, budget_alerts, goal_achieved, recurring_transactions, reminder_days)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        debt_reminders = $2,
        budget_alerts = $3,
        goal_achieved = $4,
        recurring_transactions = $5,
        reminder_days = $6,
        updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, debtReminders, budgetAlerts, goalAchieved, recurringTransactions, reminderDays || 3]);

    res.json({ success: true });
  } catch (error) {
    console.error('Update push preferences error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer la clé VAPID publique (pas besoin d'auth)
app.get('/api/push/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(404).json({ error: 'Push notifications non configurées' });
  }
  res.json({ publicKey: key });
});

// Vérifier si l'utilisateur est abonné
app.get('/api/push/status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM push_subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ subscribed: parseInt(result.rows[0].count) > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// sendPushNotification est déclarée plus haut (avant ACHIEVEMENTS)

// Vérification des notifications (CRON)
const checkAndSendNotifications = async () => {
  console.log('🔔 Vérification des notifications...');

  try {
    const today = new Date();
    
    // 1. Échéances de dettes
    const debtReminders = await pool.query(`
      SELECT d.user_id, d.name, ds.date, ds.amount, np.reminder_days
      FROM debts d
      JOIN debt_schedule ds ON d.id = ds.debt_id
      JOIN notification_preferences np ON d.user_id = np.user_id
      WHERE np.debt_reminders = true
        AND ds.paid = false
        AND ds.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * np.reminder_days
    `);

    for (const reminder of debtReminders.rows) {
      const daysUntil = Math.ceil((new Date(reminder.date) - today) / (1000 * 60 * 60 * 24));
      const dayText = daysUntil === 0 ? "aujourd'hui" : daysUntil === 1 ? 'demain' : `dans ${daysUntil} jours`;
      
      await sendPushNotification(
        reminder.user_id,
        '🔔 Échéance de dette',
        `${reminder.name} : ${reminder.amount}€ ${dayText}`,
        { type: 'debt_reminder', debtName: reminder.name }
      );
    }

    // 2. Objectifs atteints
    const goalAlerts = await pool.query(`
      SELECT g.user_id, g.name, g.icon
      FROM long_term_goals g
      JOIN notification_preferences np ON g.user_id = np.user_id
      WHERE np.goal_achieved = true
        AND g.current_amount >= g.target_amount
        AND g.updated_at >= CURRENT_DATE
    `);

    for (const goal of goalAlerts.rows) {
      await sendPushNotification(
        goal.user_id,
        '🎉 Objectif atteint !',
        `Félicitations ! "${goal.name}" est complété !`,
        { type: 'goal_achieved', goalName: goal.name }
      );
    }

    console.log(`🔔 Notifications vérifiées : ${debtReminders.rows.length} dettes, ${goalAlerts.rows.length} objectifs`);
  } catch (error) {
    console.error('❌ Erreur vérification notifications:', error);
  }
};

// Exécuter toutes les heures
setInterval(checkAndSendNotifications, 60 * 60 * 1000);

// Exécuter au démarrage (après 15 secondes)
setTimeout(checkAndSendNotifications, 15000);

// Test notification (admin)
app.post('/api/push/test', authenticateToken, async (req, res) => {
  try {
    const sent = await sendPushNotification(
      req.user.id,
      '🧪 Test Notification',
      'Les notifications fonctionnent !',
      { type: 'test' }
    );
    res.json({ success: true, sent });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});