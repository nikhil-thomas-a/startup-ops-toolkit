import { useState, useEffect } from "react";

// ── THEMES ─────────────────────────────────────────────────────
const LIGHT = {
  bg:"#F5F2EC", surface:"#EDE8DF", card:"#FFFFFF",
  border:"#DDD6C8", borderDark:"#BFB8A8",
  ink:"#1C1810", inkMid:"#5C5448", inkSoft:"#9C9080",
  green:"#1A7A4A", greenLight:"#E8F5EE", greenDim:"rgba(26,122,74,0.1)",
  amber:"#B06800", amberLight:"#FFF4E0",
  blue:"#1A4A8A",  blueLight:"#EAF0FA",
  coral:"#C8402A", coralLight:"#FAEAE7",
  isDark:false,
  mono:"'DM Mono', monospace", serif:"'Playfair Display', serif", sans:"'DM Sans', sans-serif",
};
const DARK = {
  bg:"#111210", surface:"#1C1E1A", card:"#232620",
  border:"#2E3028", borderDark:"#3E4238",
  ink:"#E8E4DC", inkMid:"#A8A49C", inkSoft:"#6A6860",
  green:"#2EAB68", greenLight:"#0D2A1C", greenDim:"rgba(46,171,104,0.12)",
  amber:"#E89A20", amberLight:"#2A1E08",
  blue:"#4A8AE8",  blueLight:"#0A1828",
  coral:"#E85A40", coralLight:"#2A0F08",
  isDark:true,
  mono:"'DM Mono', monospace", serif:"'Playfair Display', serif", sans:"'DM Sans', sans-serif",
};

// ── APP SCRIPTS ────────────────────────────────────────────────
const MAIL_SCRIPT = `/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         STARTUP OPS TOOLKIT — Multi Mail Shooter        ║
 * ║         Built by Nikhil Thomas A                        ║
 * ║         nikhil-thomas-a.github.io/startup-ops-toolkit   ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * SETUP:
 *  1. Open your Google Sheet
 *  2. Go to Extensions → Apps Script
 *  3. Paste this entire script, save (Ctrl+S)
 *  4. Run setupSheet() once to create the sheet structure
 *  5. Fill in your data and email template below
 *  6. Run sendEmails() to send — status updates live in the sheet
 *
 * SHEET COLUMNS (auto-created by setupSheet):
 *  A: First Name   B: Last Name   C: Email
 *  D: Company      E: Role        F: Custom Variable
 *  G: Status       H: Sent At     I: Notes
 */

// ── CONFIGURATION ─────────────────────────────────────────────
const CONFIG = {
  sheetName:    "Mail List",          // Sheet tab name
  senderName:   "Nikhil Thomas A",    // Your name in From field
  subjectLine:  "Quick note — {{First Name}} from {{Company}}",

  // Your email body — use {{Column Name}} for personalisation
  emailBody: \`Hi {{First Name}},

I came across {{Company}} and wanted to reach out directly.

[Your personalised message here — mention their {{Role}} or something specific about {{Company}}.]

I'd love to connect and share how I've helped similar teams. Would you be open to a 20-minute call this week?

Best,
Nikhil Thomas A\`,

  // Control which rows to process
  onlySendToPending: true,   // Skip rows already marked Sent
  testMode:          false,  // true = logs emails, doesn't send
  delayMs:           1500,   // Delay between emails (ms) — avoid spam filters
};

// ── SETUP: Creates sheet structure ────────────────────────────
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.sheetName);
  }

  // Headers
  const headers = [
    "First Name", "Last Name", "Email", "Company",
    "Role", "Custom Variable", "Status", "Sent At", "Notes"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Style header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1A7A4A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Google Sans");

  // Sample data rows
  const sampleData = [
    ["Alex", "Chen",    "alex@example.com",   "Acme Corp",   "Head of Ops",     "SaaS tools",  "Pending", "", ""],
    ["Priya","Sharma",  "priya@example.com",  "Bloom AI",    "CEO",             "AI startup",  "Pending", "", ""],
    ["Tom",  "Walker",  "tom@example.com",    "FounderCo",   "CTO",             "Series A",    "Pending", "", ""],
  ];
  sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);

  // Column widths
  sheet.setColumnWidth(1, 110); sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 220); sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 150); sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 100); sheet.setColumnWidth(8, 160);
  sheet.setColumnWidth(9, 200);

  // Freeze header row
  sheet.setFrozenRows(1);

  // Status dropdown validation
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pending", "Sent", "Failed", "Replied", "Skip"], true)
    .build();
  sheet.getRange(2, 7, 500, 1).setDataValidation(statusRule);

  SpreadsheetApp.getUi().alert("✅ Sheet ready! Fill in your contacts and run sendEmails().");
}

// ── MAIN: Send emails ─────────────────────────────────────────
function sendEmails() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet not found. Run setupSheet() first.");
    return;
  }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows    = data.slice(1);

  let sent = 0, skipped = 0, failed = 0;

  rows.forEach((row, i) => {
    const rowIndex = i + 2; // 1-indexed, skip header
    const status   = row[6]; // Column G

    // Skip non-pending rows if config says so
    if (CONFIG.onlySendToPending && status !== "Pending") {
      skipped++;
      return;
    }
    if (status === "Skip" || status === "Sent") {
      skipped++;
      return;
    }

    // Build personalisation map from headers + row values
    const vars = {};
    headers.forEach((h, idx) => { vars[h] = row[idx] || ""; });

    const email   = vars["Email"];
    if (!email || !email.includes("@")) {
      sheet.getRange(rowIndex, 7).setValue("Failed");
      sheet.getRange(rowIndex, 9).setValue("Invalid email address");
      failed++;
      return;
    }

    // Replace {{Variable}} placeholders
    let subject = CONFIG.subjectLine;
    let body    = CONFIG.emailBody;
    Object.keys(vars).forEach(key => {
      const placeholder = new RegExp(\`{{\\\\s*\${key}\\\\s*}}\`, "g");
      subject = subject.replace(placeholder, vars[key]);
      body    = body.replace(placeholder, vars[key]);
    });

    try {
      if (CONFIG.testMode) {
        Logger.log(\`TEST MODE — To: \${email}\\nSubject: \${subject}\\n\\n\${body}\\n${"─".repeat(60)}\`);
      } else {
        GmailApp.sendEmail(email, subject, body, {
          name:     CONFIG.senderName,
          replyTo:  Session.getActiveUser().getEmail(),
        });
      }

      // Update status in sheet
      sheet.getRange(rowIndex, 7).setValue("Sent");
      sheet.getRange(rowIndex, 7).setBackground("#E8F5EE");
      sheet.getRange(rowIndex, 8).setValue(new Date().toLocaleString());
      sent++;

      // Throttle to avoid Gmail rate limits
      if (!CONFIG.testMode) Utilities.sleep(CONFIG.delayMs);

    } catch (err) {
      sheet.getRange(rowIndex, 7).setValue("Failed");
      sheet.getRange(rowIndex, 7).setBackground("#FAEAE7");
      sheet.getRange(rowIndex, 9).setValue(err.message);
      failed++;
      Logger.log(\`Failed for \${email}: \${err.message}\`);
    }
  });

  const summary = \`✅ Done!\\n\\nSent: \${sent}\\nSkipped: \${skipped}\\nFailed: \${failed}\${CONFIG.testMode ? "\\n\\n⚠️ TEST MODE — no real emails sent. Check Logger." : ""}\`;
  SpreadsheetApp.getUi().alert(summary);
}

// ── MENU: Adds custom menu to Sheet UI ────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📧 Mail Shooter")
    .addItem("Setup Sheet",  "setupSheet")
    .addSeparator()
    .addItem("Send Emails",  "sendEmails")
    .addToUi();
}`;

