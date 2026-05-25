/**
 * auth-setup.js
 * Run this ONCE to get your Google OAuth2 refresh token.
 * The token is saved to .env automatically.
 *
 * Usage:
 *   node auth-setup.js
 *
 * Prerequisites:
 *   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be in your .env file
 *   - http://localhost:3001 must be added as an Authorised redirect URI
 *     in your Google Cloud Console OAuth2 client settings
 */

require('dotenv').config();
const { google } = require('googleapis');
const http       = require('http');
const url        = require('url');
const fs         = require('fs');
const path       = require('path');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3001';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in your .env file first.\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',   // forces Google to return a refresh_token every time
});

console.log('\n─────────────────────────────────────────────────────────');
console.log('  Apprecious Proposal Generator — Google Auth Setup');
console.log('─────────────────────────────────────────────────────────');
console.log('\n1. Open this URL in your browser:\n');
console.log('   ' + authUrl);
console.log('\n2. Log in with the Google account that owns your Drive folder and Sheet.');
console.log('3. Grant all requested permissions.');
console.log('4. You will be redirected to localhost — this script will');
console.log('   capture the code automatically and save the refresh token.\n');

// Start a temporary local server to capture the OAuth redirect
const server = http.createServer(async (req, res) => {
  try {
    const qs = url.parse(req.url, true).query;

    if (qs.error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h2>❌ Auth failed: ' + qs.error + '</h2><p>Close this tab and try again.</p>');
      server.close();
      return;
    }

    if (!qs.code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<p>Waiting for Google redirect...</p>');
      return;
    }

    const { tokens } = await oauth2Client.getToken(qs.code);

    if (!tokens.refresh_token) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h2>⚠️ No refresh token returned.</h2><p>This usually means you already authorised this app before. Go to <a href="https://myaccount.google.com/permissions">Google Account Permissions</a>, remove "Apprecious Proposal Generator", then run this script again.</p>');
      server.close();
      return;
    }

    // Write refresh token to .env
    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
      envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h2>✅ Success! Refresh token saved to .env</h2>
      <p>You can close this tab.</p>
      <p>Now run <code>npm start</code> to launch the app.</p>
    `);

    console.log('\n✅  Refresh token saved to .env successfully!');
    console.log('\nNext step: run  npm start\n');

    server.close();

  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h2>❌ Error: ' + err.message + '</h2>');
    console.error('\n❌ Error getting tokens:', err.message, '\n');
    server.close();
  }
});

server.listen(3001, () => {
  console.log('⏳ Waiting for Google to redirect back to this script...\n');
});
