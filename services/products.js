/**
 * products.js
 * Fetches live product data from apprecious.com.my using
 * Shopify's public /collections/{handle}/products.json endpoint.
 * No API key needed — it's publicly accessible.
 */

const BASE = 'https://www.apprecious.com.my';

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
  const tiers = type === 'merch' ? MERCH_COLLECTIONS : GIFT_SET_COLLECTIONS;
  const tier = tiers.find(t => budget <= t.max) || tiers[tiers.length - 1];
  return tier.handle;
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
 * Fetches up to `count` products from the budget-matched collection.
 * Returns an array of simplified product objects.
 *
 * @param {number} budget      - Budget per set in MYR
 * @param {'gift-set'|'merch'} type
 * @param {number} count       - How many products to return (default 7 for 7 product slides)
 */
async function fetchProducts(budget, type = 'gift-set', count = 7) {
  const handle = resolveHandle(budget, type);
  const url = `${BASE}/collections/${handle}/products.json?limit=${Math.min(count + 3, 20)}`;

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

  // Filter out sold-out variants where possible, then take the first `count`
  const products = (data.products || [])
    .filter(p => p.variants?.some(v => v.available !== false))
    .slice(0, count);

  return products.map(p => {
    const price = parseFloat(p.variants?.[0]?.price || 0);
    const comparePrice = parseFloat(p.variants?.[0]?.compare_at_price || 0);

    // Pick the first two images
    const images = (p.images || []).slice(0, 2).map(img => img.src);

    // Extract bullet-point items from description (lines starting with • or -)
    const desc = stripHtml(p.body_html);
    const bulletLines = desc
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && (l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.match(/^\d+\./)));

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      url: `${BASE}/products/${p.handle}`,
      price,
      comparePrice,
      isOnSale: comparePrice > price,
      description: desc,
      bulletItems: bulletLines.map(l => l.replace(/^[•\-*\d.]+\s*/, '').trim()),
      images,
      primaryImage: images[0] || null,
      secondaryImage: images[1] || null,
      collectionHandle: handle,
      collectionUrl: `${BASE}/collections/${handle}`,
    };
  });
}

/**
 * Returns human-readable collection name for a given budget.
 */
function getCollectionLabel(budget, type = 'gift-set') {
  const handle = resolveHandle(budget, type);
  return handle.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

module.exports = { fetchProducts, resolveHandle, getCollectionLabel };