const DOC_SCRIPT = `/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║       STARTUP OPS TOOLKIT — Document Generator          ║
 * ║       Built by Nikhil Thomas A                          ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * WHAT IT DOES:
 *  Each row in your Sheet becomes a unique Google Doc.
 *  Use it for: offer letters, NDAs, client briefs, invoices,
 *  onboarding packs — anything templated.
 *
 * SETUP:
 *  1. Create a Google Doc template — use {{Placeholder}} for variables
 *  2. Copy the template Doc ID from its URL
 *  3. Paste it in CONFIG below
 *  4. Create a destination Drive folder, paste its ID
 *  5. Run setupSheet() to create the sheet structure
 *  6. Fill in your data rows
 *  7. Run generateDocs() — Doc URLs written back to sheet
 */

const CONFIG = {
  sheetName:      "Doc List",
  templateDocId:  "PASTE_YOUR_TEMPLATE_DOC_ID_HERE",
  outputFolderId: "PASTE_YOUR_DRIVE_FOLDER_ID_HERE",
  // Column name whose value becomes the Doc filename
  fileNameColumn: "Full Name",
  fileNamePrefix: "Offer Letter — ",  // e.g. "Offer Letter — Alex Chen"
};

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = ss.insertSheet(CONFIG.sheetName);

  const headers = [
    "Full Name", "Email", "Role", "Start Date",
    "Salary", "Manager", "Department", "Custom 1", "Custom 2",
    "Status", "Doc URL", "Generated At"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1A4A8A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");

  const sample = [
    ["Alex Chen", "alex@company.com", "Senior Engineer", "1 April 2025",
     "£85,000", "Priya Sharma", "Engineering", "", "", "Pending", "", ""],
  ];
  sheet.getRange(2, 1, sample.length, headers.length).setValues(sample);
  sheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert("✅ Sheet ready! Fill in your rows and run generateDocs().");
}

function generateDocs() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getSheetByName(CONFIG.sheetName);
  const data   = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows   = data.slice(1);
  const folder = DriveApp.getFolderById(CONFIG.outputFolderId);

  let generated = 0, skipped = 0;

  rows.forEach((row, i) => {
    const rowIndex = i + 2;
    const status   = row[headers.indexOf("Status")];
    if (status === "Done") { skipped++; return; }

    // Build variable map
    const vars = {};
    headers.forEach((h, idx) => { vars[h] = row[idx] || ""; });

    // Copy template
    const templateFile = DriveApp.getFileById(CONFIG.templateDocId);
    const fileName     = CONFIG.fileNamePrefix + (vars[CONFIG.fileNameColumn] || \`Row \${rowIndex}\`);
    const newFile      = templateFile.makeCopy(fileName, folder);
    const doc          = DocumentApp.openById(newFile.getId());
    const body         = doc.getBody();

    // Replace all {{placeholders}}
    Object.keys(vars).forEach(key => {
      body.replaceText(\`{{\\\\s*\${key}\\\\s*}}\`, vars[key]);
    });

    doc.saveAndClose();

    const url = newFile.getUrl();
    sheet.getRange(rowIndex, headers.indexOf("Status") + 1).setValue("Done");
    sheet.getRange(rowIndex, headers.indexOf("Doc URL") + 1).setValue(url);
    sheet.getRange(rowIndex, headers.indexOf("Generated At") + 1).setValue(new Date().toLocaleString());

    generated++;
  });

  SpreadsheetApp.getUi().alert(\`✅ Done!\\n\\nGenerated: \${generated}\\nSkipped (already done): \${skipped}\`);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📄 Doc Generator")
    .addItem("Setup Sheet",    "setupSheet")
    .addSeparator()
    .addItem("Generate Docs",  "generateDocs")
    .addToUi();
}`;


