import { useState, useMemo, useEffect } from 'react';
import type { Client, URS, FinancialSummary, DashboardData, ApiResponse } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================
// Google Apps Script Web App URL
// Format: https://script.google.com/macros/s/<ID>/exec
const API_URL = 'https://script.google.com/macros/s/AKfycbzEc6lRDxogwQqDi9Wop4thoRabXTD4qsRfLpfrKNY_ps4qpAj_vREidCz8YGSyu8-1Yw/exec?action=getDashboardData';

// ============================================================================
// THEME TOKENS
// ============================================================================
const T = {
  navy: "#1A3666", navyD: "#0F2245", navyM: "#2A509E", navyL: "#3D6DB5",
  gold: "#C8943A", goldL: "#F0C060", goldPale: "#FDF5E6",
  bg: "#EDF1F8", card: "#FFFFFF", text: "#1C2340", muted: "#607090",
  border: "#C4CFDF",
  ok: "#1A7A3C", okBg: "#E8F5E9",
  warn: "#9A6200", warnBg: "#FFF3CD",
  new: "#6B2D8A", newBg: "#F3EAF7",
  prog: "#1055B5", progBg: "#EEF2FA",
  err: "#B01E28", errBg: "#FDECEA",
  gray: "#607090", grayBg: "#F0F2F5",
};

// ============================================================================
// CONSTANTS
// ============================================================================
const AY = "2025-2026";
const SEM = "First Semester";
const PLACEHOLDER_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

// ============================================================================
// HELPERS
// ============================================================================
const peso = (n: number) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const initials = (name: string) =>
  name.split(" ").filter(w => !["Dr.", "Prof.", "Mr.", "Ms.", "Mrs."].includes(w))
    .map(w => w[0]).slice(0, 2).join("").toUpperCase();

const formatDate = (d: string | Date) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// ============================================================================
// API FUNCTIONS
// ============================================================================
async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

async function updateClientBatch(rowNum: number, updates: Partial<Client>): Promise<ApiResponse> {
  const baseUrl = API_URL.split('?')[0];
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateClientBatch', rowNum, updates }),
  });
  return response.json();
}

async function generateReport(reportType: string): Promise<{ success: boolean; message: string; url?: string }> {
  // Remove the query parameter for POST requests
  const baseUrl = API_URL.split('?')[0];
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generateReport', reportType }),
  });
  return response.json();
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Badge Component
function Badge({ s, size = 10.5 }: { s: string; size?: number }) {
  const badgeStyles: Record<string, { c: string; bg: string }> = {
    "Paid": { c: T.ok, bg: T.okBg },
    "Pending": { c: T.warn, bg: T.warnBg },
    "Completed": { c: T.ok, bg: T.okBg },
    "In Progress": { c: T.prog, bg: T.progBg },
    "New": { c: T.new, bg: T.newBg },
    "Cancelled": { c: T.err, bg: T.errBg },
    "Active": { c: T.ok, bg: T.okBg },
    "Inactive": { c: T.gray, bg: T.grayBg },
    "SLU": { c: T.navy, bg: T.progBg },
    "Non-SLU": { c: T.gray, bg: T.grayBg },
    "Undergraduate": { c: T.prog, bg: T.progBg },
    "Graduate": { c: T.new, bg: T.newBg },
    "Staff": { c: T.gold, bg: T.goldPale },
  };
  const { c, bg } = badgeStyles[s] || { c: T.gray, bg: T.grayBg };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: size, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
      color: c, background: bg, border: `1px solid ${c}33`, whiteSpace: "nowrap"
    }}>
      {s}
    </span>
  );
}

// Card Component
function Card({ children, p = 20, style = {} }: { children: React.ReactNode; p?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,.06)", padding: p, ...style
    }}>
      {children}
    </div>
  );
}

