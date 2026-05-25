/**
 * slides.js
 * Creates a 10-slide Apprecious proposal using the Google Slides API.
 *
 * Slide order:
 *   1. Cover
 *   2. Corporate Care Programme
 *   3. Impact & Objective (5 pillars)
 *   4–10. Product slides × 7
 *
 * Brand colours:
 *   Blue   #434eb0   Light blue  #eef0fb
 *   Orange #ff8533   Light orange #fff4ea
 *   Beige  #FFE9CB
 */

const { google } = require('googleapis');

// ── Brand colours ────────────────────────────────────────────
const C = {
  blue:        { red: 0.263, green: 0.306, blue: 0.690 },  // #434eb0
  blueDark:    { red: 0.208, green: 0.247, blue: 0.627 },  // #353fa0
  blueLight:   { red: 0.933, green: 0.941, blue: 0.984 },  // #eef0fb
  orange:      { red: 1.000, green: 0.522, blue: 0.200 },  // #ff8533
  orangeLight: { red: 1.000, green: 0.957, blue: 0.918 },  // #fff4ea
  orangeDark:  { red: 0.702, green: 0.322, blue: 0.000 },  // #b35200
  beige:       { red: 1.000, green: 0.914, blue: 0.796 },  // #FFE9CB
  beigeDark:   { red: 0.941, green: 0.831, blue: 0.627 },  // #f0d4a0
  white:       { red: 1,     green: 1,     blue: 1     },
  offWhite:    { red: 0.980, green: 0.992, blue: 0.976 },
  darkText:    { red: 0.102, green: 0.102, blue: 0.102 },  // #1a1a1a
  subText:     { red: 0.333, green: 0.333, blue: 0.333 },  // #555555
  lightBorder: { red: 0.867, green: 0.867, blue: 0.867 },  // #dddddd
};

// ── Canvas: 16:9 standard ────────────────────────────────────
const W = 9144000;   // 10 inches in EMU
const H = 5143500;   // 5.625 inches in EMU

// ── Auth ─────────────────────────────────────────────────────
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

// ── EMU helpers ──────────────────────────────────────────────
const pt  = n => ({ magnitude: n * 12700, unit: 'EMU' });
const emu = n => ({ magnitude: n, unit: 'EMU' });

function pos(x, y, w, h) {
  return {
    size:      { width: emu(w), height: emu(h) },
    transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'EMU' },
  };
}

// ── ID counter ───────────────────────────────────────────────
let _id = 0;
const uid = p => `${p}_${++_id}`;

// ── Request builders ─────────────────────────────────────────
function addSlide(idx) {
  return { createSlide: { insertionIndex: idx, slideLayoutReference: { predefinedLayout: 'BLANK' } } };
}

function shape(pageId, objId, type, x, y, w, h) {
  return { createShape: { objectId: objId, shapeType: type, elementProperties: { pageObjectId: pageId, ...pos(x, y, w, h) } } };
}
const textBox = (p, id, x, y, w, h) => shape(p, id, 'TEXT_BOX', x, y, w, h);
const rect    = (p, id, x, y, w, h) => shape(p, id, 'RECTANGLE', x, y, w, h);

function text(id, t) { return { insertText: { objectId: id, insertionIndex: 0, text: t } }; }

function textStyle(id, style, si = 0, ei) {
  const range = ei != null ? { type: 'FIXED_RANGE', startIndex: si, endIndex: ei } : { type: 'ALL' };
  return { updateTextStyle: { objectId: id, textRange: range, style, fields: Object.keys(style).join(',') } };
}

function paraStyle(id, style, si = 0, ei) {
  const range = ei != null ? { type: 'FIXED_RANGE', startIndex: si, endIndex: ei } : { type: 'ALL' };
  return { updateParagraphStyle: { objectId: id, textRange: range, style, fields: Object.keys(style).join(',') } };
}

function fillRect(id, color) {
  return {
    updateShapeProperties: {
      objectId: id,
      shapeProperties: {
        shapeBackgroundFill: { solidFill: { color: { rgbColor: color } } },
        outline: { propertyState: 'NOT_RENDERED' },
      },
      fields: 'shapeBackgroundFill,outline',
    },
  };
}

