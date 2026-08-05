# ISRM Website - Code Documentation

This document contains the key code files used in the ISRM Digital Operations System website.

---

## Table of Contents
1. [api.ts - API Configuration](#1-apits---api-configuration)
2. [App.tsx - Main Application](#2-apptsx---main-application)
3. [index.css - Styles](#3-indexcss---styles)

---

## 1. api.ts - API Configuration

```typescript
// Google Apps Script Web App URL
// Deployed: April 11, 2026
export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx8CiU_mcRmZYSJeuSvFNhAC_lK27W2_3bVTflplvn6s7a1jxPzmQIiABNX50CQGo7R2w/exec';

export const OFFICER_PASSWORD = 'ISRM2026'; // Officer portal password

export interface URSClient {
  'Record ID': string;
  'Client Name': string;
  'Email': string;
  'Research Title': string;
  'Service Type': string;
  'Payment Status': string;
  'Status': string;
  'URS Share 60% (₱)': number;
  'Drive Folder URL': string;
  'Date': string;
  'Course/Department': string;
  'Total Fee (₱)': number;
  'ORS #': string;
  'Assigned URS': string;
  'Unit Share 40% (₱)': number;
}

export interface URSSummary {
  totalClients: number;
  inProgress: number;
  completed: number;
  newClients: number;
  totalEarnings: number;
}

export interface URSClientResponse {
  success: boolean;
  ursName: string;
  clients: URSClient[];
  summary: URSSummary;
}

export interface ValidationResponse {
  success: boolean;
  valid: boolean;
  name?: string;
  message?: string;
}

export interface DashboardData {
  clients: URSClient[];
  urs: any[];
  financial: {
    grossFees: number;
    ursHonoraria: number;
    unitShare: number;
    paidCount: number;
    pendingCount: number;
    completedCount: number;
    inProgressCount: number;
    newCount: number;
    totalCount: number;
  };
}

export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  recordId?: string;
  status?: string;
  notesAdded?: boolean;
}

// Call Google Apps Script Web App API
async function callScriptAPI<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
}

// Validate URS credentials
export async function validateURSCredentials(name: string, email: string, password: string): Promise<ValidationResponse> {
  return callScriptAPI<ValidationResponse>('validateURSCredentials', { name, email, password });
}

// Get clients for a specific URS
export async function getURSClients(ursName: string): Promise<URSClientResponse> {
  return callScriptAPI<URSClientResponse>('getURSClients', { ursName });
}

// Get all dashboard data (for Officer)
export async function getDashboardData(): Promise<DashboardData> {
  return callScriptAPI<DashboardData>('getDashboardData');
}

// Update client status (for URS)
export async function updateClientStatus(recordId: string, status: string, notes?: string): Promise<UpdateStatusResponse> {
  try {
    console.log('Sending update request:', { action: 'updateClientStatus', recordId, status, notes });
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateClientStatus',
        recordId,
        status,
        notes: notes || ''
      })
    });
    
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response text:', text);
    
    // Check if response is empty or not valid JSON
    if (!text || text.trim() === '') {
      return { success: false, message: 'Empty response from server' };
    }
    
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, message: 'Failed to parse response: ' + text.substring(0, 200) };
    }
  } catch (err: any) {
    console.error('Fetch error:', err);
    throw new Error(err.message || 'Network error: ' + err.toString());
  }
}

// Content APIs - fetch from Google Sheets

export interface Announcement {
  id: number;
  type: string;
  badge: string;
  date: string;
  title: string;
  body: string;
}

export interface LiveUpdate {
  id: number;
  title: string;
  description: string;
  link: string;
  date: string;
  category: string;
}

export interface Resource {
  id: number;
  category: string;
  title: string;
  description: string;
  link: string;
  tags: string[];
}

// Call Google Apps Script Web App API (GET requests)
async function callScriptAPIGet<T>(action: string): Promise<T> {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', action);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

export async function getAnnouncements(): Promise<{ success: boolean; announcements: Announcement[] }> {
  return callScriptAPIGet<{ success: boolean; announcements: Announcement[] }>('getAnnouncements');
}

export async function getLiveUpdates(): Promise<{ success: boolean; updates: LiveUpdate[] }> {
  return callScriptAPIGet<{ success: boolean; updates: LiveUpdate[] }>('getLiveUpdates');
}

export async function getResources(): Promise<{ success: boolean; resources: Resource[] }> {
  return callScriptAPIGet<{ success: boolean; resources: Resource[] }>('getResources');
}
```

---

## 2. App.tsx - Main Application

### Key Imports

```typescript
import { useState, useEffect } from 'react';
import {
  Activity, Bell, BookOpen, Calculator, Users, BookMarked,
  ChevronRight, ChevronDown, ChevronUp, ExternalLink,
  ArrowRight, CheckCircle, Clock, Mail, Phone,
  BarChart2, FileText, Lightbulb, Microscope, Star,
  GraduationCap, Award, Search, X, Menu, Lock,
  Send, Layers, AlertCircle, Calculator as CalcIcon,
  Percent, Target, FlaskConical, ArrowUpRight,
  BarChart3, TrendingUp, FolderOpen
} from 'lucide-react';
import { validateURSCredentials, getURSClients, getDashboardData, updateClientStatus, getAnnouncements, getLiveUpdates, getResources, OFFICER_PASSWORD } from './api';
```

### Type Definitions

```typescript
interface Announcement {
  id: number;
  type: 'Workshop' | 'Methodology Minute' | 'Advisory';
  badge: string;
  badgeColor: 'gold' | 'teal' | 'green' | 'navy';
  date: string;
  title: string;
  body: string;
  link?: string;
}

interface Resource {
  id: number;
  category: string;
  title: string;
  description: string;
  link: string;
  tags: string[];
}

interface Personnel {
  role: string;
  name: string;
  description: string;
  responsibilities: string[];
  icon: string;
}

interface LiveUpdate {
  id: number;
  title: string;
  description: string;
  link: string;
  date: string;
  category: 'Trends' | 'Guidelines' | 'Tools' | 'Publications';
}
```

### Main App Component

```typescript
export default function App() {
  const [currentPage, setCurrentPage] = useState(() => sessionStorage.getItem('currentPage') || 'home');
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('officerAuthenticated') === 'true');
  const [ursAuthenticated, setURSAuthenticated] = useState(false);
  const [ursName, setURSName] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info'} | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);

  // Toast helper function
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch content from Google Sheets on load
  useEffect(() => {
    const fetchContent = async () => {
      try {
        console.log('Fetching announcements from API...');
        const [annRes, updateRes] = await Promise.all([
          getAnnouncements(),
          getLiveUpdates()
        ]);
        console.log('API Response - Announcements:', annRes);
        console.log('API Response - LiveUpdates:', updateRes);
        
        if (annRes.success && annRes.announcements && annRes.announcements.length > 0) {
          setAnnouncements(annRes.announcements);
          console.log('✓ Loaded announcements:', annRes.announcements.length);
        } else {
          console.log('No announcements from API, using defaults');
        }
        
        if (updateRes.success && updateRes.updates && updateRes.updates.length > 0) {
          setLiveUpdates(updateRes.updates);
          console.log('✓ Loaded live updates:', updateRes.updates.length);
        } else {
          console.log('No live updates from API, using defaults');
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        console.log('Using default content');
      }
    };
    fetchContent();
  }, []);

  // Save currentPage to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Check for saved URS session on load
  useEffect(() => {
    const savedURSName = sessionStorage.getItem('ursName');
    const savedURSAuth = sessionStorage.getItem('ursAuthenticated');
    if (savedURSName && savedURSAuth === 'true') {
      setURSName(savedURSName);
      setURSAuthenticated(true);
    }
  }, []);
}
```

### URS Dashboard Component (Key Functions)

```typescript
function URSDashboardPage({ ursName, onLogout, showToast }: { ursName: string; onLogout: () => void; showToast?: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [clients, setClients] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleEditClient = (client: any) => {
    setEditingClient(client['Record ID']);
    setEditStatus(client['Status'] || 'New');
    setEditNotes('');
  };

  const handleSaveStatus = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingClient) return false;
    setUpdating(true);
    try {
      const result = await updateClientStatus(editingClient, editStatus, editNotes);
      if (result.success) {
        // Update local state immediately
        setClients(prevClients => prevClients.map(c => 
          c['Record ID'] === editingClient 
            ? { ...c, 'Status': editStatus, 'Remarks': editNotes ? ((c['Remarks'] || '') + '\n[' + new Date().toLocaleString() + '] ' + editNotes) : c['Remarks'] }
            : c
        ));
        // Exit edit mode immediately on success
        setEditingClient(null);
        showToast?.('Status updated successfully!', 'success');
      } else {
        showToast?.(result.message || 'Failed to update', 'error');
      }
    } catch (err: any) {
      console.error('Error:', err);
      showToast?.('Failed to connect. Please try again.', 'error');
    } finally {
      setUpdating(false);
    }
    return false;
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setEditStatus('');
    setEditNotes('');
  };

  if (loading) {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-navy border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading your assigned clients...</p>
        </div>
      </div>
    );
  }
  // ... rest of component
}
```

### Officer Dashboard Component

```typescript
function DashboardPage({ onLogout, showToast }: { onLogout: () => void; showToast?: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeSection, setActiveSection] = useState(() => sessionStorage.getItem('officerSection') || 'dashboard');

  // Save active section to session storage
  useEffect(() => {
    sessionStorage.setItem('officerSection', activeSection);
  }, [activeSection]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardData();
      if (data.clients) {
        setClients(data.clients);
      }
      if (data.urs) {
        setUrsList(data.urs);
      }
      if (data.financial) {
        setFinancial(data.financial);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'clients', label: 'Clients' },
    { id: 'financial', label: 'Financial' },
    { id: 'urs', label: 'URS Registry' },
    { id: 'reports', label: 'Reports' },
  ];
  // ... rest of component
}
```

---

## 3. index.css - Styles

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Source Serif 4', Georgia, serif;
}

::selection {
  background-color: rgba(201, 168, 76, 0.3);
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f8f9fc;
}

::-webkit-scrollbar-thumb {
  background: #B0BDCC;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #0f2557;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
```

---

## 4. Content API (Google Apps Script)

```javascript
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getAnnouncements') {
    return getAnnouncementsAPI();
  }
  if (action === 'getLiveUpdates') {
    return getLiveUpdatesAPI();
  }
  if (action === 'getResources') {
    return getResourcesAPI();
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: 'ok', actions: ['getAnnouncements', 'getLiveUpdates', 'getResources']}));
}

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
```

---

## File Locations

| File | Path |
|------|------|
| API Configuration | `E:\ISRM Digital Ops System v2.0\website-deploy\src\api.ts` |
| Main Application | `E:\ISRM Digital Ops System v2.0\website-deploy\src\App.tsx` |
| Styles | `E:\ISRM Digital Ops System v2.0\website-deploy\src\index.css` |
| Content API | `isrm_apps_script_contentAPI.gs` (in Google Apps Script) |

---

*Last Updated: April 2026*
*ISRM Unit — RISE Center, Saint Louis University*
