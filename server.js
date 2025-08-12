require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment detection
let pool;
const isLocalhost = !process.env.DB_HOST || process.env.DB_HOST === 'localhost' || process.env.NODE_ENV === 'development';
const API_URL = process.env.API_URL || (isLocalhost ? 'http://localhost:3000' : '');

// Database pool setup for production
if (!isLocalhost) {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// Configure CORS based on environment
const corsOptions = {
  origin: isLocalhost ?
    ['http://localhost:4200', 'http://localhost:3000'] : // Allow Angular dev server in local mode
    process.env.ALLOWED_ORIGIN || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS with environment-specific configuration
app.use(cors(corsOptions));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'", "data:"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "www.google-analytics.com", "www.googletagmanager.com"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "api.pwnedpasswords.com", "www.google-analytics.com", ...(isLocalhost ? ["http://localhost:*"] : [])]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  },
  frameguard: { action: 'sameorigin' },
  referrerPolicy: { policy: 'same-origin' }
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_for_development',
  resave: false,
  saveUninitialized: true, 
  cookie: {
    secure: !isLocalhost, // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public_html'), {
  setHeaders: (res, path) => {
    if (path.match(/\.(otf|ico|pdf|flv)$/)) {
      res.setHeader('Cache-Control', 'max-age=29030400, public');
    } else if (path.match(/\.(jpg|jpeg|png|gif|swf|svg)$/)) {
      res.setHeader('Cache-Control', 'max-age=2419200, public');
    } else if (path.match(/\.(xml|txt|css|js)$/)) {
      res.setHeader('Cache-Control', 'max-age=608400, public');
    } else if (path.match(/\.(phtml|html|htm|php)$/)) {
      res.setHeader('Cache-Control', 'max-age=1800, public');
    }
  }
}));

// Add API URL info to requests
app.use((req, res, next) => {
  req.apiBase = isLocalhost ? API_URL : '';
  // Add X-Environment header to indicate environment
  res.setHeader('X-Environment', isLocalhost ? 'development' : 'production');
  next();
});

const mockDatabase = {
  users: [
    {
      EMAIL: 'test@example.com',
      PASSWORD: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      SALT: 'salt123'
    },
    {
      EMAIL: 'user@test.com',
      PASSWORD: 'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86',
      SALT: 'abc123'
    }
  ]
};

async function queryDatabase(query, params) {
  if (isLocalhost) {
    console.log('Mock DB Query:', query, 'Params:', params);

    if (query.includes('SELECT SALT FROM USER WHERE EMAIL')) {
      const email = params[0];
      const user = mockDatabase.users.find(u => u.EMAIL === email);
      return [user ? [{ SALT: user.SALT }] : []];
    }

    if (query.includes('SELECT PASSWORD, EMAIL FROM USER WHERE EMAIL')) {
      const email = params[0];
      const user = mockDatabase.users.find(u => u.EMAIL === email);
      return [user ? [{ PASSWORD: user.PASSWORD, EMAIL: user.EMAIL }] : []];
    }

    return [[]];
  } else {
    return await pool.execute(query, params);
  }
}

// Define auth middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.login) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    environment: isLocalhost ? 'development' : 'production',
    apiUrl: req.apiBase
  });
});

// Auth routes
app.get('/api/auth/pepper', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');

  const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pepper = '';
  for (let i = 0; i < 12; i++) {
    pepper += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  req.session.pepper = pepper;
  res.json({ pepper });
});