// ── KPI EMAILER APP SCRIPT ────────────────────────────────────
const KPI_SCRIPT = `/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   STARTUP OPS TOOLKIT — Weekly KPI Emailer                  ║
 * ║   Built by Nikhil Thomas A                                  ║
 * ║   nikhil-thomas-a.github.io/startup-ops-toolkit             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WHAT IT DOES:
 *   Every Monday morning, this script reads the latest week's KPIs
 *   from your Google Sheet, compares them to the prior week,
 *   and sends a clean HTML digest to your team automatically.
 *
 * SETUP (one-time, ~10 minutes):
 *   1. Open your Google Sheet
 *   2. Go to Extensions → Apps Script
 *   3. Paste this entire script, save (Ctrl+S)
 *   4. Edit CONFIG below — add your email, KPI names, targets
 *   5. Run setupSheet() once to create the sheet structure
 *   6. Run setWeeklyTrigger() once to schedule Monday 8am sends
 *   7. Fill in your KPI data each week — email sends automatically
 *
 * SHEET STRUCTURE (auto-created by setupSheet):
 *   Column A: Week (e.g. "2025-W01")
 *   Column B: Week Start Date
 *   Columns C+: Your KPIs (configured below)
 */

// ── CONFIGURATION — edit this section ─────────────────────────
const CONFIG = {

  // ── Email settings ──────────────────────────────────────────
  recipients:  ["you@company.com", "ceo@company.com"],  // Who gets the digest
  emailSender: "Weekly KPI Digest",                      // Display name
  subject:     "📊 Weekly KPI Digest — {{WEEK}}",        // {{WEEK}} auto-filled

  // ── Your KPIs ───────────────────────────────────────────────
  // Add or remove metrics as needed.
  // direction: "up" = higher is better, "down" = lower is better
  // target: optional — shows as benchmark in the email
  // format: "number", "percent", "currency", "decimal"
  kpis: [
    { name: "New Signups",         column: "C", direction: "up",   target: 50,   format: "number"   },
    { name: "Active Users",        column: "D", direction: "up",   target: 200,  format: "number"   },
    { name: "Churn Rate",          column: "E", direction: "down", target: 2.0,  format: "percent"  },
    { name: "MRR (£)",             column: "F", direction: "up",   target: 5000, format: "currency" },
    { name: "Support Tickets",     column: "G", direction: "down", target: 20,   format: "number"   },
    { name: "Avg Response Time",   column: "H", direction: "down", target: 4.0,  format: "decimal"  },
  ],

  // ── Trigger settings ────────────────────────────────────────
  triggerDay:  "MONDAY",   // Day to send (MONDAY, TUESDAY, etc.)
  triggerHour: 8,          // Hour to send (24h, e.g. 8 = 8:00am)
  timezone:    "Europe/London",  // Your timezone

  sheetName: "KPI Tracker",  // Sheet tab name
};

// ── HELPERS ────────────────────────────────────────────────────
function colIndex(letter) {
  return letter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2...
}

function formatValue(val, fmt) {
  if (val === "" || val === null || val === undefined) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  switch (fmt) {
    case "percent":  return n.toFixed(1) + "%";
    case "currency": return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 0 });
    case "decimal":  return n.toFixed(1);
    default:         return Math.round(n).toLocaleString("en-GB");
  }
}

function ragStatus(current, previous, target, direction) {
  const curr = parseFloat(current);
  if (isNaN(curr)) return "grey";

  // Week-on-week change
  const prev = parseFloat(previous);
  let wowOk = true;
  if (!isNaN(prev) && prev !== 0) {
    const change = (curr - prev) / Math.abs(prev);
    wowOk = direction === "up" ? change >= -0.05 : change <= 0.05;
  }

  // vs target
  let targetOk = true;
  if (target !== null && target !== undefined) {
    targetOk = direction === "up" ? curr >= target * 0.9 : curr <= target * 1.1;
  }

  if (wowOk && targetOk) return "green";
  if (!wowOk && !targetOk) return "red";
  return "amber";
}

function wowArrow(current, previous, direction) {
  const curr = parseFloat(current);
  const prev = parseFloat(previous);
  if (isNaN(curr) || isNaN(prev) || prev === 0) return "";
  const pct = ((curr - prev) / Math.abs(prev) * 100).toFixed(1);
  const positive = parseFloat(pct) > 0;
  const good = direction === "up" ? positive : !positive;
  const arrow = positive ? "▲" : "▼";
  const color = good ? "#166534" : "#991b1b";
  return ` <span style="color:${color};font-size:12px;">${arrow} ${Math.abs(pct)}%</span>`;
}

// ── SETUP: Create sheet structure ──────────────────────────────
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = ss.insertSheet(CONFIG.sheetName);

  // Build header row
  const headers = ["Week", "Week Start"];
  CONFIG.kpis.forEach(k => headers.push(k.name));
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#1A4A8A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");

  // Add a sample data row
  const sampleRow = ["2025-W01", new Date()];
  CONFIG.kpis.forEach(k => sampleRow.push(""));
  sheet.getRange(2, 1, 1, sampleRow.length).setValues([sampleRow]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  SpreadsheetApp.getUi().alert(
    "✅ Sheet ready!\n\nFill in your KPI data each week.\nRun setWeeklyTrigger() to schedule automatic Monday sends."
  );
}

// ── TRIGGER: Schedule Monday sends ────────────────────────────
function setWeeklyTrigger() {
  // Delete existing triggers first to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "sendWeeklyKPIEmail") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("sendWeeklyKPIEmail")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay[CONFIG.triggerDay])
    .atHour(CONFIG.triggerHour)
    .create();

  SpreadsheetApp.getUi().alert(
    `✅ Trigger set!\n\nKPI digest will send every ${CONFIG.triggerDay} at ${CONFIG.triggerHour}:00.`
  );
}

// ── MAIN: Build and send the email ────────────────────────────
function sendWeeklyKPIEmail() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetName);
  const data  = sheet.getDataRange().getValues();

  if (data.length < 2) {
    Logger.log("No data rows found — skipping send.");
    return;
  }

  const latest   = data[data.length - 1];       // Most recent week
  const previous = data.length > 2 ? data[data.length - 2] : null;  // Prior week
  const weekLabel = latest[0] || "This Week";

  // ── Build KPI rows HTML ──────────────────────────────────────
  const ragColors = {
    green: { bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a", label: "On Track"  },
    amber: { bg: "#fffbeb", border: "#fde68a", dot: "#d97706", label: "Watch"     },
    red:   { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626", label: "Off Track" },
    grey:  { bg: "#f9fafb", border: "#e5e7eb", dot: "#9ca3af", label: "No Data"   },
  };

  let kpiRowsHtml = "";
  let greenCount = 0, amberCount = 0, redCount = 0;

  CONFIG.kpis.forEach(kpi => {
    const ci      = colIndex(kpi.column);
    const curr    = latest[ci];
    const prev    = previous ? previous[ci] : null;
    const rag     = ragStatus(curr, prev, kpi.target, kpi.direction);
    const rc      = ragColors[rag];
    const arrow   = wowArrow(curr, prev, kpi.direction);
    const currFmt = formatValue(curr, kpi.format);
    const tgtFmt  = kpi.target ? formatValue(kpi.target, kpi.format) : null;

    if (rag === "green") greenCount++;
    else if (rag === "amber") amberCount++;
    else if (rag === "red") redCount++;

    kpiRowsHtml += `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:12px 16px;font-size:14px;color:#374151;font-weight:500;">${kpi.name}</td>
        <td style="padding:12px 16px;font-size:16px;font-weight:700;color:#111827;">${currFmt}${arrow}</td>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">${tgtFmt ? "Target: " + tgtFmt : "—"}</td>
        <td style="padding:12px 16px;">
          <span style="display:inline-flex;align-items:center;gap:6px;background:${rc.bg};border:1px solid ${rc.border};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;color:${rc.dot};">
            <span style="width:7px;height:7px;background:${rc.dot};border-radius:50%;display:inline-block;"></span>
            ${rc.label}
          </span>
        </td>
      </tr>`;
  });

  // ── Build summary bar ────────────────────────────────────────
  const summaryHtml = `
    <div style="display:flex;gap:12px;margin:16px 0 24px;">
      <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#16a34a;">${greenCount}</div>
        <div style="font-size:11px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">On Track</div>
      </div>
      <div style="flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#d97706;">${amberCount}</div>
        <div style="font-size:11px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Watch</div>
      </div>
      <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#dc2626;">${redCount}</div>
        <div style="font-size:11px;color:#991b1b;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Off Track</div>
      </div>
    </div>`;

  // ── Full HTML email ──────────────────────────────────────────
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="background:#1A4A8A;padding:24px 32px;">
      <div style="font-size:12px;color:#93c5fd;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">
        Weekly KPI Digest
      </div>
      <div style="font-size:24px;font-weight:800;color:#ffffff;">${weekLabel}</div>
    </div>

    <!-- Summary -->
    <div style="padding:24px 32px 0;">
      <div style="font-size:13px;font-weight:600;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">
        At a Glance
      </div>
      ${summaryHtml}
    </div>

    <!-- KPI Table -->
    <div style="padding:0 32px 24px;">
      <div style="font-size:13px;font-weight:600;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;">
        Metrics
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Metric</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">This Week</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Target</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Status</th>
          </tr>
        </thead>
        <tbody>${kpiRowsHtml}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Sent automatically by Startup Ops Toolkit ·
        <a href="https://nikhil-thomas-a.github.io/startup-ops-toolkit/" style="color:#1A4A8A;text-decoration:none;">startup-ops-toolkit</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  // ── Send to all recipients ───────────────────────────────────
  const subject = CONFIG.subject.replace("{{WEEK}}", weekLabel);
  CONFIG.recipients.forEach(email => {
    MailApp.sendEmail({ to: email, subject, htmlBody, name: CONFIG.emailSender });
  });

  Logger.log(`✅ KPI digest sent for ${weekLabel} to ${CONFIG.recipients.join(", ")}`);
}

// ── MENU: Add to Sheet UI ──────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📊 KPI Emailer")
    .addItem("Setup Sheet",          "setupSheet")
    .addSeparator()
    .addItem("Set Weekly Trigger",   "setWeeklyTrigger")
    .addItem("Send Now (Test)",      "sendWeeklyKPIEmail")
    .addToUi();
}`;