function fillPage(slideId, color) {
  return {
    updatePageProperties: {
      objectId: slideId,
      pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: color } } } },
      fields: 'pageBackgroundFill',
    },
  };
}

function image(pageId, objId, url, x, y, w, h) {
  return { createImage: { objectId: objId, url, elementProperties: { pageObjectId: pageId, ...pos(x, y, w, h) } } };
}

function noOutline(id) {
  return {
    updateShapeProperties: {
      objectId: id,
      shapeProperties: { outline: { propertyState: 'NOT_RENDERED' } },
      fields: 'outline',
    },
  };
}

// Shorthand: styled text box
function tb(reqs, pageId, prefix, x, y, w, h, content, { size = 10, bold = false, italic = false, color = C.darkText, align = 'START', font } = {}) {
  const id = uid(prefix);
  const style = { fontSize: pt(size), bold, italic, foregroundColor: { opaqueColor: { rgbColor: color } } };
  if (font) style.fontFamily = font;
  reqs.push(textBox(pageId, id, x, y, w, h));
  reqs.push(noOutline(id));
  // Only insert text and styles if content is non-empty — empty strings cause API errors
  if (content && content.trim().length > 0) {
    reqs.push(text(id, content));
    reqs.push(textStyle(id, style));
    reqs.push(paraStyle(id, { alignment: align }));
  }
  return id;
}

// ── SLIDE 1: Cover ───────────────────────────────────────────
function buildCover(slideId, cv, lead) {
  const R = [];
  R.push(fillPage(slideId, C.white));

  // White top bar
  const topBar = uid('cv_top');
  R.push(rect(slideId, topBar, 0, 0, W, 600000));
  R.push(fillRect(topBar, C.white));

  // Blue bottom border on header
  const topBorder = uid('cv_top_border');
  R.push(rect(slideId, topBorder, 0, 590000, W, 18000));
  R.push(fillRect(topBorder, C.blue));

  // Apprecious logo image (full colour on white)
  R.push(image(slideId, uid('cv_logo_img'),
    'https://www.apprecious.com.my/cdn/shop/files/Apprecious_full_logo_prew.jpg?v=1728427519',
    120000, 80000, 1400000, 430000));

  // Tagline right side of top bar (now in blue, on white bg)
  tb(R, slideId, 'cv_tag', W - 3000000, 210000, 2800000, 220000,
    'Delivering CARE Moments That Matter',
    { size: 9, italic: true, color: C.blue, align: 'END' });

  // Pre-title label
  tb(R, slideId, 'cv_pre', 400000, 700000, W - 800000, 180000,
    'CORPORATE CARE PROGRAMME PROPOSAL',
    { size: 8, bold: true, color: C.orange, align: 'CENTER' });

  // Main title
  tb(R, slideId, 'cv_title', 400000, 920000, W - 800000, 750000,
    cv.proposalTitle || `A Gift That Cares — ${lead.company}`,
    { size: 26, bold: true, color: C.darkText, align: 'CENTER', font: 'Montserrat' });

  // Orange divider
  const div = uid('cv_div');
  R.push(rect(slideId, div, W / 2 - 600000, 1750000, 1200000, 20000));
  R.push(fillRect(div, C.orange));

  // Tagline / occasion
  tb(R, slideId, 'cv_tag2', 400000, 1820000, W - 800000, 220000,
    cv.tagline || 'Sustainable gifts that matter',
    { size: 11, italic: true, color: C.blue, align: 'CENTER' });

  // Prepared for
  tb(R, slideId, 'cv_for', 400000, 2100000, W - 800000, 200000,
    `Prepared for: ${cv.preparedFor || lead.clientName + ' · ' + lead.company}`,
    { size: 10, color: C.subText, align: 'CENTER' });

  // Occasion + value pill background
  const pillBg = uid('cv_pill_bg');
  R.push(rect(slideId, pillBg, W / 2 - 1400000, 2370000, 2800000, 240000));
  R.push(fillRect(pillBg, C.blueLight));

  tb(R, slideId, 'cv_pill_txt', W / 2 - 1350000, 2390000, 2700000, 200000,
    `${cv.occasion || lead.eventPurpose}  ·  ${cv.totalValue || `RM${lead.budgetPerSet} × ${lead.quantity} sets`}`,
    { size: 9.5, bold: true, color: C.blue, align: 'CENTER' });

  // Delivery date
  tb(R, slideId, 'cv_dl', 400000, 2680000, W - 800000, 160000,
    `Delivery by: ${lead.deliveryDeadline}`,
    { size: 9, color: C.subText, align: 'CENTER' });

  // Beige bottom strip
  const btm = uid('cv_btm');
  R.push(rect(slideId, btm, 0, H - 310000, W, 310000));
  R.push(fillRect(btm, C.beige));

  // Orange accent line above strip
  const accentLine = uid('cv_accent');
  R.push(rect(slideId, accentLine, 0, H - 316000, W, 16000));
  R.push(fillRect(accentLine, C.orange));

  tb(R, slideId, 'cv_btm_txt', 200000, H - 270000, W - 400000, 200000,
    'apprecious.com.my  ·  Purpose-driven gifts for people & planet',
    { size: 8, color: C.orangeDark, align: 'CENTER' });

  return R;
}

