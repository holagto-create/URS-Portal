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
    // v10 additions — Turnaround deadline tracking
    IN_PROGRESS_DATE: 28, DEADLINE_DATE: 29,
  },

  // ── URS Registry Column Indices (1-based) ───────────────────────────────
  URS_COL: {
    URS_ID:       1,  FULL_NAME:    2,  DEPARTMENT:   3,
    HIGHEST_DEG:  4,  SPEC:         5,  EMAIL:        6,
    CONTACT:      7,  AVAIL_DAYS:   8,  STATUS:       9,
    AY_APPOINTED: 10, NOTES:        11,
    // v10 additions
    AVAILABILITY:        12,   // 'Available' | 'Unavailable'
    AVAILABILITY_REASON: 13,   // Free-text reason set by URS
    PASSWORD:            14,   // Set by Officer; URS can change via portal
  },

  // ── Sheet Names ──────────────────────────────────────────────────────────
  SHEET: {
    CLIENTS:       'Clients',
    URS:           'URS_Registry',
    SUMMARY:       'Financial_Summary',
    ANNOUNCEMENTS: 'Announcements',
    HOLIDAYS:      'Holidays',          // v10: Officer-managed holiday list
  },

  // ── Turnaround Times (working days, Sundays always excluded) ─────────────
  // Only service types that have a defined TAT are listed here.
  // Consultation and Mentoring Services have no TAT.
  TURNAROUND_DAYS: {
    'Full Statistical Assistance':               14,
    'Reliability/Validity of Research Instrument': 4,
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
    .addItem('📅  Send Appointment Booking Link',              'sendAppointmentLink')
    .addItem('💰  Financial Summary (Quick View)',              'showFinancialSummary')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('⏱  Turnaround & Availability')
        .addItem('🔔  Send Deadline Reminders Now',            'checkAndSendDeadlineReminders')
        .addItem('📋  Initialize Holidays Sheet',              'setupHolidaysSheet')
        .addItem('🔄  Sync All URS Availability',              'syncAllURSAvailability')
    )
    .addSeparator()
    .addItem('⚙️  Initialize / Reset Dashboard',               'setupDashboard')
    .addItem('🔗  Setup Form Submit Trigger (FM-RIS-002)',      'setupFormTrigger')
    .addItem('🔑  Setup URS Password Column',                  'setupURSPasswordColumn')
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
      if (newValue.toLowerCase() === 'paid') {
        Logger.log(`Payment Status set to Paid for row ${row}. Sending appointment link...`);
        Utilities.sleep(1000);
        sendAppointmentLinkAuto(row);
      }
    } catch (err) {
      Logger.log(`Error in PAY_STATUS onEdit: ${err.message}`);
    }
  }

  // ── Auto-send URS notification when Assigned URS is set ──────────────────
  if (col === C.ASSIGNED_URS && e.value) {
    try {
      const ursName = e.value.toString().trim();
      if (ursName && ursName !== '') {
        Logger.log(`onEdit ASSIGNED_URS: ursName="${ursName}", row=${row}`);
        Utilities.sleep(1000);
        sendURSNotification(row, ursName);
      }
    } catch (err) {
      Logger.log(`Error in ASSIGNED_URS onEdit: ${err.message}`);
    }
  }

  // ── v10: Status changes — stamp In Progress date, calculate deadline, sync availability ──
  if (col === C.STATUS) {
    try {
      const newStatus = e.value ? e.value.toString().trim() : '';
      const serviceType = sheet.getRange(row, C.SERVICE).getValue() || '';
      const assignedURS = sheet.getRange(row, C.ASSIGNED_URS).getValue() || '';

      if (newStatus === 'In Progress') {
        // Stamp the In Progress date (used as the TAT clock start)
        const now = new Date();
        const nowStr = Utilities.formatDate(now, 'Asia/Manila', 'yyyy-MM-dd');
        sheet.getRange(row, C.IN_PROGRESS_DATE).setValue(nowStr);

        // Calculate and store the deadline if this service has a TAT
        const tatDays = CONFIG.TURNAROUND_DAYS[serviceType] || 0;
        if (tatDays > 0) {
          const deadline = calculateDeadline(now, tatDays);
          const deadlineStr = Utilities.formatDate(deadline, 'Asia/Manila', 'yyyy-MM-dd');
          sheet.getRange(row, C.DEADLINE_DATE).setValue(deadlineStr);
          Logger.log(`TAT deadline set: ${deadlineStr} for ${serviceType} (${tatDays} working days)`);
        }

        // Mark URS as Unavailable (they now have an active project)
        if (assignedURS) {
          setURSAvailabilityInternal(assignedURS, 'Unavailable', 'Working on a project');
        }

      } else if (newStatus === 'Completed' || newStatus === 'Cancelled') {
        // Clear deadline columns
        sheet.getRange(row, C.IN_PROGRESS_DATE).setValue('');
        sheet.getRange(row, C.DEADLINE_DATE).setValue('');

        // Re-check whether the URS still has other active projects
        if (assignedURS) {
          Utilities.sleep(500);
          syncURSAvailabilityForOne(assignedURS);
        }
      }
    } catch (err) {
      Logger.log(`Error in STATUS onEdit: ${err.message}`);
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
        // v10 additions
        'In Progress Date', 'Deadline Date',
      ],
    },
    {
      name: CONFIG.SHEET.URS,
      headers: [
        'URS ID',        'Full Name',          'Department',         'Highest Degree',
        'Specialization','Email',              'Contact No.',        'Available Days/Hours',
        'Status',        'AY Appointed',       'Notes',
        // v10 additions
        'Availability',  'Availability Reason', 'Password',
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

  // ── v10: URS Registry validation ─────────────────────────────────────────
  const ursSheet = ss.getSheetByName(CONFIG.SHEET.URS);
  const UC = CONFIG.URS_COL;
  ursSheet.getRange(2, UC.AVAILABILITY, 1000, 1)
    .setDataValidation(mkValidation(['Available','Unavailable']));

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

  // Remove any existing deadline-check triggers
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'checkAndSendDeadlineReminders')
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

  // Create daily time-driven trigger for deadline reminder emails (runs at 8 AM Manila time)
  // Apps Script runs in UTC — Asia/Manila is UTC+8, so 8 AM Manila = 0:00 UTC
  ScriptApp.newTrigger('checkAndSendDeadlineReminders')
    .timeBased()
    .everyDays(1)
    .atHour(0)   // midnight UTC = 8 AM Manila
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
    
    // Get announcements
    if (action === 'getAnnouncements') {
      const data = getAnnouncements();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get live updates
    if (action === 'getLiveUpdates') {
      const data = getLiveUpdates();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get resources
    if (action === 'getResources') {
      const data = getResources();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // v10: Get URS availability list
    if (action === 'getURSAvailability') {
      const data = getURSAvailabilityData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // v10: Get active project deadlines
    if (action === 'getURSDeadlines') {
      const data = getURSDeadlinesData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // URS Portal: Get all clients (for All Clients view)
    if (action === 'getAllClients') {
      const data = getAllClientsData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default: Return API info
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'ISRM API is running. Use ?action=getDashboardData for data.',
      availableActions: ['getDashboardData', 'getURSClients', 'getAnnouncements', 'getLiveUpdates', 'getResources']
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message || 'Unknown error'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doPost — Handles POST requests from the React app
 * Supports: action=updateClientBatch, action=generateReport
 */
function doPost(e) {
  let postData = {};
  try {
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.action) {
      postData = e.parameter;
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Failed to parse request: ' + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const action = postData.action;
  Logger.log('doPost received: action=' + action + ', postData=' + JSON.stringify(postData));

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
      Logger.log('updateClientStatus called: recordId=' + recordId + ', status=' + status + ', notes=' + notes);
      return ContentService.createTextOutput(JSON.stringify(updateClientStatusByURS(recordId, status, notes)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // v10: URS sets their own availability from the URS Portal
    if (action === 'setURSAvailability') {
      const { ursName, availability, reason } = postData;
      Logger.log('setURSAvailability called: ursName=' + ursName + ', availability=' + availability);
      return ContentService.createTextOutput(JSON.stringify(setURSAvailabilityInternal(ursName, availability, reason || '')))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Content Management ───────────────────────────────────────────────────
    if (action === 'addContent') {
      const { sheet, row } = postData;
      return ContentService.createTextOutput(JSON.stringify(addContentRow(sheet, row)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateContent') {
      const { sheet, rowNum, row } = postData;
      return ContentService.createTextOutput(JSON.stringify(updateContentRow(sheet, parseInt(rowNum), row)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteContent') {
      const { sheet, rowNum } = postData;
      return ContentService.createTextOutput(JSON.stringify(deleteContentRow(sheet, parseInt(rowNum))))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── URS Password Management ──────────────────────────────────────────────
    if (action === 'changeURSPassword') {
      const { ursName, email, currentPassword, newPassword } = postData;
      return ContentService.createTextOutput(JSON.stringify(changeURSPasswordFn(ursName, email, currentPassword, newPassword)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'resetURSPassword') {
      const { ursName, newPassword, officerPassword } = postData;
      return ContentService.createTextOutput(JSON.stringify(resetURSPasswordFn(ursName, newPassword, officerPassword)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // URS Portal: Express interest in an unassigned client
    if (action === 'expressInterest') {
      const { recordId, ursName } = postData;
      return ContentService.createTextOutput(JSON.stringify(expressInterestFn(recordId, ursName)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    Logger.log('Unknown action received: ' + action + '. Full postData: ' + JSON.stringify(postData));

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

  // Get URS data — explicitly strip the Password field before returning
  const ursData = ursSheet.getDataRange().getValues();
  const ursHeaders = ursData[0];
  const urs = ursData.slice(1).map(row => {
    const obj = {};
    ursHeaders.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(u => u['URS ID'])
    .map(u => {
      delete u['Password'];   // never expose passwords to the browser
      return u;
    });

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
 * getURS — Returns all URS records (Password field excluded)
 */
function getURS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.URS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map((row, idx) => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h !== 'Password') obj[h] = row[i]; // never expose password
    });
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
    const ursPassword = ursData[i][URS_PASSWORD_COL - 1] ? ursData[i][URS_PASSWORD_COL - 1].toString().trim() : ''; // Column N - Password
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

/**
 * getAnnouncements — Returns announcements from Announcements sheet
 * Includes rowNum so the Content Manager can update/delete specific rows.
 */
function getAnnouncements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEET.ANNOUNCEMENTS);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET.ANNOUNCEMENTS);
      sheet.getRange(1, 1, 1, 7)
        .setValues([['Type', 'Badge', 'BadgeColor', 'Date', 'Title', 'Body', 'Link']])
        .setFontWeight('bold')
        .setBackground('#1A3666')
        .setFontColor('#FFFFFF');
      return { success: true, announcements: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, announcements: [] };
    }
    
    const announcements = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        announcements.push({
          id:         i,
          rowNum:     i + 1,   // 1-indexed sheet row
          type:       data[i][0] || '',
          badge:      data[i][1] || '',
          badgeColor: data[i][2] || 'navy',
          date:       data[i][3] || '',
          title:      data[i][4] || '',
          body:       data[i][5] || '',
          link:       data[i][6] || '',
        });
      }
    }
    
    return { success: true, announcements: announcements };
  } catch (e) {
    return { success: false, message: e.message, announcements: [] };
  }
}

/**
 * getLiveUpdates — Returns live updates from LiveUpdates sheet
 * Includes rowNum so the Content Manager can update/delete specific rows.
 */
function getLiveUpdates() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('LiveUpdates');
    
    if (!sheet) {
      return { success: true, updates: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, updates: [] };
    }
    
    const updates = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        updates.push({
          id:          i,
          rowNum:      i + 1,   // 1-indexed sheet row
          title:       data[i][0] || '',
          description: data[i][1] || '',
          link:        data[i][2] || '',
          date:        data[i][3] || '',
          category:    data[i][4] || '',
        });
      }
    }
    
    return { success: true, updates: updates };
  } catch (e) {
    return { success: false, message: e.message, updates: [] };
  }
}

/**
 * getResources — Returns resources from Resources sheet
 * Includes rowNum so the Content Manager can update/delete specific rows.
 */
function getResources() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Resources');
    
    if (!sheet) {
      return { success: true, resources: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, resources: [] };
    }
    
    const resources = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        resources.push({
          id:          i,
          rowNum:      i + 1,   // 1-indexed sheet row (row 1 is header)
          category:    data[i][0] || '',
          title:       data[i][1] || '',
          description: data[i][2] || '',
          link:        data[i][3] || '',
          tags:        data[i][4] ? data[i][4].split(',').map(t => t.trim()) : [],
        });
      }
    }
    
    return { success: true, resources: resources };
  } catch (e) {
    return { success: false, message: e.message, resources: [] };
  }
}

// =============================================================================
// v10 — URS AVAILABILITY & TURNAROUND TIME SYSTEM
// =============================================================================

// =============================================================================
// HOLIDAYS SHEET SETUP
// Creates the Holidays sheet where the Officer can add custom holiday dates.
// These are excluded from turnaround day calculations.
// =============================================================================
function setupHolidaysSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET.HOLIDAYS);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET.HOLIDAYS);
  } else {
    // Preserve existing data — only set up header if sheet is empty
    if (sheet.getLastRow() > 0) {
      SpreadsheetApp.getUi().alert(
        '⚠️  Holidays sheet already exists and has data.\n' +
        'No changes were made. Edit the sheet directly to add or remove holidays.'
      );
      return;
    }
  }

  // Set up header
  sheet.getRange(1, 1, 1, 3)
    .setValues([['Date (yyyy-MM-dd)', 'Holiday Name', 'Type']])
    .setFontWeight('bold')
    .setBackground('#1A3666')
    .setFontColor('#FFFFFF');

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 160);
  sheet.setFrozenRows(1);

  // Pre-populate with 2025–2026 Philippine regular holidays
  const defaultHolidays = [
    // 2025 regular holidays
    ['2025-01-01', "New Year's Day",              'Regular'],
    ['2025-04-09', 'Araw ng Kagitingan',          'Regular'],
    ['2025-04-17', 'Maundy Thursday',             'Regular'],
    ['2025-04-18', 'Good Friday',                 'Regular'],
    ['2025-05-01', 'Labor Day',                   'Regular'],
    ['2025-06-12', 'Independence Day',            'Regular'],
    ['2025-08-25', 'National Heroes Day',         'Regular'],
    ['2025-11-01', "All Saints' Day",             'Special'],
    ['2025-11-30', 'Bonifacio Day',               'Regular'],
    ['2025-12-08', 'Feast of the Immaculate Conception', 'Special'],
    ['2025-12-25', 'Christmas Day',               'Regular'],
    ['2025-12-30', 'Rizal Day',                   'Regular'],
    // 2026 regular holidays
    ['2026-01-01', "New Year's Day",              'Regular'],
    ['2026-04-02', 'Maundy Thursday',             'Regular'],
    ['2026-04-03', 'Good Friday',                 'Regular'],
    ['2026-04-09', 'Araw ng Kagitingan',          'Regular'],
    ['2026-05-01', 'Labor Day',                   'Regular'],
    ['2026-06-12', 'Independence Day',            'Regular'],
    ['2026-08-31', 'National Heroes Day',         'Regular'],
    ['2026-11-30', 'Bonifacio Day',               'Regular'],
    ['2026-12-25', 'Christmas Day',               'Regular'],
    ['2026-12-30', 'Rizal Day',                   'Regular'],
  ];

  sheet.getRange(2, 1, defaultHolidays.length, 3).setValues(defaultHolidays);

  SpreadsheetApp.getUi().alert(
    '✅  Holidays Sheet Created!\n\n' +
    `Pre-populated with ${defaultHolidays.length} Philippine public holidays (2025–2026).\n\n` +
    'You can:\n' +
    '  • Add rows for additional school-specific or local holidays\n' +
    '  • Delete rows for holidays that do not apply\n' +
    '  • Use format yyyy-MM-dd in the Date column\n\n' +
    'These dates are excluded from turnaround time calculations.'
  );
}

// =============================================================================
// HELPER — Load holiday dates from the Holidays sheet into a Set of strings
// Returns a Set<string> of 'yyyy-MM-dd' holiday strings
// =============================================================================
function loadHolidaySet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.HOLIDAYS);
  const holidays = new Set();

  if (!sheet || sheet.getLastRow() < 2) return holidays;

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  data.forEach(row => {
    const raw = row[0];
    if (!raw) return;
    try {
      let dateStr;
      if (typeof raw === 'string') {
        dateStr = raw.trim();
      } else {
        // Google Sheets may store as Date object
        dateStr = Utilities.formatDate(new Date(raw), 'Asia/Manila', 'yyyy-MM-dd');
      }
      if (dateStr) holidays.add(dateStr);
    } catch (e) {
      Logger.log('Holiday parse error: ' + e.message);
    }
  });

  Logger.log('Loaded ' + holidays.size + ' holidays');
  return holidays;
}

// =============================================================================
// HELPER — calculateDeadline(startDate, workingDays)
// Adds `workingDays` working days to `startDate`, skipping Sundays and
// Officer-configured holidays (loaded from the Holidays sheet).
// Returns a Date object set to midnight Asia/Manila on the deadline day.
// =============================================================================
function calculateDeadline(startDate, workingDays) {
  const holidays = loadHolidaySet();
  let current = new Date(startDate.getTime());
  let daysAdded = 0;

  while (daysAdded < workingDays) {
    // Advance one calendar day
    current.setDate(current.getDate() + 1);

    const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
    const dateStr = Utilities.formatDate(current, 'Asia/Manila', 'yyyy-MM-dd');

    // Skip Sundays and holidays
    if (dayOfWeek === 0) continue;   // Sunday
    if (holidays.has(dateStr)) continue; // Holiday

    daysAdded++;
  }

  return current;
}

// =============================================================================
// HELPER — countRemainingWorkingDays(deadlineDate)
// Counts working days (excl. Sundays, holidays) from today to deadlineDate.
// Returns a negative number if the deadline has passed.
// =============================================================================
function countRemainingWorkingDays(deadlineDate) {
  const holidays = loadHolidaySet();
  const today = new Date();
  const todayStr = Utilities.formatDate(today, 'Asia/Manila', 'yyyy-MM-dd');
  const deadlineStr = Utilities.formatDate(deadlineDate, 'Asia/Manila', 'yyyy-MM-dd');

  if (todayStr === deadlineStr) return 0;

  const isAfterDeadline = today > deadlineDate;
  let count = 0;
  let cursor = new Date(isAfterDeadline ? deadlineDate.getTime() : today.getTime());
  const end = new Date(isAfterDeadline ? today.getTime() : deadlineDate.getTime());

  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const dayOfWeek = cursor.getDay();
    const dateStr = Utilities.formatDate(cursor, 'Asia/Manila', 'yyyy-MM-dd');
    if (dayOfWeek === 0) continue;        // Sunday
    if (holidays.has(dateStr)) continue;  // Holiday
    count++;
  }

  return isAfterDeadline ? -count : count;
}

// =============================================================================
// getURSAvailabilityData — Returns all URS records with availability fields
// Called by doGet ?action=getURSAvailability
// =============================================================================
function getURSAvailabilityData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.URS);
    if (!sheet) return { success: false, message: 'URS_Registry sheet not found', urs: [] };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, urs: [] };

    const UC = CONFIG.URS_COL;
    const ursList = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[UC.URS_ID - 1]) continue; // skip empty rows
      ursList.push({
        ursId:              row[UC.URS_ID - 1]             || '',
        name:               row[UC.FULL_NAME - 1]           || '',
        department:         row[UC.DEPARTMENT - 1]          || '',
        email:              row[UC.EMAIL - 1]               || '',
        status:             row[UC.STATUS - 1]              || '',
        availability:       row[UC.AVAILABILITY - 1]        || 'Available',
        availabilityReason: row[UC.AVAILABILITY_REASON - 1] || '',
      });
    }

    return { success: true, urs: ursList };
  } catch (e) {
    return { success: false, message: e.message, urs: [] };
  }
}

