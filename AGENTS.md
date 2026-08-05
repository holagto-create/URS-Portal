# ISRM Digital Operations System

ISRM Unit — RISE Center, Saint Louis University. Google Workspace project (Sheets + Apps Script + Forms + Docs).

## Architecture

| File | Role |
|---|---|
| `isrm_apps_script_v3.js` | Backend: triggers, menu, PDF generation, web app API |
| `isrm_dashboard.html` | Production web app served by `doGet()`, uses `google.script.run` |
| `isrm_command_center_v3.jsx` | Local React preview only — hardcoded seed data |
| `react-app/` | Standalone React dashboard (Vite, no Tailwind). Deployable via Vercel/GitHub Pages |
| `website-deploy/` | **Deployed portal** (Vite + Tailwind + lucide-react). Points to live Apps Script API |

### Two React apps — which to use?

- **Local preview/development**: `react-app/` — hardcoded seed data, no API connection
- **Live deployment**: `website-deploy/` — connects to Apps Script via `SCRIPT_URL` in `src/api.ts`

### Build commands

```bash
cd react-app && npm install && npm run dev      # local preview
cd react-app && npm run build                  # outputs to dist/

cd website-deploy && npm install && npm run dev  # local preview
cd website-deploy && npm run build               # outputs to dist/
```

### Dashboard data flow

```
isrm_dashboard.html  →  google.script.run  →  Apps Script functions  →  Google Sheets
     (client)           (fetch/save)            (getDashboardData,             (Clients,
                                              updateClientBatch, etc.)         URS_Registry)
```

## File naming conventions

- Form code: `FM-RIS-002` (intake), `FM-RIS-003` (survey), `FM-RIS-059` (semestral report), `FM-RIS-060` (honoraria)
- Revision: **Rev.01, effective 30 Sept 2025**
- Sheets: `Clients`, `URS_Registry`, `Financial_Summary` (exact names required)
- 60% URS share / 40% unit share (RSS Manual §IV.2.4)

## Critical implementation details

### Bug: `now` used before declaration (line ~158)
```js
const requestDate = formDateRaw
  ? formDateRaw
  : Utilities.formatDate(now, 'Asia/Manila', 'MM/dd/yyyy');  // 'now' not yet defined
// ...
const now = new Date();  // defined later
```
Must declare `const now = new Date();` before the `requestDate` assignment.

### Form field labels must match exactly
`onFormSubmit()` reads `e.namedValues["Label"]`. Exact Google Form field names:
`Date`, `Client Name`, `Student/Employee ID`, `Contact Number`, `Email Address`, `Course/Department`, `School`, `Research/Innovation Project Title`, `Funding Source`, `Research Category`, `Service Type`, `No. of Hours`.

**No field named `Affiliation`** — removed in v3. ISM Officer sets it manually in Col K.

### CONFIG.COL is 1-based (not 0-based)
`CONFIG.COL.TOTAL_FEE = 14` means column N. Subtract 1 when indexing into row arrays.

### Record ID collision risk
- `onEdit()` auto-stamps `ISRM-YYYY-NNNN` when Date is entered on a new row (line ~122)
- `onFormSubmit()` generates its own ID when appending (line ~174)

### Template Doc placeholders
- FM-RIS-059: `{{SEMESTER_AY}}`, `{{DATE}}`, `{{TOTAL_FEES}}`, `{{URS_SHARE}}`, `{{UNIT_SHARE}}`
- FM-RIS-060: `{{DATE}}`, `{{PERIOD}}`, `{{GRAND_TOTAL}}`

`fillDocTable()` uses the **first table only** in the Doc.

## Turnaround Time (TAT) Monitoring

### TAT Configuration (working days)
| Service Type | TAT |
|---|---|
| Full Statistical Assistance | 20 working days |
| Reliability/Validity of Research Instrument | 4 working days |
| Consultation | 5 working days |
| Mentoring Services | 5 working days |

### New Columns (Cols 28-29)
- **Assignment Date** (Col 28) — auto-stamped when URS is assigned
- **Expected Completion** (Col 29) — auto-calculated based on TAT

### Deadline Warning Thresholds
- **Critical**: ≤2 working days (red alert)
- **Warning**: ≤5 working days (orange alert)
- **Notice**: ≤10 working days (yellow alert)

### API Endpoints
- `getMonitoringData` — returns overdue/critical/warning items
- `getMonthlyStatistics` — returns monthly/semester charts data
- `getURSClientsWithDeadline` — returns URS clients with deadline info

### Email Reminder System

**Setup:** Run `setupDeadlineReminderTrigger()` from menu — sends daily at 8:00 AM (Manila time)

**Reminder Schedule:**
| Service Type | Days Before Due |
|---|---|
| Full Statistical Assistance | 7 working days |
| Reliability/Validity | 2 working days |
| Consultation | 3 working days |
| Mentoring Services | 3 working days |

**Who receives reminders:**
- Assigned URS (via email from URS_Registry)
- ISM Officer (always CC'd)

**Duplicate prevention:** Uses cache to avoid sending multiple reminders within 2 days

**Manual test:** `testDeadlineReminders()` — run from menu to trigger immediately

## Naming conventions

- SLU colors: Navy `#1A3666`, Gold `#C8943A`
- Record IDs: `ISRM-YYYY-NNNN`
- URS names in URS_Registry must exactly match values in `Clients` → `Assigned URS` column
- Signature titles: `ISM Officer` (not "RCIS Officer"), `RISE Center Director` (not "UnRIC Director")
- FM-RIS-060 addressee: **Finance Office**

## Deployment workflow

1. Create Google Drive folder structure (root + `ISRM Generated Reports`, `Form Templates`, `Client Records Archive`, `URS Registry`)
2. Create Google Sheets → Extensions → Apps Script → paste `isrm_apps_script_v3.js`
3. Update `CONFIG` (template Doc IDs, output folder ID, emails, survey URL)
4. Run `setupDashboard()` — builds sheet structure
5. Run `onOpen()` then reload Sheets — adds "🎯 ISRM Operations" menu
6. Create Google Forms (FM-RIS-002 with exact labels, FM-RIS-003 survey)
7. Create Google Doc templates with `{{PLACEHOLDER}}` tags
8. Run `setupFormTrigger()` — connects FM-RIS-002 to `onFormSubmit()`
9. Test end-to-end

## React app deployment

### react-app/ (standalone dashboard)
1. Update `API_URL` in `src/App.tsx`
2. `npm run build` → deploy `dist/` to Vercel/GitHub Pages/Netlify

### website-deploy/ (production portal)
1. Update `SCRIPT_URL` in `src/api.ts` to your Apps Script Web App URL
2. `npm run build` → deploy `dist/` to static hosting

### Google Apps Script Web App
Publish → Deploy as Web App → Execute as: Me, Access: Anyone

## When modifying the Apps Script

- Column indices in `CONFIG.COL` must stay in sync with `setupDashboard()` headers
- If adding Google Form fields, add corresponding `get()` call in `onFormSubmit()` AND add column index to `CONFIG.COL`
- `onEdit()` is a **simple trigger** — does not fire on programmatic edits
- After any code change: run any function → allow permissions when prompted