// ── SLIDE 2: Corporate Care Programme ────────────────────────
function buildCareProgramme(slideId, cp, lead) {
  const R = [];
  R.push(fillPage(slideId, C.white));

  // Blue header
  const hdr = uid('cp_hdr');
  R.push(rect(slideId, hdr, 0, 0, W, 820000));
  R.push(fillRect(hdr, C.blue));

  tb(R, slideId, 'cp_h1', 280000, 80000, W - 560000, 360000,
    'Proposal: Corporate Care Programme',
    { size: 18, bold: true, color: C.white, font: 'Montserrat' });

  tb(R, slideId, 'cp_h2', 280000, 490000, W - 560000, 230000,
    'Purpose-driven gifts aligned to your corporate calendar — each occasion, an opportunity to show you care',
    { size: 9, italic: true, color: { red: 0.80, green: 0.84, blue: 0.95 } });

  // 4 occasion cards in 2×2 grid
  const cards = cp.occasions || [
    { icon: '👥', title: 'Internal Employee Appreciation', occasions: 'Year-end gala · New joiner kits · Birthday recognition · Service milestones', why: '→ Eco gift sets that make employees feel valued while reinforcing your ESG commitments' },
    { icon: '🤝', title: 'Client Retention & VIP Gifting', occasions: 'Partnership anniversaries · Client appreciation dinners · Strategic account touchpoints', why: '→ Premium batik & heritage sets that tell a Malaysian brand story clients won\'t forget' },
    { icon: '🎊', title: 'Festive & Cultural Events', occasions: 'Hari Raya · Chinese New Year · Deepavali · National Day (Merdeka)', why: '→ Handcrafted batik sets honouring Malaysian heritage, made by local artisans' },
    { icon: '🏛', title: 'Conferences & Corporate Events', occasions: 'AGM · Industry summits · ESG reporting launch · Product launches', why: '→ Branded eco merch that doubles as take-home proof of your sustainability narrative' },
  ];

  const cardW = (W - 160000) / 2 - 60000;
  const cardH = (H - 820000 - 420000) / 2 - 60000;
  const positions = [
    [80000,  820000 + 60000],
    [80000 + cardW + 120000, 820000 + 60000],
    [80000,  820000 + 60000 + cardH + 120000],
    [80000 + cardW + 120000, 820000 + 60000 + cardH + 120000],
  ];

  cards.slice(0, 4).forEach((card, i) => {
    const [cx, cy] = positions[i];

    // Card background
    const cardBg = uid(`cp_card_bg_${i}`);
    R.push(rect(slideId, cardBg, cx, cy, cardW, cardH));
    R.push(fillRect(cardBg, C.blueLight));

    // Orange left accent bar
    const accent = uid(`cp_accent_${i}`);
    R.push(rect(slideId, accent, cx, cy, 22000, cardH));
    R.push(fillRect(accent, C.orange));

    const tx = cx + 60000;
    const tw = cardW - 80000;

    tb(R, slideId, `cp_ev_${i}`, tx, cy + 60000, tw, 200000,
      card.title, { size: 10, bold: true, color: C.blue });

    tb(R, slideId, `cp_occ_${i}`, tx, cy + 280000, tw, 340000,
      card.occasions, { size: 7.5, color: C.subText });

    tb(R, slideId, `cp_why_${i}`, tx, cy + 650000, tw, 280000,
      card.why, { size: 7.5, bold: true, color: C.orangeDark });
  });

  // Beige footer
  const foot = uid('cp_foot');
  R.push(rect(slideId, foot, 0, H - 360000, W, 360000));
  R.push(fillRect(foot, C.beige));

  tb(R, slideId, 'cp_foot_txt', 280000, H - 310000, W - 560000, 260000,
    `Every product in this proposal has been selected to serve one or more of the above occasions — creating a unified Corporate Care Programme for ${lead.company}.`,
    { size: 8, italic: true, color: C.orangeDark, align: 'CENTER' });

  return R;
}

