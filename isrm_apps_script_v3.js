// =============================================================================
// ISRM Research Statistical Services — Digital Operations Suite
// Google Apps Script | Saint Louis University — RISE Center
// Updated for: FM-RIS-002 / FM-RIS-003 / FM-RIS-059 / FM-RIS-060
// Revision Basis: Revision No. 01, Effectivity 30 Sept 2025
//
// v9 Changes (Online Document Submission):
//   • Clients upload Official Receipt and FM-RIS-002 to Drive "Others" subfolder
//   • No need to visit the office — everything is done online
//   • ISM Officer monitors Drive folder and verifies documents before payment confirmation
//
// v8 Changes (Appointment Booking Integration):
//   • Added Google Calendar appointment booking link to client workflow.
//   • Affiliation derived from "School" field (External/Non-SLU → Non-SLU).
//   • New menu item "📅 Send Appointment Booking Link" for ISM Officer.
//   • Client receives booking link after payment confirmation.
//
// v7 Changes (FM-RIS-002 Email Attachment):
//   • FM-RIS-002 PDF form now attached to client acknowledgment email.
//   • Clients instructed to download, print, fill out 2 copies.
//   • One copy goes to Accounting Office with payment.
//   • Other copy + Official Receipt submitted to ISRM Officer.
//
// v6 Changes (Client Folder System Update):
//   • "Affiliation" derived from School field (no longer separate form field).
//   • Client folders created in "ISRM-Statistical Services Digital System" folder.
//   • Systematic folder naming: [RecordID]_[ClientName]_[Affiliation]_[Category]
//   • Affiliation used to determine SLU/Non-SLU fee rates automatically.
//
// v5 Additions (Client Drive Folder System):
//   • Added new columns: Research Objectives, Research Questions, Drive Folder URL
//   • createClientFolder() — Creates Google Drive folder with subfolders
//   • Modified onFormSubmit() to capture RQs, objectives, and create folder
// =============================================================================

// =============================================================================
// CONFIG — Update all IDs before deployment
// =============================================================================
const CONFIG = {

  // ── Google Doc Template IDs ──────────────────────────────────────────────
  // After creating the FM-RIS-059 and FM-RIS-060 Google Doc templates
  // (see Installation Guide), paste each document's ID here.
  // Template Doc ID = the string between /d/ and /edit in the Doc URL.
  FM_RIS_059_TEMPLATE_ID: '1TYEUy-PCR8Lro7uLnfkkh7Z9Xijxq1w_vQP3fdMF07E',
  FM_RIS_060_TEMPLATE_ID: '1sK0hdyjX9Y58Y-xlmqLKgRkqzedM2YgE-tZBR40cRkk',

  // ── FM-RIS-002 Form PDF ──────────────────────────────────────────────────
  // The Statistical Services Request Form (FM-RIS-002) PDF file ID
  // This will be attached to the client acknowledgment email
  FM_RIS_002_FORM_ID: '1f5labytnuj9yH_cG7PIRHfOmTn0V1LKY', // TODO: Replace with actual PDF file ID

  // ── Google Drive Output Folder ───────────────────────────────────────────
  // Create a folder in Google Drive named "ISRM Generated Reports"
  // Paste its folder ID here (from the URL: /folders/<ID>)
  OUTPUT_FOLDER_ID: '1lHNa8OQAEhIShhg5qQ-9J1OXsU8IMB-R',

  // ── Client Drive Root Folder ──────────────────────────────────────────────
  // The main folder "ISRM-Statistical Services Digital System" — paste its folder ID here
  CLIENT_DRIVE_ROOT_ID: '1kbif5Mn7QD1XI3ZY9YyQPOaZ26vOExu6',

  // ── Client Subfolder Name ─────────────────────────────────────────────────
  // Name of the subfolder inside ISRM-Statistical Services Digital System
  // where all client folders will be organized
  CLIENT_SUBFOLDER_NAME: 'Client Folders',

  // ── Appointment Booking Link ───────────────────────────────────────────────
  // Google Calendar appointment booking link for clients to schedule consultations
  APPOINTMENT_BOOKING_URL: 'https://calendar.app.google/Pbkvay5R4L5AJ8SP8',

  // ── Email Addresses ──────────────────────────────────────────────────────
  ISM_OFFICER_EMAIL:          'isrm_rise@slu.edu.ph',
  RISE_CENTER_DIRECTOR_EMAIL: 'holagto@slu.edu.ph',

  // ── Sheet Names (must match exactly) ────────────────────────────────────
  SHEET: {
    CLIENTS:  'Clients',
    URS:      'URS_Registry',
    SUMMARY:  'Financial_Summary',
  },

  // ── Fee Schedule (RSS Manual §II — current semester rates) ───────────────
  FEES: {
    CONSULT: {
      UG_SLU: 200, UG_NONSLU: 220,
      GRAD_SLU: 300, GRAD_NONSLU: 350,
    },
    FULL_ASSIST: {
      UG_SLU: 2000, UG_NONSLU: 2200,
      GRAD_SLU: 4500, GRAD_NONSLU: 5000,
    },
  },

  // ── 60/40 Honoraria Split (RSS Manual §IV.2.4) ───────────────────────────
  URS_PCT:  0.60,
  UNIT_PCT: 0.40,

  // ── Academic Year Settings ────────────────────────────────────────────────
  SEM: 'First Semester',
  AY:  '2025-2026',

  // ── Turnaround Time (TAT) in Working Days ──────────────────────────────────
  TAT: {
    FULL_ANALYSIS:     14,  // Full Statistical Assistance (14 working days)
    VALIDITY_RELIABILITY: 4,  // Reliability/Validity of Research Instrument
    CONSULTATION:      0,   // Consultation (no fixed TAT)
    MENTORING:         0,   // Mentoring Services (no fixed TAT)
    OTHERS:            10,  // Others
  },

  // ── Deadline Warning Thresholds (days before due) ───────────────────────────
  DEADLINE_WARNING: {
    CRITICAL: 2,   // Red alert: due within 2 days
    WARNING:  5,   // Orange alert: due within 5 days
    NOTICE:   10,  // Yellow notice: due within 10 days
  },

  // ── Column Indices in Clients Sheet (1-based, sync with setupDashboard) ──
  COL: {
    RECORD_ID:       1,  DATE:            2,  CLIENT_NAME:     3,
    ID_NUM:          4,  CONTACT:         5,  EMAIL:           6,
    DEPARTMENT:      7,  TITLE:           8,  FUNDING:         9,
    CATEGORY:       10,  AFFILIATION:   11,  SERVICE:        12,
    HOURS:          13,  TOTAL_FEE:     14,  OR_NUM:         15,
    PAY_DATE:       16,  PAY_STATUS:    17,  ASSIGNED_URS:   18,
    URS_SHARE:      19,  UNIT_SHARE:    20,  SEMESTER:       21,
    AY:             22,  STATUS:        23,  REMARKS:        24,
    RESEARCH_OBJECTIVES: 25, RESEARCH_QUESTIONS: 26, DRIVE_FOLDER: 27,
    ASSIGNMENT_DATE: 28, EXPECTED_COMPLETION: 29,
  },
};

// =============================================================================
// MENU — Adds "🎯 ISRM Operations" to the Google Sheets menu bar
// =============================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎯  ISRM Operations')
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('📄  Generate Reports')
        .addItem('FM-RIS-059  –  Semestral Report',           'generateSemestralReport')
        .addItem('FM-RIS-060  –  Honoraria Requisition',      'generateHonorariaRequisition')
    )
    .addSeparator()
    .addItem('📧  Send Satisfaction Survey Link (FM-RIS-003)', 'sendSatisfactionSurveyEmail')
    .addItem('📅  Send Appointment Booking Link',            'sendAppointmentLink')
    .addItem('💰  Financial Summary (Quick View)',              'showFinancialSummary')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('⏰  Deadline Reminders')
        .addItem('Enable Daily Reminders (8 AM)',              'setupDeadlineReminderTrigger')
        .addItem('Disable Daily Reminders',                   'removeDeadlineReminderTrigger')
        .addItem('Test Reminders Now',                        'testDeadlineReminders')
    )
    .addSeparator()
    .addItem('⚙️  Initialize / Reset Dashboard',              'setupDashboard')
    .addItem('🔗  Setup Form Submit Trigger (FM-RIS-002)',     'setupFormTrigger')
    .addItem('📊  URS Dashboard View',                         'showURSDashboard')
    .addToUi();
}

// =============================================================================
// ONEDIT TRIGGER
// Auto-calculates 60/40 split when Total Fee is entered or edited.
// Auto-stamps Record ID (ISRM-YYYY-NNNN) when Date is entered on a new row.
// Auto-sends appointment booking link when Payment Status is set to "Paid".
// =============================================================================
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEET.CLIENTS) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();
  const C   = CONFIG.COL;

  if (row < 2) return; // Protect header row

  // ── 60/40 split: fires whenever Total Fee is edited ──────────────────────
  if (col === C.TOTAL_FEE) {
    const fee = parseFloat(e.value) || 0;
    sheet.getRange(row, C.URS_SHARE ).setValue(parseFloat((fee * CONFIG.URS_PCT ).toFixed(2)));
    sheet.getRange(row, C.UNIT_SHARE).setValue(parseFloat((fee * CONFIG.UNIT_PCT).toFixed(2)));
  }

  // ── Auto-stamp Record ID when Date is entered on an empty row ────────────
  if (col === C.DATE && !sheet.getRange(row, C.RECORD_ID).getValue()) {
    const yr = new Date().getFullYear();
    const id = `ISRM-${yr}-${String(row - 1).padStart(4, '0')}`;
    sheet.getRange(row, C.RECORD_ID).setValue(id);
  }

  // ── Auto-send appointment booking link when Payment Status is set to "Paid" ─
  if (col === C.PAY_STATUS) {
    try {
      const newValue = e.value ? e.value.toString().trim() : '';
      
      Logger.log(`onEdit PAY_STATUS: new="${newValue}", row=${row}`);
      
      // Check if changed to "Paid" (case insensitive)
      if (newValue.toLowerCase() === 'paid') {
        Logger.log(`Payment Status set to Paid for row ${row}. Sending appointment link...`);
        
        // Add a small delay to ensure the cell is fully updated
        Utilities.sleep(1000);
        
        sendAppointmentLinkAuto(row);
      }
    } catch (err) {
      Logger.log(`Error in PAY_STATUS onEdit: ${err.message}`);
    }
  }

  // ── Auto-send URS notification when Assigned URS is set ─────────────────────
  if (col === C.ASSIGNED_URS && e.value) {
    try {
      const ursName = e.value.toString().trim();

      if (ursName && ursName !== '') {
        Logger.log(`onEdit ASSIGNED_URS: ursName="${ursName}", row=${row}`);

        // Add a small delay to ensure the cell is fully updated
        Utilities.sleep(1000);

        // Auto-stamp Assignment Date and Expected Completion
        onAssignURS(row, ursName);

        sendURSNotification(row, ursName);
      }
    } catch (err) {
      Logger.log(`Error in ASSIGNED_URS onEdit: ${err.message}`);
    }
  }
}