// ── TOOLS DATA (plain colour strings, no theme refs) ───────────
const TOOLS = [
  {
    id:"mail-shooter", emoji:"📧", status:"live",
    colorKey:"green", tag:"Gmail + Sheets",
    title:"Multi Mail Shooter",
    tagline:"Personalised emails at scale — straight from a Google Sheet.",
    problem:"Sending 50 outreach emails manually takes hours, and personalising each one is error-prone. Mail merge tools cost money and require integrations.",
    solution:"One Sheet, one script. Fill in names, emails, and variables. Hit run. Every contact gets a personalised email, status updates live in the sheet.",
    features:[
      "Custom {{variables}} in subject + body",
      "Live status: Pending → Sent / Failed / Replied",
      "Delay throttling to avoid Gmail spam flags",
      "Test mode — logs without sending",
      "Custom menu added directly to your Sheet",
    ],
    columns:["First Name","Last Name","Email","Company","Role","Custom Variable","Status","Sent At","Notes"],
    steps:[
      {n:"1",title:"Open Apps Script",desc:"In your Google Sheet: Extensions → Apps Script"},
      {n:"2",title:"Paste the script",desc:"Copy the full script below, paste into Apps Script editor, save (Ctrl+S)"},
      {n:"3",title:"Run setupSheet()",desc:"Click the function dropdown → select setupSheet → click Run. Authorise when prompted."},
      {n:"4",title:"Fill your data",desc:"Add contacts to the Mail List tab. Customise CONFIG.emailBody at the top of the script."},
      {n:"5",title:"Send",desc:"Use the 📧 Mail Shooter menu in your Sheet, or run sendEmails() directly from Apps Script."},
    ],
    script:MAIL_SCRIPT,
  },
  {
    id:"doc-generator", emoji:"📄", status:"live",
    colorKey:"blue", tag:"Docs + Sheets + Drive",
    title:"Document Generator",
    tagline:"One row in a Sheet = one fully populated Google Doc in Drive.",
    problem:"Creating offer letters, NDAs, or client briefs one-by-one from a template wastes time and introduces copy-paste errors.",
    solution:"Build your Doc template with {{placeholders}}, connect it to a Sheet. Each row auto-generates a unique Doc and writes the URL back.",
    features:[
      "Works with any Google Doc template",
      "Supports unlimited {{placeholder}} variables",
      "Saves Docs to a specified Drive folder",
      "Writes Doc URL back to sheet row",
      "Skips already-generated rows automatically",
    ],
    columns:["Full Name","Email","Role","Start Date","Salary","Manager","Department","Custom 1","Custom 2","Status","Doc URL","Generated At"],
    steps:[
      {n:"1",title:"Create a Doc template",desc:"Make a Google Doc with {{Full Name}}, {{Role}}, {{Start Date}} etc. as placeholders."},
      {n:"2",title:"Copy the template ID",desc:"From the Doc URL: docs.google.com/document/d/[THIS_PART]/edit"},
      {n:"3",title:"Create output folder",desc:"Create a Drive folder for generated docs. Copy its ID from the URL."},
      {n:"4",title:"Paste IDs into CONFIG",desc:"Update templateDocId and outputFolderId in the script CONFIG."},
      {n:"5",title:"Run generateDocs()",desc:"Each row becomes a Doc. URLs appear in the Doc URL column automatically."},
    ],
    script:DOC_SCRIPT,
  },
  {
    id:"kpi-emailer", emoji:"📊", status:"live", isNew:true,
    colorKey:"amber", tag:"Sheets + Gmail",
    title:"Weekly KPI Emailer",
    tagline:"Auto-sends a formatted KPI digest every Monday morning.",
    problem:"Someone has to manually compile and send the weekly numbers. It's always late, always slightly wrong.",
    solution:"Sheet tracks your KPIs week by week. Script runs on a Monday trigger, compiles the latest row into a clean HTML email with RAG status, sends to your distribution list.",
    features:[
      "Time-based trigger — Monday 8am, set once and forget",
      "HTML email with green / amber / red RAG status per metric",
      "Week-on-week comparison with % change arrows",
      "Fully configurable: add/remove KPIs, set targets, change recipients",
      "Test send anytime via the Sheet menu",
    ],
    columns:["Week","Week Start","...your KPI columns (auto-created)"],
    steps:[
      {n:"1",title:"Open Apps Script",desc:"In your Google Sheet: Extensions → Apps Script"},
      {n:"2",title:"Paste and save",desc:"Copy the full script, paste into Apps Script editor, save (Ctrl+S)"},
      {n:"3",title:"Edit CONFIG",desc:"Update recipients[], add your KPI names and targets in the kpis[] array"},
      {n:"4",title:"Run setupSheet()",desc:"Creates the KPI Tracker tab with headers matching your CONFIG"},
      {n:"5",title:"Set the trigger",desc:"Run setWeeklyTrigger() once — digest sends every Monday at 8am automatically"},
      {n:"6",title:"Fill weekly data",desc:"Add a new row each week. Email sends automatically — or use 'Send Now (Test)' from the Sheet menu"},
    ],
    script:KPI_SCRIPT,
  },
  {
    id:"hiring-tracker", emoji:"🧑‍💼", status:"coming",
    colorKey:"coral", tag:"Sheets + Gmail + Docs",
    title:"Hiring Pipeline Tracker",
    tagline:"Stage changes in your pipeline trigger candidate emails automatically.",
    problem:"Keeping candidates updated at every stage of the process is admin-heavy and easy to forget.",
    solution:"Track candidates in a Sheet. When you move someone from Screened to Interview, the script sends them the right templated email instantly.",
    features:["Status-triggered email automation","Stage-specific email templates","Interview calendar link insertion","Rejection email with one-click send","Full candidate history log"],
    columns:[], steps:[], script:"",
  },
];