// Button Component
function Btn({
  children, variant = "primary", onClick, small, disabled, style = {}
}: {
  children: React.ReactNode;
  variant?: "primary" | "gold" | "outline" | "ghost" | "danger" | "ok";
  onClick?: () => void;
  small?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { background: T.navy, color: "#fff" },
    gold: { background: T.gold, color: "#fff" },
    outline: { background: "transparent", color: T.navy, border: `1.5px solid ${T.navy}` },
    ghost: { background: "#F0F4FA", color: T.text },
    danger: { background: T.err, color: "#fff" },
    ok: { background: T.ok, color: "#fff" },
  };
  const baseStyle = variantStyles[variant] || {};
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        ...baseStyle, border: "none", borderRadius: 5, cursor: disabled ? "not-allowed" : "pointer",
        padding: small ? "5px 11px" : "8px 16px",
        fontSize: small ? 10.5 : 12, fontWeight: 700, letterSpacing: ".05em",
        fontFamily: "inherit", opacity: disabled ? 0.5 : 1,
        transition: "opacity .15s, transform .1s", ...style
      }}
    >
      {children}
    </button>
  );
}

// Stat Card Component
function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string; icon: string; accent?: string;
}) {
  return (
    <Card p={18} style={{ flex: 1, minWidth: 130 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: accent || T.text, lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 10.5, color: T.muted, marginTop: 5 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 22, opacity: 0.6 }}>{icon}</div>
      </div>
    </Card>
  );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================
function DashboardView({ clients, fin, setView, setSelectedClient }: {
  clients: Client[];
  fin: FinancialSummary;
  setView: (v: string) => void;
  setSelectedClient: (c: Client | null) => void;
}) {
  const pending = clients.filter(c => c['Payment Status'] === "Pending");
  const recent = [...clients].sort((a, b) => String(b['Record ID'] || '').localeCompare(String(a['Record ID'] || ''))).slice(0, 5);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard label="Gross Fees Collected" value={peso(fin.grossFees)} sub={`${fin.paidCount} paid · ${fin.pendingCount} pending`} icon="💰" accent={T.ok} />
        <StatCard label="URS Honoraria (60%)" value={peso(fin.ursHonoraria)} sub="Total accrued to URS" icon="👥" accent={T.navy} />
        <StatCard label="Unit Retained (40%)" value={peso(fin.unitShare)} sub="ISRM unit share" icon="🏛" accent={T.gold} />
        <StatCard label="Pending Payment" value={fin.pendingCount} sub="Action required" icon="⏳" accent={T.warn} />
        <StatCard label="Active Consultations" value={fin.inProgressCount} sub="In Progress" icon="📋" accent={T.prog} />
        <StatCard label="Completed" value={fin.completedCount} sub={`of ${fin.totalCount} total`} icon="✅" accent={T.ok} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* Recent Activity */}
        <Card p={0}>
          <div style={{ padding: "13px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: T.navy }}>Recent Client Activity</h3>
            <Btn variant="ghost" small onClick={() => setView("clients")}>View All →</Btn>
          </div>
          {recent.map((c, i) => (
            <div key={c['Record ID']} onClick={() => setSelectedClient(c)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "11px 18px",
                cursor: "pointer", borderBottom: i < recent.length - 1 ? `1px solid ${T.bg}` : "none",
                transition: "background .12s"
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.bg}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: T.navyD,
                color: T.gold, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, flexShrink: 0
              }}>
                {initials(c['Client Name'] || '')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c['Client Name'] || '—'}
                </div>
                <div style={{ fontSize: 10.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c['Research Title'] || '—'}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginRight: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{peso(c['Total Fee (₱)'] || 0)}</div>
                <div style={{ marginTop: 3 }}><Badge s={c['Payment Status'] || ''} /></div>
              </div>
              <Badge s={c['Status'] || ''} />
            </div>
          ))}
        </Card>

        {/* Pending Actions */}
        <Card p={0}>
          <div style={{ padding: "13px 18px", borderBottom: `1px solid ${T.border}`, background: T.warnBg }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: T.warn }}>⚠️ Action Required</h3>
          </div>
          {pending.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 12 }}>✅ All payments verified</div>
          ) : pending.map(c => (
            <div key={c['Record ID']} onClick={() => setSelectedClient(c)}
              style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bg}`, cursor: "pointer", transition: "background .12s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.warnBg}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c['Client Name'] || '—'}</div>
              <div style={{ fontSize: 10.5, color: T.muted, margin: "2px 0" }}>{c['Service Type'] || '—'}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.warn }}>{peso(c['Total Fee (₱)'] || 0)}</span>
                {c['Assigned URS']
                  ? <span style={{ fontSize: 10, color: T.muted }}>URS: {c['Assigned URS'].split(" ").pop()}</span>
                  : <span style={{ fontSize: 10, color: T.err, fontWeight: 700 }}>⚠ No URS assigned</span>
                }
              </div>
            </div>
          ))}
          <div style={{ padding: "12px 16px", background: T.goldPale, borderTop: `1px solid ${T.border}`, borderRadius: "0 0 8px 8px" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
              60/40 Split Rule
            </div>
            <div style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>
              URS receives <strong>60%</strong> of every client fee.<br />
              ISRM unit retains <strong>40%</strong>.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// CLIENTS VIEW
// ============================================================================
function ClientsView({ clients, onClientSelect }: {
  clients: Client[];
  onClientSelect: (c: Client) => void;
}) {
  const [q, setQ] = useState("");
  const [fPay, setFPay] = useState("All");
  const [fStat, setFStat] = useState("All");

  const filtered = useMemo(() => clients.filter(c => {
    if (fPay !== "All" && c['Payment Status'] !== fPay) return false;
    if (fStat !== "All" && c['Status'] !== fStat) return false;
    if (q) {
      const searchStr = `${c['Client Name']} ${c['Research Title']} ${c['Record ID']} ${c['Department/School']}`.toLowerCase();
      if (!searchStr.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [clients, q, fPay, fStat]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: T.navy }}>
          Client Records ({filtered.length} of {clients.length})
        </h2>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 Search..."
          style={{
            border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px",
            fontSize: 12.5, fontFamily: "inherit", color: T.text, background: "#fff",
            outline: "none", width: "100%", maxWidth: 300
          }}
        />
        <select
          value={fPay}
          onChange={e => setFPay(e.target.value)}
          style={{ border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px", fontSize: 12.5, width: 130 }}
        >
          {["All", "Paid", "Pending"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          value={fStat}
          onChange={e => setFStat(e.target.value)}
          style={{ border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px", fontSize: 12.5, width: 145 }}
        >
          {["All", "New", "In Progress", "Completed", "Cancelled"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card p={0} style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.navyD }}>
              {["Record ID", "Date", "Client", "Dept/School", "Service", "Total Fee", "Pay", "URS Assigned", "60% Share", "Status", ""].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, fontSize: 9.5, letterSpacing: ".09em", textTransform: "uppercase", color: "rgba(255,255,255,.85)", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c['Record ID']}
                style={{ background: i % 2 === 0 ? "#fff" : T.bg, cursor: "pointer", transition: "background .1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#E8EFF8"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "#fff" : T.bg}
                onClick={() => onClientSelect(c)}
              >
                <td style={{ padding: "9px 12px" }}><span style={{ fontWeight: 700, color: T.navy, fontSize: 11 }}>{c['Record ID'] || '—'}</span></td>
                <td style={{ padding: "9px 12px" }}><span style={{ color: T.muted, fontSize: 11, whiteSpace: "nowrap" }}>{formatDate(c.Date)}</span></td>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ fontWeight: 700 }}>{c['Client Name'] || '—'}</div>
                  <div style={{ marginTop: 2, display: "flex", gap: 4 }}>
                    <Badge s={c['Category'] || ''} size={9} />
                    {c['Affiliation'] ? <Badge s={c['Affiliation']} size={9} /> : <span style={{ fontSize: 9, color: T.warn, fontWeight: 700, background: T.warnBg, padding: "2px 6px", borderRadius: 3 }}>Affiliation?</span>}
                  </div>
                </td>
                <td style={{ padding: "9px 12px" }}><span style={{ color: T.muted, fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c['Department/School'] || '—'}</span></td>
                <td style={{ padding: "9px 12px" }}>{c['Service Type'] || '—'}</td>
                <td style={{ padding: "9px 12px" }}><span style={{ fontWeight: 700 }}>{peso(c['Total Fee (₱)'] || 0)}</span></td>
                <td style={{ padding: "9px 12px" }}><Badge s={c['Payment Status'] || ''} /></td>
                <td style={{ padding: "9px 12px" }}><span style={{ fontSize: 11, color: c['Assigned URS'] ? T.navy : T.err, fontWeight: c['Assigned URS'] ? 700 : 400 }}>{c['Assigned URS'] || '⚠ Unassigned'}</span></td>
                <td style={{ padding: "9px 12px" }}><span style={{ fontWeight: 700, color: T.ok, whiteSpace: "nowrap" }}>{peso(c['URS Share 60% (₱)'] || 0)}</span></td>
                <td style={{ padding: "9px 12px" }}><Badge s={c['Status'] || ''} /></td>
                <td style={{ padding: "9px 12px" }}><Btn variant="ghost" small onClick={() => onClientSelect(c)}>Edit</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============================================================================
// URS VIEW
// ============================================================================
function URSView({ ursList, clients }: { ursList: URS[]; clients: Client[] }) {
  const [refreshing, setRefreshing] = useState(false);

  if (!ursList || ursList.length === 0) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: T.navy }}>University Research Statisticians Registry</h2>
        </div>
        <Card>
          <div style={{ textAlign: "center", padding: 40, color: T.muted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <div style={{ fontSize: 14 }}>No URS records found</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>Make sure the URS_Registry sheet has data in your Google Sheets</div>
          </div>
        </Card>
      </div>
    );
  }

  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      const data = await fetchDashboardData();
      // Update clients in parent - this will trigger re-render
      await new Promise(r => setTimeout(r, 500));
      alert('✅ Stats refreshed!');
    } catch (e) {
      alert('❌ Failed to refresh: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setRefreshing(false);
    }
  };

  const refreshBtnStyle: React.CSSProperties = {
    padding: "6px 12px",
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 4,
    fontSize: 10.5,
    fontWeight: 700,
    color: T.navy,
    cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: T.navy }}>University Research Statisticians Registry</h2>
          <span style={{ fontSize: 11, color: T.muted }}>AY {AY} · {ursList.filter(u => u['Status'] === 'Active').length} active</span>
        </div>
        <button onClick={handleRefreshStats} disabled={refreshing} style={refreshBtnStyle}>
          {refreshing ? '⟳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(295px, 1fr))", gap: 14 }}>
        {ursList.map(u => {
          const handled = clients.filter(c => c['Assigned URS'] === u['Full Name'] && c['Payment Status'] === "Paid");
          const earned = handled.reduce((s, c) => s + (c['URS Share 60% (₱)'] || 0), 0);
          const done = handled.filter(c => c['Status'] === 'Completed').length;
          const active = handled.filter(c => c['Status'] === 'In Progress').length;
          return (
            <Card key={u['URS ID']}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg,${T.navyD},${T.navyM})`,
                  color: T.gold, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700
                }}>
                  {initials(u['Full Name'])}
                </div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: T.navy }}>{u['Full Name'] || '—'}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{u['Department'] || '—'}</div>
                  <div style={{ marginTop: 4 }}><Badge s={u['Status'] || ''} /></div>
                </div>
              </div>
              <div style={{ fontSize: 11, marginBottom: 7 }}><strong>🎓 Degree:</strong> {u['Highest Degree'] || '—'}</div>
              <div style={{ fontSize: 11, marginBottom: 7 }}><strong>🔬 Specialization:</strong> {u['Specialization'] || '—'}</div>
              <div style={{ fontSize: 11, marginBottom: 7 }}><strong>🗓 Available:</strong> {u['Available Days/Hours'] || '—'}</div>
              <div style={{ fontSize: 11, marginBottom: 7 }}><strong>📧 Email:</strong> {u['Email'] || '—'}</div>
              <div style={{ display: "flex", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, margin: "12px 0", padding: "10px 0", gap: 0 }}>
                {[["Clients", handled.length, T.navy], ["Completed", done, T.ok], ["Active", active, T.prog]].map(([l, v, col], i) => (
                  <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: col as string }}>{v}</div>
                    <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: T.bg, borderRadius: 6, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>Honoraria (60%):</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: T.ok }}>{peso(earned)}</span>
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ marginTop: 20, padding: "12px 18px", background: T.goldPale, borderLeft: `4px solid ${T.gold}`, borderRadius: "0 6px 6px 0", fontSize: 12, color: T.muted, lineHeight: 1.7 }}>
        <strong style={{ color: T.text }}>RSS Manual §IV.2.4 — </strong>
        University Research Statisticians are entitled to <strong>60%</strong> of all fees collected for services they render. Honoraria are paid by the Finance Office on a yearly basis upon submission of FM-RIS-060, prepared by the ISM Officer and noted by the RISE Center Director.
      </div>
    </div>
  );
}