// =============================================================================
// FORM SUBMIT TRIGGER — onFormSubmit()
// Fires when a client submits the digital FM-RIS-002 (Google Form).
// Set up automatically via setupFormTrigger().
// =============================================================================
function onFormSubmit(e) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
  const r     = e.namedValues; // { "Field Label": ["Response value"] }

  // Helper: safely pull one response value by form field label
  const get = key => (r[key] || [''])[0].trim();

  // ── Pull form fields (labels must exactly match your Google Form) ─────────
  // NOTE: "Affiliation" is derived from the "School" field:
  //       - If School contains "External/Non-SLU" → Non-SLU
  //       - Otherwise → SLU
  const clientName = get('Client Name');
  const email      = get('Email Address');
  const category   = get('Research Category');   // 'Undergraduate' | 'Graduate' | 'Staff'
  const school     = get('School') || '';       // School field from form
  const affiliation = school.toLowerCase().includes('external') || school.toLowerCase().includes('non-slu') 
    ? 'Non-SLU' : 'SLU';                         // Derive affiliation from School
  const service    = get('Service Type');
  const hours      = parseFloat(get('No. of Hours')) || 1;

  // ── New fields for v5: Research Objectives and Research Questions ─────────
  const researchObjectives = get('Research Objectives');
  const researchQuestions  = get('Research Questions');

  // ── Capture Date from form field (mirrors original FM-RIS-002 Date field) ─
  // If the client left it blank, fall back to the submission timestamp.
  const now = new Date();
  const formDateRaw = get('Date');
  const requestDate = formDateRaw
    ? formDateRaw
    : Utilities.formatDate(now, 'Asia/Manila', 'MM/dd/yyyy');

  // ── Auto-calculate fee using affiliation from form ────────────────────────
  // Affiliation is now captured from the Google Form (SLU or Non-SLU).
  // Fee rates automatically adjust based on affiliation.
  const { totalFee, ursShare, unitShare } = calculateFee(service, category, hours, affiliation);

  // ── Determine current Semester and AY ────────────────────────────────────
  const month    = now.getMonth() + 1;
  const semester = (month >= 8 || month <= 1) ? 'First Semester' : 'Second Semester';
  const yr       = now.getFullYear();
  const ay       = (month >= 8) ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;

  // ── Generate Record ID ────────────────────────────────────────────────────
  const lastRow  = sheet.getLastRow();
  const recordId = `ISRM-${yr}-${String(lastRow).padStart(4, '0')}`;

  // ── Create Google Drive Folder for client files ──────────────────────────
  // Folder is created in "ISRM-Statistical Services Digital System" folder
  // Naming convention: [RecordID]_[ClientName]_[Affiliation]_[Category]
  const researchTitle = get('Research/Innovation Project Title') || 'Untitled Project';
  const folderResult = createClientFolder(recordId, clientName, researchTitle, affiliation, category);
  const driveFolderUrl = folderResult.success ? folderResult.url : '';

  // ── Append full record row to Clients sheet ───────────────────────────────
  sheet.appendRow([
    recordId,
    requestDate,              // Date from form field (or submission timestamp if blank)
    clientName,
    get('Student/Employee ID'),
    get('Contact Number'),
    email,
    get('Course/Department'),
    researchTitle,
    get('Funding Source'),
    category,
    affiliation || 'SLU',  // Affiliation — now from form (default to SLU if empty)
    service,
    hours,
    totalFee,   // Pre-computed at SLU base rate — adjust if client is Non-SLU
    '',         // OR Number — filled by ISM Officer after client pays at Finance Office
    '',         // Payment Date — filled by ISM Officer
    'Pending',  // Payment Status
    '',         // Assigned URS — filled by ISM Officer
    ursShare,   // Pre-computed 60% of current Total Fee
    unitShare,  // Pre-computed 40% of current Total Fee
    semester,
    ay,
    'New',      // Status
    '',         // Remarks
    researchObjectives,        // New: Research Objectives (Col 25)
    researchQuestions,         // New: Research Questions (Col 26)
    driveFolderUrl,           // New: Drive Folder URL (Col 27)
  ]);

  // ── Email 1: Client Acknowledgment ───────────────────────────────────────
  if (email) {
    // Get the FM-RIS-002 form PDF attachment
    let formAttachment = [];
    if (CONFIG.FM_RIS_002_FORM_ID) {
      try {
        const formFile = DriveApp.getFileById(CONFIG.FM_RIS_002_FORM_ID);
        formAttachment = [formFile];
        Logger.log('Attached FM-RIS-002 form to client email');
      } catch (e) {
        Logger.log('Could not attach FM-RIS-002 form: ' + e.message);
      }
    }

    GmailApp.sendEmail(
      email,
      `[SLU ISRM] Service Request Received — ${recordId}`,
      `Dear ${clientName},\n\n` +
      `Your statistical service request has been received and logged.\n\n` +
      `── REQUEST DETAILS ──────────────────────────────────\n` +
      `Record ID    : ${recordId}\n` +
      `Date         : ${requestDate}\n` +
      `Service Type : ${service}\n` +
      `Research     : ${get('Research/Innovation Project Title')}\n` +
      `Category     : ${category}\n` +
      `Affiliation  : ${affiliation || 'SLU'}\n` +
      `Estimated Fee: ₱${totalFee.toLocaleString()}\n` +
      `────────────────────────────────────────────────────\n\n` +
      `YOUR DRIVE FOLDER:\n` +
      `A Google Drive folder has been created for your project files.\n` +
      `Access it here: ${driveFolderUrl}\n\n` +
      `IMPORTANT: UPLOAD DOCUMENTS ONLINE (No need to visit the office!)\n` +
      `────────────────────────────────────────────────────\n` +
      `After paying at the Finance Office, please upload the following\n` +
      `documents to your Drive folder's "Others" subfolder:\n\n` +
      `  1. Scanned / Photo of your Official Payment Receipt\n` +
      `  2. Scanned / Photo of your filled-out FM-RIS-002 form\n\n` +
      `UPLOAD INSTRUCTIONS:\n` +
      `  • Go to your Drive folder: ${driveFolderUrl}\n` +
      `  • Open the "Others" subfolder\n` +
      `  • Upload clear photos or scans of both documents\n\n` +
      `NOTE: Your consultation will NOT proceed until you have uploaded\n` +
      `both documents to your Drive folder. The ISRM Officer will verify\n` +
      `your payment upon reviewing the uploaded files.\n\n` +
      `APPOINTMENT SCHEDULING\n` +
      `────────────────────────────────────────────────────\n` +
      `After you have:\n` +
      `  ✓ Paid the fee at the Finance Office\n` +
      `  ✓ Uploaded your Official Receipt and FM-RIS-002 form to the\n` +
      `    "Others" subfolder in your Drive folder\n` +
      `\n` +
      `The ISRM Officer will verify your payment and you will receive an\n` +
      `email with the appointment booking link to schedule your consultation.\n\n` +
      `NEXT STEPS:\n` +
      `  1. Download and fill out the FM-RIS-002 form (see attachment)\n` +
      `  2. Pay ₱${totalFee.toLocaleString()} at the SLU Finance Office\n` +
      `  3. Upload your Official Receipt to your Drive folder → "Others"\n` +
      `  4. Upload your filled-out FM-RIS-002 form to your Drive folder → "Others"\n` +
      `  5. Wait for payment verification — you will receive an email with\n` +
      `     the appointment booking link after the ISRM Officer verifies your uploads\n` +
      `  6. Upload your research files to the appropriate subfolders\n\n` +
      `For inquiries:\n` +
      `  📧 ${CONFIG.ISM_OFFICER_EMAIL}\n` +
      `  📞 (074) 444-8246 to 48 local 387\n\n` +
      `ISRM Unit — Institutional Studies & Research Methods\n` +
      `Research, Innovation, and Sustainable Extension Center (RISE Center)\n` +
      `Saint Louis University · Baguio City 2600\n\n` +
      `This is an automated message. Please do not reply directly to this email.`,
      { attachments: formAttachment }
    );
  }

  // ── Email 2: ISM Officer Alert ────────────────────────────────────────────
  GmailApp.sendEmail(
    CONFIG.ISM_OFFICER_EMAIL,
    `[ISRM Dashboard] New Request — ${recordId} | ${service}`,
    `New statistical service request logged:\n\n` +
    `── REQUEST DETAILS ──────────────────────────────────\n` +
    `Record ID   : ${recordId}\n` +
    `Date        : ${requestDate}\n` +
    `Client      : ${clientName} (${get('Student/Employee ID')})\n` +
    `Department  : ${get('Course/Department')}\n` +
    `Affiliation : ${affiliation || 'SLU'}\n` +
    `Service     : ${service} (${hours} hr)\n` +
    `Category    : ${category}\n` +
    `Research    : ${get('Research/Innovation Project Title')}\n` +
    `Objectives  : ${researchObjectives || 'Not provided'}\n` +
    `Research Qs : ${researchQuestions || 'Not provided'}\n` +
    `Drive Folder: ${driveFolderUrl || 'Failed to create'}\n` +
    `────────────────────────────────────────────────────\n` +
    `FEE BREAKDOWN (60/40 Rule — ${affiliation || 'SLU'} rate):\n` +
    `  Total Fee   : ₱${totalFee.toLocaleString()}\n` +
    `  URS Share   : ₱${ursShare.toLocaleString()} (60%)\n` +
    `  Unit Share  : ₱${unitShare.toLocaleString()} (40%)\n\n` +
    `ACTIONS REQUIRED IN DASHBOARD:\n` +
    `  1. Confirm Affiliation (Col K) — derived from School field\n` +
    `  2. Verify fee calculation (Col N) — auto-calculated based on affiliation\n` +
    `  3. Monitor client's Drive folder "Others" subfolder for uploaded\n` +
    `     Official Receipt and FM-RIS-002 form\n` +
    `  4. After verifying uploaded documents, change Payment Status to "Paid"\n` +
    `     (system will auto-send appointment booking link to client)\n` +
    `  5. Assign a URS (Column R) based on expertise and availability\n` +
    `  6. Update Status from "New" to "In Progress" once consultation begins\n` +
    `  7. Share Drive folder with assigned URS for file access\n\n` +
    `📊 Open Dashboard: ${ss.getUrl()}`
  );
}

// =============================================================================
// GENERATE FM-RIS-059 — Statistical Services Semestral Report
// =============================================================================
function generateSemestralReport() {
  const ui  = SpreadsheetApp.getUi();
  const res = ui.prompt(
    'Generate FM-RIS-059 — Semestral Report',
    'Enter Semester and AY\n(Example: "Second Semester, AY 2024-2025"):',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;

  const label = res.getResponseText().trim();
  if (!label) {
    ui.alert('⚠️  No Semester/AY entered. Please try again.');
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.CLIENTS);
  const rows  = sheet.getDataRange().getValues().slice(1);
  const C     = CONFIG.COL;

  let totalFees = 0;
  const reportRows = rows
    .filter(r => r[C.RECORD_ID - 1]) // non-empty rows only
    .map(r => {
      const fee = parseFloat(r[C.TOTAL_FEE - 1]) || 0;
      totalFees += fee;
      return {
        date    : r[C.DATE - 1]
                  ? Utilities.formatDate(new Date(r[C.DATE - 1]), 'Asia/Manila', 'MM/dd/yyyy')
                  : '—',
        client  : `${r[C.CLIENT_NAME - 1] || ''}\n(${r[C.CATEGORY - 1] || ''} · ${r[C.AFFILIATION - 1] || ''})`,
        services: `${r[C.SERVICE - 1] || ''} — ${r[C.HOURS - 1] || 1} hr` +
                  `\n₱${fee.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
        urs     : r[C.ASSIGNED_URS - 1] || '—',
        remarks : r[C.REMARKS     - 1] || '—',
      };
    });

  if (reportRows.length === 0) {
    ui.alert('⚠️  No records found in the Clients sheet. Add client records first.');
    return;
  }

  // ── Populate Google Doc template with header placeholders ────────────────
  const docId = populateDocTemplate(CONFIG.FM_RIS_059_TEMPLATE_ID, {
    '{{SEMESTER_AY}}' : label,
    '{{DATE}}'        : Utilities.formatDate(new Date(), 'Asia/Manila', 'MMMM dd, yyyy'),
    '{{TOTAL_FEES}}'  : `₱${totalFees.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
    '{{URS_SHARE}}'   : `₱${(totalFees * CONFIG.URS_PCT ).toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
    '{{UNIT_SHARE}}'  : `₱${(totalFees * CONFIG.UNIT_PCT).toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
  });

  Logger.log('FM-RIS-059: Filling table with ' + reportRows.length + ' rows');
  
  // ── Fill the data table ──────────────────────────────────────────────────────
  fillDocTable(docId, reportRows, ['date', 'client', 'services', 'urs', 'remarks']);

  // ── Save as PDF in Drive ──────────────────────────────────────────────────
  const fileName = `FM-RIS-059_${label.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const pdf      = saveToPDF(docId, fileName);

  ui.alert(
    `✅  FM-RIS-059 Generated Successfully!\n\n` +
    `Semester/AY   : ${label}\n` +
    `Total Records : ${reportRows.length}\n` +
    `Total Fees    : ₱${totalFees.toLocaleString()}\n` +
    `URS Share 60% : ₱${(totalFees * 0.60).toLocaleString()}\n` +
    `Unit Share 40%: ₱${(totalFees * 0.40).toLocaleString()}\n\n` +
    `PDF saved to Google Drive (ISRM Generated Reports folder):\n${pdf.getUrl()}\n\n` +
    `Next step: Print and submit to RISE Center Director for "Noted by" signature.`
  );
}

// =============================================================================
// GENERATE FM-RIS-060 — Requisition for Honoraria of URS
// Addressed to the Finance Office (per official form FM-RIS-060 Rev.01)
// =============================================================================
function generateHonorariaRequisition() {
  const ui  = SpreadsheetApp.getUi();
  const res = ui.prompt(
    'Generate FM-RIS-060 — Honoraria Requisition',
    'Enter the period for honoraria\n(e.g., "January 2025" or "Second Semester AY 2024-2025"):',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;

  const period = res.getResponseText().trim();
  if (!period) {
    ui.alert('⚠️  No period entered. Please try again.');
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.CLIENTS);
  const rows  = sheet.getDataRange().getValues().slice(1);
  const C     = CONFIG.COL;

  // ── Group paid records by assigned URS ───────────────────────────────────
  const byURS = {};
  rows.forEach(r => {
    const urs    = r[C.ASSIGNED_URS - 1];
    const status = r[C.PAY_STATUS   - 1];
    const fee    = parseFloat(r[C.TOTAL_FEE - 1]) || 0;
    const share  = parseFloat(r[C.URS_SHARE - 1]) || 0;

    if (!urs || status !== 'Paid') return; // Only PAID records with assigned URS

    if (!byURS[urs]) byURS[urs] = { name: urs, clients: [], totalHonoraria: 0 };
    byURS[urs].clients.push({
      no        : '',
      ursName   : '',
      client    : r[C.CLIENT_NAME - 1] || '',
      service   : `${r[C.SERVICE - 1] || ''} / ₱${fee.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
      fee       : `₱${fee.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
      share     : `₱${share.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
    });
    byURS[urs].totalHonoraria += share;
  });

  if (!Object.keys(byURS).length) {
    ui.alert(
      '⚠️  No paid records with assigned URS found.\n\n' +
      'Please ensure:\n' +
      '  • "Payment Status" column = "Paid"\n' +
      '  • "Assigned URS" column is filled\n' +
      '  for the records you want to include.'
    );
    return;
  }

  const grandTotal = Object.values(byURS).reduce((sum, u) => sum + u.totalHonoraria, 0);

  // ── Populate FM-RIS-060 Google Doc template ───────────────────────────────
  const docId = populateDocTemplate(CONFIG.FM_RIS_060_TEMPLATE_ID, {
    '{{DATE}}'        : Utilities.formatDate(new Date(), 'Asia/Manila', 'MMMM dd, yyyy'),
    '{{PERIOD}}'      : period,
    '{{GRAND_TOTAL}}' : `₱${grandTotal.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
  });

  Logger.log('FM-RIS-060: Filling table with rows');

  // ── Build flat table rows: one block per URS, sub-rows per client ─────────
  const tableRows = [];
  let idx = 1;

  Object.values(byURS).forEach(ursData => {
    ursData.clients.forEach((client, i) => {
      tableRows.push({
        no      : i === 0 ? `${idx}.` : '',
        ursName : i === 0 ? ursData.name : '',
        client  : client.client,
        service : client.service,
        share   : client.share,
      });
    });
    // Total amount due row per URS
    tableRows.push({
      no: '', ursName: '', client: '',
      service: 'Total amount due',
      share: `P  ₱${ursData.totalHonoraria.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
    });
    idx++;
  });

  fillDocTable(docId, tableRows, ['no', 'ursName', 'client', 'service', 'share']);

  // ── Grand total row appended to doc body (placeholder was replaced) ───────

  // ── Save PDF ──────────────────────────────────────────────────────────────
  const fileName = `FM-RIS-060_${period.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const pdf      = saveToPDF(docId, fileName);

  const summary = Object.values(byURS)
    .map(u => `  • ${u.name}: ₱${u.totalHonoraria.toLocaleString()}`)
    .join('\n');

  ui.alert(
    `✅  FM-RIS-060 Generated Successfully!\n\n` +
    `Period      : ${period}\n` +
    `URS Count   : ${idx - 1}\n` +
    `Grand Total : ₱${grandTotal.toLocaleString()}\n\n` +
    `Per-URS Breakdown:\n${summary}\n\n` +
    `PDF saved to Google Drive (ISRM Generated Reports folder):\n${pdf.getUrl()}\n\n` +
    `Next steps:\n` +
    `  1. Print the PDF\n` +
    `  2. Get "Noted by" signature from RISE Center Director\n` +
    `  3. Submit to Finance Office for VP Finance approval\n` +
    `  4. URS honoraria will be released after VP Finance sign-off`
  );
}

// =============================================================================
// SEND SATISFACTION SURVEY EMAIL — FM-RIS-003
// Sends digital FM-RIS-003 link to a completed client
// =============================================================================
function sendSatisfactionSurveyEmail() {
  const ui  = SpreadsheetApp.getUi();
  const res = ui.prompt(
    'Send FM-RIS-003 Satisfaction Survey',
    'Enter the client\'s email address:',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;

  const email = res.getResponseText().trim();
  if (!email || !email.includes('@')) {
    ui.alert('⚠️  Invalid email address. Please try again.');
    return;
  }

  // ── Get the client's research title for a personalized email ─────────────
  const titleRes = ui.prompt(
    'Research Title',
    'Enter the client\'s research/project title (for the email subject line):',
    ui.ButtonSet.OK_CANCEL
  );
  if (titleRes.getSelectedButton() !== ui.Button.OK) return;
  const title = titleRes.getResponseText().trim();

  // ── IMPORTANT: Replace this URL with your actual Google Form URL for FM-RIS-003 ──
  const SURVEY_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdSC4CGwn7EZDMMK_6vUhJHxtY-0PEea8nGYOBU6SvirSJzaA/viewform?usp=sharing&ouid=105963056044318429809';

  GmailApp.sendEmail(
    email,
    `[SLU ISRM] Kindly Rate Our Service — FM-RIS-003 Customer Satisfaction Survey`,
    `Dear Researcher,\n\n` +
    `Thank you for availing of the statistical services of the ISRM Unit. We hope the\n` +
    `consultation was valuable to your research on:\n\n` +
    `"${title}"\n\n` +
    `We would appreciate your feedback. Kindly complete the Customer Satisfaction\n` +
    `Survey (FM-RIS-003) by clicking the link below — it takes less than 2 minutes:\n\n` +
    `📝 Survey Link: ${SURVEY_URL}\n\n` +
    `Your responses are confidential and will help us improve the quality of our\n` +
    `statistical services. Thank you very much.\n\n` +
    `ISRM Unit — Institutional Studies & Research Methods\n` +
    `Research, Innovation, and Sustainable Extension Center (RISE Center)\n` +
    `Saint Louis University · Baguio City 2600`
  );

  ui.alert(
    `✅  FM-RIS-003 survey email sent to:\n${email}\n\n` +
    `Research: ${title}`
  );
}

// =============================================================================
// SEND APPOINTMENT BOOKING LINK — Send Google Calendar booking link to client
// Used after client has confirmed payment and is ready to schedule consultation
// =============================================================================
function sendAppointmentLink() {
  const ui  = SpreadsheetApp.getUi();
  
  // Get the active sheet and allow user to select a row
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.CLIENTS);
  const activeCell = sheet.getActiveCell();
  const row = activeCell.getRow();
  
  if (row < 2) {
    ui.alert('⚠️  Please select a client row (not the header) to send the appointment link.');
    return;
  }
  
  const C = CONFIG.COL;
  const clientName = sheet.getRange(row, C.CLIENT_NAME).getValue();
  const email = sheet.getRange(row, C.EMAIL).getValue();
  const recordId = sheet.getRange(row, C.RECORD_ID).getValue();
  const payStatus = sheet.getRange(row, C.PAY_STATUS).getValue();
  
  if (!email) {
    ui.alert('⚠️  No email address found for this client.');
    return;
  }
  
  if (payStatus !== 'Paid') {
    const proceed = ui.alert(
      '⚠️  Payment Status Warning',
      `This client's Payment Status is "${payStatus}", not "Paid".\n\n` +
      `Are you sure you want to send the appointment booking link?`,
      ui.ButtonSet.YES_NO
    );
    if (proceed !== ui.Button.YES) return;
  }
  
  // Send the appointment booking email
  GmailApp.sendEmail(
    email,
    `[SLU ISRM] Book Your Consultation Appointment — ${recordId}`,
    `Dear ${clientName},\n\n` +
    `Your payment has been confirmed. You may now book your appointment\n` +
    `with the ISRM Officer to discuss your research consultation or\n` +
    `your availed service (${service}).\n\n` +
    `── APPOINTMENT BOOKING ───────────────────────────────\n` +
    `Please use the link below to select your preferred date and time:\n\n` +
    `📅 Booking Link: ${CONFIG.APPOINTMENT_BOOKING_URL}\n\n` +
    `INSTRUCTIONS:\n` +
    `  1. Click the booking link above\n` +
    `  2. Select an available time slot that works for you\n` +
    `  3. Complete the booking details\n` +
    `  4. You will receive a calendar invite with confirmation\n\n` +
    `NOTE: Please book at least 24 hours in advance. If you need to reschedule,\n` +
    `use the reschedule link in your calendar invite or contact the ISRM Officer.\n\n` +
    `If you have any questions or need assistance, please contact:\n` +
    `  📧 ${CONFIG.ISM_OFFICER_EMAIL}\n` +
    `  📞 (074) 444-8246 to 48 local 387\n\n` +
    `We look forward to assisting you with your research!\n\n` +
    `ISRM Unit — Institutional Studies & Research Methods\n` +
    `Research, Innovation, and Sustainable Extension Center (RISE Center)\n` +
    `Saint Louis University · Baguio City 2600`
  );
  
  ui.alert(
    `✅  Appointment booking link sent to:\n${email}\n\n` +
    `Client: ${clientName}\n` +
    `Record ID: ${recordId}`
  );
}

