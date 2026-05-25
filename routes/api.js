/**
 * routes/api.js
 * POST /api/generate — full proposal generation pipeline
 * GET  /api/health   — health check
 */

const express = require('express');
const router  = express.Router();

const { fetchProducts }       = require('../services/products');
const { generateSlideContent } = require('../services/ai');
const { createProposal }      = require('../services/slides');
const { logLead }             = require('../services/sheets');

// ── Validation helper ────────────────────────────────────────
function validate(body) {
  const required = ['clientName', 'company', 'picPosition', 'eventPurpose', 'budgetPerSet', 'quantity', 'deliveryDeadline'];
  const missing  = required.filter(k => !body[k] || String(body[k]).trim() === '');
  return missing;
}

// ── Health check ─────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    googleAccount: !!process.env.GOOGLE_REFRESH_TOKEN,
    driveFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    sheetsId: !!process.env.GOOGLE_SHEETS_ID,
  });
});

// ── Main generation endpoint ─────────────────────────────────
router.post('/generate', async (req, res) => {
  // Validate
  const missing = validate(req.body);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  const leadData = {
    clientName:       String(req.body.clientName).trim(),
    company:          String(req.body.company).trim(),
    picPosition:      String(req.body.picPosition).trim(),
    eventPurpose:     String(req.body.eventPurpose).trim(),
    budgetPerSet:     parseFloat(req.body.budgetPerSet),
    quantity:         parseInt(req.body.quantity, 10),
    deliveryDeadline: String(req.body.deliveryDeadline).trim(),
    clientBrief:      String(req.body.clientBrief || '').trim(),
    productType:      req.body.productType || 'gift-set',
  };

  console.log(`[api] Generating proposal for ${leadData.company} (${leadData.clientName}) — RM${leadData.budgetPerSet}/set × ${leadData.quantity}`);

  try {
    // Step 1 — Fetch matching products from Apprecious
    console.log('[api] Step 1/3: Fetching products from apprecious.com.my...');
    const products = await fetchProducts(leadData.budgetPerSet, leadData.productType, 7);

    if (products.length === 0) {
      return res.status(502).json({ error: 'No products found for this budget range. Check the website or try a different budget.' });
    }

    console.log(`[api] Fetched ${products.length} products`);

    // Step 2 — Generate slide content with Claude
    console.log('[api] Step 2/3: Generating AI slide content...');
    const slideContent = await generateSlideContent(leadData, products);

    // Step 3 — Create Google Slides
    console.log('[api] Step 3/3: Creating Google Slides presentation...');
    const slidesUrl = await createProposal(leadData, products, slideContent);

    // Log lead to Google Sheets (non-blocking)
    logLead(leadData, slidesUrl).catch(err => console.error('[api] Sheet log error:', err));

    console.log(`[api] Done! Slides URL: ${slidesUrl}`);
    return res.json({ success: true, slidesUrl, productsCount: products.length });

  } catch (err) {
    console.error('[api] Generation error:', err);

    // User-friendly error messages
    let userMessage = err.message;
    if (err.message?.includes('ANTHROPIC') || err.message?.includes('Claude')) {
      userMessage = 'AI generation failed. Check your ANTHROPIC_API_KEY and try again.';
    } else if (err.message?.includes('Google') || err.message?.includes('googleapis')) {
      userMessage = 'Google Slides creation failed. Check your OAuth credentials and Drive folder permissions.';
    } else if (err.message?.includes('fetch') || err.message?.includes('apprecious')) {
      userMessage = 'Could not reach apprecious.com.my. Check your internet connection and try again.';
    }

    return res.status(500).json({ error: userMessage });
  }
});

module.exports = router;
