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

// ── Static frontend ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ───────────────────────────────────────────────
app.use('/api', apiRouter);

// ── SPA fallback ─────────────────────────────────────────────
app.get('*', (_req, res) => {
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