// ============================================================================
// FINANCIAL VIEW
// ============================================================================
function FinancialView({ fin }: { fin: FinancialSummary }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: T.navy }}>Financial Summary</h2>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatCard label="Gross Fees Collected" value={peso(fin.grossFees)} sub={`${fin.paidCount} paid records`} icon="💰" accent={T.ok} />
        <StatCard label="URS Honoraria (60%)" value={peso(fin.ursHonoraria)} sub="Total accrued" icon="👥" accent={T.navy} />
        <StatCard label="Unit Retained (40%)" value={peso(fin.unitShare)} sub="ISRM share" icon="🏛" accent={T.gold} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 12 }}>
          60 / 40 Split — {SEM}, AY {AY}
        </div>
        {fin.grossFees > 0 ? (
          <>
            <div style={{ height: 16, borderRadius: 8, overflow: "hidden", display: "flex", marginBottom: 10 }}>
              <div style={{ width: `${(fin.ursHonoraria / fin.grossFees) * 100}%`, background: `linear-gradient(90deg,${T.navyD},${T.navyM})`, transition: "width .6s" }} />
              <div style={{ width: `${(fin.unitShare / fin.grossFees) * 100}%`, background: `linear-gradient(90deg,${T.gold},${T.goldL})`, transition: "width .6s" }} />
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: T.navy }} />
                <span style={{ color: T.muted }}>URS Share 60% —</span>
                <span style={{ fontWeight: 700, color: T.navy }}>{peso(fin.ursHonoraria)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: T.gold }} />
                <span style={{ color: T.muted }}>Unit Share 40% —</span>
                <span style={{ fontWeight: 700, color: T.gold }}>{peso(fin.unitShare)}</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: T.muted, fontSize: 12, fontStyle: "italic" }}>No paid records yet.</div>
        )}
      </Card>
    </div>
  );
}