// =============================================================================
// getURSDeadlinesData — Returns all In Progress projects that have a deadline
// Called by doGet ?action=getURSDeadlines
// =============================================================================
function getURSDeadlinesData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    if (!sheet) return { success: false, message: 'Clients sheet not found', deadlines: [] };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, deadlines: [] };

    const C = CONFIG.COL;
    const deadlines = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[C.RECORD_ID - 1]) continue;

      const status      = (row[C.STATUS - 1] || '').toString().trim();
      const serviceType = (row[C.SERVICE - 1] || '').toString().trim();
      const deadlineRaw = row[C.DEADLINE_DATE - 1];
      const inProgRaw   = row[C.IN_PROGRESS_DATE - 1];

      // Only include In Progress records that have a deadline date set
      if (status !== 'In Progress' || !deadlineRaw) continue;

      let deadlineDate, inProgressDate;
      try {
        deadlineDate   = new Date(deadlineRaw);
        inProgressDate = inProgRaw ? new Date(inProgRaw) : null;
      } catch (e) {
        Logger.log('Date parse error for row ' + (i + 1) + ': ' + e.message);
        continue;
      }

      if (isNaN(deadlineDate.getTime())) continue;

      const remaining = countRemainingWorkingDays(deadlineDate);

      deadlines.push({
        recordId:            row[C.RECORD_ID - 1]   || '',
        clientName:          row[C.CLIENT_NAME - 1] || '',
        researchTitle:       row[C.TITLE - 1]       || '',
        serviceType:         serviceType,
        assignedURS:         row[C.ASSIGNED_URS - 1] || '',
        inProgressDate:      inProgressDate
                               ? Utilities.formatDate(inProgressDate, 'Asia/Manila', 'yyyy-MM-dd')
                               : '',
        deadlineDate:        Utilities.formatDate(deadlineDate, 'Asia/Manila', 'yyyy-MM-dd'),
        remainingWorkingDays: remaining,
        isOverdue:           remaining < 0,
      });
    }

    return { success: true, deadlines: deadlines };
  } catch (e) {
    return { success: false, message: e.message, deadlines: [] };
  }
}

