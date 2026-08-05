# ISRM Digital Operations System - Implementation Summary

## Overview

This document summarizes all the features and improvements made to the ISRM (Institutional Studies & Research Methods) Digital Operations System for Saint Louis University's RISE Center.

---

## 1. Website Deployment

**URL:** https://isrm-websitev3.vercel.app  
**Repository:** https://github.com/holagto-create/isrm-websitev3

### Frontend Stack
- React with TypeScript
- Tailwind CSS for styling
- Lucide React for icons

---

## 2. Portal Features

### A. URS Portal (University Research Statistician)

**Login Requirements:**
- Name (as registered in URS_Registry)
- Email (must match SLU email in URS_Registry)
- Status must be "Active" in the registry

**Features:**
- Dashboard showing assigned clients
- Summary cards: Total Clients, In Progress, Completed, Total Earnings
- Client table with: Record ID, Client Name, Research Title, Service Type, Payment Status, Status, My Share (60%), Notes, Actions

**Client Management:**
- Edit status: New → In Progress → Completed
- Add notes (saved to Google Sheets Remarks column)
- View Google Drive folder for each client
- Session persistence (stays logged in on refresh)

### B. Officer Portal

**Password:** `ISRM2026` (stored in api.ts)

**Features:**
- Dashboard with live Google Sheets data
- Sidebar menu: Dashboard, Clients, Financial, URS Registry, Reports
- Filter clients by status (All, Pending, Paid, Completed, In Progress, New)
- Client detail view with full information
- Financial summary: Gross Fees, URS Honoraria (60%), Unit Share (40%)
- URS Registry management
- Report generation: FM-RIS-059 & FM-RIS-060

---

## 3. Google Sheets Integration

### Sheet Structure

**Clients Sheet (Required Columns):**
| Column | Description |
|--------|-------------|
| Record ID | Auto-generated (ISRM-YYYY-NNNN) |
| Date | Request date |
| Client Name | Client's full name |
| Email | Contact email |
| Research Title | Project title |
| Service Type | Consultation, Full Assistance, etc. |
| Total Fee (₱) | Fee amount |
| Payment Status | Pending/Paid |
| Assigned URS | Assigned statistician |
| Status | New/In Progress/Completed |
| Remarks | Notes from URS |

**Announcements Sheet:**
| Column | Description |
|--------|-------------|
| Type | Workshop, Methodology Minute, Advisory |
| Badge | Upcoming, New, Notice |
| Date | Date of announcement |
| Title | Announcement title |
| Body | Announcement content |

**LiveUpdates Sheet:**
| Column | Description |
|--------|-------------|
| Title | Resource title |
| Description | Brief description |
| Link | URL to resource |
| Date | Publication date |
| Category | Trends, Guidelines, Tools, Publications |

**Resources Sheet:**
| Column | Description |
|--------|-------------|
| Category | Statistical Tools, Validity & Reliability, etc. |
| Title | Resource name |
| Description | Description |
| Link | URL |
| Tags | Comma-separated tags |

---

## 4. Google Apps Script Backend

### API Endpoints (Content API)

| Action | Description |
|--------|-------------|
| `getAnnouncements` | Returns announcements from Announcements sheet |
| `getLiveUpdates` | Returns resources from LiveUpdates sheet |
| `getResources` | Returns resources from Resources sheet |

### Functions

**Client Management:**
- `onFormSubmit()` - Handles FM-RIS-002 form submissions
- `onEdit()` - Auto-calculates 60/40 split, stamps Record ID, sends notifications
- `updateClientStatusByURS()` - Updates client status and notes from URS dashboard

**Report Generation:**
- `generateSemestralReport()` - Creates FM-RIS-059 PDF
- `generateHonorariaRequisition()` - Creates FM-RIS-060 PDF
- `generateSemestralReportDirect()` - API version
- `generateHonorariaRequisitionDirect()` - API version

**Notifications:**
- Client acknowledgment email (with FM-RIS-002 PDF attachment)
- ISM Officer alert email
- Appointment booking link email (on payment confirmation)
- URS notification when assigned to client

---

## 5. User Experience Improvements

### Implemented
- Toast notifications (success/error/info) instead of browser alerts
- Better loading states with descriptive messages
- Session persistence (stays logged in on page refresh)
- Date formatting for Manila timezone
- Notes column with hover tooltips

---

## 6. Deployment Steps

### Initial Setup
1. Create Google Sheet with required sheets (Clients, URS_Registry, Financial_Summary, Announcements, LiveUpdates, Resources)
2. Deploy Apps Script as Web App (Execute as: Me, Access: Anyone)
3. Deploy React app to Vercel
4. Update API URL in api.ts

### Updating Content
1. Edit content in Google Sheets
2. Refresh website - no redeployment needed!

### Updating Code
1. Make changes in website-deploy repository
2. Commit and push to GitHub
3. Vercel auto-deploys

### Updating Apps Script
1. Edit Code.gs in Google Apps Script
2. Deploy → New deployment
3. Share new URL if API structure changed

---

## 7. Important Files

| File | Description |
|------|-------------|
| `website-deploy/src/App.tsx` | Main React application |
| `website-deploy/src/api.ts` | API functions and configuration |
| `website-deploy/isrm_apps_script_v3.js` | Google Apps Script (backup) |
| `isrm_apps_script_contentAPI.gs` | Content API for announcements/updates/resources |

---

## 8. Current API URLs

**Content API:** https://script.google.com/macros/s/AKfycbx8CiU_mcRmZYSJeuSvFNhAC_lK27W2_3bVTflplvn6s7a1jxPzmQIiABNX50CQGo7R2w/exec

---

## 9. Color Scheme

| Color | Hex Code | Usage |
|-------|----------|-------|
| Navy | #1A3666 | Primary brand color |
| Gold | #C8943A | Accent/highlight |
| Slate | Various | Text and backgrounds |

---

## 10. Future Improvements (Optional)

- Search/filter clients by name, status, date
- Export data to CSV/Excel
- Dashboard charts/analytics
- Bulk client assignment to URS
- Email notifications for pending payments
- Mobile responsive design improvements

---

*Last Updated: April 2026*
*ISRM Unit — RISE Center, Saint Louis University*