// ── COPY BUTTON ────────────────────────────────────────────────
function CopyBtn({ text, label="Copy Script", size=14, C }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2200);
  };
  return (
    <button onClick={copy} style={{
      display:"inline-flex", alignItems:"center", gap:8,
      fontFamily:C.mono, fontSize:size, fontWeight:700,
      border:"1.5px solid " + (copied ? C.green : C.borderDark),
      background: copied ? C.greenLight : C.surface,
      color: copied ? C.green : C.inkMid,
      padding:"10px 20px", borderRadius:8, cursor:"pointer",
      letterSpacing:"0.04em", transition:"all 0.2s",
    }}>
      {copied ? "✓ Copied!" : "⎘ " + label}
    </button>
  );
}

// ── STEP CARD ──────────────────────────────────────────────────
function StepCard({ step, color, C }) {
  return (
    <div style={{
      display:"flex", gap:16, padding:"14px 0",
      borderBottom:"1px solid " + C.border,
    }}>
      <div style={{
        width:28, height:28, borderRadius:"50%",
        background:color, color:"#fff",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:C.mono, fontSize:13, fontWeight:700, flexShrink:0,
      }}>{step.n}</div>
      <div>
        <div style={{fontFamily:C.sans, fontSize:15, fontWeight:600, color:C.ink, marginBottom:4}}>{step.title}</div>
        <div style={{fontFamily:C.sans, fontSize:14, color:C.inkMid, lineHeight:1.6}}>{step.desc}</div>
      </div>
    </div>
  );
}

