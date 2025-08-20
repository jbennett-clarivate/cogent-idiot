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

const isGoDaddy = process.env.HOSTING_PROVIDER === 'godaddy';
const isLocalhost = !isGoDaddy;
const app = express();

if (!isLocalhost) {
  if (!isGoDaddy) {
    app.set('trust proxy', 1);  }
}

const FileStore = require('session-file-store')(session);

const PORT = process.env.PORT || 3000;

let pool;
const API_URL = process.env.API_URL || (isLocalhost ? 'http://localhost:3000' : '');

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

const corsOptions = {
  origin: isLocalhost ?
    ['http://localhost:4200', 'http://localhost:3000'] :    process.env.ALLOWED_ORIGIN || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};

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

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'default_secret_for_development',
  resave: true,  saveUninitialized: true,
  rolling: true,  cookie: {
    secure: false,    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'  }
};

if (isGoDaddy || !isLocalhost) {
  sessionConfig.store = new FileStore({
    path: './sessions',
    ttl: 86400,    retries: 2,
    reapInterval: 3600,    logFn: function(message) {
      console.log('FileStore:', message);
    }
  });
  console.log('Using FileStore for session management');
} else {
  console.log('Using default MemoryStore for session management');
}

app.use(session(sessionConfig));

app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', JSON.stringify(req.session, null, 2));
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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

app.use((req, res, next) => {
  req.apiBase = isLocalhost ? API_URL : '';
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

/**
 * Compares two strings in a safe manner, handling null or undefined values.
 * @param str1 - The first string to compare.
 * @param str2 - The second string to compare.
 * @param caseSensitive - Whether the comparison should be case-sensitive.
 * @returns True if the strings are equal, false otherwise.
 */
function safeStringCompare(str1, str2, caseSensitive = false) {
	if (str1 === null || str2 === null) {
		return str1 === str2;
	}

	const s1 = String(str1);
	const s2 = String(str2);

	return caseSensitive ? s1 === s2 : s1.toLowerCase() === s2.toLowerCase();
}

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

const requireAuth = (req, res, next) => {
  if (req.session && req.session.login) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    environment: isLocalhost ? 'development' : 'production',
    apiUrl: req.apiBase,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/pepper', (req, res) => {
  console.log('=== PEPPER REQUEST START ===');
  console.log('Session before pepper generation:', JSON.stringify(req.session, null, 2));
  console.log('Session ID:', req.sessionID);
  
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
  console.log('Generated pepper:', pepper);
  console.log('Session after pepper storage:', JSON.stringify(req.session, null, 2));
  
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Session save failed' });
    }
    
    console.log('Pepper session saved successfully');
    console.log('=== PEPPER REQUEST END ===');
    res.json({ pepper });
  });
});

app.post('/api/auth/salt', async (req, res) => {
  console.log('=== SALT REQUEST START ===');
  console.log('Request body:', req.body);
  console.log('Session before salt lookup:', JSON.stringify(req.session, null, 2));
  console.log('Session ID:', req.sessionID);
  
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
      const slt = "salt123";
      console.info("Mock salt: " + slt);
      rows.push({SALT: slt});
    }

    req.session.username = username.toLowerCase().trim();
    req.session.salt = rows[0].SALT;
    
    console.log('Session after storing username and salt:', JSON.stringify(req.session, null, 2));
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      
      console.log('Session saved successfully');
      console.log('=== SALT REQUEST END ===');
      res.json({ salt: rows[0].SALT });
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  console.log('=== LOGIN REQUEST START ===');
  console.log('Request body:', req.body);
  console.log('Session before login:', JSON.stringify(req.session, null, 2));
  
  const { hashedPepperedPassword } = req.body;
  const { username, salt, pepper } = req.session;

  console.log('Extracted session values:', { username, salt, pepper: pepper ? 'present' : 'missing' });

  if (!hashedPepperedPassword || !username || !salt || !pepper) {
    console.log('Missing session data:', { 
      hashedPepperedPassword: !!hashedPepperedPassword, 
      username: username || 'missing', 
      salt: salt || 'missing', 
      pepper: pepper || 'missing',
      sessionID: req.sessionID,
      fullSession: req.session
    });
    return res.status(400).json({ error: 'Invalid login attempt - session data missing' });
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

	  if (safeStringCompare(expectedHash, hashedPepperedPassword)) {
		  req.session.login = email;
		  req.session.logged_in_at = Math.floor(Date.now() / 1000);

		  delete req.session.username;
		  delete req.session.salt;
		  delete req.session.pepper;

		  console.log('Login successful, session after cleanup:', JSON.stringify(req.session, null, 2));
		  res.json({success: true, email});
	  } else {
		  console.log('Password hash mismatch');
		  res.status(401).json({error: 'Authentication failed'});
	  }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
  
  console.log('=== LOGIN REQUEST END ===');
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

app.get('/api/tools', (req, res) => {
  const tools = [
    { id: 'bayes', name: 'Bayes Calculator', description: 'Calculate Bayesian probabilities' },
    { id: 'listclean', name: 'List Cleaner', description: 'Clean and format lists' },
    { id: 'listcomparator', name: 'List Comparator', description: 'Compare two lists' },
    { id: 'listiterator', name: 'List Iterator', description: 'Iterate through list items' },
    { id: 'listrandom', name: 'List Randomizer', description: 'Randomize list order' },
    { id: 'message', name: 'TZ Tool', description: 'Send messages' },
    { id: 'pascal', name: 'Pascal Calculator', description: 'Pascal triangle calculations' },
    { id: 'safecron', name: 'Safe Cron', description: 'Manage cron jobs safely' },
    { id: 'taxes', name: 'Tax Calculator', description: 'Calculate taxes' }
  ];
  res.json(tools);
});

if (isLocalhost && process.env.API_URL && process.env.API_URL !== 'http://localhost:3000') {
  app.use('/external-api', createProxyMiddleware({
    target: process.env.API_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/external-api': '/api'
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('X-Source', 'local-proxy');
    }
  }));
  console.log(`Proxying external API requests to ${process.env.API_URL}`);
}

app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.get('*', (req, res) => {
  console.log(`Catch-all route hit: ${req.path}`);
  
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  if (!req.session || !req.session.login) {
    if (req.path !== '/login') {
      return res.redirect('/login');
    }
  }
  
  const indexPath = path.join(__dirname, 'public_html/index.html');
  console.log(`Serving index.html from: ${indexPath}`);
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
  console.log(`Server running in ${isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION'} mode on port ${PORT}`);
  console.log(`API base URL: ${API_URL || 'Using relative paths'}`);
  console.log(`Trust proxy enabled: ${app.get('trust proxy')}`);
});