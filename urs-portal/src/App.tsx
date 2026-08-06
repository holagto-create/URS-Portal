import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Users, FileText, FolderOpen, Lock, LogOut,
  CheckCircle, Clock, AlertCircle, RefreshCw,
  Edit2, Save, X, Key, BarChart2, Shield, Menu, Bell,
  ChevronDown, ChevronUp
} from 'lucide-react';

// ============================================================================
// CONFIG
// ============================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMu0lmzDEPrYREOdeGX9uSuQ__c0lnZ-mBkTGRbFDhOcfwgEO6bqNW6IdZV6u-puzNWg/exec';

// ============================================================================
// TYPES
// ============================================================================
interface Client {
  rowNum?: number;
  'Record ID': string;
  'Date': string;
  'Client Name': string;
  'Email': string;
  'Department/School': string;
  'Research Title': string;
  'Research Objectives': string;
  'Research Questions': string;
  'Service Type': string;
  'Total Fee (\u20B1)': number;
  'Payment Status': string;
  'Assigned URS': string;
  'URS Share 60% (\u20B1)': number;
  'Status': string;
  'Remarks': string;
  'Drive Folder URL': string;
  'In Progress Date': string;
  'Deadline Date': string;
}
interface URSProfile {
  name: string; email: string; department: string; status: string;
  availability: 'Available' | 'Unavailable'; availabilityReason: string;
}
interface Toast { message: string; type: 'success' | 'error' | 'info'; }
type Section = 'dashboard' | 'my-clients' | 'all-clients' | 'availability' | 'password';
// ============================================================================
// API HELPERS
// ============================================================================
async function apiGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error('Parse error: ' + text.substring(0, 120)); }
}

async function apiPost<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error('Parse error: ' + text.substring(0, 120)); }
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================
function formatDate(d: string): string {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

function statusColor(s: string): string {
  if (s === 'Completed') return 'bg-emerald-100 text-emerald-800';
  if (s === 'In Progress') return 'bg-amber-100 text-amber-800';
  if (s === 'Cancelled') return 'bg-red-100 text-red-800';
  return 'bg-blue-100 text-blue-800';
}

function deadlineUrgency(remaining: number, isOverdue: boolean): string {
  if (isOverdue) return 'bg-red-100 text-red-700 border border-red-200';
  if (remaining <= 2) return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (remaining <= 5) return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  return 'bg-blue-100 text-blue-700 border border-blue-200';
}

function countWorkingDays(deadlineDateStr: string): { remaining: number; isOverdue: boolean } {
  if (!deadlineDateStr) return { remaining: 0, isOverdue: false };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineDateStr); deadline.setHours(0, 0, 0, 0);
  if (isNaN(deadline.getTime())) return { remaining: 0, isOverdue: false };
  const isOverdue = today > deadline;
  let count = 0;
  const cursor = new Date(isOverdue ? deadline.getTime() : today.getTime());
  const end = new Date(isOverdue ? today.getTime() : deadline.getTime());
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0) count++; // skip Sundays
  }
  return { remaining: isOverdue ? -count : count, isOverdue };
}
// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

