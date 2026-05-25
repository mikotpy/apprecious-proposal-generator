/**
 * app.js — Apprecious Proposal Generator frontend logic
 */

// ── Budget → Collection label mapping ─────────────────────
const GIFT_SET_TIERS = [
  { max: 50,  label: 'Eco Gift Sets under RM50', url: 'collections/gifts-under-rm50' },
  { max: 100, label: 'Eco Gift Sets under RM100', url: 'collections/gifts-under-rm100' },
  { max: 150, label: 'Eco Gift Sets under RM150', url: 'collections/custom-gift-set-under-rm150' },
  { max: 200, label: 'Eco Gift Sets under RM200', url: 'collections/custom-gift-set-under-rm200' },
  { max: 300, label: 'Eco Gift Sets under RM300', url: 'collections/custom-gift-set-under-rm300' },
];
const MERCH_TIERS = [
  { max: 10,  label: 'Eco Merch under RM10',  url: 'collections/single-gift-and-merchandise-rm10' },
  { max: 20,  label: 'Eco Merch under RM20',  url: 'collections/single-gift-and-merchandise-rm20' },
  { max: 50,  label: 'Eco Merch under RM50',  url: 'collections/single-gift-and-merchandise-rm50' },
  { max: 100, label: 'Eco Merch under RM100', url: 'collections/single-gift-and-merchandise-rm100' },
];
const SOCIAL_IMPACT_TIER  = { label: 'Social Impact Handmade Products', url: 'collections/local-products' };

function getMatchingTier(budget, type) {
  if (type === 'social-impact') return SOCIAL_IMPACT_TIER;
  if (type === 'batik-gift-set') return GIFT_SET_TIERS.find(t => budget <= t.max) || GIFT_SET_TIERS[GIFT_SET_TIERS.length - 1];
  const tiers = type === 'merch' ? MERCH_TIERS : GIFT_SET_TIERS;
  return tiers.find(t => budget <= t.max) || tiers[tiers.length - 1];
}

// ── DOM refs ───────────────────────────────────────────────
const form         = document.getElementById('proposalForm');
const submitBtn    = document.getElementById('submitBtn');
const statusPanel  = document.getElementById('statusPanel');
const successPanel = document.getElementById('successPanel');
const errorPanel   = document.getElementById('errorPanel');
const budgetPreview= document.getElementById('budgetPreview');
const slidesLink   = document.getElementById('slidesLink');
const successSub   = document.getElementById('successSub');
const errorMsg     = document.getElementById('errorMsg');

// ── Radio product type ─────────────────────────────────────
document.querySelectorAll('input[name="productType"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.querySelectorAll('.radio-option').forEach(el => el.classList.remove('selected'));
    radio.closest('.radio-option').classList.add('selected');
    updateBudgetPreview();
  });
});

// ── Budget preview chip ────────────────────────────────────
function updateBudgetPreview() {
  const budget   = parseFloat(document.getElementById('budgetPerSet').value);
  const quantity = parseInt(document.getElementById('quantity').value, 10);
  const type     = document.querySelector('input[name="productType"]:checked')?.value || 'gift-set';

  if (!budget || budget < 1) {
    budgetPreview.textContent = '';
    return;
  }

  const tier  = getMatchingTier(budget, type);
  const total = budget && quantity ? ` · Total: RM${(budget * quantity).toLocaleString()}` : '';

  budgetPreview.innerHTML = `
    🗂 Products from: <strong>${tier.label}</strong>
    &nbsp;·&nbsp;
    <a href="https://www.apprecious.com.my/${tier.url}" target="_blank" rel="noopener" style="color:var(--green-dark);font-size:11px;">View collection ↗</a>
    ${total ? `<span style="color:var(--text-sub)">${total}</span>` : ''}
  `;
}

document.getElementById('budgetPerSet').addEventListener('input', updateBudgetPreview);
document.getElementById('quantity').addEventListener('input', updateBudgetPreview);

// ── Step progress helpers ──────────────────────────────────
function setStep(n, state, descText) {
  const step = document.getElementById(`step${n}`);
  const ind  = document.getElementById(`ind${n}`);
  const desc = document.getElementById(`desc${n}`);
  const spinner  = ind.querySelector('.spinner');
  const stepNum  = ind.querySelector('.step-num');

  step.classList.remove('active', 'done');
  ind.classList.remove('active', 'done', 'pending');

  if (state === 'active') {
    step.classList.add('active');
    ind.classList.add('active');
    spinner.hidden = false;
    stepNum.style.display = 'none';
  } else if (state === 'done') {
    step.classList.add('done');
    ind.classList.add('done');
    spinner.hidden = true;
    stepNum.style.display = '';
  } else {
    ind.classList.add('pending');
    spinner.hidden = true;
    stepNum.style.display = '';
  }

  if (descText) desc.textContent = descText;
}

function showStatus()  { statusPanel.hidden  = false; successPanel.hidden = true; errorPanel.hidden = true; }
function showSuccess() { successPanel.hidden = false; statusPanel.hidden  = true; errorPanel.hidden = true; }
function showError()   { errorPanel.hidden   = false; statusPanel.hidden  = true; successPanel.hidden = true; }
function hideAll()     { statusPanel.hidden = successPanel.hidden = errorPanel.hidden = true; }

// ── Form submit ────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  const budgetNum   = parseFloat(data.budgetPerSet);
  const quantityNum = parseInt(data.quantity, 10);

  // Basic client-side validation
  if (isNaN(budgetNum) || budgetNum < 10) {
    alert('Please enter a valid budget (minimum RM10).');
    return;
  }
  if (isNaN(quantityNum) || quantityNum < 1) {
    alert('Please enter a valid quantity (minimum 1).');
    return;
  }

  // Disable form
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Generating…';

  showStatus();
  setStep(1, 'active', 'Connecting to apprecious.com.my and matching your budget...');
  setStep(2, 'pending');
  setStep(3, 'pending');

  // Scroll to status
  statusPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Simulate step progression (API call does all 3 steps server-side,
  // so we advance indicators on a timer to reflect real activity)
  const step2Timer = setTimeout(() => {
    setStep(1, 'done', 'Products fetched successfully');
    setStep(2, 'active', 'Claude is drafting ESG copy for each slide...');
  }, 4000);

  const step3Timer = setTimeout(() => {
    setStep(2, 'done', 'AI content generated');
    setStep(3, 'active', 'Building your 9-slide Google Slides presentation...');
  }, 18000);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    clearTimeout(step2Timer);
    clearTimeout(step3Timer);

    // Session expired — redirect to login
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Unknown server error');
    }

    // Success
    setStep(1, 'done');
    setStep(2, 'done');
    setStep(3, 'done', 'Presentation created!');

    slidesLink.href = json.slidesUrl;
    successSub.textContent = `${json.productsCount} product slides generated for ${data.company} · ${data.quantity} sets @ RM${data.budgetPerSet}/set`;

    setTimeout(() => showSuccess(), 600);

  } catch (err) {
    clearTimeout(step2Timer);
    clearTimeout(step3Timer);
    errorMsg.textContent = err.message;
    showError();
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent = 'Generate Proposal';
  }
});

// ── New proposal button ────────────────────────────────────
document.getElementById('newProposalBtn')?.addEventListener('click', () => {
  hideAll();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('retryBtn')?.addEventListener('click', () => {
  hideAll();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── Init ───────────────────────────────────────────────────
updateBudgetPreview();

// Set min date for delivery deadline to today
const deadlineInput = document.getElementById('deliveryDeadline');
if (deadlineInput) {
  const today = new Date();
  deadlineInput.min = today.toISOString().split('T')[0];
}