// =============================================================================
// AUTO-SEND APPOINTMENT LINK — Called automatically when Payment Status = "Paid"
// This is triggered by the onEdit() function when Payment Status is changed to "Paid"
// =============================================================================
function sendAppointmentLinkAuto(row) {
  Logger.log(`sendAppointmentLinkAuto: Starting for row ${row}`);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.CLIENTS);
  const C = CONFIG.COL;

  const clientName = sheet.getRange(row, C.CLIENT_NAME).getValue();
  const email = sheet.getRange(row, C.EMAIL).getValue();
  const recordId = sheet.getRange(row, C.RECORD_ID).getValue();
  const service = sheet.getRange(row, C.SERVICE).getValue();

  Logger.log(`sendAppointmentLinkAuto: clientName=${clientName}, email=${email}, recordId=${recordId}, service=${service}`);

  if (!email) {
    Logger.log(`sendAppointmentLinkAuto: No email for row ${row}`);
    return;
  }

  if (!clientName) {
    Logger.log(`sendAppointmentLinkAuto: No client name for row ${row}`);
    return;
  }

  // Send the appointment booking email
  GmailApp.sendEmail(
    email,
    `[SLU ISRM] Payment Confirmed — Book Your Consultation — ${recordId}`,
    `Dear ${clientName},\n\n` +
    `✅ PAYMENT CONFIRMED\n` +
    `Your payment for the statistical service has been verified and confirmed.\n` +
    `You may now book your appointment with the ISRM Officer to discuss\n` +
    `your research consultation or your availed service (${service}).\n\n` +
    `── SERVICE DETAILS ──────────────────────────────\n` +
    `Record ID    : ${recordId}\n` +
    `Service Type : ${service}\n` +
    `────────────────────────────────────────────────\n\n` +
    `📅 BOOK YOUR APPOINTMENT\n` +
    `Please use the link below to select your preferred date and time:\n\n` +
    `${CONFIG.APPOINTMENT_BOOKING_URL}\n\n` +
    `INSTRUCTIONS:\n` +
    `  1. Click the booking link above\n` +
    `  2. Select an available time slot that works for you\n` +
    `  3. Complete the booking details\n` +
    `  4. You will receive a calendar invite with confirmation\n\n` +
    `NOTE: Please book at least 24 hours in advance. If you need to reschedule,\n` +
    `use the reschedule link in your calendar invite or contact the ISRM Officer.\n\n` +
    `If you have any questions or need assistance, please contact:\n` +
    `  📧 ${CONFIG.ISM_OFFICER_EMAIL}\n` +
    `  📞 (074) 444-8246 to 48 local 387\n\n` +
    `We look forward to assisting you with your research!\n\n` +
    `ISRM Unit — Institutional Studies & Research Methods\n` +
    `Research, Innovation, and Sustainable Extension Center (RISE Center)\n` +
    `Saint Louis University · Baguio City 2600`
  );

  Logger.log(`Auto-sent appointment link to ${email} for record ${recordId}`);
}

// =============================================================================
// URS NOTIFICATION — Send email to URS when assigned to a client
// This is triggered by the onEdit() function when Assigned URS is set
// =============================================================================
function sendURSNotification(row, ursName) {
  Logger.log(`sendURSNotification: Starting for row ${row}, URS: ${ursName}`);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.CLIENTS);
  const C = CONFIG.COL;

  const clientName = sheet.getRange(row, C.CLIENT_NAME).getValue();
  const clientEmail = sheet.getRange(row, C.EMAIL).getValue();
  const recordId = sheet.getRange(row, C.RECORD_ID).getValue();
  const service = sheet.getRange(row, C.SERVICE).getValue();
  const researchTitle = sheet.getRange(row, C.TITLE).getValue();
  const category = sheet.getRange(row, C.CATEGORY).getValue();
  const fee = sheet.getRange(row, C.TOTAL_FEE).getValue();
  const ursShare = sheet.getRange(row, C.URS_SHARE).getValue();
  const driveFolderUrl = sheet.getRange(row, C.DRIVE_FOLDER).getValue();
  const researchObjectives = sheet.getRange(row, C.RESEARCH_OBJECTIVES).getValue();
  const researchQuestions = sheet.getRange(row, C.RESEARCH_QUESTIONS).getValue();

  Logger.log(`sendURSNotification: clientName=${clientName}, service=${service}, researchTitle=${researchTitle}`);

  // Get URS email from URS_Registry sheet
  const ursSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.URS);
  const ursData = ursSheet.getDataRange().getValues();
  let ursEmail = '';
  
  for (let i = 1; i < ursData.length; i++) {
    if (ursData[i][1] === ursName) { // Column B is Full Name
      ursEmail = ursData[i][5]; // Column F is Email
      break;
    }
  }

  if (!ursEmail) {
    Logger.log(`sendURSNotification: URS email not found for ${ursName}`);
    // Still send notification but without URS email - will go to ISM Officer
  }

  // Prepare email content
  const emailSubject = `[ISRM] New Client Assignment — ${recordId} | ${ursName}`;
  const emailBody = 
`Dear ${ursName},

You have been assigned as the University Research Statistician (URS) for a new client.

── CLIENT DETAILS ─────────────────────────────────────
Record ID    : ${recordId}
Client Name  : ${clientName}
Email        : ${clientEmail}
Category     : ${category}
Service Type : ${service}
Research     : ${researchTitle}
────────────────────────────────────────────────────

── PROJECT DETAILS ────────────────────────────────────
Total Fee    : ₱${parseFloat(fee || 0).toLocaleString()}
Your Share   : ₱${parseFloat(ursShare || 0).toLocaleString()} (60%)

Research Objectives:
${researchObjectives || 'Not provided'}

Research Questions:
${researchQuestions || 'Not provided'}
────────────────────────────────────────────────────

── DRIVE FOLDER ───────────────────────────────────────
Access client's files here:
${driveFolderUrl || 'Not available'}

Please review the client's files and coordinate with the ISRM Officer
for the consultation schedule.

── NEXT STEPS ─────────────────────────────────────────
1. Access the client's Drive folder
2. Review the manuscript, data-gathering tool, and data files
3. Coordinate with the ISRM Officer for the consultation meeting
4. Update the project status as needed

If you have any questions, please contact the ISRM Officer:
📧 ${CONFIG.ISM_OFFICER_EMAIL}
📞 (074) 444-8246 to 48 local 387

Thank you for your service!

ISRM Unit — Institutional Studies & Research Methods
Research, Innovation, and Sustainable Extension Center (RISE Center)
Saint Louis University · Baguio City 2600`;

  // Send email to URS
  if (ursEmail) {
    GmailApp.sendEmail(ursEmail, emailSubject, emailBody);
    Logger.log(`Sent URS notification to ${ursEmail}`);
    
    // Also notify ISM Officer
    GmailApp.sendEmail(
      CONFIG.ISM_OFFICER_EMAIL,
      `[ISRM Dashboard] URS Assigned — ${recordId} | ${ursName}`,
      `URS ${ursName} has been assigned to client ${clientName} (${recordId}).\n\n` +
      `An notification email has been sent to the URS at ${ursEmail}.\n\n` +
      `Client: ${clientName}\n` +
      `Service: ${service}\n` +
      `Research: ${researchTitle}\n` +
      `Your Share: ₱${parseFloat(ursShare || 0).toLocaleString()}`
    );
  } else {
    // No URS email found, notify ISM Officer
    GmailApp.sendEmail(
      CONFIG.ISM_OFFICER_EMAIL,
      `[ISRM Dashboard] URS Assigned (No URS Email) — ${recordId}`,
      `⚠️ URS "${ursName}" was assigned to ${clientName} (${recordId}) but no email\n` +
      `was found in the URS_Registry sheet. Please update the URS email address.\n\n` +
      `Client: ${clientName}\n` +
      `Service: ${service}\n` +
      `Research: ${researchTitle}`
    );
  }
}

// =============================================================================
// FINANCIAL SUMMARY — Quick popup overview of all paid records
// =============================================================================
function showFinancialSummary() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.CLIENTS);
  const rows  = sheet.getDataRange().getValues().slice(1);
  const C     = CONFIG.COL;

  let paid = 0, pending = 0, completed = 0;
  let totalFee = 0, totalURS = 0, totalUnit = 0;

  rows.forEach(r => {
    if (!r[C.RECORD_ID - 1]) return;
    const fee = parseFloat(r[C.TOTAL_FEE - 1]) || 0;
    if (r[C.PAY_STATUS - 1] === 'Paid') {
      totalFee  += fee;
      totalURS  += fee * CONFIG.URS_PCT;
      totalUnit += fee * CONFIG.UNIT_PCT;
      paid++;
    } else {
      pending++;
    }
    if (r[C.STATUS - 1] === 'Completed') completed++;
  });

  SpreadsheetApp.getUi().alert(
    `📊  ISRM Financial Summary\n` +
    `${'━'.repeat(42)}\n` +
    `Gross Fees Collected : ₱${totalFee .toLocaleString()}\n` +
    `URS Share (60%)      : ₱${totalURS .toLocaleString()}\n` +
    `Unit Share (40%)     : ₱${totalUnit.toLocaleString()}\n` +
    `${'━'.repeat(42)}\n` +
    `Paid Records         : ${paid}\n` +
    `Pending Payment      : ${pending}\n` +
    `Completed Sessions   : ${completed}\n` +
    `Total Records        : ${paid + pending}`
  );
}

// =============================================================================
// HELPER — Populate a Google Doc template with {{PLACEHOLDER}} replacements
//          Returns the ID of the new working copy (temporary Doc)
// =============================================================================
function populateDocTemplate(templateId, replacements) {
  try {
    Logger.log('populateDocTemplate: templateId=' + templateId);
    Logger.log('OUTPUT_FOLDER_ID: ' + CONFIG.OUTPUT_FOLDER_ID);
    
    const folder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
    Logger.log('Got folder: ' + folder.getName());
    
    const templateFile = DriveApp.getFileById(templateId);
    Logger.log('Got template file: ' + templateFile.getName());
    
    const copy = templateFile.makeCopy(`__WORKING_${Date.now()}`, folder);
    Logger.log('Made copy: ' + copy.getId());
    
    const doc = DocumentApp.openById(copy.getId());
    const body = doc.getBody();
    Logger.log('Opened doc, body type: ' + body.getType());

    Object.entries(replacements).forEach(([placeholder, value]) => {
      body.replaceText(placeholder, value || '—');
    });

    doc.saveAndClose();
    Logger.log('Returning docId: ' + copy.getId());
    return copy.getId();
  } catch (e) {
    Logger.log('Error in populateDocTemplate: ' + e.message);
    throw e;
  }
}