// ── TOOL CARD ──────────────────────────────────────────────────
function ToolCard({ tool, onOpen, C }) {
  const [hov, setHov] = useState(false);
  const color = C[tool.colorKey];
  const colorBg = C[tool.colorKey + "Light"];
  const isLive = tool.status === "live";
  return (
    <div
      onClick={isLive ? onOpen : undefined}
      onMouseEnter={()=>isLive && setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        background: C.card,
        border:"1.5px solid " + (hov ? color : C.border),
        borderRadius:14, padding:"28px 32px",
        cursor: isLive ? "pointer" : "default",
        transition:"all 0.2s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0," + (C.isDark?0.4:0.1) + ")" : "none",
        position:"relative", overflow:"hidden",
      }}>
      {isLive && <div style={{
        position:"absolute", top:0, left:0, right:0, height:3,
        background:color, opacity:hov?1:0.4, transition:"opacity 0.2s",
        borderRadius:"14px 14px 0 0",
      }}/>}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{fontSize:24}}>{tool.emoji}</span>
          <span style={{
            fontFamily:C.mono, fontSize:10, fontWeight:700,
            color:color, background:colorBg,
            padding:"3px 9px", borderRadius:4,
            letterSpacing:"0.1em", textTransform:"uppercase",
          }}>{tool.tag}</span>
        </div>
        {isLive
          ? <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontFamily:C.mono,fontSize:11,fontWeight:700,color:color,background:colorBg,padding:"3px 10px",borderRadius:20,letterSpacing:"0.06em"}}>LIVE</span>{tool.isNew&&<span style={{background:"#16a34a",color:"#fff",fontSize:9,fontWeight:800,letterSpacing:"0.12em",padding:"2px 7px",borderRadius:3,textTransform:"uppercase"}}>NEW</span>}</div>
          : <span style={{fontFamily:C.mono,fontSize:11,color:C.inkSoft,background:C.surface,padding:"3px 10px",borderRadius:20,letterSpacing:"0.06em"}}>COMING SOON</span>
        }
      </div>
      <h3 style={{fontFamily:C.serif, fontSize:22, fontWeight:800, color:C.ink, marginBottom:8}}>{tool.title}</h3>
      <p style={{fontFamily:C.sans, fontSize:14, color:C.inkMid, lineHeight:1.65, marginBottom: isLive ? 20 : 0}}>{tool.tagline}</p>
      {isLive && (
        <div style={{display:"flex", alignItems:"center", gap:6, fontFamily:C.mono, fontSize:12, fontWeight:700, color:color}}>
          View setup guide + script →
        </div>
      )}
    </div>
  );
}

