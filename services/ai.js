/**
 * ai.js
 * Uses Claude to generate content for all 10 proposal slides.
 */

const Anthropic = require('@anthropic-ai/sdk');

let _client;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

async function generateSlideContent(leadData, products) {
  const {
    clientName, company, picPosition, eventPurpose,
    budgetPerSet, quantity, deliveryDeadline, clientBrief,
  } = leadData;

  const productsContext = products.map((p, i) => `
PRODUCT ${i + 1}: ${p.title}
Price: RM${p.price}/set${p.isOnSale ? ` (was RM${p.comparePrice})` : ''}
URL: ${p.url}
Description: ${p.description.slice(0, 350)}${p.description.length > 350 ? '...' : ''}
${p.bulletItems.length > 0 ? `Items/Features:\n${p.bulletItems.slice(0, 8).map(b => `  - ${b}`).join('\n')}` : ''}
`).join('\n---');

  const system = `You are a senior proposal writer at Apprecious, Malaysia's leading sustainable gifting brand.
Your proposals are warm, confident and purpose-driven.
Apprecious brand colours: blue #434eb0, orange #ff8533, beige #FFE9CB.
Apprecious impact pillars: Community (retirees, single mothers, micro-entrepreneurs), Environment (tree adoption, biodegradable materials), Education (B40 students via Sambong Future), Orang Asli solar energy, Healthcare (Picaso Hospital).
Achievements: 50,000+ gifts delivered, 25+ artisans employed, 250+ corporate clients, Malaysia & Singapore delivery.`;

  const prompt = `Generate a complete 10-slide proposal for this lead. Return ONLY valid JSON — no markdown, no extra text.

=== LEAD ===
Client: ${clientName} (${picPosition}) at ${company}
Event: ${eventPurpose}
Budget/set: RM${budgetPerSet}  |  Qty: ${quantity} sets  |  Deadline: ${deliveryDeadline}
${clientBrief ? `Client brief:\n${clientBrief}` : ''}

=== PRODUCTS (from apprecious.com.my, budget RM${budgetPerSet}) ===
${productsContext}

=== REQUIRED JSON STRUCTURE ===
{
  "coverSlide": {
    "proposalTitle": "e.g. 'A Gift That Cares — [Company] Staff Appreciation 2026'",
    "tagline": "Apprecious tagline adapted to this occasion (max 12 words)",
    "occasion": "Clean occasion label e.g. 'Annual Staff Appreciation Day 2026'",
    "preparedFor": "[clientName] · [company]",
    "totalValue": "RM[budgetPerSet × quantity] total"
  },
  "careProgrammeSlide": {
    "occasions": [
      {
        "title": "Internal Employee Appreciation",
        "occasions": "Name 2–3 SPECIFIC upcoming occasions for ${company} employees based on their industry — e.g. if they are a bank: Annual Performance Awards Dinner Q4 2026, Banker's Day, new branch opening staff gifts. If exhibition company: post-event crew appreciation, project milestone celebration. Make it sound like you know their internal calendar.",
        "why": "→ One sentence showing exactly why Apprecious gifts fit ${company}'s employee culture — reference their industry or ESG positioning specifically"
      },
      {
        "title": "Client Retention & VIP Gifting",
        "occasions": "Name 2–3 SPECIFIC client-facing touchpoints for ${company}'s industry — e.g. for exhibition company: exhibitor welcome kits, post-event thank-you for top exhibitors, VIP delegate gifts at flagship events like MIHAS, MREPC, ARCHIDEX or similar Malaysian trade shows their clients attend. Sound informed.",
        "why": "→ One sentence on how sustainable gifting strengthens ${company}'s client relationships in their specific sector"
      },
      {
        "title": "Festive & Cultural Events",
        "occasions": "Name the next 2–3 upcoming Malaysian festive gifting windows relevant to ${company}'s stakeholder mix — be specific with timing e.g. 'Hari Raya Aidiladha (June 2026)', 'National Day / Merdeka (Aug 2026)', 'Deepavali (Oct 2026)', 'Chinese New Year (Jan 2027)'. Pick the ones most relevant to their audience.",
        "why": "→ One sentence tying ${company}'s brand values to Malaysian cultural gifting — mention batik/heritage angle if relevant"
      },
      {
        "title": "Conferences & Corporate Events",
        "occasions": "Name 2–3 REAL upcoming industry events, trade shows, AGMs or summits that ${company} is likely attending or hosting in 2026–2027 — based on their industry. For exhibition companies: MACEOS events, trade exhibitions they manage. For banks: investor days, ESG summits. For tech: tech conferences. Sound like you've done research.",
        "why": "→ One sentence on how Apprecious eco merch becomes a brand statement for ${company} at these specific events"
      }
    ]
  },
  "objectiveSlide": {
    "intro": "2 sentences connecting ${company}'s industry/ESG goals to Apprecious's mission",
    "impactStatement": "One powerful closing sentence naming ${company} specifically"
  },
  "productSlides": [
    {
      "productIndex": 0,
      "headline": "Punchy product headline max 7 words (sell the feeling)",
      "subheadline": "Exact product name from Apprecious",
      "price": "RM XX / set",
      "occasionTag": "Best occasion fit e.g. 'Staff Appreciation · Festive'",
      "giftSetItems": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
      "productUrl": "${products[0]?.url || ''}"
    }
  ]
}

Rules:
- Generate productSlides for ALL ${products.length} products (indices 0–${products.length - 1})
- giftSetItems: list ONLY the physical items in the gift set from the product description (5–8 items). Do NOT include "Product Materials", "Impact Story Card", "Brand Logo", or any placeholder/instruction text — these are separate blank fields on the slide
- occasionTag: pick the 1–2 best occasion fits from: Staff Appreciation, Client Retention, Festive, New Joiner, Conference, VIP Gifting, Merdeka
- Be specific to ${company}'s industry — avoid generic copy
- Product Materials, Impact Story Card, Brand Logo are left blank for sales team to fill in manually`;

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0]?.text || '';
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error('Claude returned non-JSON. Check ANTHROPIC_API_KEY and retry.');
  }

  // Attach live product data to each slide
  if (parsed.productSlides) {
    parsed.productSlides = parsed.productSlides.map((slide, i) => ({
      ...slide,
      productUrl:    products[i]?.url          || slide.productUrl || '',
      primaryImage:  products[i]?.primaryImage  || null,
      actualPrice:   products[i]?.price         || null,
    }));
  }

  return parsed;
}

module.exports = { generateSlideContent };