// ── SLIDE 3: Our Purpose ─────────────────────────────────────
function buildImpact(slideId, obj) {
  const R = [];
  const half = W / 2;
  R.push(fillPage(slideId, C.white));

  // ── Left panel: empty image placeholder ──────────────────────
  const leftBg = uid('ob_lbg');
  R.push(rect(slideId, leftBg, 0, 0, half, H));
  R.push(fillRect(leftBg, C.beige));

  // Placeholder hint text centred on left panel
  tb(R, slideId, 'ob_img_hint', 100000, H / 2 - 200000, half - 200000, 400000,
    '[ Add image here ]',
    { size: 11, italic: true, color: C.beigeDark, align: 'CENTER' });

  // Orange accent line on right edge of left panel
  const leftEdge = uid('ob_ledge');
  R.push(rect(slideId, leftEdge, half - 14000, 0, 14000, H));
  R.push(fillRect(leftEdge, C.orange));

  // ── Right panel: "Our Purpose" ────────────────────────────────
  // Blue header strip
  const rHdr = uid('ob_rhdr');
  R.push(rect(slideId, rHdr, half, 0, half, 640000));
  R.push(fillRect(rHdr, C.blue));

  tb(R, slideId, 'ob_title', half + 200000, 150000, half - 350000, 360000,
    'Our Purpose',
    { size: 24, bold: true, color: C.white, font: 'Montserrat' });

  // Orange underline accent
  const accent = uid('ob_accent');
  R.push(rect(slideId, accent, half + 200000, 660000, 500000, 18000));
  R.push(fillRect(accent, C.orange));

  // Split intro into two paragraphs at nearest sentence break after midpoint
  const introText = obj.intro || 'Apprecious is Malaysia\'s purpose-driven gifting brand — where every gift creates real impact for communities, the environment, and the lives of everyday Malaysians.';
  const mid = Math.floor(introText.length / 2);
  const splitAt = introText.indexOf('. ', mid);
  const para1 = (splitAt > -1 && splitAt < introText.length * 0.82)
    ? introText.slice(0, splitAt + 1).trim()
    : introText;
  const para2 = (splitAt > -1 && splitAt < introText.length * 0.82)
    ? introText.slice(splitAt + 2).trim()
    : '';

  // Paragraph 1
  tb(R, slideId, 'ob_p1', half + 200000, 740000, half - 350000, 1550000,
    para1, { size: 13, color: C.darkText });

  // Paragraph 2 (if content exists)
  if (para2) {
    tb(R, slideId, 'ob_p2', half + 200000, 2440000, half - 350000, 1550000,
      para2, { size: 13, color: C.darkText });
  }

  // Divider line
  const div = uid('ob_div');
  R.push(rect(slideId, div, half + 200000, 4120000, half - 400000, 8000));
  R.push(fillRect(div, C.lightBorder));

  // Impact statement — clearly above footer
  tb(R, slideId, 'ob_impact', half + 200000, 4170000, half - 350000, 580000,
    obj.impactStatement || 'When you choose Apprecious, your brand becomes part of a larger story.',
    { size: 9.5, italic: true, color: C.blue });

  // Blue footer strip
  const foot = uid('ob_foot');
  R.push(rect(slideId, foot, half, H - 160000, half, 160000));
  R.push(fillRect(foot, C.blue));

  tb(R, slideId, 'ob_foot_txt', half + 200000, H - 138000, half - 350000, 118000,
    'apprecious.com.my',
    { size: 7.5, color: C.white });

  return R;
}