// =============================================================================
// setURSAvailabilityInternal — Writes Availability and Reason to URS_Registry
// Called by: onEdit (automatic), doPost setURSAvailability (from URS Portal)
// @param {string} ursName - Must match 'Full Name' column exactly
// @param {string} availability - 'Available' | 'Unavailable'
// @param {string} reason - Free-text reason (optional)
// =============================================================================
function setURSAvailabilityInternal(ursName, availability, reason) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.URS);
    if (!sheet) return { success: false, message: 'URS_Registry sheet not found' };

    const data = sheet.getDataRange().getValues();
    const UC = CONFIG.URS_COL;

    for (let i = 1; i < data.length; i++) {
      const fullName = (data[i][UC.FULL_NAME - 1] || '').toString().trim();
      if (fullName.toLowerCase() === ursName.toLowerCase()) {
        const rowNum = i + 1;

        // Only update reason if a non-empty string is provided, unless
        // switching to Available (in which case clear the reason).
        sheet.getRange(rowNum, UC.AVAILABILITY).setValue(availability);
        if (availability === 'Available') {
          // When marked available, clear the reason unless explicitly provided
          sheet.getRange(rowNum, UC.AVAILABILITY_REASON).setValue(reason || '');
        } else if (reason) {
          sheet.getRange(rowNum, UC.AVAILABILITY_REASON).setValue(reason);
        }

        Logger.log(`setURSAvailabilityInternal: ${ursName} → ${availability} (${reason || 'no reason'})`);
        return { success: true, message: 'Availability updated', ursName: fullName, availability, reason };
      }
    }

    return { success: false, message: 'URS not found: ' + ursName };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// =============================================================================
