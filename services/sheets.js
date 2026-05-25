/**
 * sheets.js
 * Logs each lead submission to a Google Sheet for CRM tracking.
 * Creates the header row automatically on first use.
 */

const { google } = require('googleapis');

const HEADERS = [
  'Timestamp', 'Client Name', 'Company', 'PIC Position', 'Event Purpose',
  'Budget/Set (RM)', 'Quantity', 'Delivery Deadline', 'Client Brief', 'Slides URL',
];

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001'
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
}

/**
 * Appends a lead row to the configured Google Sheet.
 * Creates the header row if the sheet is empty.
 */
async function logLead(leadData, slidesUrl) {
  const sheetsId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetsId) {
    console.warn('[sheets] GOOGLE_SHEETS_ID not set — skipping lead log');
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });

    // Check if sheet is empty (needs headers)
    const check = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsId,
      range: 'Sheet1!A1:A2',
    });

    const isEmpty = !check.data.values || check.data.values.length === 0;

    const rows = [];
    if (isEmpty) rows.push(HEADERS);

    rows.push([
      new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
      leadData.clientName    || '',
      leadData.company       || '',
      leadData.picPosition   || '',
      leadData.eventPurpose  || '',
      leadData.budgetPerSet  || '',
      leadData.quantity      || '',
      leadData.deliveryDeadline || '',
      leadData.clientBrief   || '',
      slidesUrl              || '',
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetsId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    console.log(`[sheets] Logged lead for ${leadData.company}`);
  } catch (err) {
    // Don't fail the whole request if sheet logging fails
    console.error('[sheets] Failed to log lead:', err.message);
  }
}

module.exports = { logLead };