// =============================================================================
// HELPER — Fill a table in a Google Doc with data row objects.
//          Automatically finds the data table (most columns) and fills it.
// =============================================================================
function fillDocTable(docId, dataRows, keys, tableIndex = null) {
  const doc   = DocumentApp.openById(docId);
  const body  = doc.getBody();
  const tables = body.getTables();
  
  Logger.log('fillDocTable: Found ' + tables.length + ' tables');
  
  let table;
  let actualIndex;
  
  if (tableIndex !== null && tables[tableIndex]) {
    table = tables[tableIndex];
    actualIndex = tableIndex;
    Logger.log('Using specified table index: ' + tableIndex);
  } else {
    // Auto-find: prioritize tables with 0 rows (empty data table)
    // then tables with most columns
    let maxCols = 0;
    let tableWithZeroRows = null;
    
    for (let i = 0; i < tables.length; i++) {
      const numRows = tables[i].getNumRows();
      const numCols = numRows > 0 ? tables[i].getRow(0).getNumCells() : 0;
      Logger.log('Table ' + i + ': ' + numRows + ' rows, ' + numCols + ' columns');
      
      // First, look for empty table (0 rows) - likely the data table
      if (numRows === 0 && tableWithZeroRows === null) {
        tableWithZeroRows = i;
        Logger.log('Found empty table at index ' + i);
      }
      
      if (numCols > maxCols) {
        maxCols = numCols;
        table = tables[i];
        actualIndex = i;
      }
    }
    
    // If we found an empty table, use that instead
    if (tableWithZeroRows !== null) {
      table = tables[tableWithZeroRows];
      actualIndex = tableWithZeroRows;
      Logger.log('Using empty table at index: ' + actualIndex);
    } else {
      Logger.log('Auto-selected table index: ' + actualIndex + ' with ' + maxCols + ' columns');
    }
  }

  if (!table) {
    Logger.log('⚠️  No table found in template Doc');
    doc.saveAndClose();
    return;
  }

  // Remove all rows after the header (row 0)
  while (table.getNumRows() > 1) {
    table.removeRow(table.getNumRows() - 1);
  }

  Logger.log('Table has ' + table.getNumRows() + ' rows');
  
  // Append one row per data entry
  Logger.log('Adding ' + dataRows.length + ' data rows...');
  dataRows.forEach((rowObj, idx) => {
    try {
      const tableRow = table.appendTableRow();
      
      // For each key, create cell and set text
      keys.forEach((k, kidx) => {
        const cell = tableRow.appendTableCell();
        const text = String(rowObj[k] || '');
        cell.setText(text);
        
        // Force text color to black - this is critical!
        const paragraph = cell.getChild(0);
        if (paragraph) {
          try {
            paragraph.asText().setForegroundColor('#000000');
          } catch(e) {
            // If asText fails, try regular paragraph
            paragraph.setForegroundColor('#000000');
          }
        }
        // Also set background to white (in case text was transparent)
        cell.setBackgroundColor('#ffffff');
      });
      Logger.log('Added row ' + idx);
    } catch (e) {
      Logger.log('Error on row ' + idx + ': ' + e.message);
    }
  });
  Logger.log('Done adding rows');

  doc.saveAndClose();
}

// =============================================================================
// HELPER — Convert a Google Doc to PDF, save to OUTPUT_FOLDER, delete temp Doc
//          Returns the DriveFile object for the saved PDF
// =============================================================================
function saveToPDF(docId, fileName) {
  try {
    Logger.log('saveToPDF: Starting for docId=' + docId + ', fileName=' + fileName);
    Logger.log('OUTPUT_FOLDER_ID: ' + CONFIG.OUTPUT_FOLDER_ID);
    
    const folder  = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
    Logger.log('Got folder: ' + folder.getName());
    
    const originalDoc = DriveApp.getFileById(docId);
    Logger.log('Got original doc');
    
    const pdfBlob = originalDoc.getBlob().setName(`${fileName}.pdf`);
    Logger.log('Created PDF blob');
    
    const pdfFile = folder.createFile(pdfBlob);
    Logger.log('Created PDF file: ' + pdfFile.getName());
    
    // Trash the working Doc copy (the PDF is the deliverable)
    originalDoc.setTrashed(true);
    Logger.log('Trashed original doc');
    
    return pdfFile;
  } catch (e) {
    Logger.log('Error in saveToPDF: ' + e.message);
    throw e;
  }
}

// =============================================================================
// HELPER — Fee Calculation Engine
//          Enforces the fee schedule from RSS Manual §II.
//          "Affiliation" is derived from the "School" field in the Google Form:
//            - If School contains "External" or "Non-SLU" → Non-SLU
//            - Otherwise → SLU
//          Fee rates automatically adjust based on affiliation.
//          Returns { totalFee, ursShare, unitShare }
// =============================================================================
function calculateFee(serviceType, category, hours, affiliation = 'SLU') {
  const F  = CONFIG.FEES;
  const ug = (category === 'Undergraduate');
  const isSLU = (affiliation && affiliation.toString().trim().toUpperCase() === 'SLU');
  let fee  = 0;

  // Determine rates based on affiliation (SLU or Non-SLU)
  if (serviceType === 'Consultation') {
    const rate = ug 
      ? (isSLU ? F.CONSULT.UG_SLU : F.CONSULT.UG_NONSLU)
      : (isSLU ? F.CONSULT.GRAD_SLU : F.CONSULT.GRAD_NONSLU);
    fee = rate * (hours || 1);

  } else if (serviceType === 'Full Statistical Assistance') {
    fee = ug 
      ? (isSLU ? F.FULL_ASSIST.UG_SLU : F.FULL_ASSIST.UG_NONSLU)
      : (isSLU ? F.FULL_ASSIST.GRAD_SLU : F.FULL_ASSIST.GRAD_NONSLU);

  } else if (serviceType === 'Reliability/Validity of Research Instrument') {
    fee = isSLU ? 500 : 550;   // Non-SLU adds 10%

  } else if (serviceType === 'Mentoring Services') {
    fee = isSLU ? 300 : 330;   // Non-SLU adds 10%
  }
  // 'Others' and officially funded grantees = 0 (ISM Officer adjusts as needed)

  return {
    totalFee : fee,
    ursShare : parseFloat((fee * CONFIG.URS_PCT ).toFixed(2)),
    unitShare: parseFloat((fee * CONFIG.UNIT_PCT).toFixed(2)),
  };
}

// =============================================================================
// CLIENT FOLDER CREATION — createClientFolder()
// Creates a Google Drive folder for each client with subfolders:
//   • Manuscript
//   • Data Gathering Tool
//   • Data Files
//   • Others
// 
// Folder Naming Convention: [RecordID]_[ClientName]_[Affiliation]_[Category]
// Example: ISRM-2025-0001_JohnDoe_SLU_Graduate
//
// Structure:
//   ISRM-Statistical Services Digital System (root)
//   └── Client Folders (subfolder - configurable via CLIENT_SUBFOLDER_NAME)
//       └── [RecordID]_[ClientName]_[Affiliation]_[Category]
//           ├── Manuscript
//           ├── Data Gathering Tool
//           ├── Data Files
//           └── Others
//
// Returns: { success: boolean, folderId: string, url: string }
// =============================================================================
function createClientFolder(recordId, clientName, researchTitle, affiliation = 'SLU', category = 'Graduate') {
  try {
    // Clean folder name: remove special characters, limit length
    const cleanName = (name) => name.replace(/[<>:"/\\|?*]/g, '').trim().substring(0, 30);
    
    // Systematic naming: [RecordID]_[ClientName]_[Affiliation]_[Category]
    const folderName = `${recordId}_${cleanName(clientName)}_${affiliation}_${category}`;
    
    // Get or create the main ISRM-Statistical Services Digital System folder in Drive
    let rootFolder;
    const ROOT_FOLDER_NAME = 'ISRM-Statistical Services Digital System';
    
    // First, try to use the configured folder ID if provided
    if (CONFIG.CLIENT_DRIVE_ROOT_ID) {
      try {
        rootFolder = DriveApp.getFolderById(CONFIG.CLIENT_DRIVE_ROOT_ID);
        Logger.log(`Using configured root folder ID: ${CONFIG.CLIENT_DRIVE_ROOT_ID}`);
      } catch (e) {
        Logger.log(`Configured folder ID not found, falling back to folder name search`);
      }
    }
    
    // If no configured ID or ID not found, search by name
    if (!rootFolder) {
      const rootFolders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
      
      if (rootFolders.hasNext()) {
        rootFolder = rootFolders.next();
        Logger.log(`Using existing root folder: ${ROOT_FOLDER_NAME}`);
      } else {
        // Create the root folder if it doesn't exist
        rootFolder = DriveApp.createFolder(ROOT_FOLDER_NAME);
        Logger.log(`Created new root folder: ${ROOT_FOLDER_NAME}`);
      }
    }
    
    // Get or create the subfolder for client folders
    let clientSubfolder;
    const SUBFOLDER_NAME = CONFIG.CLIENT_SUBFOLDER_NAME || 'Client Folders';
    const subfolders = rootFolder.getFoldersByName(SUBFOLDER_NAME);
    
    if (subfolders.hasNext()) {
      clientSubfolder = subfolders.next();
      Logger.log(`Using existing subfolder: ${SUBFOLDER_NAME}`);
    } else {
      clientSubfolder = rootFolder.createFolder(SUBFOLDER_NAME);
      Logger.log(`Created new subfolder: ${SUBFOLDER_NAME}`);
    }
    
    // Create the client's folder inside the subfolder
    const clientFolderObj = clientSubfolder.createFolder(folderName);
    const clientFolderId = clientFolderObj.getId();
    const clientFolderUrl = clientFolderObj.getUrl();
    
    // Create subfolders for organization
    clientFolderObj.createFolder('Manuscript');
    clientFolderObj.createFolder('Data Gathering Tool');
    clientFolderObj.createFolder('Data Files');
    clientFolderObj.createFolder('Others');
    
    Logger.log(`Created client folder: ${folderName}`);
    Logger.log(`Subfolders: Manuscript, Data Gathering Tool, Data Files, Others`);
    Logger.log(`Location: ${ROOT_FOLDER_NAME}/${SUBFOLDER_NAME}`);
    
    return {
      success: true,
      folderId: clientFolderId,
      url: clientFolderUrl
    };
    
  } catch (e) {
    Logger.log('Error creating client folder: ' + e.message);
    return {
      success: false,
      folderId: '',
      url: ''
    };
  }
}

// =============================================================================
// DASHBOARD INITIALIZATION
// Creates all required sheets, column headers, data validation rules,
// and conditional formatting. Run once on first deployment.
// =============================================================================
function setupDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Rename the spreadsheet if it's still "Untitled" ──────────────────────
  if (ss.getName() === 'Untitled spreadsheet') {
    ss.rename('ISRM Statistical Services Dashboard — RISE Center');
  }

  // ── Sheet definitions ─────────────────────────────────────────────────────
  const SHEET_DEFS = [
    {
      name: CONFIG.SHEET.CLIENTS,
      headers: [
        'Record ID',       'Date',            'Client Name',     'ID Number',
        'Contact No.',     'Email',            'Department/School','Research Title',
        'Funding Source',  'Category',         'Affiliation',      'Service Type',
        'Hours',           'Total Fee (₱)',    'OR Number',        'Payment Date',
        'Payment Status',  'Assigned URS',     'URS Share 60% (₱)','Unit Share 40% (₱)',
        'Semester',        'AY',               'Status',           'Remarks',
        'Research Objectives', 'Research Questions', 'Drive Folder URL',
        'Assignment Date', 'Expected Completion',
      ],
    },
    {
      name: CONFIG.SHEET.URS,
      headers: [
        'URS ID',        'Full Name',          'Department',         'Highest Degree',
        'Specialization','Email',              'Contact No.',        'Available Days/Hours',
        'Status',        'AY Appointed',       'Notes',
      ],
    },
    {
      name: CONFIG.SHEET.SUMMARY,
      headers: [
        'Metric', 'Value',
      ],
    },
  ];

  SHEET_DEFS.forEach(def => {
    let sh = ss.getSheetByName(def.name);
    if (!sh) sh = ss.insertSheet(def.name);
    sh.clearContents();
    sh.getRange(1, 1, 1, def.headers.length)
      .setValues([def.headers])
      .setFontWeight('bold')
      .setBackground('#1A3666')   // SLU Navy
      .setFontColor('#FFFFFF')
      .setFontFamily('Arial')
      .setFontSize(10);
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 110); // Record ID
  });

  // ── Data Validation for Clients Sheet ────────────────────────────────────
  const cs  = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
  const C   = CONFIG.COL;

  const mkValidation = list => SpreadsheetApp.newDataValidation()
    .requireValueInList(list, true)
    .setAllowInvalid(false)
    .build();

  cs.getRange(2, C.CATEGORY,    1000, 1)
    .setDataValidation(mkValidation(['Undergraduate','Graduate','Staff']));
  cs.getRange(2, C.AFFILIATION, 1000, 1)
    .setDataValidation(mkValidation(['SLU','Non-SLU']));
  // NOTE: Affiliation is filled by the ISM Officer (not from the Google Form).
  // After reviewing the client's "School" field, the ISM Officer selects
  // 'SLU' or 'Non-SLU'. If Non-SLU, they also manually update Total Fee (Col N).
  cs.getRange(2, C.SERVICE,     1000, 1)
    .setDataValidation(mkValidation([
      'Consultation',
      'Full Statistical Assistance',
      'Reliability/Validity of Research Instrument',
      'Mentoring Services',
      'Others',
    ]));
  cs.getRange(2, C.PAY_STATUS,  1000, 1)
    .setDataValidation(mkValidation(['Pending','Paid']));
  cs.getRange(2, C.STATUS,      1000, 1)
    .setDataValidation(mkValidation(['New','In Progress','Completed','Cancelled']));

  // ── Conditional Formatting ────────────────────────────────────────────────
  const dataRange = cs.getRange('A2:AA1000');
  const pendingRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$Q2="Pending"')
    .setBackground('#FFF3CD') // amber tint
    .setRanges([dataRange])
    .build();
  const paidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$Q2="Paid"')
    .setBackground('#E8F5E9') // green tint
    .setRanges([dataRange])
    .build();
  const cancelRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$W2="Cancelled"')
    .setBackground('#FCE8E6') // red tint
    .setRanges([dataRange])
    .build();
  cs.setConditionalFormatRules([pendingRule, paidRule, cancelRule]);

  // ── Financial Summary Sheet — Auto-formulas ───────────────────────────────
  const fsh = ss.getSheetByName(CONFIG.SHEET.SUMMARY);
  const summaryData = [
    ['Gross Fees Collected (Paid)',     "=SUMIF(Clients!Q:Q,\"Paid\",Clients!N:N)"],
    ['Total URS Honoraria 60% (Paid)',  "=SUMIF(Clients!Q:Q,\"Paid\",Clients!S:S)"],
    ['Total Unit Share 40% (Paid)',     "=SUMIF(Clients!Q:Q,\"Paid\",Clients!T:T)"],
    ['Total Records',                   "=COUNTA(Clients!A:A)-1"],
    ['Paid Records',                    "=COUNTIF(Clients!Q:Q,\"Paid\")"],
    ['Pending Payment',                 "=COUNTIF(Clients!Q:Q,\"Pending\")"],
    ['Completed Sessions',              "=COUNTIF(Clients!W:W,\"Completed\")"],
    ['Active Sessions (In Progress)',   "=COUNTIF(Clients!W:W,\"In Progress\")"],
    ['New Records',                     "=COUNTIF(Clients!W:W,\"New\")"],
  ];
  fsh.getRange(2, 1, summaryData.length, 2).setValues(summaryData);
  fsh.getRange(2, 2, summaryData.length, 1).setNumberFormat('₱#,##0.00');

  SpreadsheetApp.getUi().alert(
    '✅  ISRM Dashboard Initialized Successfully!\n\n' +
    '• "Clients" sheet — 27 columns with headers, validation, and conditional formatting\n' +
    '  (including new: Research Objectives, Research Questions, Drive Folder URL)\n' +
    '• "URS_Registry" sheet — 11 columns for statistician registry\n' +
    '• "Financial_Summary" sheet — auto-formula summary metrics\n\n' +
    'NEW FEATURES (v5):\n' +
    '  • Research Objectives field — captures study objectives from form\n' +
    '  • Research Questions field — captures RQs from form\n' +
    '  • Drive Folder URL column — stores link to client\'s Google Drive folder\n' +
    '  • Auto-creates Drive folder with subfolders: Manuscript, Data Gathering Tool, Data Files, Others\n\n' +
    'AFFILIATION COLUMN NOTE (Col K):\n' +
    '  Not auto-filled from FM-RIS-002 (Affiliation is not on the form).\n' +
    '  ISM Officer sets this manually per client after reviewing School field.\n' +
    '  For Non-SLU clients, also manually update Total Fee (Col N).\n' +
    '  The 60/40 split will auto-recalculate via the onEdit() trigger.\n\n' +
    'NEXT STEP:\n' +
    '  Run "🔗 Setup Form Submit Trigger (FM-RIS-002)" from the ISRM Operations menu\n' +
    '  to connect your Google Form (digital FM-RIS-002) to this dashboard.'
  );
}