// syncURSAvailabilityForOne — Re-evaluates a single URS's availability
// Called when a project is completed/cancelled to check if they're now free.
// A URS is Available only if they have zero 'In Progress' projects.
// A manually-set Unavailable reason (not 'Working on a project') is preserved.
// =============================================================================
function syncURSAvailabilityForOne(ursName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clientsSheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
  const C = CONFIG.COL;
  const data = clientsSheet.getDataRange().getValues();

  // Count active (In Progress) projects for this URS
  let activeCount = 0;
  for (let i = 1; i < data.length; i++) {
    const assigned = (data[i][C.ASSIGNED_URS - 1] || '').toString().trim();
    const status   = (data[i][C.STATUS - 1] || '').toString().trim();
    if (assigned.toLowerCase() === ursName.toLowerCase() && status === 'In Progress') {
      activeCount++;
    }
  }

  Logger.log(`syncURSAvailabilityForOne: ${ursName} has ${activeCount} active projects`);

  if (activeCount === 0) {
    // URS is free — mark Available and clear system reason
    // But check if they have a custom manual reason first
    const ursSheet = ss.getSheetByName(CONFIG.SHEET.URS);
    const ursData = ursSheet.getDataRange().getValues();
    const UC = CONFIG.URS_COL;

    for (let i = 1; i < ursData.length; i++) {
      const fullName = (ursData[i][UC.FULL_NAME - 1] || '').toString().trim();
      if (fullName.toLowerCase() === ursName.toLowerCase()) {
        const currentReason = (ursData[i][UC.AVAILABILITY_REASON - 1] || '').toString().trim();
        // Only auto-set to Available if the reason was the system-set one
        if (currentReason === '' || currentReason === 'Working on a project') {
          setURSAvailabilityInternal(ursName, 'Available', '');
        }
        // If they have a custom reason (e.g., "On leave"), leave them as Unavailable
        break;
      }
    }
  }
  // If activeCount > 0, they remain Unavailable — do nothing
}

