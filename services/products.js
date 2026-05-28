/**
 * products.js
 * Fetches live product data from apprecious.com.my using
 * Shopify's public /collections/{handle}/products.json endpoint.
 * No API key needed — it's publicly accessible.
 */

const BASE = 'https://www.apprecious.com.my';
const { PRIORITY_PRODUCTS } = require('../config/priority-products');

// ── Budget → Collection handle mapping ──────────────────────
// Two product types: curated gift sets and single eco merch.
const GIFT_SET_COLLECTIONS = [
  { max: 50,  handle: 'gifts-under-rm50' },
  { max: 100, handle: 'gifts-under-rm100' },
  { max: 150, handle: 'custom-gift-set-under-rm150' },
  { max: 200, handle: 'custom-gift-set-under-rm200' },
  { max: 300, handle: 'custom-gift-set-under-rm300' },
];

const MERCH_COLLECTIONS = [
  { max: 10,  handle: 'single-gift-and-merchandise-rm10' },
  { max: 20,  handle: 'single-gift-and-merchandise-rm20' },
  { max: 50,  handle: 'single-gift-and-merchandise-rm50' },
  { max: 100, handle: 'single-gift-and-merchandise-rm100' },
];

/**
 * Returns the Shopify collection handle for a given budget and product type.
 * Falls back to the highest tier if budget exceeds all tiers.
 */
// Social Impact: handmade batik local products (fixed collection, no budget tiers)
const SOCIAL_IMPACT_HANDLE = 'local-products';

// Batik + Eco Gift Set: same tiered budget collections as gift-set
const BATIK_GIFT_SET_COLLECTIONS = GIFT_SET_COLLECTIONS;

function resolveHandle(budget, type = 'gift-set') {
  if (type === 'social-impact') return SOCIAL_IMPACT_HANDLE;
  if (type === 'batik-gift-set') {
    const tier = BATIK_GIFT_SET_COLLECTIONS.find(t => budget <= t.max) || BATIK_GIFT_SET_COLLECTIONS[BATIK_GIFT_SET_COLLECTIONS.length - 1];
    return tier.handle;
  }
  // Gadget uses the same merch collections (single items, same price tiers)
  const tiers = (type === 'merch' || type === 'gadget') ? MERCH_COLLECTIONS : GIFT_SET_COLLECTIONS;
  const tier = tiers.find(t => budget <= t.max) || tiers[tiers.length - 1];
  return tier.handle;
}

/**
 * Returns the priority product URLs for a given type and budget.
 * Handles both the new budget-tier object format and legacy array format.
 */
function getPriorityUrls(type, budget) {
  const entry = PRIORITY_PRODUCTS[type];
  if (!entry) return [];
  // Legacy flat array
  if (Array.isArray(entry)) return entry;
  // Budget-tier object — find the matching tier
  const tiers = [50, 100, 150, 200, 300];
  const tier = tiers.find(t => budget <= t) || tiers[tiers.length - 1];
  return entry[tier] || [];
}

/**
 * Strips HTML tags from Shopify body_html descriptions.
 */
function stripHtml(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|li|div|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts a raw Shopify product object into our simplified format.
 */
function normaliseProduct(p, handle) {
  const price        = parseFloat(p.variants?.[0]?.price || 0);
  const comparePrice = parseFloat(p.variants?.[0]?.compare_at_price || 0);
  const images       = (p.images || []).slice(0, 2).map(img => img.src);
  const desc         = stripHtml(p.body_html);
  const bulletLines  = desc
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && (l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.match(/^\d+\./)));

  return {
    id:               p.id,
    title:            p.title,
    handle:           p.handle,
    url:              `${BASE}/products/${p.handle}`,
    price,
    comparePrice,
    isOnSale:         comparePrice > price,
    description:      desc,
    bulletItems:      bulletLines.map(l => l.replace(/^[•\-*\d.]+\s*/, '').trim()),
    images,
    primaryImage:     images[0] || null,
    secondaryImage:   images[1] || null,
    collectionHandle: handle || p.handle,
    collectionUrl:    `${BASE}/collections/${handle || ''}`,
  };
}

/**
 * Fetches a single product by its handle or full URL.
 * Returns null if not found or unavailable.
 */
async function fetchProductByUrl(productUrl) {
  try {
    const handle = productUrl.replace(/.*\/products\//, '').replace(/[?#].*/, '').trim();
    if (!handle) return null;
    const res = await fetch(`${BASE}/products/${handle}.json`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'AppreciousProposalBot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.product) return null;
    const p = data.product;
    // Skip if completely sold out
    if (p.variants?.every(v => v.available === false)) return null;
    return normaliseProduct(p, null);
  } catch {
    return null; // silently skip failed priority products
  }
}

/**
 * Fetches up to `count` products from the budget-matched collection,
 * with priority products appearing first (newest-first for the rest).
 *
 * @param {number} budget      - Budget per set in MYR
 * @param {'gift-set'|'merch'|'social-impact'|'batik-gift-set'} type
 * @param {number} count       - How many products to return (default 7)
 */
async function fetchProducts(budget, type = 'gift-set', count = 7) {
  const handle = resolveHandle(budget, type);

  // ── Step 1: Fetch priority products for this category ────────
  const priorityUrls = getPriorityUrls(type, budget).slice(0, count);
  const priorityProducts = [];

  if (priorityUrls.length > 0) {
    const fetched = await Promise.all(priorityUrls.map(fetchProductByUrl));
    fetched.forEach(p => { if (p) priorityProducts.push(p); });
  }

  // If priority products already fill all slots, return them
  if (priorityProducts.length >= count) {
    return priorityProducts.slice(0, count);
  }

  // ── Step 2: Fill remaining slots from collection (newest first) ─
  const remaining = count - priorityProducts.length;
  const priorityIds = new Set(priorityProducts.map(p => p.id));

  const url = `${BASE}/collections/${handle}/products.json?limit=20&sort_by=created-descending`;
  let data;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'AppreciousProposalBot/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    throw new Error(`Failed to fetch products from Apprecious (${handle}): ${err.message}`);
  }

  const collectionProducts = (data.products || [])
    .filter(p => p.variants?.some(v => v.available !== false))
    .filter(p => !priorityIds.has(p.id))   // exclude already-included priority products
    .slice(0, remaining)
    .map(p => normaliseProduct(p, handle));

  return [...priorityProducts, ...collectionProducts];
}

/**
 * Returns human-readable collection name for a given budget.
 */
function getCollectionLabel(budget, type = 'gift-set') {
  const handle = resolveHandle(budget, type);
  return handle.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

module.exports = { fetchProducts, resolveHandle, getCollectionLabel };
