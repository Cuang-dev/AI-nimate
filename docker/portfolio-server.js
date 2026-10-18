import express from 'express';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'portfolio.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Enable Gzip compression & JSON parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Standard Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Helper to get portfolio data
function getPortfolioData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading persistent portfolio data file:', e);
    }
  }
  return null;
}

// Helper to save portfolio data atomically
function savePortfolioData(data) {
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DATA_FILE);
}

// Reverse Proxy: Forward /projects to projects-cuang-nginx container
app.use('/projects', (req, res) => {
  const targetHost = 'projects-cuang-nginx';
  const targetPort = 80;
  const targetPath = `/projects${req.url}`;

  const proxyReq = http.request({
    host: targetHost,
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'projects.cuang.dev'
    }
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Projects Proxy Error]:', err.message);
    res.status(502).send('Projects Nginx Gateway Unavailable');
  });

  req.pipe(proxyReq, { end: true });
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    storage: 'persistent-disk',
    dataFileExists: fs.existsSync(DATA_FILE)
  });
});

app.get('/api/data', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const data = getPortfolioData();
  if (data) {
    return res.json(data);
  }
  res.status(404).json({ error: 'No custom data saved on server yet' });
});

app.post('/api/save', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.personalInfo || !data.skills || !data.projects) {
      return res.status(400).json({ success: false, error: 'Invalid schema' });
    }

    savePortfolioData(data);
    console.log(`[${new Date().toISOString()}] Portfolio data successfully saved to persistent server storage (${DATA_FILE})`);
    return res.json({ 
      success: true, 
      message: 'Portfolio data saved and synchronized to persistent server storage!' 
    });
  } catch (err) {
    console.error('Error saving portfolio data:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Blog Ingestion & Sync Endpoints
app.get('/api/blogs/scan', (req, res) => {
  try {
    const blogsPath = path.join(__dirname, 'src/data/blogs.json');
    if (fs.existsSync(blogsPath)) {
      const posts = JSON.parse(fs.readFileSync(blogsPath, 'utf-8'));
      return res.json({ success: true, count: posts.length, posts });
    }
    const currentData = getPortfolioData();
    if (currentData && currentData.blogs) {
      return res.json({ success: true, count: currentData.blogs.length, posts: currentData.blogs });
    }
    return res.json({ success: true, count: 0, posts: [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/blogs/export', (req, res) => {
  try {
    const post = req.body;
    const currentData = getPortfolioData() || {};
    currentData.blogs = currentData.blogs || [];
    const idx = currentData.blogs.findIndex(b => b.slug === post.slug);
    if (idx >= 0) {
      currentData.blogs[idx] = post;
    } else {
      currentData.blogs.unshift(post);
    }
    savePortfolioData(currentData);
    return res.json({ success: true, message: 'Blog post successfully updated in persistent storage' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Basic Auth Protection for /admin route
const ADMIN_USER = process.env.ADMIN_USER || 'negotiate';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Aq5y3@5RjB&Sec';

app.use((req, res, next) => {
  if (req.path === '/admin' || req.path.startsWith('/admin/')) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Admin Portal"');
      return res.status(401).send('Unauthorized');
    }

    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii');
    const [user, pass] = credentials.split(':');

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Admin Portal"');
    return res.status(401).send('Unauthorized');
  }
  next();
});

// Static files from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA Fallback for all other routes
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Portfolio production server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Persistent storage path: ${DATA_FILE}`);
});