// =============================================================================
// syncAllURSAvailability — Re-evaluates all URS availability from scratch
// Useful after bulk status updates or manual Officer use from the menu.
// =============================================================================
function syncAllURSAvailability() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ursSheet = ss.getSheetByName(CONFIG.SHEET.URS);
  const clientsSheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
  const UC = CONFIG.URS_COL;
  const C  = CONFIG.COL;

  const ursData     = ursSheet.getDataRange().getValues();
  const clientsData = clientsSheet.getDataRange().getValues();

  // Build a map: ursName (lowercase) → count of In Progress projects
  const activeMap = {};
  for (let i = 1; i < clientsData.length; i++) {
    const assigned = (clientsData[i][C.ASSIGNED_URS - 1] || '').toString().trim().toLowerCase();
    const status   = (clientsData[i][C.STATUS - 1] || '').toString().trim();
    if (assigned && status === 'In Progress') {
      activeMap[assigned] = (activeMap[assigned] || 0) + 1;
    }
  }

  let updated = 0;
  for (let i = 1; i < ursData.length; i++) {
    const fullName = (ursData[i][UC.FULL_NAME - 1] || '').toString().trim();
    if (!fullName) continue;

    const lowerName     = fullName.toLowerCase();
    const activeCount   = activeMap[lowerName] || 0;
    const currentAvail  = (ursData[i][UC.AVAILABILITY - 1] || '').toString().trim();
    const currentReason = (ursData[i][UC.AVAILABILITY_REASON - 1] || '').toString().trim();
    const rowNum        = i + 1;

    if (activeCount > 0) {
      // Has active projects → Unavailable
      if (currentAvail !== 'Unavailable' || currentReason !== 'Working on a project') {
        // Only overwrite if current reason is blank or the system default
        if (currentReason === '' || currentReason === 'Working on a project') {
          ursSheet.getRange(rowNum, UC.AVAILABILITY).setValue('Unavailable');
          ursSheet.getRange(rowNum, UC.AVAILABILITY_REASON).setValue('Working on a project');
          updated++;
        }
      }
    } else {
      // No active projects → Available (only if reason is system-generated or blank)
      if (currentReason === '' || currentReason === 'Working on a project') {
        if (currentAvail !== 'Available') {
          ursSheet.getRange(rowNum, UC.AVAILABILITY).setValue('Available');
          ursSheet.getRange(rowNum, UC.AVAILABILITY_REASON).setValue('');
          updated++;
        }
      }
    }
  }

  SpreadsheetApp.getUi().alert(
    `✅  URS Availability Synced!\n\n` +
    `${updated} URS record(s) were updated based on current project statuses.`
  );
}

// =============================================================================
// checkAndSendDeadlineReminders — Daily trigger function
// • Sends a warning email when exactly 2 working days remain before deadline
// • Sends a daily overdue email when the deadline has been missed
// Both the URS and the ISM Officer receive the email.
// =============================================================================
function checkAndSendDeadlineReminders() {
  Logger.log('checkAndSendDeadlineReminders: Starting daily check...');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
  if (!sheet) {
    Logger.log('checkAndSendDeadlineReminders: Clients sheet not found');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const C = CONFIG.COL;

  // Collect URS emails from URS_Registry for lookup
  const ursEmailMap = buildURSEmailMap();

  let warningsSent = 0;
  let overduesSent = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[C.RECORD_ID - 1]) continue;

    const status      = (row[C.STATUS - 1] || '').toString().trim();
    const deadlineRaw = row[C.DEADLINE_DATE - 1];

    // Only process In Progress records with a deadline
    if (status !== 'In Progress' || !deadlineRaw) continue;

    let deadlineDate;
    try {
      deadlineDate = new Date(deadlineRaw);
      if (isNaN(deadlineDate.getTime())) continue;
    } catch (e) {
      continue;
    }

    const remaining   = countRemainingWorkingDays(deadlineDate);
    const recordId    = row[C.RECORD_ID - 1]    || '';
    const clientName  = row[C.CLIENT_NAME - 1]  || '';
    const title       = row[C.TITLE - 1]        || '';
    const serviceType = row[C.SERVICE - 1]      || '';
    const assignedURS = row[C.ASSIGNED_URS - 1] || '';
    const ursEmail    = ursEmailMap[assignedURS.toLowerCase()] || '';
    const deadlineStr = Utilities.formatDate(deadlineDate, 'Asia/Manila', 'MMMM d, yyyy');

    if (remaining === 2) {
      // ── 2-day warning ──────────────────────────────────────────────────
      const subject = `[ISRM] ⚠️ Deadline in 2 Days — ${recordId}`;
      const body =
`Dear ${assignedURS || 'URS'},

This is a reminder that the turnaround deadline for the following project is in 2 WORKING DAYS.

── PROJECT DETAILS ────────────────────────────────────
Record ID    : ${recordId}
Client       : ${clientName}
Research     : ${title}
Service Type : ${serviceType}
Deadline     : ${deadlineStr}
Remaining    : 2 working days
────────────────────────────────────────────────────

Please ensure the statistical work is completed and submitted to the client on time.

If you need assistance or an extension, contact the ISRM Officer immediately:
📧 ${CONFIG.ISM_OFFICER_EMAIL}
📞 (074) 444-8246 to 48 local 387

ISRM Unit — Saint Louis University · Baguio City 2600`;

      // Send to URS
      if (ursEmail) {
        GmailApp.sendEmail(ursEmail, subject, body);
        Logger.log(`2-day warning sent to ${ursEmail} for ${recordId}`);
      }
      // Always send to Officer
      GmailApp.sendEmail(CONFIG.ISM_OFFICER_EMAIL, subject,
        `[Officer Copy]\n\n` + body + `\n\nAssigned URS: ${assignedURS} (${ursEmail || 'no email on file'})`
      );
      warningsSent++;

    } else if (remaining < 0) {
      // ── Overdue daily alert ────────────────────────────────────────────
      const daysOverdue = Math.abs(remaining);
      const subject = `[ISRM] 🚨 OVERDUE ${daysOverdue}d — ${recordId}`;
      const body =
`Dear ${assignedURS || 'URS'},

The following project is now OVERDUE by ${daysOverdue} working day${daysOverdue === 1 ? '' : 's'}.

── PROJECT DETAILS ────────────────────────────────────
Record ID    : ${recordId}
Client       : ${clientName}
Research     : ${title}
Service Type : ${serviceType}
Deadline     : ${deadlineStr} (MISSED)
Days Overdue : ${daysOverdue} working day${daysOverdue === 1 ? '' : 's'}
────────────────────────────────────────────────────

Please complete the work immediately and update the project status to "Completed"
in your URS Dashboard, or contact the ISRM Officer to discuss next steps.

📧 ${CONFIG.ISM_OFFICER_EMAIL}
📞 (074) 444-8246 to 48 local 387

ISRM Unit — Saint Louis University · Baguio City 2600`;

      if (ursEmail) {
        GmailApp.sendEmail(ursEmail, subject, body);
        Logger.log(`Overdue alert sent to ${ursEmail} for ${recordId} (${daysOverdue}d overdue)`);
      }
      GmailApp.sendEmail(CONFIG.ISM_OFFICER_EMAIL, subject,
        `[Officer Copy]\n\n` + body + `\n\nAssigned URS: ${assignedURS} (${ursEmail || 'no email on file'})`
      );
      overduesSent++;
    }
  }

  Logger.log(`checkAndSendDeadlineReminders: Done. Warnings: ${warningsSent}, Overdues: ${overduesSent}`);
}

