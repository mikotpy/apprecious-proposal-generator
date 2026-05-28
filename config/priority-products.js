/**
 * priority-products.js
 * ─────────────────────────────────────────────────────────────
 * Priority product URLs organised by category and budget tier.
 * These products appear FIRST in proposals before the website
 * collection fills the remaining slots.
 *
 * HOW TO UPDATE:
 *   1. Find the product on apprecious.com.my
 *   2. Copy its URL and paste it into the correct category + budget tier below
 *   3. Save, commit, and push to GitHub — Render redeploys automatically
 *
 * STRUCTURE:
 *   Each category has budget tiers: 50, 100, 150, 200
 *   Products are picked from the tier that matches the proposal budget.
 *   e.g. budget RM80 → uses tier 100 (below RM100)
 */

const PRIORITY_PRODUCTS = {

  // ── Eco Gift Sets ───────────────────────────────────────────
  // Form: "Eco Gift Sets" — Eco Items Only + Packaging + Festive
  'gift-set': {
    50: [
      'https://www.apprecious.com.my/products/daily-eco-work-essential-gift-set',
      'https://www.apprecious.com.my/products/nature-friendly-companion-kit',
      'https://www.apprecious.com.my/products/the-eco-productivity-kit',
      'https://www.apprecious.com.my/products/laminated-jute-and-canvas-bag',
      'https://www.apprecious.com.my/products/dupont-paper-batik-canvas-tote-bag',
      'https://www.apprecious.com.my/products/reusable-egg-basket-for-gift-packaging',
      'https://www.apprecious.com.my/products/reusable-fabric-batik-tote-bag-red',
    ],
    100: [
      'https://www.apprecious.com.my/products/sustainable-wooden-bamboo-desk-gift-set',
      'https://www.apprecious.com.my/products/green-gourmet-gift-basket',
      'https://www.apprecious.com.my/products/sleek-sustainable-everyday-corporate-gift-set',
      'https://www.apprecious.com.my/products/amazing-batik-tote-bag',
    ],
    150: [
      'https://www.apprecious.com.my/products/tradition-meets-modern-bamboo-gift-set',
      'https://www.apprecious.com.my/products/sustainable-leadership-welcome-gift-set',
      'https://www.apprecious.com.my/products/values-in-action-leadership-gift-set',
      'https://www.apprecious.com.my/products/care-the-pause-collection-gift-set-1',
      'https://www.apprecious.com.my/products/malaysia-unity-celebration-gift-basket',
      'https://www.apprecious.com.my/products/kongsi-raya-wellness-crate',
    ],
    200: [
      'https://www.apprecious.com.my/products/care-eco-essentials-gift-set',
      'https://www.apprecious.com.my/products/the-bamboo-signature-executive-gift-set',
      'https://www.apprecious.com.my/products/travel-with-purpose-leadership-kit',
      'https://www.apprecious.com.my/products/workday-companion-gift-set',
      'https://www.apprecious.com.my/products/modern-day-sustainable-essentials',
      'https://www.apprecious.com.my/products/kampung-moments-collection-batik-gift-basket',
      'https://www.apprecious.com.my/products/kongsi-raya-cultural-feast-tiffin',
    ],
  },

  // ── Batik + Eco Gift Set ────────────────────────────────────
  // Form: "Batik + Eco Gift Set" — Batik Eco Modern + Batik VIP
  'batik-gift-set': {
    50: [
      'https://www.apprecious.com.my/products/small-batik-gift-set-malaysia',
    ],
    100: [
      'https://www.apprecious.com.my/products/green-gourmet-gift-basket',
      'https://www.apprecious.com.my/products/i-love-malaysia-community-gift-bag',
      'https://www.apprecious.com.my/products/batik-goodies-gift-box',
      'https://www.apprecious.com.my/products/malaysia-exclusive-batik-nasi-lemak-set',
      'https://www.apprecious.com.my/products/batik-malaysia-gift-bundle-package',
      'https://www.apprecious.com.my/products/the-eco-productivity-kit',
      'https://www.apprecious.com.my/products/malaysian-batik-heritage-gift-set',
    ],
    150: [
      'https://www.apprecious.com.my/products/batik-harmony-corporate-collection',
      'https://www.apprecious.com.my/products/celebrate-her-wellness-lifestyle-gift-set',
      'https://www.apprecious.com.my/products/malaysia-unity-celebration-gift-basket',
      'https://www.apprecious.com.my/products/malaysian-batik-heritage-gift-set',
      'https://www.apprecious.com.my/products/tradition-meets-modern-bamboo-gift-set',
    ],
    200: [
      'https://www.apprecious.com.my/products/malaysian-heritage-food-culture-gift-set',
      'https://www.apprecious.com.my/products/kampung-moments-collection-batik-gift-basket',
    ],
  },

  // ── Social Impact Products ──────────────────────────────────
  // Form: "Social Impact Products" — Social Impact Door Gifts
  'social-impact': {
    50: [
      'https://www.apprecious.com.my/products/handmade-batik-luggage-tag',
      'https://www.apprecious.com.my/products/premium-leather-batik-passport-holder',
      'https://www.apprecious.com.my/products/batik-malaysia-nasi-lemak-gift-bag',
      'https://www.apprecious.com.my/products/batik-small-multi-purpose-bag',
      'https://www.apprecious.com.my/products/batik-2-in-1-coaster-and-bookmark',
      'https://www.apprecious.com.my/products/batik-passport-holder',
      'https://www.apprecious.com.my/products/reusable-batik-cup-holder',
    ],
    100: [
      'https://www.apprecious.com.my/products/premium-batik-lanyard-card-holder',
      'https://www.apprecious.com.my/products/journey-of-resilience-batik-notebook',
      'https://www.apprecious.com.my/products/batik-pen-holder-keychain',
      'https://www.apprecious.com.my/products/amazing-batik-tote-bag',
    ],
    150: [],
    200: [],
  },

  // ── Eco Merchandise ─────────────────────────────────────────
  // Form: "Eco Merch" — Single eco items
  'merch': {
    50: [
      'https://www.apprecious.com.my/products/batik-unity-ceramic-cork-coaster',
      'https://www.apprecious.com.my/products/kongsi-raya-seed-paper-money-packet',
      'https://www.apprecious.com.my/products/rpet-multi-compartment-tech-bag',
      'https://www.apprecious.com.my/products/journey-of-resilience-batik-notebook',
      'https://www.apprecious.com.my/products/high-heat-resistant-glass-lunch-box-with-wooden-lid',
      'https://www.apprecious.com.my/products/biodegrable-stone-material-pen',
      'https://www.apprecious.com.my/products/cork-cover-small-notebook-with-ball-pen',
    ],
    100: [
      'https://www.apprecious.com.my/products/eco-friendly-bamboo-wireless-mouse',
      'https://www.apprecious.com.my/products/wheat-straw-and-bamboo-phone-holder',
      'https://www.apprecious.com.my/products/4-in-1-eco-bamboo-coaster',
      'https://www.apprecious.com.my/products/borosilicate-glass-bottle-with-eco-sleeve-pouch',
      'https://www.apprecious.com.my/products/biodegradable-cork-mouse-pad-with-wireless-charging',
      'https://www.apprecious.com.my/products/2-in-1-bamboo-stationery-holder-with-wireless-charging',
      'https://www.apprecious.com.my/products/rpet-cover-notebook-grey',
    ],
    150: [],
    200: [],
  },

  // ── Gadget ──────────────────────────────────────────────────
  // Form: "Gadget" — Tech & gadget items
  'gadget': {
    50: [
      'https://www.apprecious.com.my/products/5-in-1-cable-connector-in-bamboo-case',
      'https://www.apprecious.com.my/products/4-in-1-cable-connector',
      'https://www.apprecious.com.my/products/3-in-1-magsafe-travel-wireless-charger',
      'https://www.apprecious.com.my/products/magnetic-everything-kit',
    ],
    100: [
      'https://www.apprecious.com.my/products/5w-magnetic-magsafe-wireless-speaker',
      'https://www.apprecious.com.my/products/eco-friendly-bamboo-wireless-mouse',
      'https://www.apprecious.com.my/products/biodegradable-cork-mouse-pad-with-wireless-charging',
      'https://www.apprecious.com.my/products/2-in-1-bamboo-stationery-holder-with-wireless-charging',
    ],
    150: [],
    200: [],
  },

};

module.exports = { PRIORITY_PRODUCTS };