function ToastNotification({ toast }: { toast: Toast | null }) {
  if (!toast) return null;
  const base = 'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-in';
  const styles = toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-navy text-white';
  return (
    <div className={`${base} ${styles}`}>
      {toast.type === 'success' && <CheckCircle size={16} />}
      {toast.type === 'error' && <AlertCircle size={16} />}
      {toast.type === 'info' && <Bell size={16} />}
      {toast.message}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-navy font-playfair">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
// ============================================================================
// LOGIN PAGE
// ============================================================================
function LoginPage({ onLogin }: { onLogin: (name: string, email: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) { setError('All fields are required.'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiGet<{ success: boolean; valid: boolean; name?: string; message?: string }>(
        'validateURSCredentials', { name: name.trim(), email: email.trim(), password: password.trim() }
      );
      if (res.success && res.valid) {
        onLogin(res.name || name.trim(), email.trim());
      } else {
        setError(res.message || 'Incorrect credentials. Please check your name, email, and password.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #071435 0%, #0f2557 55%, #1a3d7c 100%)' }}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,#C9A84C 39px,#C9A84C 40px),repeating-linear-gradient(90deg,transparent,transparent 79px,#C9A84C 79px,#C9A84C 80px)' }} />
      <div className="relative w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold/40 mx-auto mb-4 shadow-lg">
              <img src="/slu-logo.png" alt="SLU" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-navy font-playfair">URS Portal</h1>
            <p className="text-slate-500 text-sm mt-1">ISRM &mdash; Saint Louis University</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="As registered in URS Registry"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@slu.edu.ph"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Password provided by ISRM Officer"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy pr-12" />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 transition-all disabled:opacity-50 mt-2">
              {loading ? 'Verifying...' : 'Access My Dashboard'}
            </button>
          </form>
          <p className="text-xs text-slate-400 text-center mt-4">
            Forgot your password? Contact the ISRM Officer at <span className="text-navy font-medium">isrm_rise@slu.edu.ph</span>
          </p>
        </Card>
      </div>
    </div>
  );
}
// ============================================================================
// DASHBOARD OVERVIEW SECTION
// ============================================================================
function DashboardOverview({ ursName, myClients, profile }: { ursName: string; myClients: Client[]; profile: URSProfile | null }) {
  const inProgress = myClients.filter(c => c['Status'] === 'In Progress');
  const completed  = myClients.filter(c => c['Status'] === 'Completed');
  const newOnes    = myClients.filter(c => c['Status'] === 'New');
  const totalEarnings = myClients.filter(c => c['Payment Status'] === 'Paid')
    .reduce((s, c) => s + (Number(c['URS Share 60% (\u20B1)']) || 0), 0);

  const overdue = myClients.filter(c => {
    if (c['Status'] !== 'In Progress' || !c['Deadline Date']) return false;
    return countWorkingDays(c['Deadline Date']).isOverdue;
  });

  const stats = [
    { icon: Users,      label: 'Total Clients',   value: myClients.length, color: 'bg-navy' },
    { icon: Clock,      label: 'In Progress',      value: inProgress.length, color: 'bg-amber-500' },
    { icon: CheckCircle,label: 'Completed',         value: completed.length,  color: 'bg-emerald-600' },
    { icon: AlertCircle,label: 'New / Pending',     value: newOnes.length,    color: 'bg-blue-500' },
    { icon: BarChart2,  label: 'Paid Earnings',    value: `\u20B1${totalEarnings.toLocaleString()}`, color: 'bg-gold' },
    { icon: AlertCircle,label: 'Overdue',           value: overdue.length,    color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy font-playfair mb-1">Welcome back, {ursName}</h2>
        <p className="text-slate-500 text-sm">Here is a summary of your current workload.</p>
      </div>

      {/* Availability banner */}
      {profile && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          profile.availability === 'Available'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${profile.availability === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span>You are currently <strong>{profile.availability}</strong>
            {profile.availability === 'Unavailable' && profile.availabilityReason && ` — ${profile.availabilityReason}`}
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={18} className="text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-navy">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Upcoming deadlines */}
      {inProgress.filter(c => c['Deadline Date']).length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-navy px-5 py-3">
            <h3 className="text-white font-bold font-playfair text-sm">Active Deadlines</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {inProgress.filter(c => c['Deadline Date']).map(c => {
              const { remaining, isOverdue } = countWorkingDays(c['Deadline Date']);
              return (
                <div key={c['Record ID']} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-navy">{c['Record ID']}</span>
                    <span className="text-slate-500 text-xs ml-2 truncate">{c['Client Name']}</span>
                    <div className="text-xs text-slate-400 mt-0.5">{c['Service Type']} &mdash; due {formatDate(c['Deadline Date'])}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${deadlineUrgency(remaining, isOverdue)}`}>
                    {isOverdue ? `Overdue ${Math.abs(remaining)}d` : `${remaining}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
// ============================================================================
// MY CLIENTS SECTION
// ============================================================================
function MyClientsSection({ ursName, clients, onRefresh, showToast }:
  { ursName: string; clients: Client[]; onRefresh: () => void; showToast: (m: string, t: Toast['type']) => void }) {

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editStatus,  setEditStatus]  = useState('');
  const [editURS,     setEditURS]     = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');

  const statuses = ['All', 'New', 'In Progress', 'Completed', 'Cancelled'];
  const filtered = filter === 'All' ? clients : clients.filter(c => c['Status'] === filter);

  const startEdit = (c: Client) => {
    setEditingId(c['Record ID']);
    setEditStatus(c['Status'] || 'New');
    setEditURS(c['Assigned URS'] || ursName);
    setEditRemarks(c['Remarks'] || '');
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (c: Client) => {
    setSaving(true);
    try {
      const res = await apiPost<{ success: boolean; message?: string }>({
        action: 'updateClientStatus',
        recordId: c['Record ID'],
        status: editStatus,
        notes: editRemarks,
        assignedURS: editURS,
      });
      if (res.success) {
        showToast('Client record updated successfully.', 'success');
        setEditingId(null);
        onRefresh();
      } else {
        showToast(res.message || 'Update failed.', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="My Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''} assigned to you`}
        action={
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filter === s ? 'bg-navy text-white border-navy' : 'bg-white text-slate-600 border-slate-200 hover:border-navy'}`}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          <p>No clients match this filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const isExpanded = expandedId === c['Record ID'];
            const isEditing  = editingId  === c['Record ID'];
            const { remaining, isOverdue } = c['Deadline Date'] && c['Status'] === 'In Progress'
              ? countWorkingDays(c['Deadline Date'])
              : { remaining: 0, isOverdue: false };

            return (
              <Card key={c['Record ID']} className="overflow-hidden">
                {/* Card header */}
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400">{c['Record ID']}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColor(c['Status'])}`}>{c['Status'] || 'New'}</span>
                      {c['Status'] === 'In Progress' && c['Deadline Date'] && (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${deadlineUrgency(remaining, isOverdue)}`}>
                          {isOverdue ? `Overdue ${Math.abs(remaining)}d` : `${remaining}d left`}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-navy text-sm">{c['Client Name']}</p>
                    <p className="text-slate-500 text-xs">{c['Service Type']} • {c['Department/School'] || '—'}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {!isEditing && (
                      <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 transition-all" title="Edit">
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : c['Record ID'])}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 transition-all">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase">Update Record</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Status</label>
                        <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy">
                          {['New','In Progress','Completed','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Assigned URS</label>
                        <input type="text" value={editURS} onChange={e => setEditURS(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Remarks / Notes</label>
                      <textarea value={editRemarks} onChange={e => setEditRemarks(e.target.value)} rows={3}
                        placeholder="Add consultation notes, progress updates, or remarks..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={cancelEdit} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1">
                        <X size={13} /> Cancel
                      </button>
                      <button onClick={() => saveEdit(c)} disabled={saving}
                        className="px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy/90 flex items-center gap-1 disabled:opacity-50">
                        <Save size={13} /> {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-xs font-bold text-slate-400 uppercase">Research Title</span><p className="text-slate-700 mt-0.5">{c['Research Title'] || '—'}</p></div>
                      <div><span className="text-xs font-bold text-slate-400 uppercase">Payment</span><p className={`mt-0.5 font-semibold ${c['Payment Status'] === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{c['Payment Status'] || '—'}</p></div>
                      <div><span className="text-xs font-bold text-slate-400 uppercase">Total Fee</span><p className="text-navy font-bold mt-0.5">&#8369;{(Number(c['Total Fee (\u20B1)']) || 0).toLocaleString()}</p></div>
                      <div><span className="text-xs font-bold text-slate-400 uppercase">Your Share (60%)</span><p className="text-gold font-bold mt-0.5">&#8369;{(Number(c['URS Share 60% (\u20B1)']) || 0).toLocaleString()}</p></div>
                      {c['In Progress Date'] && <div><span className="text-xs font-bold text-slate-400 uppercase">Started</span><p className="text-slate-700 mt-0.5">{formatDate(c['In Progress Date'])}</p></div>}
                      {c['Deadline Date'] && <div><span className="text-xs font-bold text-slate-400 uppercase">Deadline</span><p className="text-slate-700 mt-0.5">{formatDate(c['Deadline Date'])}</p></div>}
                    </div>
                    {c['Research Objectives'] && <div><span className="text-xs font-bold text-slate-400 uppercase">Objectives</span><p className="text-slate-600 text-sm mt-0.5">{c['Research Objectives']}</p></div>}
                    {c['Research Questions'] && <div><span className="text-xs font-bold text-slate-400 uppercase">Research Questions</span><p className="text-slate-600 text-sm mt-0.5">{c['Research Questions']}</p></div>}
                    {c['Remarks'] && <div><span className="text-xs font-bold text-slate-400 uppercase">Remarks</span><p className="text-slate-600 text-sm mt-0.5">{c['Remarks']}</p></div>}
                    {c['Drive Folder URL'] && (
                      <a href={c['Drive Folder URL']} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 font-medium">
                        <FolderOpen size={14} /> Open Research Files
                      </a>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ============================================================================
// ALL CLIENTS SECTION
// ============================================================================
function AllClientsSection({ ursName, allClients, onRefresh, showToast }:
  { ursName: string; allClients: Client[]; onRefresh: () => void; showToast: (m: string, t: Toast['type']) => void }) {

  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interestId, setInterestId] = useState<string | null>(null);
  const [sending, setSending]       = useState(false);

  const unassigned = allClients.filter(c => !c['Assigned URS'] || c['Assigned URS'].trim() === '');
  const statuses = ['All', 'New', 'In Progress', 'Completed'];

  const filtered = allClients.filter(c => {
    const matchStatus = filter === 'All' || c['Status'] === filter;
    const term = search.toLowerCase();
    const matchSearch = !search ||
      c['Client Name'].toLowerCase().includes(term) ||
      c['Research Title'].toLowerCase().includes(term) ||
      c['Service Type'].toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const handleExpressInterest = async (c: Client) => {
    if (!confirm(`Express interest in client "${c['Client Name']}"?\n\nThis will notify the ISRM Officer, who will make the final assignment.`)) return;
    setSending(true); setInterestId(c['Record ID']);
    try {
      const res = await apiPost<{ success: boolean; message?: string }>({
        action: 'expressInterest', recordId: c['Record ID'], ursName,
      });
      if (res.success) {
        showToast('Interest submitted! The ISRM Officer has been notified.', 'success');
      } else {
        showToast(res.message || 'Could not submit interest.', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Request failed.', 'error');
    } finally { setSending(false); setInterestId(null); }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="All Clients"
        subtitle={`${unassigned.length} unassigned client${unassigned.length !== 1 ? 's' : ''} available • ${allClients.length} total`}
        action={
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
        <strong>How assignment works:</strong> The ISRM Officer assigns clients to URS. If you are available and interested in a client, click <em>Express Interest</em> to notify the Officer. They will review and assign accordingly.
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, title, or service..."
          className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-navy" />
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === s ? 'bg-navy text-white border-navy' : 'bg-white text-slate-600 border-slate-200 hover:border-navy'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          <FileText size={32} className="mx-auto mb-2 opacity-30" />
          <p>No clients match your search.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const isExpanded = expandedId === c['Record ID'];
            const isUnassigned = !c['Assigned URS'] || c['Assigned URS'].trim() === '';
            const isMyClient = (c['Assigned URS'] || '').toLowerCase() === ursName.toLowerCase();
            return (
              <Card key={c['Record ID']} className={`overflow-hidden ${isMyClient ? 'border-gold/50' : ''} ${isUnassigned ? 'border-l-4 border-l-teal-500' : ''}`}>
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400">{c['Record ID']}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColor(c['Status'])}`}>{c['Status'] || 'New'}</span>
                      {isMyClient && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gold/20 text-amber-800">Yours</span>}
                      {isUnassigned && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Unassigned</span>}
                    </div>
                    <p className="font-semibold text-navy text-sm">{c['Client Name']}</p>
                    <p className="text-slate-500 text-xs">{c['Service Type']} • {c['Department/School'] || '—'}</p>
                    {!isUnassigned && !isMyClient && <p className="text-slate-400 text-xs mt-0.5">Assigned to: {c['Assigned URS']}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isUnassigned && (
                      <button
                        onClick={() => handleExpressInterest(c)}
                        disabled={sending && interestId === c['Record ID']}
                        className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-all shadow-sm whitespace-nowrap">
                        {sending && interestId === c['Record ID'] ? 'Sending...' : 'Express Interest'}
                      </button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : c['Record ID'])}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                    <div><span className="text-xs font-bold text-slate-400 uppercase">Research Title</span><p className="text-slate-700 text-sm mt-0.5">{c['Research Title'] || '—'}</p></div>
                    {c['Research Objectives'] && <div><span className="text-xs font-bold text-slate-400 uppercase">Objectives</span><p className="text-slate-600 text-sm mt-0.5">{c['Research Objectives']}</p></div>}
                    {c['Research Questions'] && <div><span className="text-xs font-bold text-slate-400 uppercase">Research Questions</span><p className="text-slate-600 text-sm mt-0.5">{c['Research Questions']}</p></div>}
                    <div className="flex gap-6 text-sm">
                      <div><span className="text-xs font-bold text-slate-400 uppercase">Date</span><p className="text-slate-600 mt-0.5">{formatDate(c['Date'])}</p></div>
                      <div><span className="text-xs font-bold text-slate-400 uppercase">Payment</span><p className={`font-semibold mt-0.5 ${c['Payment Status'] === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{c['Payment Status'] || '—'}</p></div>
                    </div>
                    {c['Drive Folder URL'] && (
                      <a href={c['Drive Folder URL']} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 font-medium">
                        <FolderOpen size={14} /> View Research Files
                      </a>
                    )}
                    {isUnassigned && (
                      <button
                        onClick={() => handleExpressInterest(c)}
                        disabled={sending && interestId === c['Record ID']}
                        style={{ backgroundColor: '#0d9488', color: '#ffffff' }} className="mt-3 w-full py-4 text-base font-bold rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md hover:opacity-90">
                        {sending && interestId === c['Record ID'] ? 'Sending notification to Officer...': '✉ Express Interest — Notify Officer'}
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ============================================================================
// AVAILABILITY SECTION
// ============================================================================
function AvailabilitySection({ profile, onRefresh, showToast }:
  { profile: URSProfile | null; onRefresh: () => void; showToast: (m: string, t: Toast['type']) => void }) {

  const [availability, setAvailability] = useState<'Available' | 'Unavailable'>(profile?.availability || 'Available');
  const [reason, setReason]             = useState(profile?.availabilityReason || '');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    if (profile) {
      setAvailability(profile.availability);
      setReason(profile.availabilityReason || '');
    }
  }, [profile]);

  const presetReasons = [
    'On leave',
    'Medical leave',
    'Conference / Training',
    'Fully booked — working on another project',
    'Personal reasons',
  ];

  const effectiveReason = reason === '__custom__' ? customReason : reason;

  const handleSave = async () => {
    if (availability === 'Unavailable' && !effectiveReason.trim()) {
      showToast('Please provide a reason for unavailability.', 'error'); return;
    }
    setSaving(true);
    try {
      const res = await apiPost<{ success: boolean; message?: string }>({
        action: 'setURSAvailability',
        ursName: profile?.name || '',
        availability,
        reason: availability === 'Available' ? '' : effectiveReason.trim(),
      });
      if (res.success) {
        showToast('Availability updated successfully.', 'success');
        onRefresh();
      } else {
        showToast(res.message || 'Update failed.', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <SectionHeader title="My Availability" subtitle="Set your current availability status. The ISRM Officer can see this when assigning clients." />

      {/* Current status */}
      <Card className="p-5">
        <div className="text-xs font-bold text-slate-500 uppercase mb-3">Current Status</div>
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          (profile?.availability ?? 'Available') === 'Available'
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <span className={`w-3 h-3 rounded-full ${(profile?.availability ?? 'Available') === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <div>
            <div className={`font-bold text-sm ${(profile?.availability ?? 'Available') === 'Available' ? 'text-emerald-800' : 'text-amber-800'}`}>
              {profile?.availability ?? 'Available'}
            </div>
            {profile?.availabilityReason && (
              <div className="text-xs text-slate-500 mt-0.5">{profile.availabilityReason}</div>
            )}
          </div>
        </div>
      </Card>

      {/* Update form */}
      <Card className="p-5 space-y-4">
        <div className="text-xs font-bold text-slate-500 uppercase">Update Status</div>

        <div className="grid grid-cols-2 gap-3">
          {(['Available', 'Unavailable'] as const).map(opt => (
            <button key={opt} onClick={() => setAvailability(opt)}
              className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                availability === opt
                  ? opt === 'Available'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-amber-500 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${opt === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {opt}
            </button>
          ))}
        </div>

        {availability === 'Unavailable' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase">Reason <span className="text-red-500">*</span></div>
            <div className="space-y-2">
              {presetReasons.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${reason === r ? 'border-navy bg-navy/5 text-navy font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {r}
                </button>
              ))}
              <button onClick={() => setReason('__custom__')}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${reason === '__custom__' ? 'border-navy bg-navy/5 text-navy font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                Other (specify below)
              </button>
            </div>
            {reason === '__custom__' && (
              <input type="text" value={customReason} onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe your reason..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
            )}
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          <Save size={15} /> {saving ? 'Saving...' : 'Update Availability'}
        </button>
      </Card>
    </div>
  );
}
// ============================================================================
// CHANGE PASSWORD SECTION
// ============================================================================
function ChangePasswordSection({ profile, showToast }:
  { profile: URSProfile | null; showToast: (m: string, t: Toast['type']) => void }) {

  const [current,  setCurrent]  = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showAll,  setShowAll]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const strength = (p: string): { label: string; color: string; width: string } => {
    if (p.length === 0) return { label: '', color: '', width: 'w-0' };
    if (p.length < 6)   return { label: 'Too short', color: 'bg-red-500', width: 'w-1/4' };
    if (p.length < 8)   return { label: 'Weak', color: 'bg-amber-500', width: 'w-2/4' };
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
    return { label: 'Moderate', color: 'bg-blue-500', width: 'w-3/4' };
  };

  const pw = strength(newPass);

  const handleSave = async () => {
    if (!current || !newPass || !confirm) { showToast('All fields are required.', 'error'); return; }
    if (newPass.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return; }
    if (newPass !== confirm) { showToast('Passwords do not match.', 'error'); return; }
    if (current === newPass) { showToast('New password must be different from the current password.', 'error'); return; }
    setSaving(true);
    try {
      const res = await apiPost<{ success: boolean; message?: string }>({
        action: 'changeURSPassword',
        ursName: profile?.name || '',
        email: profile?.email || '',
        currentPassword: current,
        newPassword: newPass,
      });
      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setCurrent(''); setNewPass(''); setConfirm('');
      } else {
        showToast(res.message || 'Password change failed.', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Request failed.', 'error');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy";

  return (
    <div className="space-y-6 max-w-md">
      <SectionHeader title="Change Password" subtitle="Update your URS Portal password. Minimum 8 characters." />

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Current Password</label>
          <input type={showAll ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)}
            placeholder="Your current password" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">New Password</label>
          <input type={showAll ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)}
            placeholder="At least 8 characters" className={inputClass} />
          {newPass && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${pw.color} ${pw.width}`} />
              </div>
              <p className={`text-xs font-medium ${pw.color.replace('bg-', 'text-')}`}>{pw.label}</p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Confirm New Password</label>
          <input type={showAll ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter new password" className={inputClass} />
          {confirm && newPass !== confirm && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
          {confirm && newPass === confirm && newPass && <p className="text-xs text-emerald-600 mt-1">Passwords match</p>}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="accent-navy" />
          Show passwords
        </label>

        <button onClick={handleSave} disabled={saving || !current || !newPass || !confirm || newPass !== confirm}
          className="w-full py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 disabled:opacity-40 flex items-center justify-center gap-2">
          <Key size={15} /> {saving ? 'Changing...' : 'Change Password'}
        </button>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        If you forgot your current password, contact the ISRM Officer to reset it:&nbsp;
        <a href="mailto:isrm_rise@slu.edu.ph" className="text-navy hover:underline">isrm_rise@slu.edu.ph</a>
      </p>
    </div>
  );
}
// ============================================================================
// MAIN DASHBOARD SHELL
// ============================================================================
function DashboardShell({ ursName, email, onLogout }: { ursName: string; email: string; onLogout: () => void }) {
  const [section, setSection]       = useState<Section>('dashboard');
  const [myClients, setMyClients]   = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [profile, setProfile]       = useState<URSProfile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<Toast | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = useCallback((message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, allRes, availRes] = await Promise.all([
        apiGet<{ success: boolean; clients: Client[] }>('getURSClients', { ursName }),
        apiGet<{ success: boolean; clients: Client[] }>('getAllClients'),
        apiGet<{ success: boolean; urs: URSProfile[] }>('getURSAvailability'),
      ]);
      if (myRes.success)    setMyClients(myRes.clients || []);
      if (allRes.success)   setAllClients(allRes.clients || []);
      if (availRes.success) {
        const me = (availRes.urs || []).find(u => u.name?.toLowerCase() === ursName.toLowerCase());
        if (me) setProfile({ ...me, email });
        else    setProfile({ name: ursName, email, department: '', status: 'Active', availability: 'Available', availabilityReason: '' });
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load data.', 'error');
    } finally { setLoading(false); }
  }, [ursName, email, showToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const navItems: { id: Section; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard',   label: 'Dashboard',     icon: BarChart2 },
    { id: 'my-clients',  label: 'My Clients',    icon: Users,    badge: myClients.filter(c => c['Status'] === 'In Progress').length || undefined },
    { id: 'all-clients', label: 'All Clients',   icon: FileText, badge: allClients.filter(c => !c['Assigned URS'] || c['Assigned URS'].trim() === '').length || undefined },
    { id: 'availability',label: 'Availability',  icon: Shield },
    { id: 'password',    label: 'Change Password', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top navbar */}
      <header className="bg-navy text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(o => !o)} className="md:hidden p-1.5 rounded-lg hover:bg-white/10">
            <Menu size={20} />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gold/40 flex-shrink-0">
            <img src="/slu-logo.png" alt="SLU" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">ISRM URS Portal</div>
            <div className="text-[10px] text-gold tracking-widest uppercase">Saint Louis University</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold">{ursName}</div>
            <div className="text-[11px] text-blue-300">{email}</div>
          </div>
          {profile && (
            <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${profile.availability === 'Available' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${profile.availability === 'Available' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {profile.availability}
            </span>
          )}
          <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-blue-300 hover:text-white transition-colors">
            <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar backdrop (mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-[53px] left-0 h-[calc(100vh-53px)] w-60 bg-white border-r border-slate-200
          flex flex-col z-20 transition-transform duration-200 overflow-y-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <nav className="flex-1 p-3 space-y-1 pt-4">
            {navItems.map(item => (
              <button key={item.id}
                onClick={() => { setSection(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${section === item.id ? 'bg-navy text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-navy'}`}>
                <span className="flex items-center gap-2.5">
                  <item.icon size={16} />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${section === item.id ? 'bg-white/20 text-white' : 'bg-gold/20 text-amber-800'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <div className="text-[10px] text-slate-400 text-center">ISRM &mdash; RISE Center &middot; SLU</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6">
          {loading ? <Spinner /> : (
            <>
              {section === 'dashboard'   && <DashboardOverview ursName={ursName} myClients={myClients} profile={profile} />}
              {section === 'my-clients'  && <MyClientsSection  ursName={ursName} clients={myClients}   onRefresh={loadAll} showToast={showToast} />}
              {section === 'all-clients' && <AllClientsSection ursName={ursName} allClients={allClients} onRefresh={loadAll} showToast={showToast} />}
              {section === 'availability'&& <AvailabilitySection profile={profile} onRefresh={loadAll} showToast={showToast} />}
              {section === 'password'    && <ChangePasswordSection profile={profile} showToast={showToast} />}
            </>
          )}
        </main>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
}

// ============================================================================
// ROOT APP
// ============================================================================
export default function App() {
  const [ursName, setUrsName] = useState<string>(() => sessionStorage.getItem('ursName') || '');
  const [email,   setEmail]   = useState<string>(() => sessionStorage.getItem('ursEmail') || '');

  const handleLogin = (name: string, mail: string) => {
    setUrsName(name); setEmail(mail);
    sessionStorage.setItem('ursName',  name);
    sessionStorage.setItem('ursEmail', mail);
  };

  const handleLogout = () => {
    setUrsName(''); setEmail('');
    sessionStorage.removeItem('ursName');
    sessionStorage.removeItem('ursEmail');
  };

  return ursName
    ? <DashboardShell ursName={ursName} email={email} onLogout={handleLogout} />
    : <LoginPage onLogin={handleLogin} />;
}