app.post('/api/auth/salt', async (req, res) => {
  const { username } = req.body;

  if (!username || username.length > 256) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  try {
    let rows = [];
    if (!isLocalhost) {
      [rows] = await queryDatabase(
        'SELECT SALT FROM USER WHERE EMAIL = ?',
        [username.toLowerCase().trim()]
      );

      if (rows.length === 0) {
        return res.status(404).json({error: 'User not found'});
      }
    } else {
      rows.push({SALT: "salt123"});
    }

    req.session.username = username.toLowerCase().trim();
    req.session.salt = rows[0].SALT;

    res.json({ salt: rows[0].SALT });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { hashedPepperedPassword } = req.body;
  const { username, salt, pepper } = req.session;

  if (!hashedPepperedPassword || !username || !salt || !pepper) {
    console.log('Missing session data:', { hashedPepperedPassword: !!hashedPepperedPassword, username, salt, pepper });
    return res.status(400).json({ error: 'Invalid login attempt' });
  }

  try {
    let rows = [];
    if (!isLocalhost) {
      [rows] = await queryDatabase(
        'SELECT PASSWORD, EMAIL FROM USER WHERE EMAIL = ?',
        [username]
      );

      if (rows.length !== 1) {
        return res.status(401).json({error: 'Authentication failed'});
      }
    } else {
      // Mock DHP: sha256(salt + password) - matching frontend calculation order
      // For test user with password '123456' and salt 'salt123'
      const mockDHP = crypto.createHash('sha256').update('salt123' + '123456').digest('hex');
      rows.push({PASSWORD: mockDHP, EMAIL: 'test@example.com'});
    }

    const storedDHP = rows[0].PASSWORD;
    const email = rows[0].EMAIL;

    const expectedHash = crypto.createHash('sha256')
      .update(storedDHP + pepper)
      .digest('hex');

    console.log('Login attempt for:', username);
    console.log('Expected hash:', expectedHash);
    console.log('Received hash:', hashedPepperedPassword);

    if (expectedHash === hashedPepperedPassword) {
      req.session.login = email;
      req.session.logged_in_at = Math.floor(Date.now() / 1000);

      delete req.session.username;
      delete req.session.salt;
      delete req.session.pepper;

      res.json({ success: true, email });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.login) {
    res.json({
      authenticated: true,
      email: req.session.login,
      logged_in_at: req.session.logged_in_at
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.post('/api/auth/refresh', (req, res) => {
  if (req.session && req.session.login) {
    req.session.logged_in_at = Math.floor(Date.now() / 1000);
    res.json({
      authenticated: true,
      email: req.session.login,
      logged_in_at: req.session.logged_in_at
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Tools API endpoint
app.get('/api/tools', (req, res) => {
  const tools = [
    { id: 'bayes', name: 'Bayes Calculator', description: 'Calculate Bayesian probabilities' },
    { id: 'listclean', name: 'List Cleaner', description: 'Clean and format lists' },
    { id: 'listcomparator', name: 'List Comparator', description: 'Compare two lists' },
    { id: 'listiterator', name: 'List Iterator', description: 'Iterate through list items' },
    { id: 'listrandom', name: 'List Randomizer', description: 'Randomize list order' },
    { id: 'message', name: 'Message Tool', description: 'Send messages' },
    { id: 'pascal', name: 'Pascal Calculator', description: 'Pascal triangle calculations' },
    { id: 'safecron', name: 'Safe Cron', description: 'Manage cron jobs safely' },
    { id: 'taxes', name: 'Tax Calculator', description: 'Calculate taxes' }
  ];
  res.json(tools);
});

// If in local development and external API_URL is specified, set up proxy for external APIs
if (isLocalhost && process.env.API_URL && process.env.API_URL !== 'http://localhost:3000') {
  app.use('/external-api', createProxyMiddleware({
    target: process.env.API_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/external-api': '/api'
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      // Add source header for tracking
      proxyReq.setHeader('X-Source', 'local-proxy');
    }
  }));
  console.log(`Proxying external API requests to ${process.env.API_URL}`);
}

// Catch-all route for SPA
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.includes('.')) {
    if (!req.session || !req.session.login) {
      if (req.path !== '/login') {
        return res.redirect('/login');
      }
    }
  }
  res.sendFile(path.join(__dirname, 'public_html/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running in ${isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION'} mode on port ${PORT}`);
  console.log(`API base URL: ${API_URL || 'Using relative paths'}`);
});