// ── TOOL DETAIL MODAL ──────────────────────────────────────────
function ToolDetail({ tool, onClose, C }) {
  const color = C[tool.colorKey];
  const colorBg = C[tool.colorKey + "Light"];
  const [tab, setTab] = useState("setup");

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:100,
      background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"32px 16px", overflowY:"auto",
    }} onClick={e=>e.target===e.currentTarget && onClose()}>
      <div style={{
        background:C.card, borderRadius:18,
        width:"100%", maxWidth:680,
        border:"1.5px solid " + C.border,
        boxShadow:"0 24px 80px rgba(0,0,0," + (C.isDark?0.6:0.2) + ")",
      }}>
        {/* Modal header */}
        <div style={{
          padding:"24px 32px 20px",
          borderBottom:"1px solid " + C.border,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <span style={{fontSize:28}}>{tool.emoji}</span>
            <div>
              <div style={{fontFamily:C.serif, fontSize:20, fontWeight:800, color:C.ink}}>{tool.title}</div>
              <div style={{fontFamily:C.mono, fontSize:11, color:color, letterSpacing:"0.08em", textTransform:"uppercase", marginTop:2}}>{tool.tag}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background:C.surface, border:"1px solid " + C.border,
            borderRadius:8, padding:"6px 12px", cursor:"pointer",
            fontFamily:C.mono, fontSize:12, color:C.inkSoft, fontWeight:700,
          }}>✕ Close</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex", borderBottom:"1px solid " + C.border, padding:"0 32px"}}>
          {["setup","script"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              fontFamily:C.mono, fontSize:12, fontWeight:700,
              color: tab===t ? color : C.inkSoft,
              background:"none", border:"none", cursor:"pointer",
              padding:"14px 16px 12px",
              borderBottom: tab===t ? "2px solid " + color : "2px solid transparent",
              letterSpacing:"0.08em", textTransform:"uppercase",
              transition:"color 0.15s",
            }}>{t==="setup" ? "Setup Guide" : "Apps Script"}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{padding:"28px 32px"}}>
          {tab === "setup" ? (
            <div>
              <div style={{
                background:colorBg, borderRadius:10,
                padding:"16px 20px", marginBottom:24,
                border:"1px solid " + color + "30",
              }}>
                <div style={{fontFamily:C.sans, fontSize:14, fontWeight:700, color:color, marginBottom:4}}>What it does</div>
                <div style={{fontFamily:C.sans, fontSize:14, color:C.inkMid, lineHeight:1.65}}>{tool.solution}</div>
              </div>
              <div style={{fontFamily:C.mono, fontSize:11, color:C.inkSoft, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12}}>Steps</div>
              {tool.steps.map((s,i)=><StepCard key={i} step={s} color={color} C={C}/>)}
              {tool.columns.length > 0 && (
                <div style={{marginTop:24}}>
                  <div style={{fontFamily:C.mono, fontSize:11, color:C.inkSoft, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12}}>Sheet columns</div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                    {tool.columns.map((col,i)=>(
                      <span key={i} style={{
                        fontFamily:C.mono, fontSize:12, color:C.inkMid,
                        background:C.surface, border:"1px solid " + C.border,
                        padding:"4px 10px", borderRadius:4,
                      }}>{col}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{marginBottom:16}}>
                <CopyBtn text={tool.script} label="Copy Script" C={C}/>
              </div>
              <pre style={{
                background:C.isDark?"#0A0C0A":C.surface,
                border:"1px solid " + C.border,
                borderRadius:10, padding:"20px 24px",
                fontFamily:C.mono, fontSize:12, color:C.inkMid,
                lineHeight:1.65, overflowX:"auto",
                maxHeight:400, overflowY:"auto",
                whiteSpace:"pre-wrap", wordBreak:"break-word",
              }}>{tool.script}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────
export default function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [mounted,    setMounted]    = useState(false);
  const [dark,       setDark]       = useState(false);
  const C = dark ? DARK : LIGHT;
  useEffect(()=>setMounted(true),[]);

  const liveTool    = TOOLS.find(t=>t.id===activeTool);
  const liveCount   = TOOLS.filter(t=>t.status==="live").length;
  const comingCount = TOOLS.filter(t=>t.status==="coming").length;

  return (
    <div style={{
      fontFamily:C.sans, background:C.bg, minHeight:"100vh",
      opacity:mounted?1:0, transition:"opacity 0.4s ease, background 0.3s",
    }}>
      <style>{"html,body,#root{background:" + C.bg + "!important;transition:background 0.3s;}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}a{transition:opacity 0.2s;}::-webkit-scrollbar{width:4px;background:" + C.bg + ";}::-webkit-scrollbar-thumb{background:" + C.border + ";border-radius:2px;}"}</style>

      {liveTool && <ToolDetail tool={liveTool} onClose={()=>setActiveTool(null)} C={C}/>}

      <div style={{maxWidth:860, margin:"0 auto", padding:"0 24px 80px"}}>

        {/* NAV */}
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"22px 0", borderBottom:"1px solid " + C.border, marginBottom:56,
        }}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <span style={{fontSize:20}}>⚙️</span>
            <span style={{fontFamily:C.serif, fontSize:18, fontWeight:800, color:C.ink}}>
              Startup Ops Toolkit
            </span>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <a href="https://nikhil-thomas-a.github.io/portfolio/"
              target="_blank" rel="noopener noreferrer"
              style={{fontFamily:C.mono, fontSize:11, fontWeight:700, color:C.green,
                textDecoration:"none", letterSpacing:"0.08em",
                border:"1px solid " + C.green + "40", padding:"5px 12px", borderRadius:6}}>
              ← Portfolio
            </a>
            <a href="https://www.linkedin.com/in/nikhil-thomas-a-58538117a/"
              target="_blank" rel="noopener noreferrer"
              style={{fontFamily:C.mono, fontSize:11, color:C.inkSoft,
                textDecoration:"none", letterSpacing:"0.08em",
                display:"flex", alignItems:"center", gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={C.inkSoft}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              Nikhil Thomas A
            </a>
            <button onClick={()=>setDark(!dark)} style={{
              background:C.surface, border:"1px solid " + C.border,
              borderRadius:7, padding:"6px 12px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:6,
              color:C.inkSoft, fontSize:11, fontFamily:C.mono,
              fontWeight:700, letterSpacing:"0.06em", transition:"all 0.2s",
            }}>{dark ? "☀ Light" : "🌙 Dark"}</button>
          </div>
        </div>

        {/* HERO */}
        <div style={{marginBottom:64}}>
          <div style={{
            fontFamily:C.mono, fontSize:12, fontWeight:700,
            color:C.green, letterSpacing:"0.16em", textTransform:"uppercase",
            marginBottom:20, display:"flex", alignItems:"center", gap:8,
          }}>
            <span style={{display:"inline-block", width:28, height:2, background:C.green, borderRadius:1}}/>
            Google Workspace Automations
          </div>
          <h1 style={{
            fontFamily:C.serif, fontSize:"clamp(44px,7vw,72px)",
            fontWeight:900, lineHeight:1.0, letterSpacing:"-0.02em",
            color:C.ink, marginBottom:20,
          }}>
            Startup Ops<br/>
            <em style={{color:C.green, fontStyle:"italic"}}>Toolkit.</em>
          </h1>
          <p style={{
            fontFamily:C.sans, fontSize:17, color:C.inkMid,
            lineHeight:1.8, maxWidth:540, marginBottom:32,
          }}>
            Google Sheets + Apps Script templates for early-stage teams.
            No paid tools, no integrations — just scripts you copy, paste, and own.
          </p>
          <div style={{display:"flex", gap:20, flexWrap:"wrap"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:C.serif, fontSize:36, fontWeight:900, color:C.green}}>{liveCount}</div>
              <div style={{fontFamily:C.mono, fontSize:10, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.1em", marginTop:2}}>Live now</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:C.serif, fontSize:36, fontWeight:900, color:C.inkMid}}>{comingCount}</div>
              <div style={{fontFamily:C.mono, fontSize:10, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.1em", marginTop:2}}>Coming soon</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:C.serif, fontSize:36, fontWeight:900, color:C.amber}}>0</div>
              <div style={{fontFamily:C.mono, fontSize:10, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.1em", marginTop:2}}>Cost</div>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:32}}>
          <div style={{flex:1, height:1, background:C.border}}/>
          <span style={{fontFamily:C.mono, fontSize:11, color:C.inkSoft, letterSpacing:"0.12em", textTransform:"uppercase"}}>The Toolkit</span>
          <div style={{flex:1, height:1, background:C.border}}/>
        </div>

        {/* TOOL GRID */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20, marginBottom:64}}>
          {TOOLS.map(t=>(
            <ToolCard key={t.id} tool={t} C={C} onOpen={()=>setActiveTool(t.id)}/>
          ))}
        </div>

        {/* ABOUT */}
        <div style={{
          background:C.surface, borderRadius:16,
          border:"1px solid " + C.border,
          padding:"36px 40px", marginBottom:48,
        }}>
          <div style={{fontFamily:C.mono, fontSize:11, color:C.inkSoft, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16}}>
            Why this toolkit exists
          </div>
          <p style={{fontFamily:C.sans, fontSize:16, color:C.inkMid, lineHeight:1.8, marginBottom:24}}>
            Every early-stage team I've worked with wastes hours on the same operational tasks —
            personalised outreach, document generation, reporting. These are solved problems.
            This toolkit packages the patterns I've seen repeated across dozens of startups — no paid tools,
            no integrations, just Apps Script that you own entirely.
          </p>
          <a href="https://www.linkedin.com/in/nikhil-thomas-a-58538117a/"
            target="_blank" rel="noopener noreferrer"
            style={{
              display:"inline-flex", alignItems:"center", gap:8,
              fontFamily:C.mono, fontSize:12, fontWeight:700,
              color:C.ink, textDecoration:"none",
              border:"1.5px solid " + C.borderDark,
              padding:"10px 20px", borderRadius:8, letterSpacing:"0.06em",
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={C.ink}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            Connect with Nikhil Thomas A
          </a>
        </div>

        {/* FOOTER */}
        <div style={{
          paddingTop:24, borderTop:"1px solid " + C.border,
          display:"flex", justifyContent:"space-between", alignItems:"center",
          flexWrap:"wrap", gap:12,
        }}>
          <span style={{fontFamily:C.serif, fontSize:16, fontWeight:800, color:C.ink}}>
            Startup Ops Toolkit
          </span>
          <div style={{display:"flex", gap:16, alignItems:"center", flexWrap:"wrap"}}>
            <a href="https://nikhil-thomas-a.github.io/portfolio/"
              target="_blank" rel="noopener noreferrer"
              style={{fontFamily:C.mono, fontSize:11, color:C.inkSoft, textDecoration:"none", letterSpacing:"0.06em"}}>
              Built by Nikhil Thomas A
            </a>
            <span style={{color:C.border}}>·</span>
            <a href="https://nikhil-thomas-a.github.io/pm-ai-hub/"
              target="_blank" rel="noopener noreferrer"
              style={{fontFamily:C.mono, fontSize:11, color:C.inkSoft, textDecoration:"none", letterSpacing:"0.06em"}}>
              PM AI Hub
            </a>
            <span style={{color:C.border}}>·</span>
            <span style={{fontFamily:C.mono, fontSize:11, color:C.inkSoft, letterSpacing:"0.06em"}}>Free forever</span>
          </div>
        </div>

      </div>
    </div>
  );
}