// =============================================================================
// HELPER — buildURSEmailMap
// Returns an object mapping ursName.toLowerCase() → email
// =============================================================================
function buildURSEmailMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.URS);
  if (!sheet) return {};

  const data = sheet.getDataRange().getValues();
  const UC = CONFIG.URS_COL;
  const map = {};

  for (let i = 1; i < data.length; i++) {
    const name  = (data[i][UC.FULL_NAME - 1] || '').toString().trim();
    const email = (data[i][UC.EMAIL - 1]     || '').toString().trim();
    if (name && email) {
      map[name.toLowerCase()] = email;
    }
  }

  return map;
}

// =============================================================================
// CONTENT MANAGEMENT — addContentRow / updateContentRow / deleteContentRow
// These back the Officer Portal's Content Manager for Announcements,
// LiveUpdates, and Resources sheets.
//
// Column layout per sheet (must match what getAnnouncements/getLiveUpdates/
// getResources read):
//
//   Announcements : Type | Badge | BadgeColor | Date | Title | Body | Link
//   LiveUpdates   : Title | Description | Link | Date | Category
//   Resources     : Category | Title | Description | Link | Tags
// =============================================================================

/**
 * COLUMN MAP — maps field key → column index (1-based) for each sheet
 */
var CONTENT_COLS = {
  Announcements: {
    type: 1, badge: 2, badgeColor: 3, date: 4, title: 5, body: 6, link: 7,
  },
  LiveUpdates: {
    title: 1, description: 2, link: 3, date: 4, category: 5,
  },
  Resources: {
    category: 1, title: 2, description: 3, link: 4, tags: 5,
  },
};

/**
 * resolveContentSheet — Gets or creates the sheet for a given content type.
 * Creates the sheet with appropriate headers if it does not exist.
 */
function resolveContentSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = {
      Announcements: ['Type', 'Badge', 'BadgeColor', 'Date', 'Title', 'Body', 'Link'],
      LiveUpdates:   ['Title', 'Description', 'Link', 'Date', 'Category'],
      Resources:     ['Category', 'Title', 'Description', 'Link', 'Tags'],
    };
    const h = headers[sheetName];
    if (h) {
      sheet.getRange(1, 1, 1, h.length)
        .setValues([h])
        .setFontWeight('bold')
        .setBackground('#1A3666')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
    Logger.log('resolveContentSheet: Created new sheet ' + sheetName);
  }

  return sheet;
}

/**
 * rowToValues — Converts a field object into an ordered value array
 * based on the column map for the given sheet.
 */
function rowToValues(sheetName, rowObj) {
  const colMap = CONTENT_COLS[sheetName];
  if (!colMap) throw new Error('Unknown content sheet: ' + sheetName);

  const maxCol = Math.max.apply(null, Object.values(colMap));
  const values = new Array(maxCol).fill('');

  Object.entries(colMap).forEach(function(entry) {
    const key = entry[0];
    const col = entry[1];
    let val = rowObj[key] !== undefined ? rowObj[key] : '';
    // Tags may come as an array — join to comma-separated string for storage
    if (Array.isArray(val)) val = val.join(', ');
    values[col - 1] = val;
  });

  return values;
}

/**
 * addContentRow — Appends a new row to the specified content sheet.
 * @param {string} sheetName  'Announcements' | 'LiveUpdates' | 'Resources'
 * @param {object} row        Field key-value pairs
 */