// ── SLIDES 4–10: Product slides ───────────────────────────────
function buildProductSlide(slideId, slide, index) {
  const R = [];
  const half = W / 2;

  // Left panel — beige image area
  const leftBg = uid(`pd_lbg_${index}`);
  R.push(rect(slideId, leftBg, 0, 0, half, H));
  R.push(fillRect(leftBg, C.beige));

  // Option label strip — sits ABOVE the image on the beige panel
  const optLabelH = 220000;
  tb(R, slideId, `pd_opt_${index}`, 60000, 60000, half - 120000, optLabelH,
    `OPTION ${index + 1}`,
    { size: 17, bold: true, color: C.darkText, font: 'Montserrat' });

  // Product image starts below the option label
  const imgTop = optLabelH + 40000;
  if (slide.primaryImage) {
    try {
      R.push(image(slideId, uid(`pd_img_${index}`), slide.primaryImage, 50000, imgTop, half - 100000, H - imgTop - 50000));
    } catch { /* fall through to placeholder */ }
  } else {
    const phBg = uid(`pd_ph_${index}`);
    R.push(rect(slideId, phBg, 100000, imgTop, half - 200000, H - imgTop - 400000));
    R.push(fillRect(phBg, C.white));
    tb(R, slideId, `pd_ph_txt_${index}`, 100000, H / 2, half - 200000, 300000,
      'Product image', { size: 10, color: C.lightBorder, align: 'CENTER' });
  }

  // Occasion tag (bottom of left panel)
  if (slide.occasionTag) {
    const tagBg = uid(`pd_tag_bg_${index}`);
    const tagW = Math.min(slide.occasionTag.length * 90000 + 300000, half - 200000);
    R.push(rect(slideId, tagBg, (half - tagW) / 2, H - 310000, tagW, 200000));
    R.push(fillRect(tagBg, C.orange));
    tb(R, slideId, `pd_tag_txt_${index}`, (half - tagW) / 2 + 30000, H - 295000, tagW - 60000, 170000,
      slide.occasionTag, { size: 7.5, bold: true, color: C.white, align: 'CENTER' });
  }

  // ── Right panel ──────────────────────────────────────────────
  const rightX = half;
  const M = 150000;   // margin
  const TW = half - 2 * M;

  // Blue header
  const rHdr = uid(`pd_rhdr_${index}`);
  R.push(rect(slideId, rHdr, rightX, 0, half, 730000));
  R.push(fillRect(rHdr, C.blue));

  tb(R, slideId, `pd_rh_${index}`, rightX + M, 60000, TW, 380000,
    slide.headline || slide.subheadline || 'Product highlight',
    { size: 13, bold: true, color: C.white, font: 'Montserrat' });

  tb(R, slideId, `pd_rs_${index}`, rightX + M, 460000, TW, 220000,
    slide.subheadline || '',
    { size: 8, italic: true, color: { red: 1, green: 1, blue: 1 } });

  let curY = 820000;
  const lblColor = C.blue;
  const GAP = 100000;   // space between sections

  // ── Section: Product Materials (label + blank space, no grey box) ──
  tb(R, slideId, `pd_mat_lbl_${index}`, rightX + M, curY, TW, 130000,
    'PRODUCT MATERIALS', { size: 6.5, bold: true, color: lblColor });
  curY += 350000;  // label + generous blank writing space

  // Divider
  const div1 = uid(`pd_div1_${index}`);
  R.push(rect(slideId, div1, rightX + M, curY, TW, 8000));
  R.push(fillRect(div1, C.lightBorder));
  curY += GAP;

  // ── Section: Gift Set Includes ────────────────────────────────────
  tb(R, slideId, `pd_gi_lbl_${index}`, rightX + M, curY, TW, 130000,
    'GIFT SET INCLUDES', { size: 6.5, bold: true, color: lblColor });
  curY += 160000;

  const items = (slide.giftSetItems || []).slice(0, 8);
  const colH = 140000;
  const half2 = TW / 2;
  items.forEach((item, ii) => {
    const col = ii % 2;
    const row = Math.floor(ii / 2);
    const ix = rightX + M + col * half2;
    const iy = curY + row * colH;
    tb(R, slideId, `pd_item_${index}_${ii}`, ix, iy, half2 - 20000, colH,
      `• ${item}`, { size: 7.5, color: C.subText });
  });
  curY += Math.ceil(items.length / 2) * colH + GAP;

  // Divider
  const div2 = uid(`pd_div2_${index}`);
  R.push(rect(slideId, div2, rightX + M, curY, TW, 8000));
  R.push(fillRect(div2, C.lightBorder));
  curY += GAP;

  // ── Section: Impact Story Card (label + blank space, no grey box) ─
  tb(R, slideId, `pd_imp_lbl_${index}`, rightX + M, curY, TW, 130000,
    'IMPACT STORY CARD', { size: 6.5, bold: true, color: lblColor });
  curY += 320000;  // label + generous blank writing space

  // Divider
  const div3 = uid(`pd_div3_${index}`);
  R.push(rect(slideId, div3, rightX + M, curY, TW, 8000));
  R.push(fillRect(div3, C.lightBorder));
  curY += GAP;

  // ── Section: Brand Logo (label only, blank space beside) ─────────
  tb(R, slideId, `pd_logo_lbl_${index}`, rightX + M, curY, TW, 130000,
    'BRAND LOGO', { size: 6.5, bold: true, color: lblColor });

  // ── Orange footer with price ────────────────────────────────
  const foot = uid(`pd_foot_${index}`);
  R.push(rect(slideId, foot, rightX, H - 340000, half, 340000));
  R.push(fillRect(foot, C.orange));

  tb(R, slideId, `pd_price_${index}`, rightX + M, H - 300000, TW * 0.55, 260000,
    slide.price || (slide.actualPrice ? `RM${slide.actualPrice} / set` : 'Price on request'),
    { size: 18, bold: true, color: C.white, font: 'Montserrat' });

  tb(R, slideId, `pd_url_${index}`, rightX + M + TW * 0.55, H - 260000, TW * 0.45, 180000,
    'apprecious.com.my', { size: 7.5, color: { red: 1, green: 1, blue: 1 }, align: 'END' });

  return R;
}