// ============================================================================
// REPORTS VIEW
// ============================================================================
function ReportsView({ fin }: { fin: FinancialSummary }) {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (reportType: string) => {
    setGenerating(reportType);
    try {
      const result = await generateReport(reportType);
      if (result.success) {
        if (result.url) {
          window.open(result.url, '_blank');
          alert(`✅ ${reportType} generated successfully!\n\nThe document has been opened in a new tab.`);
        } else {
          alert(`✅ ${reportType} generated successfully!\n\nPlease check your Google Drive for the file.`);
        }
      } else {
        alert(`⚠️ ${result.message || 'Generation failed. Please try again.'}`);
      }
    } catch (err) {
      alert('❌ Error: Unable to generate report. Please try opening the Google Sheets and use the ISRM Operations menu directly.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: T.navy }}>Document Generation</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(135deg,${T.navyD},${T.navyM})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
            }}>📊</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: T.navy }}>FM-RIS-059</div>
              <div style={{ fontSize: 11, color: T.muted }}>Statistical Services Semestral Report</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.65, marginBottom: 14 }}>
            Official semester report for the RISE Center Director. Includes all client records, services rendered, fees collected, and the aggregated 60/40 split.
          </p>
          <div style={{ background: T.bg, borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
            {[["Semester/AY", `${SEM}, AY ${AY}`], ["Total Records", fin.totalCount], ["Gross Fees", peso(fin.grossFees)]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                <span style={{ color: T.muted }}>{l}:</span>
                <span style={{ fontWeight: 700, color: T.text }}>{v}</span>
              </div>
            ))}
          </div>
          <Btn onClick={() => handleGenerate('FM-RIS-059')} disabled={generating === 'FM-RIS-059'}>
            {generating === 'FM-RIS-059' ? '⏳ Generating...' : '🖨️ Generate FM-RIS-059'}
          </Btn>
        </Card>

        <Card>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(135deg,${T.gold},#E0A840)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
            }}>💳</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: T.navy }}>FM-RIS-060</div>
              <div style={{ fontSize: 11, color: T.muted }}>Requisition for Honoraria of URS</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.65, marginBottom: 14 }}>
            Accounting-ready honoraria requisition. Groups paid records by assigned URS, applies the 60% rule, and produces per-URS totals and grand total for Finance Office approval.
          </p>
          <div style={{ background: T.bg, borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
            {[["Period", `${SEM}, AY ${AY}`], ["Paid Records", fin.paidCount], ["Grand Honoraria", peso(fin.ursHonoraria)]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                <span style={{ color: T.muted }}>{l}:</span>
                <span style={{ fontWeight: 700, color: T.text }}>{v}</span>
              </div>
            ))}
          </div>
          <Btn variant="gold" onClick={() => handleGenerate('FM-RIS-060')} disabled={generating === 'FM-RIS-060'}>
            {generating === 'FM-RIS-060' ? '⏳ Generating...' : '🖨️ Generate FM-RIS-060'}
          </Btn>
        </Card>
      </div>
      <div style={{ marginTop: 16, padding: "12px 16px", background: T.progBg, borderLeft: `4px solid ${T.prog}`, borderRadius: "0 6px 6px 0", fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
        <strong style={{ color: T.text }}>Note:</strong> Click the buttons above to generate reports via Google Sheets. The generated documents will be saved to your Google Drive.
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [view, setView] = useState("dashboard");
  const [clients, setClients] = useState<Client[]>([]);
  const [ursList, setUrsList] = useState<URS[]>([]);
  const [financial, setFinancial] = useState<FinancialSummary>({
    grossFees: 0, ursHonoraria: 0, unitShare: 0,
    paidCount: 0, pendingCount: 0, completedCount: 0,
    inProgressCount: 0, newCount: 0, totalCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = API_URL as string;
    if (url === PLACEHOLDER_URL || !url.includes('script.google.com')) {
      setError("Please configure your Google Apps Script Web App URL in src/App.tsx");
      setLoading(false);
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardData();
      setClients(data.clients || []);
      setUrsList(data.urs || []);
      setFinancial(data.financial || {
        grossFees: 0, ursHonoraria: 0, unitShare: 0,
        paidCount: 0, pendingCount: 0, completedCount: 0,
        inProgressCount: 0, newCount: 0, totalCount: 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      const updates: Partial<Client> = {
        'Payment Status': selectedClient['Payment Status'],
        'Payment Date': selectedClient['Payment Date'],
        'OR Number': selectedClient['OR Number'],
        'Status': selectedClient['Status'],
        'Assigned URS': selectedClient['Assigned URS'],
        Remarks: selectedClient.Remarks,
      };
      const result = await updateClientBatch(selectedClient.row, updates);
      if (result.success) {
        setClients(prev => prev.map(c => c.row === selectedClient.row ? { ...c, ...updates } : c));
        setSelectedClient(null);
      } else {
        alert(result.message || 'Failed to save');
      }
    } catch (err) {
      alert('Error saving: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: "dashboard", label: `📊 Dashboard` },
    { id: "clients", label: `📋 Clients (${clients.length})` },
    { id: "urs", label: "👥 URS Registry" },
    { id: "financial", label: "💰 Financial" },
    { id: "reports", label: "📄 Reports" },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid', borderColor: T.border, borderTopColor: T.navy, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: T.muted }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg, padding: 20 }}>
        <Card p={32} style={{ maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: T.err, marginBottom: 12 }}>Connection Error</h2>
          <p style={{ color: T.muted, marginBottom: 16 }}>{error}</p>
          <p style={{ fontSize: 12, color: T.muted }}>
            To connect this dashboard to your Google Apps Script:
            <br />1. Deploy your Apps Script as a Web App
            <br />2. Copy the deployment URL
            <br />3. Paste it in <code>src/App.tsx</code> as <code>API_URL</code>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Lato:ital,wght@0,300;0,400;0,700;1,400&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${T.bg}; font-family: 'Lato', sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: #B0BDCC; border-radius: 3px; }
        select, input, button { font-family: 'Lato', sans-serif; }
      `}</style>

      <div style={{ fontFamily: "'Lato', sans-serif", minHeight: "100vh", background: T.bg }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg,${T.navyD} 0%,${T.navy} 55%,${T.navyM} 100%)`,
          boxShadow: "0 3px 18px rgba(10,26,60,.38)",
          padding: "14px 26px", display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
            background: T.gold, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: T.navyD
          }}>SLU</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>
              ISRM Officer's Command Center
            </div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 2 }}>
              Institutional Studies & Research Methods — RISE Center · Saint Louis University
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ color: T.goldL, fontSize: 11, fontWeight: 700 }}>{SEM}, AY {AY}</div>
            <div style={{ color: "rgba(255,255,255,.45)", fontSize: 10, marginTop: 3 }}>
              {new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: T.navyD, display: "flex", padding: "0 26px", gap: 2, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: "11px 18px", background: "none", border: "none",
              color: view === t.id ? T.gold : "rgba(255,255,255,.5)",
              cursor: "pointer", fontFamily: "'Lato', sans-serif", fontWeight: 700,
              fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase",
              whiteSpace: "nowrap", borderBottom: view === t.id ? `3px solid ${T.gold}` : "3px solid transparent",
              transition: "color .2s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "22px 26px", maxWidth: 1120, margin: "0 auto" }}>
          {view === "dashboard" && <DashboardView clients={clients} fin={financial} setView={setView} setSelectedClient={setSelectedClient} />}
          {view === "clients" && <ClientsView clients={clients} onClientSelect={setSelectedClient} />}
          {view === "urs" && <URSView ursList={ursList} clients={clients} />}
          {view === "financial" && <FinancialView fin={financial} />}
          {view === "reports" && <ReportsView fin={financial} />}
        </div>

        {/* Client Edit Modal */}
        {selectedClient && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(10,20,50,.6)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto"
          }}>
            <div style={{ background: T.card, borderRadius: 10, width: "100%", maxWidth: 660, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.28)" }}>
              <div style={{ background: `linear-gradient(135deg,${T.navyD},${T.navy})`, padding: "16px 22px", borderRadius: "10px 10px 0 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", color: T.gold, fontSize: 17, fontWeight: 700 }}>{selectedClient['Record ID']}</div>
                    <div style={{ color: "rgba(255,255,255,.7)", fontSize: 11.5, marginTop: 3 }}>{selectedClient['Client Name']} · {selectedClient['Department/School']}</div>
                  </div>
                  <button onClick={() => setSelectedClient(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", fontSize: 22 }}>×</button>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <Card p={14} style={{ background: T.bg, marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Research Title</div>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55, fontStyle: "italic" }}>"{selectedClient['Research Title']}"</div>
                </Card>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "OR Number", key: 'OR Number' },
                    { label: "Payment Date", key: 'Payment Date' },
                    { label: "Payment Status", key: 'Payment Status', options: ["Pending", "Paid"] },
                    { label: "Consultation Status", key: 'Status', options: ["New", "In Progress", "Completed", "Cancelled"] },
                    { label: "Assigned URS", key: 'Assigned URS', options: ["", ...ursList.map(u => u['Full Name'])] },
                  ].map(({ label, key, options }) => (
                    <div key={key} style={{ marginBottom: 13 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 5 }}>{label}</div>
                      {options ? (
                        <select
                          value={(selectedClient as any)[key] || ''}
                          onChange={e => setSelectedClient({ ...selectedClient, [key]: e.target.value })}
                          style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px", fontSize: 12.5 }}
                        >
                          {options.map(o => <option key={o} value={o}>{o || "— Select —"}</option>)}
                        </select>
                      ) : (
                        <input
                          value={(selectedClient as any)[key] || ''}
                          onChange={e => setSelectedClient({ ...selectedClient, [key]: e.target.value })}
                          style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px", fontSize: 12.5 }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 5 }}>Remarks</div>
                  <textarea
                    value={selectedClient.Remarks || ''}
                    onChange={e => setSelectedClient({ ...selectedClient, Remarks: e.target.value })}
                    style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px", fontSize: 12.5, minHeight: 80 }}
                    placeholder="Optional notes..."
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                  <Btn variant="ghost" onClick={() => setSelectedClient(null)}>Cancel</Btn>
                  <Btn variant="gold" onClick={handleSaveClient} disabled={saving}>
                    {saving ? 'Saving...' : '💾 Save Changes'}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