// =============================================================================
// TRIGGER SETUP — Creates the onFormSubmit trigger programmatically
//                 Also creates an installable onEdit trigger for automation
// =============================================================================
function setupFormTrigger() {
  // Remove any existing onFormSubmit triggers to prevent duplicate firings
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onFormSubmit')
    .forEach(t => ScriptApp.deleteTrigger(t));

  // Remove any existing onEdit triggers to prevent duplicate firings
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onEdit')
    .forEach(t => ScriptApp.deleteTrigger(t));

  // Create onFormSubmit trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();

  // Create installable onEdit trigger for auto-sending appointment links
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert(
    '✅  Form Submit Trigger Created!\n\n' +
    'Your digital FM-RIS-002 Google Form is now connected.\n' +
    'Every new submission will automatically:\n' +
    '  1. Generate a Record ID (ISRM-YYYY-NNNN)\n' +
    '  2. Log the full record to the Clients sheet (including Research Objectives & Questions)\n' +
    '  3. Derive Affiliation (SLU/Non-SLU) from School field and calculate appropriate fee\n' +
    '  4. Calculate the fee and 60/40 split based on affiliation\n' +
    '  5. Create a Google Drive folder with subfolders in "ISRM-Statistical Services Digital System"\n' +
    '     Folder naming: [RecordID]_[ClientName]_[Affiliation]_[Category]\n' +
    '  6. Send acknowledgment email to client with:\n' +
    '     • FM-RIS-002 PDF form attachment\n' +
    '     • Drive folder link\n' +
    '     • Payment and appointment booking instructions\n' +
    '  7. Send alert email to the ISM Officer\n\n' +
    'IMPORTANT: Ensure your Google Form includes these fields:\n' +
    '  • School (must include "External" or "Non-SLU" for Non-SLU clients)\n' +
    '  • Research Objectives (text area)\n' +
    '  • Research Questions (text area)\n\n' +
    'FEES AUTO-CALCULATE BASED ON SCHOOL FIELD:\n' +
    '  • If School contains "External" or "Non-SLU" → Non-SLU rate (10% higher)\n' +
    '  • Otherwise → SLU base rate\n\n' +
    'FM-RIS-002 FORM ATTACHMENT:\n' +
    '  • The client acknowledgment email includes the FM-RIS-002 PDF\n' +
    '  • Clients upload Official Receipt and FM-RIS-002 to Drive "Others" subfolder\n' +
    '  • No need to visit the office — everything is done online!\n\n' +
    'APPOINTMENT BOOKING INTEGRATION:\n' +
    '  • AUTOMATIC: When you change Payment Status to "Paid" in the dashboard,\n' +
    '    the system automatically sends the appointment booking link to the client\n' +
    '  • The acknowledgment email NO LONGER contains the booking link\n' +
    '  • Clients are informed that they will receive the link after payment confirmation\n' +
    '  • Manual backup: Use "📅 Send Appointment Booking Link" if needed\n' +
    '  • Link: ' + CONFIG.APPOINTMENT_BOOKING_URL + '\n\n' +
    '⚠️  IMPORTANT: Run "🔗 Setup Form Submit Trigger" from the menu to ensure\n' +
    '    the automatic triggers are properly set up. This is required for the\n' +
    '    automatic appointment link to work when Payment Status is changed to "Paid".\n\n' +
    'Remember: You still need to manually enter the OR Number\n' +
    '(Column O) after the client pays at the Finance Office.'
  );
}

// =============================================================================
// CHECK TRIGGERS — Verify that all required triggers are set up
// =============================================================================
function checkTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let triggerInfo = 'Current Triggers:\n';
  
  if (triggers.length === 0) {
    triggerInfo += 'No triggers found!\n';
  } else {
    triggers.forEach((t, i) => {
      triggerInfo += `${i + 1}. ${t.getHandlerFunction()} - ${t.getEventType()}\n`;
    });
  }
  
  SpreadsheetApp.getUi().alert(triggerInfo + '\n\nIf onEdit trigger is missing, run "Setup Form Submit Trigger" again.');
}

