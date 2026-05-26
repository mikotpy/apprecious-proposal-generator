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

  // ── Slide customisation options ────────────────────────────
  const selectedOccasions = ['employee', 'client', 'festive', 'conference']
    .filter(k => req.body[`occ_${k}`]);
  const occList = selectedOccasions.length > 0 ? selectedOccasions : ['employee', 'client', 'festive', 'conference'];

  const websiteSlideCount = Math.min(Math.max(parseInt(req.body.websiteSlideCount) || 7, 0), 7);
  const customSlideCount  = Math.min(Math.max(parseInt(req.body.customSlideCount)  || 0, 0), 7);
  const websiteNoImage    = !!req.body.websiteNoImage;

  // Parse custom slide details
  const customSlides = [];
  for (let i = 0; i < customSlideCount; i++) {
    customSlides.push({
      productName: String(req.body[`custom_${i}_name`] || `Custom Product ${i + 1}`).trim(),
      giftItems:   String(req.body[`custom_${i}_items`] || '').split('\n').map(l => l.trim()).filter(Boolean),
      noImage:     !!req.body[`custom_${i}_noImage`],
    });
  }

  console.log(`[api] Generating proposal for ${leadData.company} (${leadData.clientName}) — RM${leadData.budgetPerSet}/set × ${leadData.quantity}`);
  console.log(`[api] Occasions: ${occList.join(', ')} | Website slides: ${websiteSlideCount} | Custom slides: ${customSlideCount}`);

  try {
    // Step 1 — Fetch matching products from Apprecious
    console.log('[api] Step 1/3: Fetching products from apprecious.com.my...');
    const websiteProducts = websiteSlideCount > 0
      ? await fetchProducts(leadData.budgetPerSet, leadData.productType, websiteSlideCount)
      : [];

    if (websiteProducts.length === 0 && customSlideCount === 0) {
      return res.status(502).json({ error: 'No products found for this budget range. Add custom slides or try a different budget.' });
    }

    // Build custom product objects (for AI context + slide building)
    const customProductObjects = customSlides.map((cs, i) => ({
      id:               `custom_${i}`,
      title:            cs.productName,
      handle:           '',
      url:              'https://www.apprecious.com.my',
      price:            leadData.budgetPerSet,
      description:      cs.giftItems.join(', '),
      bulletItems:      cs.giftItems,
      images:           [],
      primaryImage:     null,
      isCustom:         true,
      noImage:          cs.noImage,
    }));

    // Website products marked with noImage flag if option selected
    const markedWebsiteProducts = websiteProducts.map(p => ({ ...p, noImage: websiteNoImage }));
    const allProducts = [...markedWebsiteProducts, ...customProductObjects];

    console.log(`[api] Total products: ${allProducts.length} (${websiteProducts.length} website + ${customProductObjects.length} custom)`);

    // Step 2 — Generate slide content with Claude
    console.log('[api] Step 2/3: Generating AI slide content...');
    const slideContent = await generateSlideContent(leadData, allProducts, { selectedOccasions: occList });

    // Step 3 — Create Google Slides
    console.log('[api] Step 3/3: Creating Google Slides presentation...');
    const slidesUrl = await createProposal(leadData, allProducts, slideContent);

    // Log lead to Google Sheets (non-blocking)
    logLead(leadData, slidesUrl).catch(err => console.error('[api] Sheet log error:', err));

    console.log(`[api] Done! Slides URL: ${slidesUrl}`);
    return res.json({ success: true, slidesUrl, productsCount: allProducts.length });

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
