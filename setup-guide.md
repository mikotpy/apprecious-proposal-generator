# Apprecious Proposal Generator — Setup & Deploy Guide

A one-click AI proposal tool for the Apprecious sales team. Fill in a lead form → get a fully formatted, ESG-aligned Google Slides deck in ~30 seconds.

---

## What It Does

1. **Fetches live products** from apprecious.com.my matching the client's budget (Shopify public JSON API)
2. **Generates slide copy** using Claude (Anthropic) — ESG pillars, product headlines, materials, why-this-client notes
3. **Creates a Google Slides deck** (9 slides: cover, objective, 7 product slides) via the Google Slides API
4. **Logs each lead** to a Google Sheet for CRM tracking

---

## Prerequisites

- Node.js 18+ installed
- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- A Google Cloud project with:
  - Google Slides API enabled
  - Google Drive API enabled
  - Google Sheets API enabled
  - A Service Account with a JSON key

---

## Step 1 — Install dependencies

```bash
cd apprecious-proposal-generator
npm install
```

---

## Step 2 — Set up Google Cloud (one-time)

### 2a. Create a Google Cloud project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "Apprecious Tools")

### 2b. Enable APIs
In your project, enable all three:
- Google Slides API
- Google Drive API
- Google Sheets API

(Search for each in the API Library and click Enable)

### 2c. Create a Service Account
1. Go to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Name it `apprecious-proposal-bot`
4. Role: **Editor**
5. Click **Done**
6. Click the service account → **Keys → Add Key → JSON**
7. Download the JSON file

### 2d. Share your Google Drive folder
1. Create a folder in Google Drive where proposals will be saved (e.g. "Apprecious Proposals")
2. Share that folder with the service account email (e.g. `apprecious-proposal-bot@your-project.iam.gserviceaccount.com`)
3. Copy the folder ID from the URL: `drive.google.com/drive/folders/THIS_IS_THE_ID`

### 2e. Create the leads Google Sheet
1. Create a new Google Sheet (e.g. "Apprecious Leads Log")
2. Share it with the service account email
3. Copy the sheet ID from the URL: `docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit`

---

## Step 3 — Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
ANTHROPIC_API_KEY=sk-ant-...

GOOGLE_SERVICE_ACCOUNT_EMAIL=apprecious-proposal-bot@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----\n"

GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUv
GOOGLE_SHEETS_ID=1AbCdEfGhIjKlMnOpQrStUv

PORT=3000
```

**Tip for GOOGLE_PRIVATE_KEY:** Open the downloaded JSON key, copy the `private_key` field value (including `-----BEGIN...-----END...`), and paste it as-is (with the `\n` characters intact).

---

## Step 4 — Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Check the terminal — it will show green ✓ for each connected service.

---

## Step 5 — Deploy to the web (free options)

### Option A: Render.com (recommended)
1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node server.js`
6. Add all `.env` values under **Environment Variables**
7. Deploy

Your app will be live at `https://your-app.onrender.com`

### Option B: Railway
1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Add environment variables
3. Railway auto-detects Node.js and deploys

### Option C: Fly.io
```bash
npm install -g flyctl
fly auth login
fly launch
fly secrets set ANTHROPIC_API_KEY=... GOOGLE_SERVICE_ACCOUNT_EMAIL=... # etc.
fly deploy
```

---

## How the sales team uses it

1. Open the web app URL
2. Fill in: client name, company, PIC position, event purpose, budget/set, quantity, deadline
3. Optionally paste WhatsApp/email notes in "Client Brief"
4. Click **Generate Proposal** (~30 seconds)
5. Click **Open in Google Slides** → share directly or download as .pptx

### Editing the generated deck
The Google Slides deck is fully editable:
- Swap product images (drag from your PhotoRoom/Drive swipe file)
- Edit any text directly
- Change ESG highlights per client
- Add/remove slides

---

## Slide Structure

| # | Slide | Content |
|---|-------|---------|
| 1 | Cover | Client name, company, occasion, total value, delivery date |
| 2 | Objective | ESG pillars mapped to client's industry, impact statement |
| 3–9 | Products | Half-image / half-text: headline, key materials, gift set items, environmental impact, price |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ANTHROPIC_API_KEY` error | Check your key at console.anthropic.com |
| Google Slides 403 | Make sure the Drive folder is shared with the service account email |
| No products found | The budget may be outside the supported ranges (RM10–RM300). Try RM50, RM100, RM150, RM200, or RM300. |
| Products fetch timeout | Check internet connectivity; apprecious.com.my may be temporarily slow |

---

## Budget → Collection Mapping

| Budget | Gift Set Collection | Merch Collection |
|--------|---------------------|------------------|
| ≤ RM50  | gifts-under-rm50 | single-gift-and-merchandise-rm10/rm20/rm50 |
| ≤ RM100 | gifts-under-rm100 | single-gift-and-merchandise-rm100 |
| ≤ RM150 | custom-gift-set-under-rm150 | — |
| ≤ RM200 | custom-gift-set-under-rm200 | — |
| ≤ RM300 | custom-gift-set-under-rm300 | — |

---

*Built with Node.js, Claude (Anthropic), Google Slides API · apprecious.com.my*