// =============================================================================
// URS DASHBOARD VIEW — Shows a dashboard for URS to view their assigned clients
// =============================================================================
function showURSDashboard() {
  const ui = SpreadsheetApp.getUi();
  
  // First, let user select which URS to view
  const ursSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.URS);
  const ursData = ursSheet.getDataRange().getValues();
  
  // Build URS list (skip header)
  const ursList = [];
  for (let i = 1; i < ursData.length; i++) {
    if (ursData[i][1]) { // Full Name column
      ursList.push(ursData[i][1]);
    }
  }
  
  if (ursList.length === 0) {
    ui.alert('⚠️ No URS found in the URS_Registry sheet. Please add URS first.');
    return;
  }
  
  // Create selection prompt
  const response = ui.prompt(
    'URS Dashboard View',
    'Enter the name of the URS to view their assigned clients:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  
  const selectedURS = response.getResponseText().trim();
  
  // Find matching URS
  let matchedURS = '';
  for (const urs of ursList) {
    if (urs.toLowerCase() === selectedURS.toLowerCase()) {
      matchedURS = urs;
      break;
    }
  }
  
  if (!matchedURS) {
    ui.alert(`⚠️ URS "${selectedURS}" not found. Available URS: ${ursList.join(', ')}`);
    return;
  }
  
  // Get clients for this URS
  const clientsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.CLIENTS);
  const clientsData = clientsSheet.getDataRange().getValues();
  const C = CONFIG.COL;
  
  const ursClients = [];
  for (let i = 1; i < clientsData.length; i++) {
    if (clientsData[i][C.ASSIGNED_URS - 1] === matchedURS) {
      ursClients.push({
        row: i + 1,
        recordId: clientsData[i][C.RECORD_ID - 1],
        clientName: clientsData[i][C.CLIENT_NAME - 1],
        service: clientsData[i][C.SERVICE - 1],
        status: clientsData[i][C.STATUS - 1],
        payStatus: clientsData[i][C.PAY_STATUS - 1],
        fee: clientsData[i][C.TOTAL_FEE - 1],
        ursShare: clientsData[i][C.URS_SHARE - 1],
        researchTitle: clientsData[i][C.TITLE - 1],
        email: clientsData[i][C.EMAIL - 1],
        driveFolder: clientsData[i][C.DRIVE_FOLDER - 1],
      });
    }
  }
  
  if (ursClients.length === 0) {
    ui.alert(`No clients assigned to ${matchedURS} yet.`);
    return;
  }
  
  // Calculate summary
  const totalClients = ursClients.length;
  const completed = ursClients.filter(c => c.status === 'Completed').length;
  const inProgress = ursClients.filter(c => c.status === 'In Progress').length;
  const newClients = ursClients.filter(c => c.status === 'New').length;
  const totalEarnings = ursClients.reduce((sum, c) => sum + (parseFloat(c.ursShare) || 0), 0);
  
  // Build HTML dashboard
  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Roboto', sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .header { background: linear-gradient(135deg, #1A3666 0%, #2d5a87 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .summary-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
    .summary-card .number { font-size: 28px; font-weight: bold; color: #1A3666; }
    .summary-card .label { font-size: 12px; color: #666; margin-top: 5px; }
    .clients-table { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1A3666; color: white; padding: 12px; text-align: left; font-size: 12px; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
    tr:hover { background: #f8f9fa; }
    .status-new { color: #2196F3; font-weight: 500; }
    .status-inprogress { color: #FF9800; font-weight: 500; }
    .status-completed { color: #4CAF50; font-weight: 500; }
    .status-pending { color: #FF9800; }
    .status-paid { color: #4CAF50; }
    .btn { display: inline-block; padding: 6px 12px; background: #1A3666; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; }
    .btn:hover { background: #2d5a87; }
    .empty-state { text-align: center; padding: 40px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 URS Dashboard — ${matchedURS}</h1>
    <p>Saint Louis University — ISRM Unit</p>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <div class="number">${totalClients}</div>
      <div class="label">Total Clients</div>
    </div>
    <div class="summary-card">
      <div class="number">${inProgress}</div>
      <div class="label">In Progress</div>
    </div>
    <div class="summary-card">
      <div class="number">${completed}</div>
      <div class="label">Completed</div>
    </div>
    <div class="summary-card">
      <div class="number">₱${totalEarnings.toLocaleString()}</div>
      <div class="label">Total Earnings (60%)</div>
    </div>
  </div>
  
  <div class="clients-table">
    <table>
      <thead>
        <tr>
          <th>Record ID</th>
          <th>Client Name</th>
          <th>Research Title</th>
          <th>Service</th>
          <th>Payment</th>
          <th>Status</th>
          <th>URS Share</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${ursClients.map(c => `
          <tr>
            <td>${c.recordId || '-'}</td>
            <td>${c.clientName || '-'}</td>
            <td>${c.researchTitle ? (c.researchTitle.length > 30 ? c.researchTitle.substring(0, 30) + '...' : c.researchTitle) : '-'}</td>
            <td>${c.service || '-'}</td>
            <td class="${c.payStatus === 'Paid' ? 'status-paid' : 'status-pending'}">${c.payStatus || '-'}</td>
            <td class="status-${c.status ? c.status.toLowerCase().replace(' ', '') : 'new'}">${c.status || 'New'}</td>
            <td>₱${parseFloat(c.ursShare || 0).toLocaleString()}</td>
            <td>
              ${c.driveFolder ? `<a class="btn" href="${c.driveFolder}" target="_blank">📁 Drive</a>` : '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  
  // Display the dashboard
  const output = HtmlService.createHtmlOutput(html)
    .setTitle(`URS Dashboard - ${matchedURS}`)
    .setWidth(1200)
    .setHeight(800);
  
  ui.showModalDialog(output, `URS Dashboard - ${matchedURS}`);
}

// =============================================================================
// WEB APP DASHBOARD — Serve the live dashboard as a Google Apps Script Web App
// =============================================================================

/**
 * doGet — Serves JSON API when the Web App URL is accessed
 * Deploy: Publish → Deploy as Web App → Execute as: Me, Access: Anyone
 * 
 * Usage:
 *   - ?action=getDashboardData: Returns JSON data for React app
 *   - ?action=getClients: Returns clients list as JSON
 */
function doGet(e) {
  const action = e.parameter.action;
  try {
    // JSON API for external React app
    if (action === 'getDashboardData') {
      const data = getDashboardData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // URS API endpoints
    if (action === 'getURSClients') {
      const ursName = e.parameter.ursName;
      if (!ursName) {
        throw new Error('URS name is required');
      }
      const data = getURSClients(ursName);
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // Validate URS credentials
    if (action === 'validateURSCredentials') {
      const ursName = e.parameter.name;
      const ursEmail = e.parameter.email;
      const ursPassword = e.parameter.password || '';
      if (!ursName || !ursEmail) {
        throw new Error('URS name and email are required');
      }
      const result = validateURSCredentials(ursName, ursEmail, ursPassword);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // Monitoring/Notifications API for Officer Dashboard
    if (action === 'getMonitoringData') {
      const data = getMonitoringData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // Monthly/Semester Statistics for charts
    if (action === 'getMonthlyStatistics') {
      const data = getMonthlyStatistics();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // URS with Deadline info (for URS Portal)
    if (action === 'getURSClientsWithDeadline') {
      const ursName = e.parameter.ursName;
      if (!ursName) {
        throw new Error('URS name is required');
      }
      const data = getURSClientsWithDeadline(ursName);
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Get available clients (for URS to claim)
    if (action === 'getAvailableClients') {
      const data = getAvailableClients();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // URS claims a client
    if (action === 'claimClient') {
      const recordId = e.parameter.recordId;
      const ursName = e.parameter.ursName;
      if (!recordId || !ursName) {
        throw new Error('Record ID and URS name are required');
      }
      const data = claimClient(recordId, ursName);
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // Announcements, Live Updates, Resources (from the other file)
    if (action === 'getAnnouncements') {
      return getAnnouncementsAPI();
    }
    if (action === 'getLiveUpdates') {
      return getLiveUpdatesAPI();
    }
    if (action === 'getResources') {
      return getResourcesAPI();
    }
    // Default: Return API info
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'ISRM API is running.',
      availableActions: [
        'getDashboardData',
        'getURSClients',
        'getURSClientsWithDeadline',
        'validateURSCredentials',
        'getMonitoringData',
        'getMonthlyStatistics',
        'getAnnouncements',
        'getLiveUpdates',
        'getResources'
      ]
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message || 'Unknown error'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
// ============ Announcements, Live Updates, Resources ============
function getAnnouncementsAPI() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Announcements');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({success: true, announcements: []})).setMimeType(ContentService.MimeType.JSON);
    const data = sheet.getDataRange().getValues();
    const announcements = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let dateStr = '';
        if (data[i][2]) {
          const d = new Date(data[i][2]);
          dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
        }
        announcements.push({id: i, type: data[i][0], badge: data[i][1], date: dateStr, title: data[i][3], body: data[i][4]});
      }
    }
    return ContentService.createTextOutput(JSON.stringify({success: true, announcements: announcements})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: e.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
function getLiveUpdatesAPI() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('LiveUpdates');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({success: true, updates: []})).setMimeType(ContentService.MimeType.JSON);
    const data = sheet.getDataRange().getValues();
    const updates = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let dateStr = '';
        if (data[i][3]) {
          const d = new Date(data[i][3]);
          dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
        }
        updates.push({id: i, title: data[i][0], description: data[i][1], link: data[i][2], date: dateStr, category: data[i][4]});
      }
    }
    return ContentService.createTextOutput(JSON.stringify({success: true, updates: updates})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: e.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
function getResourcesAPI() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Resources');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({success: true, resources: []})).setMimeType(ContentService.MimeType.JSON);
    const data = sheet.getDataRange().getValues();
    const resources = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        resources.push({id: i, category: data[i][0], title: data[i][1], description: data[i][2], link: data[i][3], tags: data[i][4] ? data[i][4].split(',').map(t => t.trim()) : []});
      }
    }
    return ContentService.createTextOutput(JSON.stringify({success: true, resources: resources})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: e.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doPost — Handles POST requests from the React app
 * Supports: action=updateClientBatch, action=generateReport
 */
function doPost(e) {
  const postData = e.postData ? JSON.parse(e.postData.contents) : {};
  const action = postData.action;

  try {
    if (action === 'updateClientBatch') {
      const { rowNum, updates } = postData;
      return ContentService.createTextOutput(JSON.stringify(updateClientBatch(rowNum, updates)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'generateReport') {
      const { reportType } = postData;
      const period = CONFIG.SEM + ' AY ' + CONFIG.AY;
      let result;

      if (reportType === 'FM-RIS-059') {
        result = generateSemestralReportDirect(period);
      } else if (reportType === 'FM-RIS-060') {
        result = generateHonorariaRequisitionDirect(period);
      } else {
        result = { success: false, message: 'Unknown report type: ' + reportType };
      }

      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateClientStatus') {
      const { recordId, status, notes } = postData;
      return ContentService.createTextOutput(JSON.stringify(updateClientStatusByURS(recordId, status, notes)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Unknown action: ' + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.message || 'Unknown error'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * generateSemestralReportDirect — Direct generation for API call (FM-RIS-059)
 */
function generateSemestralReportDirect(period) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const rows = sheet.getDataRange().getValues().slice(1);
    const C = CONFIG.COL;

    const filtered = rows.filter(r => r[C.RECORD_ID - 1]);
    if (filtered.length === 0) {
      return { success: false, message: 'No records found in the Clients sheet' };
    }

    let totalFees = 0;
    const reportRows = filtered.map(r => {
      const fee = parseFloat(r[C.TOTAL_FEE - 1]) || 0;
      totalFees += fee;
      return {
        date: r[C.DATE - 1] ? Utilities.formatDate(new Date(r[C.DATE - 1]), 'Asia/Manila', 'MM/dd/yyyy') : '—',
        client: `${r[C.CLIENT_NAME - 1] || ''}\n(${r[C.CATEGORY - 1] || ''} · ${r[C.AFFILIATION - 1] || ''})`,
        services: `${r[C.SERVICE - 1] || ''} — ${r[C.HOURS - 1] || 1} hr\n₱${fee.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
        urs: r[C.ASSIGNED_URS - 1] || '—',
        remarks: r[C.REMARKS - 1] || '—',
      };
    });

    // Populate Google Doc template
    const docId = populateDocTemplate(CONFIG.FM_RIS_059_TEMPLATE_ID, {
      '{{SEMESTER_AY}}': period,
      '{{DATE}}': Utilities.formatDate(new Date(), 'Asia/Manila', 'MMMM dd, yyyy'),
      '{{TOTAL_FEES}}': `₱${totalFees.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
      '{{URS_SHARE}}': `₱${(totalFees * CONFIG.URS_PCT).toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
      '{{UNIT_SHARE}}': `₱${(totalFees * CONFIG.UNIT_PCT).toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
    });

  fillDocTable(docId, reportRows, ['date', 'client', 'services', 'urs', 'remarks']);

    const fileName = `FM-RIS-059_${period.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const pdf = saveToPDF(docId, fileName);

    return {
      success: true,
      message: `FM-RIS-059 generated for ${period}`,
      url: pdf.getUrl(),
      recordCount: filtered.length,
      totalFees: totalFees
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * generateHonorariaRequisitionDirect — Direct generation for API call (FM-RIS-060)
 */
function generateHonorariaRequisitionDirect(period) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const rows = sheet.getDataRange().getValues().slice(1);
    const C = CONFIG.COL;

    const paid = rows.filter(r => r[C.PAY_STATUS - 1] === 'Paid' && r[C.ASSIGNED_URS - 1]);

    if (paid.length === 0) {
      return { success: false, message: 'No paid records with assigned URS found' };
    }

    const byURS = {};
    paid.forEach(r => {
      const ursName = r[C.ASSIGNED_URS - 1];
      if (!byURS[ursName]) {
        byURS[ursName] = { name: ursName, count: 0, total: 0, clients: [] };
      }
      byURS[ursName].count++;
      byURS[ursName].total += parseFloat(r[C.URS_SHARE - 1]) || 0;
      byURS[ursName].clients.push({
        client: r[C.CLIENT_NAME - 1],
        service: r[C.SERVICE - 1],
        hours: r[C.HOURS - 1] || 1,
        fee: r[C.TOTAL_FEE - 1],
        ursShare: r[C.URS_SHARE - 1]
      });
    });

    const grandTotal = Object.values(byURS).reduce((s, u) => s + u.total, 0);

    const reportRows = Object.values(byURS).map(u => ({
      urs: u.name,
      count: u.count,
      total: u.total,
      clients: u.clients.map(c => ({
        client: c.client,
        service: c.service,
        hours: c.hours,
        fee: c.fee,
        ursShare: c.ursShare
      }))
    }));

    // Populate Google Doc template
    const docId = populateDocTemplate(CONFIG.FM_RIS_060_TEMPLATE_ID, {
      '{{PERIOD}}': period,
      '{{DATE}}': Utilities.formatDate(new Date(), 'Asia/Manila', 'MMMM dd, yyyy'),
      '{{GRAND_TOTAL}}': `₱${grandTotal.toLocaleString('en-PH', {minimumFractionDigits: 2})}`,
      '{{PAID_COUNT}}': paid.length.toString(),
      '{{ACTIVE_URS}}': Object.keys(byURS).length.toString(),
    });

    Logger.log('FM-RIS-060 Direct: Filling table with ' + reportRows.length + ' rows');
    
    fillDocTable(docId, reportRows, ['urs', 'count', 'total']);

    const fileName = `FM-RIS-060_${period.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const pdf = saveToPDF(docId, fileName);

    return {
      success: true,
      message: `FM-RIS-060 generated for ${period}`,
      url: pdf.getUrl(),
      recordCount: paid.length,
      grandTotal: grandTotal
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * getDashboardData — Returns all data needed for initial dashboard load
 * Called via google.script.run from the client-side JavaScript
 */
function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clientsSheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
  const ursSheet = ss.getSheetByName(CONFIG.SHEET.URS);

  // Get clients data (skip header row)
  const clientsData = clientsSheet.getDataRange().getValues();
  const headers = clientsData[0];
  const clients = clientsData.slice(1).map(row => {
    const obj = { row: clientsData.indexOf(row) + 2 }; // 1-indexed row number
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(c => c['Record ID']); // Filter empty rows

  // Get URS data
  const ursData = ursSheet.getDataRange().getValues();
  const ursHeaders = ursData[0];
  const urs = ursData.slice(1).map(row => {
    const obj = {};
    ursHeaders.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(u => u['URS ID']);

  // Calculate financial summary
  const paidClients = clients.filter(c => c['Payment Status'] === 'Paid');
  const financial = {
    grossFees: paidClients.reduce((s, c) => s + (c['Total Fee (₱)'] || 0), 0),
    ursHonoraria: paidClients.reduce((s, c) => s + (c['URS Share 60% (₱)'] || 0), 0),
    unitShare: paidClients.reduce((s, c) => s + (c['Unit Share 40% (₱)'] || 0), 0),
    paidCount: paidClients.length,
    pendingCount: clients.filter(c => c['Payment Status'] === 'Pending').length,
    completedCount: clients.filter(c => c['Status'] === 'Completed').length,
    inProgressCount: clients.filter(c => c['Status'] === 'In Progress').length,
    newCount: clients.filter(c => c['Status'] === 'New').length,
    totalCount: clients.length
  };

  return {
    clients: clients,
    urs: urs,
    financial: financial,
    config: {
      ursPct: CONFIG.URS_PCT,
      unitPct: CONFIG.UNIT_PCT,
      ay: CONFIG.AY || '2024-2025',
      sem: CONFIG.SEM || 'Second Semester'
    }
  };
}

/**
 * getClients — Returns filtered clients data
 * @param {string} filterBy - Optional filter: 'all', 'pending', 'paid', 'completed', 'inProgress', 'new'
 */
function getClients(filterBy = 'all') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let clients = data.slice(1).map((row, idx) => {
    const obj = { row: idx + 2 };
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(c => c['Record ID']);

  // Apply filter
  if (filterBy === 'pending') clients = clients.filter(c => c['Payment Status'] === 'Pending');
  else if (filterBy === 'paid') clients = clients.filter(c => c['Payment Status'] === 'Paid');
  else if (filterBy === 'completed') clients = clients.filter(c => c['Status'] === 'Completed');
  else if (filterBy === 'inProgress') clients = clients.filter(c => c['Status'] === 'In Progress');
  else if (filterBy === 'new') clients = clients.filter(c => c['Status'] === 'New');

  return clients;
}

/**
 * getURS — Returns all URS records
 */
function getURS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.URS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map((row, idx) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(u => u['URS ID']);
}

/**
 * updateClientField — Updates a single field for a client record
 * @param {number} rowNum - The row number to update (1-indexed)
 * @param {string} fieldName - The column header name to update
 * @param {any} value - The new value
 * @returns {object} Success status and updated value
 */
function updateClientField(rowNum, fieldName, value) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);

    // Find column index for the field
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colIndex = headers.indexOf(fieldName);

    if (colIndex === -1) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    // Update the cell
    sheet.getRange(rowNum, colIndex + 1).setValue(value);

    // If updating Total Fee, also update 60/40 split
    if (fieldName === 'Total Fee (₱)') {
      const fee = parseFloat(value) || 0;
      const ursCol = headers.indexOf('URS Share 60% (₱)') + 1;
      const unitCol = headers.indexOf('Unit Share 40% (₱)') + 1;
      sheet.getRange(rowNum, ursCol).setValue(parseFloat((fee * CONFIG.URS_PCT).toFixed(2)));
      sheet.getRange(rowNum, unitCol).setValue(parseFloat((fee * CONFIG.UNIT_PCT).toFixed(2)));
    }

    return { success: true, message: 'Updated successfully' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * updateClientBatch — Updates multiple fields for a client record
 * @param {number} rowNum - The row number to update
 * @param {object} updates - Object with fieldName: value pairs
 * @returns {object} Success status
 */
function updateClientBatch(rowNum, updates) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    Object.entries(updates).forEach(([fieldName, value]) => {
      const colIndex = headers.indexOf(fieldName);
      if (colIndex !== -1) {
        sheet.getRange(rowNum, colIndex + 1).setValue(value);
      }
    });

    return { success: true, message: 'Updated successfully' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * getAvailableURS — Returns list of active URS names for dropdown
 */
function getAvailableURS() {
  const urs = getURS();
  return urs
    .filter(u => u['Status'] === 'Active')
    .map(u => u['Full Name']);
}

/**
 * getURSClients — Returns clients assigned to a specific URS
 * Used for URS Dashboard on the website
 * @param {string} ursName - The URS name to filter clients
 */
function getURSClients(ursName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clientsSheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
  const C = CONFIG.COL;

  const clientsData = clientsSheet.getDataRange().getValues();
  const headers = clientsData[0];

  const ursClients = [];
  for (let i = 1; i < clientsData.length; i++) {
    const assignedURS = clientsData[i][C.ASSIGNED_URS - 1];
    if (assignedURS === ursName) {
      const client = { row: i + 2 };
      headers.forEach((h, idx) => { client[h] = clientsData[i][idx]; });
      ursClients.push(client);
    }
  }

  // Calculate summary
  const totalClients = ursClients.length;
  const completed = ursClients.filter(c => c['Status'] === 'Completed').length;
  const inProgress = ursClients.filter(c => c['Status'] === 'In Progress').length;
  const newClients = ursClients.filter(c => c['Status'] === 'New').length;
  const totalEarnings = ursClients.reduce((sum, c) => sum + (parseFloat(c['URS Share 60% (₱)'] || 0), 0), 0);

  return {
    success: true,
    ursName: ursName,
    clients: ursClients,
    summary: {
      totalClients: totalClients,
      inProgress: inProgress,
      completed: completed,
      newClients: newClients,
      totalEarnings: totalEarnings
    }
  };
}

/**
 * validateURSCredentials — Validates URS login credentials
 * @param {string} ursName - URS name (matches Full Name in URS_Registry)
 * @param {string} email - URS email (must match in URS_Registry)
 */
function validateURSCredentials(ursName, email, password) {
  const ursSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.URS);
  const ursData = ursSheet.getDataRange().getValues();
  
  Logger.log('URS Sheet: ' + CONFIG.SHEET.URS);
  Logger.log('URS Data rows: ' + ursData.length);

  // Check first few rows
  for (let i = 0; i < Math.min(5, ursData.length); i++) {
    Logger.log('Row ' + i + ': ' + JSON.stringify(ursData[i]));
  }

  // Normalize input
  const inputName = ursName ? ursName.toString().trim().toLowerCase() : '';
  const inputEmail = email ? email.toString().trim().toLowerCase() : '';
  const inputPassword = password ? password.toString().trim() : '';

  for (let i = 1; i < ursData.length; i++) {
    const fullName = ursData[i][1] ? ursData[i][1].toString().trim() : '';
    const ursEmail = ursData[i][5] ? ursData[i][5].toString().trim() : '';
    const ursPassword = ursData[i][11] ? ursData[i][11].toString().trim() : ''; // Column L - Password
    const status = ursData[i][8] ? ursData[i][8].toString().trim() : '';

    Logger.log(`Checking: name="${fullName}" (${fullName.toLowerCase()}) vs "${inputName}", email="${ursEmail}" (${ursEmail.toLowerCase()}) vs "${inputEmail}", status="${status}", hasPassword=${!!ursPassword}`);

    // Case-insensitive comparison - require name, email, AND password
    if (fullName.toLowerCase() === inputName && 
        ursEmail.toLowerCase() === inputEmail && 
        status === 'Active') {
      
      // If password is set in sheet, validate it
      if (ursPassword && ursPassword !== '') {
        if (inputPassword !== ursPassword) {
          return { success: false, valid: false, message: 'Incorrect password' };
        }
      }
      
      return { success: true, valid: true, name: fullName };
    }
  }

  return { success: false, valid: false, message: 'Invalid credentials or URS not found. Check if Status is "Active" in URS_Registry sheet.' };
}

/**
 * generateReportPDF — Generates a PDF report and returns the URL
 * @param {string} type - 'FM-RIS-059' or 'FM-RIS-060'
 * @param {string} period - Semester/AY or period description
 * @returns {object} { url: string, fileName: string }
 */
function generateReportPDF(type, period) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const rows = sheet.getDataRange().getValues().slice(1);
    const C = CONFIG.COL;

    if (type === 'FM-RIS-059') {
      // Filter by semester/AY
      const filtered = rows.filter(r =>
        `${r[C.SEMESTER-1]}, AY ${r[C.AY-1]}` === period ||
        r[C.SEMESTER-1] === period ||
        r[C.AY-1] === period
      );

      if (filtered.length === 0) {
        return { success: false, message: 'No records found for this period' };
      }

      const totalFees = filtered.reduce((s, r) => s + (r[C.TOTAL_FEE-1] || 0), 0);

      return {
        success: true,
        message: `Generated FM-RIS-059 for ${period}`,
        recordCount: filtered.length,
        totalFees: totalFees,
        ursShare: totalFees * CONFIG.URS_PCT,
        unitShare: totalFees * CONFIG.UNIT_PCT,
        url: ss.getUrl()
      };
    }

    if (type === 'FM-RIS-060') {
      const paid = rows.filter(r => r[C.PAY_STATUS-1] === 'Paid' && r[C.ASSIGNED_URS-1]);

      if (paid.length === 0) {
        return { success: false, message: 'No paid records with assigned URS found' };
      }

      const grandTotal = paid.reduce((s, r) => s + (r[C.URS_SHARE-1] || 0), 0);

      return {
        success: true,
        message: `Generated FM-RIS-060 for ${period}`,
        recordCount: paid.length,
        grandTotal: grandTotal,
        url: ss.getUrl()
      };
    }

    return { success: false, message: 'Unknown report type' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * getSystemInfo — Returns system configuration and status
 */
function getSystemInfo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    spreadsheetId: ss.getId(),
    user: Session.getActiveUser().getEmail(),
    timestamp: new Date().toISOString()
  };
}

/**
 * updateClientStatusByURS — Updates client status and notes from URS dashboard
 * @param {string} recordId - The Record ID to update
 * @param {string} status - New status (New, In Progress, Completed)
 * @param {string} notes - Optional notes to add to Remarks
 */
function updateClientStatusByURS(recordId, status, notes) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const data = sheet.getDataRange().getValues();
    const C = CONFIG.COL;
    
    // Find the row with matching Record ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][C.RECORD_ID - 1] === recordId) {
        const rowNum = i + 1; // 1-indexed for sheet
        
        // Update Status
        if (status) {
          sheet.getRange(rowNum, C.STATUS).setValue(status);
        }
        
        // Append notes to existing remarks if provided
        if (notes) {
          const existingRemarks = data[i][C.REMARKS - 1] || '';
          const timestamp = Utilities.formatDate(new Date(), 'Asia/Manila', 'MM/dd/yyyy HH:mm');
          const newRemarks = existingRemarks 
            ? existingRemarks + '\n[' + timestamp + '] ' + notes 
            : '[' + timestamp + '] ' + notes;
          sheet.getRange(rowNum, C.REMARKS).setValue(newRemarks);
        }
        
        return {
          success: true,
          message: 'Client status updated successfully',
          recordId: recordId,
          status: status,
          notesAdded: !!notes
        };
      }
    }

    return {
      success: false,
      message: 'Client not found: ' + recordId
    };
  } catch (e) {
    return {
      success: false,
      message: e.message
    };
  }
}

// =============================================================================
// TAT (TURNAROUND TIME) HELPER FUNCTIONS
// =============================================================================

/**
 * addWorkingDays — Adds working days to a date, skipping weekends
 * @param {Date} startDate - Starting date
 * @param {number} workingDays - Number of working days to add
 * @returns {Date} - Resulting date
 */
function addWorkingDays(startDate, workingDays) {
  const date = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < workingDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
      daysAdded++;
    }
  }

  return date;
}

/**
 * getWorkingDaysRemaining — Calculates working days until due date
 * @param {Date} dueDate - Target date
 * @returns {number} - Working days remaining (negative if overdue)
 */
function getWorkingDaysRemaining(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  let workingDays = 0;
  const current = new Date(today);

  while (current < due) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }

  // If due date has passed, calculate negative
  if (today > due) {
    workingDays = 0;
    const temp = new Date(due);
    while (temp < today) {
      temp.setDate(temp.getDate() + 1);
      const dayOfWeek = temp.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays--;
      }
    }
  }

  return workingDays;
}

/**
 * getTATForService — Returns TAT in working days for a given service type
 * @param {string} serviceType - The service type
 * @returns {number} - TAT in working days
 */
function getTATForService(serviceType) {
  const T = CONFIG.TAT;
  if (!serviceType) return T.OTHERS;

  const svc = serviceType.toLowerCase();

  if (svc.includes('full statistical')) return T.FULL_ANALYSIS;
  if (svc.includes('validity') || svc.includes('reliability')) return T.VALIDITY_RELIABILITY;
  if (svc.includes('consultation')) return T.CONSULTATION;
  if (svc.includes('mentoring')) return T.MENTORING;
  return T.OTHERS;
}

/**
 * calculateExpectedCompletion — Calculates expected completion date from assignment date
 * @param {Date} assignmentDate - Date when URS was assigned
 * @param {string} serviceType - Type of service
 * @returns {Date} - Expected completion date
 */
function calculateExpectedCompletion(assignmentDate, serviceType) {
  const tat = getTATForService(serviceType);
  return addWorkingDays(assignmentDate, tat);
}

// =============================================================================
// AUTO-STAMP ASSIGNMENT DATE & EXPECTED COMPLETION
// Triggered when Assigned URS column is filled
// =============================================================================
function onAssignURS(row, ursName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET.CLIENTS);
  const C = CONFIG.COL;

  const assignmentDate = new Date();
  const serviceType = sheet.getRange(row, C.SERVICE).getValue();
  const expectedCompletion = calculateExpectedCompletion(assignmentDate, serviceType);

  // Set Assignment Date
  sheet.getRange(row, C.ASSIGNMENT_DATE).setValue(assignmentDate);

  // Set Expected Completion Date
  sheet.getRange(row, C.EXPECTED_COMPLETION).setValue(expectedCompletion);

  Logger.log(`Auto-stamped assignment dates for row ${row}: Assignment=${assignmentDate}, Expected=${expectedCompletion}`);
}

// =============================================================================
// getMonitoringData — Returns monitoring/notification data for Officer Dashboard
// =============================================================================
function getMonitoringData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const C = CONFIG.COL;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = {
      overdue: [],      // Past due date, not completed
      critical: [],     // Due within 2 working days
      warning: [],      // Due within 5 working days
      notice: [],       // Due within 10 working days
      pendingAssignment: [], // Assigned but no dates set
    };

    let inProgressCount = 0;
    let completedThisMonth = 0;
    let completedThisSemester = 0;
    let totalOngoing = 0;

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get semester boundaries
    const semStartMonth = 8; // August
    const semStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;

    for (let i = 1; i < data.length; i++) {
      const recordId = data[i][C.RECORD_ID - 1];
      if (!recordId) continue;

      const status = data[i][C.STATUS - 1];
      const payStatus = data[i][C.PAY_STATUS - 1];

      // Count ongoing (In Progress and Assigned)
      if (status === 'In Progress' && payStatus === 'Paid') {
        inProgressCount++;
        totalOngoing++;

        const client = {
          row: i + 1,
          recordId: recordId,
          clientName: data[i][C.CLIENT_NAME - 1],
          serviceType: data[i][C.SERVICE - 1],
          assignedURS: data[i][C.ASSIGNED_URS - 1],
          assignmentDate: data[i][C.ASSIGNMENT_DATE - 1],
          expectedCompletion: data[i][C.EXPECTED_COMPLETION - 1],
          status: status,
        };

        // Check if has expected completion date
        if (client.expectedCompletion) {
          const dueDate = new Date(client.expectedCompletion);
          dueDate.setHours(0, 0, 0, 0);

          const daysRemaining = getWorkingDaysRemaining(dueDate);

          client.daysRemaining = daysRemaining;
          client.dueDateFormatted = Utilities.formatDate(dueDate, 'Asia/Manila', 'MM/dd/yyyy');

          if (dueDate < today && status !== 'Completed') {
            // Overdue
            notifications.overdue.push(client);
          } else if (daysRemaining <= CONFIG.DEADLINE_WARNING.CRITICAL && status !== 'Completed') {
            notifications.critical.push(client);
          } else if (daysRemaining <= CONFIG.DEADLINE_WARNING.WARNING && status !== 'Completed') {
            notifications.warning.push(client);
          } else if (daysRemaining <= CONFIG.DEADLINE_WARNING.NOTICE && status !== 'Completed') {
            notifications.notice.push(client);
          }
        } else if (!client.assignmentDate) {
          notifications.pendingAssignment.push(client);
        }
      }

      // Completed counts
      if (status === 'Completed') {
        totalOngoing++;

        const completionDate = data[i][C.ASSIGNMENT_DATE - 1]; // Using assignment date as proxy
        if (completionDate) {
          const compDate = new Date(completionDate);
          if (compDate.getMonth() === currentMonth && compDate.getFullYear() === currentYear) {
            completedThisMonth++;
          }
          if (compDate >= new Date(semStartYear, semStartMonth - 1, 1)) {
            completedThisSemester++;
          }
        } else {
          // Check date column as fallback
          const dateCol = data[i][C.DATE - 1];
          if (dateCol) {
            const d = new Date(dateCol);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
              completedThisMonth++;
            }
          }
        }
      }

      // New records today
      if (payStatus === 'Pending') {
        totalOngoing++;
      }
    }

    return {
      success: true,
      notifications: notifications,
      summary: {
        totalOngoing: inProgressCount,
        overdueCount: notifications.overdue.length,
        criticalCount: notifications.critical.length,
        warningCount: notifications.warning.length,
        noticeCount: notifications.notice.length,
        pendingAssignmentCount: notifications.pendingAssignment.length,
        completedThisMonth: completedThisMonth,
        completedThisSemester: completedThisSemester,
      },
      tatInfo: {
        fullAnalysis: CONFIG.TAT.FULL_ANALYSIS + ' working days',
        validityReliability: CONFIG.TAT.VALIDITY_RELIABILITY + ' working days',
        consultation: CONFIG.TAT.CONSULTATION > 0 ? CONFIG.TAT.CONSULTATION + ' working days' : 'No fixed TAT',
        mentoring: CONFIG.TAT.MENTORING > 0 ? CONFIG.TAT.MENTORING + ' working days' : 'No fixed TAT',
      }
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// =============================================================================
// getMonthlyStatistics — Returns monthly and semester statistics for charts
// =============================================================================
function getMonthlyStatistics() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const data = sheet.getDataRange().getValues();
    const C = CONFIG.COL;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Get semester info
    const semStartMonth = 8; // August
    const semStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    const semesterLabel = currentMonth >= 8 || currentMonth <= 1 ? 'First Semester' : 'Second Semester';
    const ayLabel = currentMonth >= 8 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

    // Initialize monthly data for current semester (Aug-Dec or Jan-Jul)
    const monthlyData = {};
    const semesterMonths = currentMonth >= 8
      ? [8, 9, 10, 11, 12]  // Aug-Dec
      : [1, 2, 3, 4, 5, 6, 7]; // Jan-Jul

    semesterMonths.forEach(month => {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      monthlyData[month] = {
        month: monthNames[month],
        newClients: 0,
        completed: 0,
        inProgress: 0,
        totalFees: 0,
      };
    });

    let semesterTotalFees = 0;
    let semesterTotalClients = 0;
    let semesterCompleted = 0;
    let semesterInProgress = 0;

    for (let i = 1; i < data.length; i++) {
      const recordId = data[i][C.RECORD_ID - 1];
      if (!recordId) continue;

      const dateVal = data[i][C.DATE - 1];
      const status = data[i][C.STATUS - 1];
      const payStatus = data[i][C.PAY_STATUS - 1];
      const fee = parseFloat(data[i][C.TOTAL_FEE - 1]) || 0;

      if (!dateVal) continue;

      const recordDate = new Date(dateVal);
      const recordMonth = recordDate.getMonth() + 1; // 1-indexed
      const recordYear = recordDate.getFullYear();

      // Check if within current semester
      const isInSemester = (recordYear === semStartYear && semesterMonths.includes(recordMonth)) ||
                          (recordYear === semStartYear + 1 && currentMonth >= 8 && recordMonth <= 7);

      if (isInSemester && monthlyData[recordMonth]) {
        monthlyData[recordMonth].newClients++;
        semesterTotalClients++;

        if (fee > 0) {
          monthlyData[recordMonth].totalFees += fee;
          semesterTotalFees += fee;
        }

        if (status === 'Completed') {
          monthlyData[recordMonth].completed++;
          semesterCompleted++;
        } else if (status === 'In Progress') {
          monthlyData[recordMonth].inProgress++;
          semesterInProgress++;
        }
      }
    }

    // Also add "this month" data for current in-progress count
    const currentMonthData = monthlyData[currentMonth + 1] || monthlyData[currentMonth];

    return {
      success: true,
      semester: {
        label: `${semesterLabel} ${ayLabel}`,
        totalClients: semesterTotalClients,
        totalFees: semesterTotalFees,
        completed: semesterCompleted,
        inProgress: semesterInProgress,
        ursShare: semesterTotalFees * CONFIG.URS_PCT,
        unitShare: semesterTotalFees * CONFIG.UNIT_PCT,
      },
      monthly: Object.values(monthlyData),
      currentMonth: currentMonth + 1,
      year: currentYear,
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// =============================================================================
// getURSWithDeadline — Returns clients for URS portal with deadline info
// =============================================================================
function getURSClientsWithDeadline(ursName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const data = sheet.getDataRange().getValues();
    const C = CONFIG.COL;

    const ursClients = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < data.length; i++) {
      const assignedURS = data[i][C.ASSIGNED_URS - 1];
      if (assignedURS !== ursName) continue;

      const status = data[i][C.STATUS - 1];
      const payStatus = data[i][C.PAY_STATUS - 1];

      // Only show active/paid clients
      if (payStatus !== 'Paid') continue;
      if (status === 'Cancelled') continue;

      const assignmentDate = data[i][C.ASSIGNMENT_DATE - 1];
      const expectedCompletion = data[i][C.EXPECTED_COMPLETION - 1];
      const serviceType = data[i][C.SERVICE - 1];

      const client = {
        row: i + 1,
        'Record ID': data[i][C.RECORD_ID - 1],
        'Client Name': data[i][C.CLIENT_NAME - 1],
        'Email': data[i][C.EMAIL - 1],
        'Research Title': data[i][C.TITLE - 1],
        'Service Type': serviceType,
        'Payment Status': payStatus,
        'Status': status,
        'URS Share 60% (₱)': data[i][C.URS_SHARE - 1],
        assignmentDate: assignmentDate
          ? Utilities.formatDate(new Date(assignmentDate), 'Asia/Manila', 'MM/dd/yyyy')
          : null,
        expectedCompletion: expectedCompletion
          ? Utilities.formatDate(new Date(expectedCompletion), 'Asia/Manila', 'MM/dd/yyyy')
          : null,
        tat: getTATForService(serviceType),
        'Remarks': data[i][C.REMARKS - 1],
        'Drive Folder URL': data[i][C.DRIVE_FOLDER - 1],
      };

      // Calculate days remaining
      if (expectedCompletion) {
        const dueDate = new Date(expectedCompletion);
        dueDate.setHours(0, 0, 0, 0);
        client.daysRemaining = getWorkingDaysRemaining(dueDate);
        client.isOverdue = dueDate < today && status !== 'Completed';
        client.isCritical = client.daysRemaining <= CONFIG.DEADLINE_WARNING.CRITICAL && status !== 'Completed';
        client.isWarning = client.daysRemaining <= CONFIG.DEADLINE_WARNING.WARNING && status !== 'Completed';
      }

      ursClients.push(client);
    }

    // Sort by urgency (overdue first, then by days remaining)
    ursClients.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.daysRemaining !== undefined && b.daysRemaining !== undefined) {
        return a.daysRemaining - b.daysRemaining;
      }
      return 0;
    });

    const inProgress = ursClients.filter(c => c.status === 'In Progress').length;
    const completed = ursClients.filter(c => c.status === 'Completed').length;
    const overdue = ursClients.filter(c => c.isOverdue).length;

    return {
      success: true,
      ursName: ursName,
      clients: ursClients,
      summary: {
        total: ursClients.length,
        inProgress: inProgress,
        completed: completed,
        overdue: overdue,
        urgent: ursClients.filter(c => c.isCritical).length,
      }
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// =============================================================================
// updateAssignment — Updates assignment date and calculates expected completion
// =============================================================================
function updateAssignment(rowNum, assignmentDate, serviceType) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const C = CONFIG.COL;

    const assignDate = assignmentDate ? new Date(assignmentDate) : new Date();
    const expectedCompletion = calculateExpectedCompletion(assignDate, serviceType);

    sheet.getRange(rowNum, C.ASSIGNMENT_DATE).setValue(assignDate);
    sheet.getRange(rowNum, C.EXPECTED_COMPLETION).setValue(expectedCompletion);

    return {
      success: true,
      assignmentDate: Utilities.formatDate(assignDate, 'Asia/Manila', 'MM/dd/yyyy'),
      expectedCompletion: Utilities.formatDate(expectedCompletion, 'Asia/Manila', 'MM/dd/yyyy'),
      tat: getTATForService(serviceType),
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// =============================================================================
// EMAIL REMINDER SYSTEM — Deadline Alerts
//
// Reminder schedule:
//   - Full Statistical Assistance: 7 days before due
//   - Validity/Reliability: 2 days before due
//   - Consultation & Mentoring: 3 days before due
//
// Only sends if status is NOT 'Completed'
// =============================================================================

// Reminder thresholds (in working days before due)
const REMINDER_THRESHOLDS = {
  FULL_ANALYSIS:         7,  // 7 working days before (for 14-day deadline)
  VALIDITY_RELIABILITY:   2,  // 2 working days before
  CONSULTATION:           0,  // No fixed TAT - no reminders
  MENTORING:             0,  // No fixed TAT - no reminders
  OTHERS:                5,  // 5 working days before
};

/**
 * sendDeadlineReminders — Checks all in-progress tasks and sends email reminders
 * Should be run daily via time-driven trigger
 */
function sendDeadlineReminders() {
  try {
    Logger.log('Starting deadline reminder check...');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const clientsSheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const ursSheet = ss.getSheetByName(CONFIG.SHEET.URS);
    const data = clientsSheet.getDataRange().getValues();
    const C = CONFIG.COL;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remindersSent = 0;
    const reminderLog = [];

    // Build URS email lookup
    const ursEmailMap = {};
    const ursData = ursSheet.getDataRange().getValues();
    for (let i = 1; i < ursData.length; i++) {
      const name = ursData[i][1] ? ursData[i][1].toString().trim() : '';
      const email = ursData[i][5] ? ursData[i][5].toString().trim() : '';
      if (name) ursEmailMap[name] = email;
    }

    for (let i = 1; i < data.length; i++) {
      const recordId = data[i][C.RECORD_ID - 1];
      if (!recordId) continue;

      const status = data[i][C.STATUS - 1];
      const payStatus = data[i][C.PAY_STATUS - 1];

      // Skip if already completed or not paid
      if (status === 'Completed' || status === 'Cancelled') continue;
      if (payStatus !== 'Paid') continue;

      const expectedCompletion = data[i][C.EXPECTED_COMPLETION - 1];
      if (!expectedCompletion) continue;

      const dueDate = new Date(expectedCompletion);
      dueDate.setHours(0, 0, 0, 0);

      const serviceType = data[i][C.SERVICE - 1] || '';
      const clientName = data[i][C.CLIENT_NAME - 1] || '';
      const researchTitle = data[i][C.TITLE - 1] || '';
      const assignedURS = data[i][C.ASSIGNED_URS - 1] || '';

      // Get threshold based on service type
      const threshold = getReminderThreshold(serviceType);
      const daysRemaining = getWorkingDaysRemaining(dueDate);

      Logger.log(`${recordId}: ${serviceType}, daysRemaining=${daysRemaining}, threshold=${threshold}`);

      // Check if reminder should be sent
      if (daysRemaining <= threshold && daysRemaining > 0) {
        // Check if we already sent a reminder today (avoid duplicates)
        const todayStr = Utilities.formatDate(today, 'Asia/Manila', 'yyyy-MM-dd');
        const reminderKey = `${recordId}_${todayStr}_${threshold}day`;

        // Check if reminder was already sent today
        const lastReminder = CacheService.getUserCache().get(reminderKey);

        if (!lastReminder) {
          // Get URS email
          const ursEmail = ursEmailMap[assignedURS] || '';

          // Prepare reminder details
          const reminderInfo = {
            recordId: recordId,
            clientName: clientName,
            researchTitle: researchTitle,
            serviceType: serviceType,
            assignedURS: assignedURS,
            dueDate: Utilities.formatDate(dueDate, 'Asia/Manila', 'MMMM dd, yyyy'),
            daysRemaining: daysRemaining,
            threshold: threshold,
          };

          // Send reminder emails
          const emailResult = sendReminderEmails(reminderInfo, ursEmail);

          if (emailResult.sent) {
            remindersSent++;
            reminderLog.push(`${recordId}: ${assignedURS || 'No URS'} - ${daysRemaining} days left`);
            // Cache that we sent a reminder (expires in 2 days to prevent duplicates)
            CacheService.getUserCache().put(reminderKey, 'sent', 172800);
          }
        }
      }
    }

    Logger.log(`Deadline reminders sent: ${remindersSent}`);

    // Send summary to ISM Officer
    if (remindersSent > 0) {
      GmailApp.sendEmail(
        CONFIG.ISM_OFFICER_EMAIL,
        `[ISRM] Deadline Reminder Summary - ${Utilities.formatDate(today, 'Asia/Manila', 'MMMM dd, yyyy')}`,
        `Daily Deadline Reminder Report\n` +
        `${'='.repeat(50)}\n\n` +
        `Date: ${Utilities.formatDate(today, 'Asia/Manila', 'MMMM dd, yyyy')}\n` +
        `Total Reminders Sent: ${remindersSent}\n\n` +
        `Reminders Sent:\n` +
        reminderLog.map(r => `  • ${r}`).join('\n') +
        `\n\n${'='.repeat(50)}\n` +
        `ISRM Digital Operations System\n` +
        `Automated Daily Reminder`
      );
    }

    return {
      success: true,
      remindersSent: remindersSent,
      log: reminderLog,
    };
  } catch (e) {
    Logger.log('Error in sendDeadlineReminders: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * getReminderThreshold — Returns reminder threshold in working days for a service type
 */
function getReminderThreshold(serviceType) {
  if (!serviceType) return REMINDER_THRESHOLDS.OTHERS;

  const svc = serviceType.toLowerCase();

  if (svc.includes('full statistical')) return REMINDER_THRESHOLDS.FULL_ANALYSIS;
  if (svc.includes('validity') || svc.includes('reliability')) return REMINDER_THRESHOLDS.VALIDITY_RELIABILITY;
  if (svc.includes('consultation')) return REMINDER_THRESHOLDS.CONSULTATION;
  if (svc.includes('mentoring')) return REMINDER_THRESHOLDS.MENTORING;
  return REMINDER_THRESHOLDS.OTHERS;
}

/**
 * sendReminderEmails — Sends reminder emails to URS and ISM Officer
 */
function sendReminderEmails(reminderInfo, ursEmail) {
  try {
    const { recordId, clientName, researchTitle, serviceType, assignedURS, dueDate, daysRemaining, threshold } = reminderInfo;

    const urgencyLevel = daysRemaining <= 2 ? 'URGENT' : daysRemaining <= 5 ? 'IMPORTANT' : 'REMINDER';

    const subject = `[${urgencyLevel}] ${recordId} - ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until deadline`;

    // Email body for URS
    const ursEmailBody =
      `Dear ${assignedURS},\n\n` +
      `This is a reminder that the deadline for your assigned statistical service is approaching.\n\n` +
      `${'─'.repeat(50)}\n` +
      `RECORD DETAILS\n` +
      `${'─'.repeat(50)}\n` +
      `Record ID       : ${recordId}\n` +
      `Client Name     : ${clientName}\n` +
      `Research Title  : ${researchTitle}\n` +
      `Service Type    : ${serviceType}\n` +
      `Due Date        : ${dueDate}\n` +
      `Days Remaining  : ${daysRemaining} working day${daysRemaining !== 1 ? 's' : ''}\n` +
      `${'─'.repeat(50)}\n\n` +
      `Please ensure that the analysis is completed and the client is attended to before the deadline.\n\n` +
      `If you have any concerns or need assistance, please contact the ISM Officer immediately.\n\n` +
      `ISM Officer: ${CONFIG.ISM_OFFICER_EMAIL}\n\n` +
      `This is an automated reminder from the ISRM Digital Operations System.\n` +
      `Please do not reply to this email.\n`;

    // Email body for ISM Officer
    const officerEmailBody =
      `[${urgencyLevel}] Deadline Reminder\n\n` +
      `A deadline reminder has been sent to the assigned URS.\n\n` +
      `${'─'.repeat(50)}\n` +
      `RECORD DETAILS\n` +
      `${'─'.repeat(50)}\n` +
      `Record ID       : ${recordId}\n` +
      `Client Name     : ${clientName}\n` +
      `Research Title  : ${researchTitle}\n` +
      `Service Type    : ${serviceType}\n` +
      `Assigned URS    : ${assignedURS || 'Not assigned'}\n` +
      `Due Date        : ${dueDate}\n` +
      `Days Remaining  : ${daysRemaining} working day${daysRemaining !== 1 ? 's' : ''}\n` +
      `Reminder Type   : ${threshold}-day reminder\n` +
      `${'─'.repeat(50)}\n\n` +
      `ACTION REQUIRED:\n` +
      `• Monitor this task in the ISRM Dashboard\n` +
      `• Follow up with ${assignedURS || 'the assigned URS'} if needed\n` +
      `• Ensure client is updated on progress\n\n` +
      `Dashboard: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}\n\n` +
      `ISRM Digital Operations System\n` +
      `Automated Daily Reminder`;

    // Send to URS if email is available
    if (ursEmail && ursEmail.includes('@')) {
      GmailApp.sendEmail(ursEmail, subject + ' [Action Required]', ursEmailBody);
      Logger.log(`Sent reminder to URS: ${ursEmail}`);
    } else if (assignedURS) {
      Logger.log(`URS email not found for: ${assignedURS}`);
      // Forward to ISM Officer to notify manually
      GmailApp.sendEmail(
        CONFIG.ISM_OFFICER_EMAIL,
        `[WARNING] ${recordId} - URS Email Not Found`,
        `Could not send deadline reminder to URS "${assignedURS}" because no email was found in the URS_Registry sheet.\n\n` +
        `Please update the URS email address and follow up manually.\n\n` +
        `Record: ${recordId} - ${clientName}\n` +
        `Due: ${dueDate} (${daysRemaining} days remaining)`
      );
    }

    // Always CC ISM Officer
    GmailApp.sendEmail(CONFIG.ISM_OFFICER_EMAIL, subject, officerEmailBody);
    Logger.log(`Sent reminder to ISM Officer`);

    return { sent: true };
  } catch (e) {
    Logger.log('Error sending reminder emails: ' + e.message);
    return { sent: false, error: e.message };
  }
}

/**
 * setupDeadlineReminderTrigger — Creates daily time-driven trigger for reminders
 * Run this once from the ISRM Operations menu
 */
function setupDeadlineReminderTrigger() {
  // Delete existing triggers for this function
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sendDeadlineReminders')
    .forEach(t => ScriptApp.deleteTrigger(t));

  // Create new trigger to run daily at 8:00 AM
  ScriptApp.newTrigger('sendDeadlineReminders')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  SpreadsheetApp.getUi().alert(
    '✅  Deadline Reminder System Activated!\n\n' +
    'Email reminders will now be sent daily at 8:00 AM (Manila time).\n\n' +
    'Reminder Schedule:\n' +
    `  • Full Statistical Assistance: 7 days before due\n` +
    `  • Validity/Reliability: 2 days before due\n` +
    `  • Consultation & Mentoring: 3 days before due\n\n` +
    'Reminders are sent to:\n' +
    '  • The assigned URS\n' +
    '  • The ISM Officer\n\n' +
    'Note: Reminders are NOT sent for completed tasks.'
  );
}

/**
 * removeDeadlineReminderTrigger — Removes the daily reminder trigger
 */
function removeDeadlineReminderTrigger() {
  const triggers = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sendDeadlineReminders');

  if (triggers.length === 0) {
    SpreadsheetApp.getUi().alert('No deadline reminder trigger found to remove.');
    return;
  }

  triggers.forEach(t => ScriptApp.deleteTrigger(t));

  SpreadsheetApp.getUi().alert('✅  Deadline reminder trigger removed. You will no longer receive automatic reminders.');
}

/**
 * testDeadlineReminders — Manually trigger reminder check (for testing)
 */
function testDeadlineReminders() {
  const result = sendDeadlineReminders();
  Logger.log('Test result: ' + JSON.stringify(result));
  SpreadsheetApp.getUi().alert(
    result.success
      ? `✅  Test Complete\n\nReminders sent: ${result.remindersSent}\n\nCheck the log for details.`
      : `❌  Error\n\n${result.message}`
  );
}

// =============================================================================
// AVAILABLE CLIENTS - For URS Self-Service Portal
// =============================================================================

/**
 * getAvailableClients — Returns clients ready to be claimed by URS
 * Shows clients who have paid but are not yet assigned to any URS
 */
function getAvailableClients() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const data = sheet.getDataRange().getValues();
    const C = CONFIG.COL;

    const availableClients = [];

    for (let i = 1; i < data.length; i++) {
      const recordId = data[i][C.RECORD_ID - 1];
      if (!recordId) continue;

      const payStatus = data[i][C.PAY_STATUS - 1];
      const assignedURS = data[i][C.ASSIGNED_URS - 1];
      const status = data[i][C.STATUS - 1];

      // Available if: Paid, No URS assigned, Not cancelled/completed
      if (payStatus === 'Paid' && (!assignedURS || assignedURS === '') && status !== 'Cancelled' && status !== 'Completed') {
        const client = {
          row: i + 1,
          'Record ID': recordId,
          'Client Name': data[i][C.CLIENT_NAME - 1],
          'Email': data[i][C.EMAIL - 1],
          'Contact No.': data[i][C.CONTACT - 1],
          'Research Title': data[i][C.TITLE - 1],
          'Research Objectives': data[i][C.RESEARCH_OBJECTIVES - 1] || '',
          'Research Questions': data[i][C.RESEARCH_QUESTIONS - 1] || '',
          'Service Type': data[i][C.SERVICE - 1],
          'Course/Department': data[i][C.DEPARTMENT - 1],
          'Total Fee (₱)': data[i][C.TOTAL_FEE - 1],
          'Date': data[i][C.DATE - 1] ? Utilities.formatDate(new Date(data[i][C.DATE - 1]), 'Asia/Manila', 'MM/dd/yyyy') : '',
        };
        availableClients.push(client);
      }
    }

    return {
      success: true,
      clients: availableClients,
      count: availableClients.length
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * claimClient — Allows a URS to claim an available client
 * @param {string} recordId - The Record ID to claim
 * @param {string} ursName - The URS name claiming the client
 */
function claimClient(recordId, ursName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    const data = sheet.getDataRange().getValues();
    const C = CONFIG.COL;

    for (let i = 1; i < data.length; i++) {
      if (data[i][C.RECORD_ID - 1] === recordId) {
        const rowNum = i + 1;
        const currentURS = data[i][C.ASSIGNED_URS - 1];
        const status = data[i][C.STATUS - 1];

        // Check if already assigned
        if (currentURS && currentURS !== '') {
          return { success: false, message: 'Client is already assigned to ' + currentURS };
        }

        // Check if cancelled/completed
        if (status === 'Cancelled' || status === 'Completed') {
          return { success: false, message: 'This client is no longer available' };
        }

        // Assign the URS
        sheet.getRange(rowNum, C.ASSIGNED_URS).setValue(ursName);
        sheet.getRange(rowNum, C.STATUS).setValue('In Progress');

        // Auto-stamp assignment date and expected completion
        onAssignURS(rowNum, ursName);

        // Send notification to URS
        sendURSNotification(rowNum, ursName);

        Logger.log(`URS ${ursName} claimed client ${recordId}`);

        return {
          success: true,
          message: 'Client claimed successfully!',
          recordId: recordId,
          assignedURS: ursName
        };
      }
    }

    return {
      success: false,
      message: 'Client not found: ' + recordId
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