// ── Main entry: createProposal ────────────────────────────────
async function createProposal(leadData, products, slideContent) {
  const auth = getAuth();
  const slides = google.slides({ version: 'v1', auth });
  const drive  = google.drive({ version: 'v3', auth });

  // Create blank presentation
  const createRes = await slides.presentations.create({
    requestBody: {
      title: `Apprecious Proposal — ${leadData.company} — ${new Date().toLocaleDateString('en-MY')}`,
    },
  });

  const presentationId = createRes.data.presentationId;
  const defaultSlideId = createRes.data.slides[0].objectId;

  // Add 9 more slides (total 10: 1 default + 9 new)
  const addRequests = [];
  for (let i = 1; i < 10; i++) addRequests.push(addSlide(i));

  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests: addRequests },
  });

  // Get all slide IDs
  const pRes = await slides.presentations.get({ presentationId });
  const slideIds = pRes.data.slides.map(s => s.objectId);

  // Delete default placeholder text boxes ("Click to add title/subtitle")
  const deletePlaceholderReqs = [];
  pRes.data.slides.forEach(slide => {
    (slide.pageElements || []).forEach(el => {
      if (el.shape && el.shape.placeholder) {
        deletePlaceholderReqs.push({ deleteObject: { objectId: el.objectId } });
      }
    });
  });
  if (deletePlaceholderReqs.length > 0) {
    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: { requests: deletePlaceholderReqs },
    });
  }

  // Build all content requests
  const contentRequests = [
    ...buildCover(slideIds[0], slideContent.coverSlide || {}, leadData),
    ...buildCareProgramme(slideIds[1], slideContent.careProgrammeSlide || {}, leadData),
    ...buildImpact(slideIds[2], slideContent.objectiveSlide || {}),
  ];

  const productSlides = (slideContent.productSlides || []).slice(0, 7);
  productSlides.forEach((ps, i) => {
    if (slideIds[i + 3]) {
      contentRequests.push(...buildProductSlide(slideIds[i + 3], ps, i));
    }
  });

  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests: contentRequests },
  });

  // Move to Drive folder if set
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    await drive.files.update({
      fileId: presentationId,
      addParents: process.env.GOOGLE_DRIVE_FOLDER_ID,
      removeParents: 'root',
      fields: 'id,parents',
    });
  }

  return `https://docs.google.com/presentation/d/${presentationId}/edit`;
}

module.exports = { createProposal };
