/**
 * server.js
 * Apprecious Proposal Generator — Express server entry point
 *
 * Start:  node server.js
 * Dev:    npx nodemon server.js
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const session = require('express-session');

const apiRouter = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc:     ["'self'", "fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "https:"],
      connectSrc:  ["'self'"],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Session ──────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'apprecious-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

// ── Auth middleware ──────────────────────────────────────────
const APP_USER = process.env.APP_USERNAME || 'apprecious';
const APP_PASS = process.env.APP_PASSWORD || 'sales2026';

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.redirect('/login');
}

// ── Login routes ─────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === APP_USER && password === APP_PASS) {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ── Static frontend (protected) ──────────────────────────────
app.use(requireAuth, express.static(path.join(__dirname, 'public')));

// ── API routes (protected) ───────────────────────────────────
app.use('/api', requireAuth, apiRouter);

// ── SPA fallback ─────────────────────────────────────────────
app.get('*', requireAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  Apprecious Proposal Generator           ║`);
  console.log(`║  http://localhost:${PORT}                  ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
  console.log(`  Claude API:     ${process.env.ANTHROPIC_API_KEY       ? '✓ Connected'  : '✗ Missing ANTHROPIC_API_KEY'}`);
  console.log(`  Google OAuth:   ${process.env.GOOGLE_REFRESH_TOKEN    ? '✓ Configured' : '✗ Missing GOOGLE_REFRESH_TOKEN'}`);
  console.log(`  Drive Folder:   ${process.env.GOOGLE_DRIVE_FOLDER_ID  ? '✓ Set'        : '⚠ Not set (files saved to root)'}`);
  console.log(`  Sheets Log:     ${process.env.GOOGLE_SHEETS_ID        ? '✓ Set'        : '⚠ Not set (lead logging disabled)'}\n`);
});