function addContentRow(sheetName, row) {
  try {
    const sheet = resolveContentSheet(sheetName);
    const values = rowToValues(sheetName, row);
    sheet.appendRow(values);
    Logger.log('addContentRow: Added row to ' + sheetName);
    return { success: true, message: 'Item added to ' + sheetName };
  } catch (e) {
    Logger.log('addContentRow error: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * updateContentRow — Overwrites an existing row in the content sheet.
 * @param {string} sheetName  Sheet to update
 * @param {number} rowNum     1-indexed row number (row 1 = header, so data starts at 2)
 * @param {object} row        Updated field key-value pairs
 */
function updateContentRow(sheetName, rowNum, row) {
  try {
    if (!rowNum || rowNum < 2) {
      return { success: false, message: 'Invalid row number: ' + rowNum };
    }
    const sheet = resolveContentSheet(sheetName);
    const values = rowToValues(sheetName, row);
    sheet.getRange(rowNum, 1, 1, values.length).setValues([values]);
    Logger.log('updateContentRow: Updated row ' + rowNum + ' in ' + sheetName);
    return { success: true, message: 'Item updated in ' + sheetName };
  } catch (e) {
    Logger.log('updateContentRow error: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * deleteContentRow — Deletes a row from the content sheet (shifts rows up).
 * @param {string} sheetName  Sheet to delete from
 * @param {number} rowNum     1-indexed row number to delete
 */
function deleteContentRow(sheetName, rowNum) {
  try {
    if (!rowNum || rowNum < 2) {
      return { success: false, message: 'Cannot delete header row or invalid row: ' + rowNum };
    }
    const sheet = resolveContentSheet(sheetName);
    if (rowNum > sheet.getLastRow()) {
      return { success: false, message: 'Row ' + rowNum + ' does not exist (sheet has ' + sheet.getLastRow() + ' rows)' };
    }
    sheet.deleteRow(rowNum);
    Logger.log('deleteContentRow: Deleted row ' + rowNum + ' from ' + sheetName);
    return { success: true, message: 'Item deleted from ' + sheetName };
  } catch (e) {
    Logger.log('deleteContentRow error: ' + e.message);
    return { success: false, message: e.message };
  }
}

// =============================================================================
// URS PASSWORD MANAGEMENT
// Password is stored in Column J (index 10, 1-based) of URS_Registry.
// The Officer sets an initial password per URS directly in the sheet.
// The URS can change their own password from the URS Portal.
// The Officer can reset any URS password (verified by Officer portal password).
//
// Security note: Passwords are stored as plain text in the Google Sheet,
// which is protected by Google account access controls. This is consistent
// with the existing system design. For higher security, use Google OAuth
// or a proper identity provider in a future version.
// =============================================================================

// Column N in URS_Registry = index 14 (1-based)
// Layout: A=URS ID, B=Full Name, C=Department, D=Highest Degree,
//         E=Specialization, F=Email, G=Contact, H=Available Days/Hours,
//         I=Status, J=AY Appointed, K=Notes, L=Availability,
//         M=Availability Reason, N=Password
var URS_PASSWORD_COL = 14;
// Officer password (same as the web portal) — used to authorise resets
var OFFICER_PORTAL_PASSWORD = 'ISRM_R3s3@rch';

/**
 * changeURSPasswordFn — Allows a URS to change their own password.
 * Requires current password to match before updating.
 * Called from the URS Portal via POST action=changeURSPassword.
 *
 * @param {string} ursName        Must match Full Name in URS_Registry
 * @param {string} email          Must match Email in URS_Registry
 * @param {string} currentPassword The URS's existing password
 * @param {string} newPassword     The desired new password
 */
function changeURSPasswordFn(ursName, email, currentPassword, newPassword) {
  try {
    if (!ursName || !email || !currentPassword || !newPassword) {
      return { success: false, message: 'All fields are required.' };
    }
    if (newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters.' };
    }
    if (currentPassword === newPassword) {
      return { success: false, message: 'New password must be different from the current password.' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.URS);
    if (!sheet) return { success: false, message: 'URS_Registry sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const UC = CONFIG.URS_COL;

    const inputName  = ursName.toString().trim().toLowerCase();
    const inputEmail = email.toString().trim().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const fullName   = (data[i][UC.FULL_NAME - 1] || '').toString().trim();
      const ursEmail   = (data[i][UC.EMAIL - 1]     || '').toString().trim();
      const storedPass = (data[i][URS_PASSWORD_COL - 1] || '').toString().trim();
      const status     = (data[i][UC.STATUS - 1]    || '').toString().trim();

      if (fullName.toLowerCase() === inputName && ursEmail.toLowerCase() === inputEmail) {
        if (status !== 'Active') {
          return { success: false, message: 'Your account is not active. Contact the ISRM Officer.' };
        }
        // Validate current password
        if (storedPass && storedPass !== currentPassword) {
          return { success: false, message: 'Current password is incorrect.' };
        }
        // Update password
        sheet.getRange(i + 1, URS_PASSWORD_COL).setValue(newPassword);
        Logger.log('changeURSPasswordFn: Password changed for ' + fullName);
        return { success: true, message: 'Password changed successfully.' };
      }
    }

    return { success: false, message: 'URS not found. Check your name and email.' };
  } catch (e) {
    Logger.log('changeURSPasswordFn error: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * resetURSPasswordFn — Allows the ISM Officer to reset any URS's password.
 * Requires the Officer portal password for authorisation.
 * Called from the Officer Portal via POST action=resetURSPassword.
 *
 * @param {string} ursName        URS Full Name to reset
 * @param {string} newPassword    New password to set (officer chooses this)
 * @param {string} officerPassword Must match OFFICER_PORTAL_PASSWORD
 */
function resetURSPasswordFn(ursName, newPassword, officerPassword) {
  try {
    if (!ursName || !newPassword || !officerPassword) {
      return { success: false, message: 'All fields are required.' };
    }
    // Verify Officer's own password before allowing reset
    if (officerPassword !== OFFICER_PORTAL_PASSWORD) {
      return { success: false, message: 'Invalid Officer password. Reset not authorised.' };
    }
    if (newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters.' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.URS);
    if (!sheet) return { success: false, message: 'URS_Registry sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const UC = CONFIG.URS_COL;
    const inputName = ursName.toString().trim().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const fullName = (data[i][UC.FULL_NAME - 1] || '').toString().trim();
      if (fullName.toLowerCase() === inputName) {
        sheet.getRange(i + 1, URS_PASSWORD_COL).setValue(newPassword);
        Logger.log('resetURSPasswordFn: Password reset for ' + fullName + ' by Officer');

        // Notify URS by email about the reset
        const ursEmail = (data[i][UC.EMAIL - 1] || '').toString().trim();
        if (ursEmail) {
          try {
            GmailApp.sendEmail(
              ursEmail,
              '[SLU ISRM] Your URS Portal Password Has Been Reset',
              'Dear ' + fullName + ',\n\n' +
              'The ISRM Officer has reset your URS Portal password.\n\n' +
              'Your new temporary password is: ' + newPassword + '\n\n' +
              'Please log in and change your password immediately.\n\n' +
              'If you did not request this reset, contact the ISRM Officer:\n' +
              '  Email: ' + CONFIG.ISM_OFFICER_EMAIL + '\n' +
              '  Phone: (074) 444-8246 to 48 local 387\n\n' +
              'ISRM Unit — Saint Louis University · Baguio City 2600'
            );
            Logger.log('resetURSPasswordFn: Notification sent to ' + ursEmail);
          } catch (emailErr) {
            Logger.log('resetURSPasswordFn: Could not send email — ' + emailErr.message);
          }
        }

        return {
          success: true,
          message: 'Password reset for ' + fullName + '.' + (ursEmail ? ' Notification sent to ' + ursEmail + '.' : ' No email on file — inform them manually.'),
        };
      }
    }

    return { success: false, message: 'URS "' + ursName + '" not found in URS_Registry.' };
  } catch (e) {
    Logger.log('resetURSPasswordFn error: ' + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * setupURSPasswordColumn — One-time setup helper.
 * Adds "Password" as the header for Column N (index 14) in URS_Registry.
 * Run from the menu or manually after first deployment.
 */
function setupURSPasswordColumn() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.URS);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('URS_Registry sheet not found. Run Initialize Dashboard first.');
    return;
  }

  const current = sheet.getRange(1, URS_PASSWORD_COL).getValue();
  if (!current) {
    sheet.getRange(1, URS_PASSWORD_COL)
      .setValue('Password')
      .setFontWeight('bold')
      .setBackground('#1A3666')
      .setFontColor('#FFFFFF');
    SpreadsheetApp.getUi().alert(
      '✅  Password column (Column N) added to URS_Registry.\n\n' +
      'Enter each URS\'s initial password in Column N.\n' +
      'The URS can change their own password from the URS Portal.\n' +
      'You can reset any URS password from the Officer Portal.'
    );
  } else if (current === 'Password') {
    SpreadsheetApp.getUi().alert('Password column is already set up in Column N. No changes made.');
  } else {
    // Column N has something unexpected — ask before overwriting
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '⚠️  Column N already contains: "' + current + '".\n\n' +
      'The URS_Registry layout expected here is:\n' +
      'A=URS ID, B=Full Name, C=Department, D=Highest Degree,\n' +
      'E=Specialization, F=Email, G=Contact, H=Available Days/Hours,\n' +
      'I=Status, J=AY Appointed, K=Notes, L=Availability,\n' +
      'M=Availability Reason, N=Password\n\n' +
      'Do you want to overwrite Column N with "Password"?',
      ui.ButtonSet.YES_NO
    );
    if (response === ui.Button.YES) {
      sheet.getRange(1, URS_PASSWORD_COL)
        .setValue('Password')
        .setFontWeight('bold')
        .setBackground('#1A3666')
        .setFontColor('#FFFFFF');
      SpreadsheetApp.getUi().alert('✅  Password column set in Column N.');
    } else {
      SpreadsheetApp.getUi().alert('No changes made. Check your column layout and try again.');
    }
  }
}

// =============================================================================
// getAllClientsData — Returns ALL client records for the URS Portal All Clients view
// Called by doGet ?action=getAllClients
// Returns every client with key fields; excludes sensitive Officer-only financial totals.
// =============================================================================
function getAllClientsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    if (!sheet) return { success: false, message: 'Clients sheet not found', clients: [] };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, clients: [] };

    const C = CONFIG.COL;
    const clients = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[C.RECORD_ID - 1]) continue; // skip blank rows

      clients.push({
        rowNum:               i + 1,
        'Record ID':          row[C.RECORD_ID - 1]    || '',
        'Date':               row[C.DATE - 1]          ? Utilities.formatDate(new Date(row[C.DATE - 1]), 'Asia/Manila', 'yyyy-MM-dd') : '',
        'Client Name':        row[C.CLIENT_NAME - 1]  || '',
        'Email':              row[C.EMAIL - 1]         || '',
        'Department/School':  row[C.DEPARTMENT - 1]   || '',
        'Research Title':     row[C.TITLE - 1]        || '',
        'Research Objectives':row[C.RESEARCH_OBJECTIVES - 1] || '',
        'Research Questions': row[C.RESEARCH_QUESTIONS - 1]  || '',
        'Service Type':       row[C.SERVICE - 1]      || '',
        'Total Fee (P)':      parseFloat(row[C.TOTAL_FEE - 1] || 0),
        'Payment Status':     row[C.PAY_STATUS - 1]   || '',
        'Assigned URS':       row[C.ASSIGNED_URS - 1] || '',
        'URS Share 60% (P)':  parseFloat(row[C.URS_SHARE - 1] || 0),
        'Status':             row[C.STATUS - 1]       || '',
        'Remarks':            row[C.REMARKS - 1]      || '',
        'Drive Folder URL':   row[C.DRIVE_FOLDER - 1] || '',
        'In Progress Date':   row[C.IN_PROGRESS_DATE - 1] || '',
        'Deadline Date':      row[C.DEADLINE_DATE - 1]    || '',
      });
    }

    return { success: true, clients: clients };
  } catch (e) {
    return { success: false, message: e.message, clients: [] };
  }
}

// =============================================================================
// expressInterestFn — URS expresses interest in an unassigned client.
// Sends a notification email to the ISM Officer with the URS's name and client ID.
// The Officer reviews and makes the final assignment decision.
// Called from the URS Portal via POST action=expressInterest.
// =============================================================================
function expressInterestFn(recordId, ursName) {
  try {
    if (!recordId || !ursName) {
      return { success: false, message: 'Record ID and URS name are required.' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET.CLIENTS);
    if (!sheet) return { success: false, message: 'Clients sheet not found.' };

    const data = sheet.getDataRange().getValues();
    const C = CONFIG.COL;

    // Find the client record
    let clientRow = null;
    for (let i = 1; i < data.length; i++) {
      if ((data[i][C.RECORD_ID - 1] || '').toString().trim() === recordId.toString().trim()) {
        clientRow = data[i];
        break;
      }
    }

    if (!clientRow) {
      return { success: false, message: 'Client record not found: ' + recordId };
    }

    const clientName   = clientRow[C.CLIENT_NAME - 1] || '';
    const serviceType  = clientRow[C.SERVICE - 1]     || '';
    const assignedURS  = (clientRow[C.ASSIGNED_URS - 1] || '').toString().trim();

    // Double-check client is still unassigned
    if (assignedURS && assignedURS !== '') {
      return {
        success: false,
        message: 'This client has already been assigned to ' + assignedURS + '. Please refresh the list.',
      };
    }

    // Build email to Officer
    const subject = '[ISRM URS Portal] Interest in Client ' + recordId + ' — ' + ursName;
    const body =
      'Dear ISRM Officer,\n\n' +
      'The following URS has expressed interest in taking on a client:\n\n' +
      '── URS Details ────────────────────────────────────\n' +
      'URS Name     : ' + ursName + '\n' +
      '────────────────────────────────────────────────────\n\n' +
      '── Client Details ──────────────────────────────────\n' +
      'Record ID    : ' + recordId + '\n' +
      'Client Name  : ' + clientName + '\n' +
      'Service Type : ' + serviceType + '\n' +
      '────────────────────────────────────────────────────\n\n' +
      'Please review and assign the client to ' + ursName + ' if appropriate.\n\n' +
      'You can do this by updating the "Assigned URS" column (Column R) for Record ID ' + recordId +
      ' in the Clients sheet.\n\n' +
      'ISRM URS Portal — Saint Louis University · Baguio City 2600';

    GmailApp.sendEmail(CONFIG.ISM_OFFICER_EMAIL, subject, body);
    Logger.log('expressInterestFn: Email sent to Officer for ' + recordId + ' from ' + ursName);

    return {
      success: true,
      message: 'Your interest has been submitted. The ISRM Officer will review and assign you to this client.',
    };
  } catch (e) {
    Logger.log('expressInterestFn error: ' + e.message);
    return { success: false, message: e.message };
  }
}
