# ⚙️ Startup Ops Toolkit

**Google Sheets + Apps Script automations for early-stage teams.**
No paid tools. No integrations. Just scripts you copy, paste, and own.

🔗 **[startup-ops-toolkit →](https://nikhil-thomas-a.github.io/startup-ops-toolkit/)**

---

## What it is

A growing collection of Google Workspace automation templates built for founders, operators, and Delivery PMs at early-stage startups. Every tool is a single Apps Script file — paste it into your Sheet, run the setup function, and it works.

---

## Tools

### 📧 Multi Mail Shooter — `live`
Personalised email outreach at scale, straight from a Google Sheet.

- Use `{{Column Name}}` placeholders in your subject and body
- Live status column: `Pending → Sent / Failed / Replied`
- Delay throttling to avoid Gmail spam filters
- Test mode — logs without sending
- Custom menu added directly to your Sheet

**Use it for:** cold outreach, investor updates, partner emails, event invites

---

### 📄 Document Generator — `live`
One row in a Sheet = one fully populated Google Doc, saved to Drive automatically.

- Works with any Google Doc template
- Supports unlimited `{{placeholder}}` variables
- Saves generated Docs to a specified Drive folder
- Writes the Doc URL back to the sheet row
- Skips already-generated rows automatically

**Use it for:** offer letters, NDAs, client briefs, onboarding packs, invoices

---

### 📊 Weekly KPI Emailer — `live`
Auto-sends a formatted HTML KPI digest every Monday morning.

- RAG status (🟢 On Track / 🟡 Watch / 🔴 Off Track) per metric
- Week-on-week % change arrows calculated automatically
- Fully configurable: add any KPIs, set targets, change recipients in 5 lines
- `setWeeklyTrigger()` schedules sends in one click — runs forever after that
- "Send Now (Test)" option in the Sheet menu for manual sends

**Use it for:** weekly team standups, investor updates, OKR tracking, board reports

---

### 🧑‍💼 Hiring Pipeline Tracker — `coming soon`
Stage changes in your pipeline trigger candidate emails automatically.

---

## How to use any tool

1. Open the site → click the tool → go to the **Apps Script** tab
2. Copy the full script
3. Open your Google Sheet → `Extensions → Apps Script`
4. Paste and save (`Ctrl+S`)
5. Run `setupSheet()` once to create the sheet structure
6. Fill in your data and run the main function — or let the trigger handle it

Each tool has a step-by-step guide on the site.

---

## Tech stack

| Layer | What |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Inline styles — no CSS framework |
| Hosting | GitHub Pages |
| Automations | Google Apps Script (vanilla JS, no dependencies) |
| Fonts | Playfair Display, DM Mono, DM Sans |

---

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

The site deploys automatically via GitHub Actions on every push to `main`.

---

## Roadmap

- [x] Multi Mail Shooter
- [x] Document Generator
- [x] Weekly KPI Emailer
- [ ] Hiring Pipeline Tracker + Auto-Responder
- [ ] Invoice Generator + PDF Sender
- [ ] Meeting Notes → Action Item Distributor
- [ ] Startup Dashboard (Sheets → live metrics page)

---

## Built by

**Nikhil Thomas A** — Delivery PM & Fractional Head of Data

🔗 [Portfolio](https://nikhil-thomas-a.github.io/portfolio/) · [PM AI Hub](https://nikhil-thomas-a.github.io/pm-ai-hub/) · [LinkedIn](https://www.linkedin.com/in/nikhil-thomas-a-58538117a/)
