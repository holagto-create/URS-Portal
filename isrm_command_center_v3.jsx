import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════
// ISRM OFFICER'S COMMAND CENTER
// Institutional Studies & Research Methods — Saint Louis University
// Digital Operations Suite v2.0 | 2025
// ═══════════════════════════════════════════════════════════════════

// ─── THEME TOKENS ─────────────────────────────────────────────────
const T = {
  navy:"#1A3666", navyD:"#0F2245", navyM:"#2A509E", navyL:"#3D6DB5",
  gold:"#C8943A", goldL:"#F0C060", goldPale:"#FDF5E6",
  bg:"#EDF1F8", card:"#FFFFFF", text:"#1C2340", muted:"#607090",
  border:"#C4CFDF",
  ok:"#1A7A3C",   okBg:"#E8F5E9",
  warn:"#9A6200", warnBg:"#FFF3CD",
  new:"#6B2D8A",  newBg:"#F3EAF7",
  prog:"#1055B5", progBg:"#EEF2FA",
  err:"#B01E28",  errBg:"#FDECEA",
  gray:"#607090", grayBg:"#F0F2F5",
};

// ─── CONSTANTS (sourced from RSS Manual §II) ───────────────────────
const URS_PCT   = 0.60;
const UNIT_PCT  = 0.40;
const AY        = "2024-2025";
const SEM       = "Second Semester";
const OFFICER   = "ISM Officer";
const DIRECTOR  = "RISE Center Director";
const URS_OPTS  = ["Dr. Harold Gato","Dr. Anna Reyes","Prof. Carl Mendez"];

const STAT_FLOWS = ["New","In Progress","Completed","Cancelled"];
const SERVICE_OPTS = ["Consultation","Full Statistical Assistance","Training/Workshop","Others"];

// ─── SEED DATA ────────────────────────────────────────────────────
const SEED_CLIENTS = [
  {
    id:"ISRM-2025-0001", date:"2025-01-15",
    name:"Maria Luz Santos", idNum:"GS-2025-001",
    contact:"0917-123-4567", email:"mlsantos@slu.edu.ph",
    department:"Graduate School of Nursing",
    title:"Mindfulness-Based Interventions on Anxiety Among SLU Nursing Students",
    funding:"Personal", category:"Graduate", affiliation:"SLU",
    service:"Full Statistical Assistance", hours:1,
    totalFee:4500, orNum:"OR-2025-0124", payDate:"2025-01-16",
    payStatus:"Paid", assignedURS:"Dr. Anna Reyes",
    ursShare:2700, unitShare:1800, semester:SEM, ay:AY,
    status:"Completed", remarks:""
  },
  {
    id:"ISRM-2025-0002", date:"2025-01-22",
    name:"Joseph Bagunas", idNum:"BS-Nur-4B-015",
    contact:"0928-876-5432", email:"jbagunas@slu.edu.ph",
    department:"School of Nursing",
    title:"Factors Affecting Academic Performance Among BSN Students During Remote Learning",
    funding:"Personal", category:"Undergraduate", affiliation:"SLU",
    service:"Consultation", hours:2,
    totalFee:400, orNum:"OR-2025-0201", payDate:"2025-01-23",
    payStatus:"Paid", assignedURS:"Dr. Anna Reyes",
    ursShare:240, unitShare:160, semester:SEM, ay:AY,
    status:"Completed", remarks:"Two sessions completed"
  },
  {
    id:"ISRM-2025-0003", date:"2025-02-03",
    name:"Priscilla Wayway", idNum:"GS-UB-2025-018",
    contact:"0955-234-5678", email:"pwayway@gmail.com",
    department:"Univ. of Baguio — Graduate School",
    title:"Prevalence of Metabolic Syndrome Among Cordillera Indigenous Peoples",
    funding:"CHED Grant", category:"Graduate", affiliation:"Non-SLU",
    service:"Full Statistical Assistance", hours:1,
    totalFee:5000, orNum:"OR-2025-0289", payDate:"2025-02-04",
    payStatus:"Paid", assignedURS:"Dr. Harold Gato",
    ursShare:3000, unitShare:2000, semester:SEM, ay:AY,
    status:"In Progress", remarks:"Data cleaning phase"
  },
  {
    id:"ISRM-2025-0004", date:"2025-02-14",
    name:"Rafael Bautista", idNum:"ME-Arch-3A-007",
    contact:"0918-345-6789", email:"rbautista@slu.edu.ph",
    department:"School of Engineering and Architecture",
    title:"Structural Performance of Bamboo-Reinforced Concrete in Seismic Zones",
    funding:"Personal", category:"Undergraduate", affiliation:"",
    service:"Consultation", hours:1,
    totalFee:200, orNum:"", payDate:"",
    payStatus:"Pending", assignedURS:"",
    ursShare:120, unitShare:80, semester:SEM, ay:AY,
    status:"New", remarks:"⚠ Affiliation pending ISM Officer review"
  },
  {
    id:"ISRM-2025-0005", date:"2025-02-20",
    name:"Cynthia Dumangeng", idNum:"GS-2025-031",
    contact:"0999-456-7890", email:"cdumangeng@slu.edu.ph",
    department:"School of Accountancy and Commerce",
    title:"Impact of Digital Payment Adoption on SME Revenue in Baguio City",
    funding:"Personal", category:"Graduate", affiliation:"SLU",
    service:"Full Statistical Assistance", hours:1,
    totalFee:4500, orNum:"OR-2025-0412", payDate:"2025-02-21",
    payStatus:"Paid", assignedURS:"Prof. Carl Mendez",
    ursShare:2700, unitShare:1800, semester:SEM, ay:AY,
    status:"In Progress", remarks:"Analysis underway"
  },
  {
    id:"ISRM-2025-0006", date:"2025-03-01",
    name:"Bryan Soliven", idNum:"GS-UB-2025-044",
    contact:"0906-567-8901", email:"bsoliven@gmail.com",
    department:"Univ. of Baguio — Liberal Arts",
    title:"Language Shift Patterns Among Ibaloi-Speaking Communities in Tuba, Benguet",
    funding:"Personal", category:"Graduate", affiliation:"Non-SLU",
    service:"Consultation", hours:3,
    totalFee:1050, orNum:"OR-2025-0489", payDate:"2025-03-02",
    payStatus:"Paid", assignedURS:"Dr. Anna Reyes",
    ursShare:630, unitShare:420, semester:SEM, ay:AY,
    status:"Completed", remarks:""
  },
  {
    id:"ISRM-2025-0007", date:"2025-03-10",
    name:"Fatima Bangcas", idNum:"BS-MedTech-4A-023",
    contact:"0932-678-9012", email:"fbangcas@slu.edu.ph",
    department:"School of Medical Technology",
    title:"Prevalence of Anemia Among Public Elementary School Children in La Trinidad",
    funding:"Personal", category:"Undergraduate", affiliation:"",
    service:"Full Statistical Assistance", hours:1,
    totalFee:2000, orNum:"", payDate:"",
    payStatus:"Pending", assignedURS:"Prof. Carl Mendez",
    ursShare:1200, unitShare:800, semester:SEM, ay:AY,
    status:"New", remarks:"Awaiting payment confirmation — Affiliation pending ISM review"
  },
  {
    id:"ISRM-2025-0008", date:"2025-03-15",
    name:"Nestor Bucsit", idNum:"GS-2025-055",
    contact:"0915-789-0123", email:"nbucsit@slu.edu.ph",
    department:"Graduate School of Business",
    title:"CSR Practices of BPO Companies in Baguio City and Their Socio-Economic Impact",
    funding:"UNRIC Research Grant", category:"Graduate", affiliation:"SLU",
    service:"Full Statistical Assistance", hours:1,
    totalFee:0, orNum:"—", payDate:"2025-03-15",
    payStatus:"Paid", assignedURS:"Dr. Harold Gato",
    ursShare:0, unitShare:0, semester:SEM, ay:AY,
    status:"In Progress", remarks:"Free — Officially funded UNRIC grantee"
  },
];

const SEED_URS = [
  {
    id:"URS-001", name:"Dr. Harold Gato",
    department:"Mathematics Department",
    degree:"Ph.D. Applied Statistics (candidate)",
    specialization:"Multivariate Analysis · Composite Index · Psychometrics",
    email:"hgato@slu.edu.ph", contact:"0917-000-0001",
    available:"MWF Afternoons · Saturday AM",
    status:"Active", ay:AY,
  },
  {
    id:"URS-002", name:"Dr. Anna Reyes",
    department:"School of Nursing",
    degree:"Ph.D. Public Health",
    specialization:"Health Research · Epidemiology · Biostatistics",
    email:"areyes@slu.edu.ph", contact:"0918-000-0002",
    available:"TTh Afternoons",
    status:"Active", ay:AY,
  },
  {
    id:"URS-003", name:"Prof. Carl Mendez",
    department:"School of Accountancy and Commerce",
    degree:"M.S. Applied Statistics",
    specialization:"Business Research · Finance · Operations Research",
    email:"cmendez@slu.edu.ph", contact:"0928-000-0003",
    available:"Saturday – Sunday AM",
    status:"Active", ay:AY,
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────
const peso = n =>
  `₱${Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

const split60 = fee => ({
  ursShare : parseFloat((Number(fee)*URS_PCT ).toFixed(2)),
  unitShare: parseFloat((Number(fee)*UNIT_PCT).toFixed(2)),
});

const initials = name =>
  name.split(" ").filter(w=>!["Dr.","Prof.","Mr.","Ms.","Mrs."].includes(w))
    .map(w=>w[0]).slice(0,2).join("").toUpperCase();

// ─── BADGE ────────────────────────────────────────────────────────
const BADGE_CFG = {
  "Paid":        {c:T.ok,   bg:T.okBg},
  "Pending":     {c:T.warn, bg:T.warnBg},
  "Completed":   {c:T.ok,   bg:T.okBg},
  "In Progress": {c:T.prog, bg:T.progBg},
  "New":         {c:T.new,  bg:T.newBg},
  "Cancelled":   {c:T.err,  bg:T.errBg},
  "Active":      {c:T.ok,   bg:T.okBg},
  "Inactive":    {c:T.gray, bg:T.grayBg},
  "SLU":         {c:T.navy, bg:T.progBg},
  "Non-SLU":     {c:T.gray, bg:T.grayBg},
  "Undergraduate":{c:T.prog, bg:T.progBg},
  "Graduate":    {c:T.new,  bg:T.newBg},
  "Staff":       {c:T.gold, bg:T.goldPale},
};

function Badge({s, size=10.5}) {
  const {c,bg} = BADGE_CFG[s] || {c:T.gray, bg:T.grayBg};
  return (
    <span style={{display:"inline-block",padding:"2px 8px",borderRadius:4,
      fontSize:size,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",
      color:c,background:bg,border:`1px solid ${c}33`,whiteSpace:"nowrap"}}>
      {s}
    </span>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────
function Card({children, p=20, style={}}) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,
      borderRadius:8,boxShadow:"0 2px 10px rgba(0,0,0,.06)",padding:p,...style}}>
      {children}
    </div>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────
function Btn({children, variant="primary", onClick, small, disabled, style={}}) {
  const V = {
    primary:{background:T.navy,   color:"#fff"},
    gold:   {background:T.gold,   color:"#fff"},
    outline:{background:"transparent",color:T.navy,border:`1.5px solid ${T.navy}`},
    ghost:  {background:"#F0F4FA",color:T.text},
    danger: {background:T.err,    color:"#fff"},
    ok:     {background:T.ok,     color:"#fff"},
  }[variant]||{};
  return (
    <button disabled={disabled} onClick={onClick} style={{
      ...V, border:"none", borderRadius:5, cursor:disabled?"not-allowed":"pointer",
      padding:small?"5px 11px":"8px 16px",
      fontSize:small?10.5:12, fontWeight:700, letterSpacing:".05em",
      fontFamily:"inherit", opacity:disabled?.5:1,
      transition:"opacity .15s, transform .1s", ...style,
    }}
    onMouseEnter={e=>{if(!disabled)e.target.style.opacity=".82";}}
    onMouseLeave={e=>{e.target.style.opacity="1";}}
    >{children}</button>
  );
}

// ─── FORM CONTROLS ────────────────────────────────────────────────
function FInput({value,onChange,placeholder,style={}}) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder}
      style={{border:`1px solid ${T.border}`,borderRadius:5,padding:"7px 10px",
        fontSize:12.5,fontFamily:"inherit",color:T.text,background:"#fff",
        outline:"none",width:"100%",...style}}
    />
  );
}
function FSelect({value,onChange,options,style={}}) {
  return (
    <select value={value} onChange={onChange}
      style={{border:`1px solid ${T.border}`,borderRadius:5,padding:"7px 10px",
        fontSize:12.5,fontFamily:"inherit",color:T.text,background:"#fff",
        outline:"none",...style}}>
      {options.map(o=><option key={o} value={o}>{o||"— Select —"}</option>)}
    </select>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────
function SHead({title, action}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:T.navy}}>
        {title}
      </h2>
      {action}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({label,value,sub,icon,accent,style={}}) {
  return (
    <Card p={18} style={{flex:1,minWidth:130,...style}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",
            color:T.muted,marginBottom:6}}>{label}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,
            color:accent||T.text,lineHeight:1}}>{value}</div>
          {sub && <div style={{fontSize:10.5,color:T.muted,marginTop:5}}>{sub}</div>}
        </div>
        <div style={{fontSize:22,opacity:.6}}>{icon}</div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function DashboardView({clients, fin, setView, setSelectedClient}) {
  const pending = clients.filter(c=>c.payStatus==="Pending");
  const recent  = [...clients].sort((a,b)=>b.id.localeCompare(a.id)).slice(0,5);

  return (
    <div>
      {/* Stat grid */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
        <StatCard label="Gross Fees Collected" value={peso(fin.totalFee)}
          sub={`${fin.paid} paid · ${fin.pending} pending`} icon="💰" accent={T.ok}/>
        <StatCard label="URS Honoraria (60%)" value={peso(fin.totalURS)}
          sub="Total accrued to URS" icon="👥" accent={T.navy}/>
        <StatCard label="Unit Retained (40%)" value={peso(fin.totalUnit)}
          sub="ISRM unit share" icon="🏛" accent={T.gold}/>
        <StatCard label="Pending Payment" value={fin.pending}
          sub="Action required" icon="⏳" accent={T.warn}/>
        <StatCard label="Active Consultations" value={fin.active}
          sub="In Progress" icon="📋" accent={T.prog}/>
        <StatCard label="Completed" value={fin.completed}
          sub={`of ${fin.total} total`} icon="✅" accent={T.ok}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16}}>
        {/* Recent activity */}
        <Card p={0}>
          <div style={{padding:"13px 18px",borderBottom:`1px solid ${T.border}`,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:14,
              fontWeight:700,color:T.navy}}>Recent Client Activity</h3>
            <Btn variant="ghost" small onClick={()=>setView("clients")}>View All →</Btn>
          </div>
          {recent.map((c,i)=>(
            <div key={c.id} onClick={()=>setSelectedClient(c)}
              style={{display:"flex",alignItems:"center",gap:14,padding:"11px 18px",
                cursor:"pointer",borderBottom:i<recent.length-1?`1px solid ${T.bg}`:"none",
                transition:"background .12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.bg}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:36,height:36,borderRadius:"50%",background:T.navyD,
                color:T.gold,display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,flexShrink:0}}>
                {initials(c.name)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:700,color:T.text,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:10.5,color:T.muted,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginRight:8}}>
                <div style={{fontSize:12,fontWeight:700,color:T.text}}>{peso(c.totalFee)}</div>
                <div style={{marginTop:3}}><Badge s={c.payStatus}/></div>
              </div>
              <Badge s={c.status}/>
            </div>
          ))}
        </Card>

        {/* Pending actions panel */}
        <Card p={0}>
          <div style={{padding:"13px 18px",borderBottom:`1px solid ${T.border}`,
            background:T.warnBg}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:14,
              fontWeight:700,color:T.warn}}>⚠️ Action Required</h3>
          </div>
          {pending.length===0 ? (
            <div style={{padding:24,textAlign:"center",color:T.muted,fontSize:12}}>
              ✅ All payments verified
            </div>
          ) : pending.map(c=>(
            <div key={c.id} onClick={()=>setSelectedClient(c)}
              style={{padding:"12px 16px",borderBottom:`1px solid ${T.bg}`,cursor:"pointer",
                transition:"background .12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.warnBg}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{fontSize:12,fontWeight:700,color:T.text}}>{c.name}</div>
              <div style={{fontSize:10.5,color:T.muted,margin:"2px 0"}}>{c.service}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5}}>
                <span style={{fontSize:12,fontWeight:700,color:T.warn}}>{peso(c.totalFee)}</span>
                {c.assignedURS
                  ? <span style={{fontSize:10,color:T.muted}}>URS: {c.assignedURS.split(" ").slice(-1)[0]}</span>
                  : <span style={{fontSize:10,color:T.err,fontWeight:700}}>⚠ No URS assigned</span>
                }
              </div>
            </div>
          ))}
          {/* 60/40 reminder */}
          <div style={{padding:"12px 16px",background:T.goldPale,
            borderTop:`1px solid ${T.border}`,borderRadius:"0 0 8px 8px"}}>
            <div style={{fontSize:9.5,fontWeight:700,color:T.gold,
              textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>
              60/40 Split Rule
            </div>
            <div style={{fontSize:11,color:T.text,lineHeight:1.6}}>
              URS receives <strong>60%</strong> of every client fee.<br/>
              ISRM unit retains <strong>40%</strong>.<br/>
              Applied automatically on all paid records.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: CLIENTS TABLE
// ═══════════════════════════════════════════════════════════════════
function ClientsView({clients, setClients, setSelectedClient}) {
  const [q,    setQ]    = useState("");
  const [fPay, setFPay] = useState("All");
  const [fStat,setFStat]= useState("All");
  const [fURS, setFURS] = useState("All");

  const filtered = useMemo(()=>clients.filter(c=>{
    if(fPay!=="All" && c.payStatus!==fPay) return false;
    if(fStat!=="All" && c.status!==fStat) return false;
    if(fURS!=="All"){
      if(fURS==="Unassigned" && c.assignedURS) return false;
      if(fURS!=="Unassigned" && c.assignedURS!==fURS) return false;
    }
    if(q && !`${c.name} ${c.title} ${c.id} ${c.department} ${c.idNum}`
        .toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }),[clients,q,fPay,fStat,fURS]);

  const TH = ({children}) => (
    <th style={{padding:"9px 12px",textAlign:"left",fontWeight:700,fontSize:9.5,
      letterSpacing:".09em",textTransform:"uppercase",color:"rgba(255,255,255,.85)",
      whiteSpace:"nowrap"}}>{children}</th>
  );
  const TD = ({children,style={}}) => (
    <td style={{padding:"9px 12px",...style}}>{children}</td>
  );

  return (
    <div>
      <SHead title={`Client Records (${filtered.length} of ${clients.length})`}/>
      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <FInput value={q} onChange={e=>setQ(e.target.value)}
          placeholder="🔍  Search name · title · record ID · department…"
          style={{maxWidth:300}}/>
        <FSelect value={fPay} onChange={e=>setFPay(e.target.value)}
          options={["All","Paid","Pending"]} style={{width:130}}/>
        <FSelect value={fStat} onChange={e=>setFStat(e.target.value)}
          options={["All",...STAT_FLOWS]} style={{width:145}}/>
        <FSelect value={fURS} onChange={e=>setFURS(e.target.value)}
          options={["All",...URS_OPTS,"Unassigned"]} style={{width:175}}/>
        {(q||fPay!=="All"||fStat!=="All"||fURS!=="All") && (
          <Btn variant="ghost" small
            onClick={()=>{setQ("");setFPay("All");setFStat("All");setFURS("All");}}>
            ✕ Clear
          </Btn>
        )}
      </div>

      {/* Table */}
      <Card p={0} style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:T.navyD}}>
              <TH>Record ID</TH><TH>Date</TH><TH>Client</TH><TH>Dept / School</TH>
              <TH>Service</TH><TH>Total Fee</TH><TH>OR #</TH>
              <TH>Pay</TH><TH>URS Assigned</TH><TH>60% Share</TH><TH>Status</TH><TH></TH>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c,i)=>(
              <tr key={c.id}
                style={{background:i%2===0?"#fff":T.bg,cursor:"pointer",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#E8EFF8"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":T.bg}
                onClick={()=>setSelectedClient(c)}>
                <TD><span style={{fontWeight:700,color:T.navy,fontSize:11}}>{c.id}</span></TD>
                <TD><span style={{color:T.muted,fontSize:11,whiteSpace:"nowrap"}}>{c.date}</span></TD>
                <TD>
                  <div style={{fontWeight:700,color:T.text}}>{c.name}</div>
                  <div style={{marginTop:2,display:"flex",gap:4}}>
                    <Badge s={c.category} size={9}/>
                    {c.affiliation
                      ? <Badge s={c.affiliation} size={9}/>
                      : <span style={{fontSize:9,color:T.warn,fontWeight:700,
                          background:T.warnBg,padding:"2px 6px",borderRadius:3,
                          border:`1px solid ${T.warn}33`}}>Affiliation?</span>
                    }
                  </div>
                </TD>
                <TD>
                  <span style={{color:T.muted,fontSize:11,display:"block",maxWidth:160,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {c.department}
                  </span>
                </TD>
                <TD><span style={{color:T.text,whiteSpace:"nowrap"}}>{c.service}</span></TD>
                <TD><span style={{fontWeight:700,color:T.text}}>{peso(c.totalFee)}</span></TD>
                <TD><span style={{fontSize:11,color:c.orNum?T.text:T.muted}}>{c.orNum||"—"}</span></TD>
                <TD><Badge s={c.payStatus}/></TD>
                <TD><span style={{fontSize:11,color:c.assignedURS?T.navy:T.err,fontWeight:c.assignedURS?700:400}}>
                  {c.assignedURS||"⚠ Unassigned"}
                </span></TD>
                <TD><span style={{fontWeight:700,color:T.ok,whiteSpace:"nowrap"}}>{peso(c.ursShare)}</span></TD>
                <TD><Badge s={c.status}/></TD>
                <TD><Btn variant="ghost" small>Edit</Btn></TD>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={12} style={{padding:36,textAlign:"center",color:T.muted,fontStyle:"italic"}}>
                No records match the current filters.
              </td></tr>
            )}
          </tbody>
          {filtered.length>0 && (
            <tfoot>
              <tr style={{background:"#F5F8FF",borderTop:`2px solid ${T.border}`}}>
                <td colSpan={5} style={{padding:"9px 12px",fontWeight:700,fontSize:11,color:T.navy}}>
                  SUBTOTALS — {filtered.length} record{filtered.length!==1?"s":""}
                </td>
                <td style={{padding:"9px 12px",fontWeight:700}}>
                  {peso(filtered.reduce((s,c)=>s+(c.totalFee||0),0))}
                </td>
                <td colSpan={3}/>
                <td style={{padding:"9px 12px",fontWeight:700,color:T.ok}}>
                  {peso(filtered.reduce((s,c)=>s+(c.ursShare||0),0))}
                </td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: URS REGISTRY
// ═══════════════════════════════════════════════════════════════════
function URSView({ursList, clients}) {
  return (
    <div>
      <SHead title="University Research Statisticians Registry"
        action={<span style={{fontSize:11,color:T.muted}}>AY {AY} · {ursList.length} active</span>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(295px,1fr))",gap:14}}>
        {ursList.map(u=>{
          const handled = clients.filter(c=>c.assignedURS===u.name&&c.payStatus==="Paid");
          const earned  = handled.reduce((s,c)=>s+(c.ursShare||0),0);
          const done    = handled.filter(c=>c.status==="Completed").length;
          const active  = handled.filter(c=>c.status==="In Progress").length;
          return (
            <Card key={u.id}>
              {/* Avatar + Name */}
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                <div style={{width:48,height:48,borderRadius:"50%",flexShrink:0,
                  background:`linear-gradient(135deg,${T.navyD},${T.navyM})`,
                  color:T.gold,display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700}}>
                  {initials(u.name)}
                </div>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,
                    fontWeight:700,color:T.navy}}>{u.name}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:1}}>{u.department}</div>
                  <div style={{marginTop:4}}><Badge s={u.status}/></div>
                </div>
              </div>

              {/* Info rows */}
              {[
                ["🎓 Degree", u.degree],
                ["🔬 Specialization", u.specialization],
                ["🗓 Available", u.available],
                ["📧 Email", u.email],
              ].map(([l,v])=>(
                <div key={l} style={{fontSize:11,marginBottom:7}}>
                  <span style={{fontWeight:700,color:T.muted}}>{l}: </span>
                  <span style={{color:T.text}}>{v}</span>
                </div>
              ))}

              {/* Stats bar */}
              <div style={{display:"flex",borderTop:`1px solid ${T.border}`,
                borderBottom:`1px solid ${T.border}`,margin:"12px 0",padding:"10px 0",gap:0}}>
                {[
                  ["Clients",  handled.length, T.navy],
                  ["Completed",done,           T.ok],
                  ["Active",   active,          T.prog],
                ].map(([l,v,col],i)=>(
                  <div key={l} style={{flex:1,textAlign:"center",
                    borderRight:i<2?`1px solid ${T.border}`:"none"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",
                      fontSize:20,fontWeight:700,color:col}}>{v}</div>
                    <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",
                      letterSpacing:".08em"}}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Honoraria */}
              <div style={{background:T.bg,borderRadius:6,padding:"10px 14px",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:T.muted,fontWeight:700}}>Honoraria (60%):</span>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,
                  fontWeight:700,color:T.ok}}>{peso(earned)}</span>
              </div>
            </Card>
          );
        })}
      </div>
      {/* Policy reminder */}
      <div style={{marginTop:20,padding:"12px 18px",background:T.goldPale,
        borderLeft:`4px solid ${T.gold}`,borderRadius:"0 6px 6px 0",fontSize:12,
        color:T.muted,lineHeight:1.7}}>
        <strong style={{color:T.text}}>RSS Manual §IV.2.4 — </strong>
        University Research Statisticians are entitled to <strong>60%</strong> of all fees
        collected for services they render. Honoraria are paid by the Finance Office on a
        yearly basis upon submission of FM-RIS-060, prepared by the ISM Officer and noted by
        the RISE Center Director.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: FINANCIAL SUMMARY
// ═══════════════════════════════════════════════════════════════════
function FinancialView({clients, fin}) {
  const byURS = useMemo(()=>{
    const map = {};
    clients.filter(c=>c.payStatus==="Paid").forEach(c=>{
      const k = c.assignedURS||"Unassigned";
      if(!map[k]) map[k]={name:k,count:0,totalFee:0,ursShare:0,unitShare:0};
      map[k].count++;
      map[k].totalFee  += c.totalFee ||0;
      map[k].ursShare  += c.ursShare ||0;
      map[k].unitShare += c.unitShare||0;
    });
    return Object.values(map).sort((a,b)=>b.ursShare-a.ursShare);
  },[clients]);

  const bySvc = useMemo(()=>{
    const map = {};
    clients.filter(c=>c.payStatus==="Paid").forEach(c=>{
      const k = c.service;
      if(!map[k]) map[k]={service:k,count:0,fees:0};
      map[k].count++;
      map[k].fees += c.totalFee||0;
    });
    return Object.values(map).sort((a,b)=>b.fees-a.fees);
  },[clients]);

  return (
    <div>
      <SHead title="Financial Summary"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18}}>
        <StatCard label="Gross Fees Collected" value={peso(fin.totalFee)}
          sub={`${fin.paid} paid records`} icon="💰" accent={T.ok}/>
        <StatCard label="URS Honoraria (60%)" value={peso(fin.totalURS)} icon="👤" accent={T.navy}/>
        <StatCard label="Unit Retained (40%)" value={peso(fin.totalUnit)} icon="🏛" accent={T.gold}/>
      </div>

      {/* Split bar */}
      <Card style={{marginBottom:16}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:14,
          color:T.navy,marginBottom:12}}>60 / 40 Split — {SEM}, AY {AY}</div>
        {fin.totalFee>0 ? (
          <>
            <div style={{height:16,borderRadius:8,overflow:"hidden",
              display:"flex",marginBottom:10}}>
              <div style={{width:`${URS_PCT*100}%`,
                background:`linear-gradient(90deg,${T.navyD},${T.navyM})`,
                transition:"width .6s"}}/>
              <div style={{width:`${UNIT_PCT*100}%`,
                background:`linear-gradient(90deg,${T.gold},${T.goldL})`,
                transition:"width .6s"}}/>
            </div>
            <div style={{display:"flex",gap:24}}>
              {[
                {label:"URS Share 60%",value:fin.totalURS,color:T.navy},
                {label:"Unit Share 40%",value:fin.totalUnit,color:T.gold},
              ].map(({label,value,color})=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                  <div style={{width:10,height:10,borderRadius:2,background:color}}/>
                  <span style={{color:T.muted}}>{label} —</span>
                  <span style={{fontWeight:700,color}}>{peso(value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{color:T.muted,fontSize:12,fontStyle:"italic"}}>
            No paid records yet. Record split will appear here once payments are logged.
          </div>
        )}
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        {/* By-URS breakdown */}
        <Card p={0}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontWeight:700,
              fontSize:14,color:T.navy}}>Honoraria Breakdown by URS</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#F5F8FF"}}>
                {["URS Name","Clients","Gross Fees","URS 60%","Unit 40%"].map(h=>(
                  <th key={h} style={{padding:"8px 14px",textAlign:"left",fontWeight:700,
                    fontSize:10,letterSpacing:".07em",textTransform:"uppercase",
                    color:T.muted,borderBottom:`1px solid ${T.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byURS.map(u=>(
                <tr key={u.name} style={{borderBottom:`1px solid ${T.bg}`}}>
                  <td style={{padding:"9px 14px",fontWeight:700,color:T.navy}}>{u.name}</td>
                  <td style={{padding:"9px 14px",textAlign:"center"}}>{u.count}</td>
                  <td style={{padding:"9px 14px"}}>{peso(u.totalFee)}</td>
                  <td style={{padding:"9px 14px",fontWeight:700,color:T.ok}}>{peso(u.ursShare)}</td>
                  <td style={{padding:"9px 14px",color:T.gold,fontWeight:700}}>{peso(u.unitShare)}</td>
                </tr>
              ))}
              <tr style={{background:"#F5F8FF",borderTop:`2px solid ${T.border}`,fontWeight:700}}>
                <td style={{padding:"9px 14px",color:T.text}}>TOTAL</td>
                <td style={{padding:"9px 14px",textAlign:"center"}}>{fin.paid}</td>
                <td style={{padding:"9px 14px"}}>{peso(fin.totalFee)}</td>
                <td style={{padding:"9px 14px",color:T.ok}}>{peso(fin.totalURS)}</td>
                <td style={{padding:"9px 14px",color:T.gold}}>{peso(fin.totalUnit)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* By-service breakdown */}
        <Card p={0}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontWeight:700,
              fontSize:14,color:T.navy}}>By Service Type</span>
          </div>
          {bySvc.map(s=>(
            <div key={s.service} style={{padding:"10px 16px",
              borderBottom:`1px solid ${T.bg}`}}>
              <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:5}}>
                {s.service}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                <span style={{color:T.muted}}>{s.count} client{s.count!==1?"s":""}</span>
                <span style={{fontWeight:700,color:T.ok}}>{peso(s.fees)}</span>
              </div>
              {fin.totalFee>0 && (
                <div style={{marginTop:6,height:4,borderRadius:2,background:T.border}}>
                  <div style={{height:"100%",borderRadius:2,
                    background:`linear-gradient(90deg,${T.navy},${T.navyM})`,
                    width:`${(s.fees/fin.totalFee)*100}%`}}/>
                </div>
              )}
            </div>
          ))}
          {bySvc.length===0 && (
            <div style={{padding:20,color:T.muted,fontSize:12,textAlign:"center",fontStyle:"italic"}}>
              No paid records yet.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: REPORTS
// ═══════════════════════════════════════════════════════════════════
function ReportsView({clients, fin, setReportType}) {
  const paid = clients.filter(c=>c.payStatus==="Paid");

  const byURS = useMemo(()=>{
    const map={};
    paid.forEach(c=>{
      const k=c.assignedURS||"Unassigned";
      if(!map[k]) map[k]={name:k,entries:[],total:0};
      map[k].entries.push(c);
      map[k].total+=c.ursShare||0;
    });
    return Object.values(map);
  },[paid]);

  return (
    <div>
      <SHead title="Document Generation"/>
      <div style={{marginBottom:14,padding:"12px 16px",background:"#EEF2FA",
        borderLeft:`4px solid ${T.navy}`,borderRadius:"0 6px 6px 0",fontSize:12,
        color:T.muted,lineHeight:1.6}}>
        <strong style={{color:T.text}}>How this works: </strong>
        The "Preview" button generates a formatted document replica using live dashboard data.
        In the deployed Google Sheets system, clicking the equivalent menu item runs the
        Apps Script to populate the Google Doc template and export a signed PDF to Drive.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        {/* FM-RIS-059 */}
        <Card>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14}}>
            <div style={{width:44,height:44,borderRadius:8,flexShrink:0,
              background:`linear-gradient(135deg,${T.navyD},${T.navyM})`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              📊
            </div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,
                fontWeight:700,color:T.navy}}>FM-RIS-059</div>
              <div style={{fontSize:11,color:T.muted}}>Statistical Services Semestral Report</div>
            </div>
          </div>
          <p style={{fontSize:12,color:T.muted,lineHeight:1.65,marginBottom:14}}>
            Official semester report for the RISE Center Director. Includes all client records,
            services rendered, fees collected, and the aggregated 60/40 split for the period.
          </p>
          <div style={{background:T.bg,borderRadius:6,padding:"10px 14px",marginBottom:16}}>
            {[["Semester/AY",`${SEM}, AY ${AY}`],["Total Records",clients.length],
              ["Gross Fees",peso(fin.totalFee)],["URS 60%",peso(fin.totalURS)],
              ["Unit 40%",peso(fin.totalUnit)]]
              .map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                fontSize:11.5,marginBottom:4}}>
                <span style={{color:T.muted}}>{l}:</span>
                <span style={{fontWeight:700,color:T.text}}>{v}</span>
              </div>
            ))}
          </div>
          <Btn onClick={()=>setReportType("059")}>🖨️  Preview FM-RIS-059</Btn>
        </Card>

        {/* FM-RIS-060 */}
        <Card>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14}}>
            <div style={{width:44,height:44,borderRadius:8,flexShrink:0,
              background:`linear-gradient(135deg,${T.gold},#E0A840)`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              💳
            </div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,
                fontWeight:700,color:T.navy}}>FM-RIS-060</div>
              <div style={{fontSize:11,color:T.muted}}>Requisition for Honoraria of URS</div>
            </div>
          </div>
          <p style={{fontSize:12,color:T.muted,lineHeight:1.65,marginBottom:14}}>
            Accounting-ready honoraria requisition. Groups paid records by assigned URS,
            applies the 60% rule to each client fee, and produces per-URS totals and a
            grand total for VP Finance approval.
          </p>
          <div style={{background:T.bg,borderRadius:6,padding:"10px 14px",marginBottom:16}}>
            {[["Period",`${SEM}, AY ${AY}`],["Paid Records",fin.paid],
              ["Active URS",byURS.length],["Grand Honoraria",peso(fin.totalURS)]]
              .map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                fontSize:11.5,marginBottom:4}}>
                <span style={{color:T.muted}}>{l}:</span>
                <span style={{fontWeight:700,color:T.text}}>{v}</span>
              </div>
            ))}
          </div>
          <Btn variant="gold" onClick={()=>setReportType("060")}>🖨️  Preview FM-RIS-060</Btn>
        </Card>
      </div>

      {/* Per-URS honoraria preview table */}
      <Card p={0}>
        <div style={{padding:"11px 18px",borderBottom:`1px solid ${T.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontWeight:700,
            fontSize:14,color:T.navy}}>FM-RIS-060 Data Preview — Per-URS Breakdown</span>
          <span style={{fontSize:10.5,color:T.muted}}>Paid records only</span>
        </div>
        {byURS.map(u=>(
          <div key={u.name}>
            <div style={{padding:"8px 18px",background:"#F5F8FF",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontWeight:700,fontSize:13,color:T.navy}}>{u.name}</span>
              <span style={{fontWeight:700,color:T.ok,fontSize:13}}>
                Total: {peso(u.total)}
              </span>
            </div>
            {u.entries.map((c,i)=>(
              <div key={c.id} style={{padding:"7px 18px 7px 32px",fontSize:11.5,
                borderBottom:`1px solid ${T.bg}`,display:"flex",
                justifyContent:"space-between",alignItems:"center",
                background:i%2===0?"#fff":T.bg}}>
                <div>
                  <span style={{fontWeight:700,color:T.text}}>{c.name}</span>
                  <span style={{color:T.muted,marginLeft:8}}>{c.service}</span>
                </div>
                <div style={{display:"flex",gap:16,alignItems:"center"}}>
                  <span style={{color:T.muted}}>Fee: {peso(c.totalFee)}</span>
                  <span style={{fontWeight:700,color:T.ok}}>60%: {peso(c.ursShare)}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{padding:"10px 18px",background:T.navyD,
          display:"flex",justifyContent:"space-between",borderRadius:"0 0 8px 8px"}}>
          <span style={{fontWeight:700,color:"#fff",fontSize:13}}>GRAND TOTAL HONORARIA</span>
          <span style={{fontWeight:700,color:T.goldL,fontSize:14,
            fontFamily:"'Playfair Display',serif"}}>{peso(fin.totalURS)}</span>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL: CLIENT DETAIL + EDIT
// ═══════════════════════════════════════════════════════════════════
function ClientModal({client, clients, setClients, onClose}) {
  const [c, setC] = useState({...client});
  const live60 = split60(c.totalFee);

  const save = () => {
    const updated = {...c, ursShare:live60.ursShare, unitShare:live60.unitShare};
    setClients(prev=>prev.map(x=>x.id===updated.id?updated:x));
    onClose();
  };

  const Field = ({label,children}) => (
    <div style={{marginBottom:13}}>
      <div style={{fontSize:9.5,fontWeight:700,color:T.muted,textTransform:"uppercase",
        letterSpacing:".09em",marginBottom:5}}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,20,50,.6)",
      zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,
      overflowY:"auto"}}>
      <div style={{background:T.card,borderRadius:10,width:"100%",maxWidth:660,
        maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.28)"}}>

        {/* Modal header */}
        <div style={{background:`linear-gradient(135deg,${T.navyD},${T.navy})`,
          padding:"16px 22px",borderRadius:"10px 10px 0 0",
          display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,
              fontSize:17,fontWeight:700}}>{c.id}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:11.5,marginTop:3}}>
              {c.name} · {c.department}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:22,
            lineHeight:1,padding:"0 4px"}}>×</button>
        </div>

        <div style={{padding:24}}>
          {/* Research info (read-only) */}
          <Card p={14} style={{background:T.bg,marginBottom:18}}>
            <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",
              letterSpacing:".1em",marginBottom:6}}>Research Title</div>
            <div style={{fontSize:13,color:T.text,lineHeight:1.55,fontStyle:"italic"}}>
              "{c.title}"
            </div>
            <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
              <Badge s={c.category}/>
              {c.affiliation
                ? <Badge s={c.affiliation}/>
                : <span style={{fontSize:10,color:T.warn,fontWeight:700,
                    background:T.warnBg,padding:"2px 8px",borderRadius:3,
                    border:`1px solid ${T.warn}55`}}>
                    ⚠ Affiliation not set — ISM Officer fills below
                  </span>
              }
              <span style={{fontSize:11,color:T.muted}}>
                Funding: {c.funding}
              </span>
            </div>
          </Card>

          {/* 60/40 split panel */}
          <div style={{background:`linear-gradient(135deg,${T.navyD},${T.navy})`,
            borderRadius:8,padding:"14px 18px",marginBottom:18}}>
            <div style={{color:"rgba(255,255,255,.6)",fontSize:10,fontWeight:700,
              textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>
              60 / 40 Split Engine
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              {[["Total Fee",peso(c.totalFee),"rgba(255,255,255,.95)"],
                ["URS Share (60%)",peso(live60.ursShare),T.goldL],
                ["Unit Share (40%)",peso(live60.unitShare),T.goldL],
              ].map(([l,v,col])=>(
                <div key={l}>
                  <div style={{fontSize:9.5,color:"rgba(255,255,255,.5)",
                    textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>{l}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",
                    fontSize:18,fontWeight:700,color:col}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Editable fields — 2 columns */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Field label="Official Receipt (OR) Number">
              <FInput value={c.orNum} onChange={e=>setC({...c,orNum:e.target.value})}
                placeholder="e.g. OR-2025-0000"/>
            </Field>
            <Field label="Payment Date">
              <FInput value={c.payDate} onChange={e=>setC({...c,payDate:e.target.value})}
                placeholder="MM/DD/YYYY"/>
            </Field>
            <Field label="Payment Status">
              <FSelect value={c.payStatus} onChange={e=>setC({...c,payStatus:e.target.value})}
                options={["Pending","Paid"]}/>
            </Field>
            <Field label="Consultation Status">
              <FSelect value={c.status} onChange={e=>setC({...c,status:e.target.value})}
                options={STAT_FLOWS}/>
            </Field>
            <Field label="Affiliation (ISM Officer sets)">
              <div>
                <FSelect value={c.affiliation||""}
                  onChange={e=>setC({...c,affiliation:e.target.value})}
                  options={["","SLU","Non-SLU"]}/>
                <div style={{fontSize:9.5,color:T.muted,marginTop:4,lineHeight:1.5}}>
                  ⚠ Not from form — ISM Officer fills. If Non-SLU, also adjust Total Fee below.
                </div>
              </div>
            </Field>
            <Field label="Assigned URS">
              <FSelect value={c.assignedURS}
                onChange={e=>setC({...c,assignedURS:e.target.value})}
                options={["",...URS_OPTS]}/>
            </Field>
            <Field label="Total Fee (₱) — adjust for Non-SLU">
              <FInput value={c.totalFee}
                onChange={e=>setC({...c,
                  totalFee: parseFloat(e.target.value)||0,
                  ursShare: parseFloat(((parseFloat(e.target.value)||0)*0.60).toFixed(2)),
                  unitShare:parseFloat(((parseFloat(e.target.value)||0)*0.40).toFixed(2)),
                })}
                placeholder="₱0.00"/>
            </Field>
            <Field label="Remarks / Notes">
              <FInput value={c.remarks} onChange={e=>setC({...c,remarks:e.target.value})}
                placeholder="Optional notes…"/>
            </Field>
          </div>

          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="gold" onClick={save}>💾  Save Changes to Dashboard</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL: REPORT PREVIEW (FM-RIS-059 / FM-RIS-060)
// ═══════════════════════════════════════════════════════════════════
function ReportModal({type, clients, fin, onClose}) {
  const paid  = clients.filter(c=>c.payStatus==="Paid");
  const is059 = type==="059";
  const today = new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"});

  const byURS = useMemo(()=>{
    const map={};
    paid.forEach(c=>{
      const k=c.assignedURS||"Unassigned";
      if(!map[k]) map[k]={name:k,entries:[],total:0};
      map[k].entries.push(c);
      map[k].total+=c.ursShare||0;
    });
    return Object.values(map);
  },[paid]);

  const TH = ({children,right}) => (
    <th style={{padding:"6px 10px",textAlign:right?"right":"left",
      fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,.9)",letterSpacing:".04em"}}>
      {children}
    </th>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,20,50,.7)",
      zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",
      padding:24,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:8,width:"100%",maxWidth:720,
        boxShadow:"0 24px 64px rgba(0,0,0,.3)",marginBottom:24}}>

        {/* Chrome bar */}
        <div style={{background:T.navyD,padding:"12px 20px",
          borderRadius:"8px 8px 0 0",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",color:T.gold,
              fontSize:14,fontWeight:700}}>
              {is059?"FM-RIS-059 — Statistical Services Semestral Report"
                    :"FM-RIS-060 — Requisition for Honoraria of URS"}
            </div>
            <div style={{color:"rgba(255,255,255,.55)",fontSize:10,marginTop:2}}>
              Document Preview · {SEM}, AY {AY}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{background:T.warnBg,color:T.warn,fontSize:10,fontWeight:700,
              padding:"4px 10px",borderRadius:4,letterSpacing:".04em"}}>
              📋 PREVIEW — Print or send to Apps Script for PDF
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",
              color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
          </div>
        </div>

        {/* Document */}
        <div style={{padding:"28px 40px",fontFamily:"'Lato',sans-serif",
          fontSize:12,color:"#1C2340",lineHeight:1.65}}>
          {/* Letterhead */}
          <div style={{textAlign:"center",marginBottom:22,paddingBottom:16,
            borderBottom:"2.5px solid #1A3666"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,
              fontWeight:800,color:"#1A3666",letterSpacing:".03em"}}>
              SAINT LOUIS UNIVERSITY
            </div>
            <div style={{fontSize:10.5,color:T.muted,marginTop:3}}>
              Research, Innovation, and Sustainable Extension Center · 2/F Administrative Center ·
              A. Bonifacio Street, Baguio City 2600
            </div>
            <div style={{marginTop:12,fontSize:14,fontWeight:700,color:"#1A3666",
              textTransform:"uppercase",letterSpacing:".08em"}}>
              {is059?"Statistical Services Semestral Report"
                    :"Requisition for Honoraria of University Research Statisticians"}
            </div>
            <div style={{fontSize:10,color:T.muted,marginTop:3}}>
              Form No.: FM-RIS-{type} · {SEM}, AY {AY}
            </div>
          </div>

          {/* Doc header row */}
          <div style={{display:"flex",justifyContent:"space-between",
            marginBottom:16,fontSize:12}}>
            <div><strong>Date:</strong> {today}</div>
            <div><strong>Semester, AY:</strong> {SEM}, AY {AY}</div>
          </div>

          {is059 ? (
            /* ── FM-RIS-059 ── */
            <>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:16}}>
                <thead>
                  <tr style={{background:"#1A3666"}}>
                    <TH>Date</TH><TH>Client</TH><TH>Service / Fee</TH>
                    <TH>URS</TH><TH>Remarks</TH>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c,i)=>(
                    <tr key={c.id} style={{background:i%2===0?"#fff":"#F8FAFF"}}>
                      <td style={{padding:"5px 10px",whiteSpace:"nowrap",color:T.muted}}>{c.date}</td>
                      <td style={{padding:"5px 10px"}}>
                        <div style={{fontWeight:700}}>{c.name}</div>
                        <div style={{fontSize:9.5,color:T.muted}}>
                          {c.category}{c.affiliation ? ` · ${c.affiliation}` : " · (Affiliation: ISM sets)"}
                        </div>
                      </td>
                      <td style={{padding:"5px 10px"}}>
                        {c.service} ({c.hours}hr) — {peso(c.totalFee)}
                      </td>
                      <td style={{padding:"5px 10px",fontSize:10.5}}>{c.assignedURS||"—"}</td>
                      <td style={{padding:"5px 10px",fontSize:10.5,color:T.muted}}>
                        {c.remarks||"—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:"#1A3666",fontWeight:700}}>
                    <td colSpan={2} style={{padding:"7px 10px",color:"#fff"}}>TOTALS</td>
                    <td style={{padding:"7px 10px",color:T.goldL}}>{peso(fin.totalFee)}</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              </table>
              <div style={{display:"flex",gap:16,padding:"10px 14px",
                background:"#F5F8FF",borderRadius:5,marginBottom:20,fontSize:11.5}}>
                <div><strong>Gross Fees:</strong> {peso(fin.totalFee)}</div>
                <div><strong>URS Honoraria (60%):</strong> {peso(fin.totalURS)}</div>
                <div><strong>Unit Share (40%):</strong> {peso(fin.totalUnit)}</div>
              </div>
            </>
          ) : (
            /* ── FM-RIS-060 ── */
            <>
              <p style={{marginBottom:16,fontSize:12}}>
                May I request for the payment of the honoraria of the following University
                Research Statisticians (URS) for the period of{" "}
                <strong>{SEM}, AY {AY}</strong>:
              </p>
              {byURS.map((u,ui)=>(
                <div key={u.name} style={{marginBottom:14}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead>
                      <tr style={{background:"#1A3666"}}>
                        <TH>{ui+1}.</TH>
                        <TH>Name of URS</TH>
                        <TH>Client Name</TH>
                        <TH>Service / Fee</TH>
                        <TH right>Amount Due</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {u.entries.map((c,i)=>(
                        <tr key={c.id} style={{background:i%2===0?"#fff":"#F8FAFF"}}>
                          <td style={{padding:"5px 10px"}}>{i===0?`${ui+1}.`:""}</td>
                          <td style={{padding:"5px 10px",fontWeight:i===0?700:400}}>
                            {i===0?u.name:""}
                          </td>
                          <td style={{padding:"5px 10px"}}>{c.name}</td>
                          <td style={{padding:"5px 10px"}}>{c.service} — {peso(c.totalFee)}</td>
                          <td style={{padding:"5px 10px",textAlign:"right",fontWeight:700,
                            color:T.ok}}>{peso(c.ursShare)}</td>
                        </tr>
                      ))}
                      <tr style={{background:"#EEF2FA",fontWeight:700}}>
                        <td colSpan={4} style={{padding:"6px 10px",textAlign:"right",
                          color:T.navy}}>Total amount due:</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:T.navy}}>
                          {peso(u.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
              <div style={{background:T.navyD,color:"#fff",padding:"9px 16px",
                borderRadius:5,display:"flex",justifyContent:"space-between",
                fontSize:13,fontWeight:700,marginBottom:20}}>
                <span>GRAND TOTAL HONORARIA:</span>
                <span style={{color:T.goldL,fontFamily:"'Playfair Display',serif"}}>
                  {peso(fin.totalURS)}
                </span>
              </div>
            </>
          )}

          {/* Certification */}
          <div style={{fontSize:11.5,marginBottom:20,fontStyle:"italic",color:T.muted}}>
            I attest that the above-listed{is059?" records":" University Research Statisticians"}{" "}
            are accurate and complete as of {today}.
          </div>

          {/* Signature block */}
          <div style={{display:"flex",justifyContent:"space-around",marginTop:24,
            paddingTop:16,borderTop:"1px solid #ddd"}}>
            {[
              ["Prepared by:", OFFICER, "ISM Officer"],
              ["Noted by:", DIRECTOR, "RISE Center Director"],
            ].map(([role,name,title])=>(
              <div key={name} style={{textAlign:"center",minWidth:180}}>
                <div style={{color:T.muted,fontSize:10,marginBottom:24}}>{role}</div>
                <div style={{borderBottom:"1px solid #555",marginBottom:6,marginTop:2}}/>
                <div style={{fontWeight:700,fontSize:11.5}}>{name}</div>
                <div style={{fontSize:10,color:T.muted}}>{title}</div>
              </div>
            ))}
          </div>
          {!is059 && (
            <div style={{textAlign:"center",marginTop:20}}>
              <div style={{color:T.muted,fontSize:10,marginBottom:24}}>Approved for release:</div>
              <div style={{borderBottom:"1px solid #555",marginBottom:6,
                maxWidth:220,margin:"0 auto"}}/>
              <div style={{fontWeight:700,fontSize:11.5,marginTop:6}}>Vice President for Finance</div>
            </div>
          )}
          <div style={{marginTop:20,fontSize:9.5,color:T.muted,textAlign:"center",
            borderTop:"1px dashed #ccc",paddingTop:10}}>
            Generated by the ISRM Digital Operations Suite · Saint Louis University ·
            The Apps Script equivalent would convert this preview into a PDF and save to
            Google Drive › ISRM Generated Reports.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  ROOT — ISRM COMMAND CENTER
// ═══════════════════════════════════════════════════════════════════
export default function ISRMCommandCenter() {
  const [view,    setView]    = useState("dashboard");
  const [clients, setClients] = useState(SEED_CLIENTS);
  const [ursList]             = useState(SEED_URS);
  const [selClient, setSelClient] = useState(null);
  const [reportType, setReportType] = useState(null);

  const fin = useMemo(()=>{
    const paid = clients.filter(c=>c.payStatus==="Paid");
    return {
      totalFee : paid.reduce((s,c)=>s+(c.totalFee ||0),0),
      totalURS : paid.reduce((s,c)=>s+(c.ursShare ||0),0),
      totalUnit: paid.reduce((s,c)=>s+(c.unitShare||0),0),
      paid     : paid.length,
      pending  : clients.filter(c=>c.payStatus==="Pending").length,
      completed: clients.filter(c=>c.status==="Completed").length,
      active   : clients.filter(c=>c.status==="In Progress").length,
      total    : clients.length,
    };
  },[clients]);

  const TABS = [
    {id:"dashboard", label:"📊 Dashboard"},
    {id:"clients",   label:`📋 Clients (${clients.length})`},
    {id:"urs",       label:"👥 URS Registry"},
    {id:"financial", label:"💰 Financial"},
    {id:"reports",   label:"📄 Reports"},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Lato:ital,wght@0,300;0,400;0,700;1,400&display=swap');
        *{box-sizing:border-box;}
        body{margin:0;background:#EDF1F8;font-family:'Lato',sans-serif;}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:#EDF1F8;}
        ::-webkit-scrollbar-thumb{background:#B0BDCC;border-radius:3px;}
        select,input,button{font-family:'Lato',sans-serif;}
      `}</style>

      <div style={{fontFamily:"'Lato',sans-serif",minHeight:"100vh",background:"#EDF1F8"}}>

        {/* ── HEADER ── */}
        <div style={{
          background:`linear-gradient(135deg,${T.navyD} 0%,${T.navy} 55%,${T.navyM} 100%)`,
          boxShadow:"0 3px 18px rgba(10,26,60,.38)",
          padding:"14px 26px",display:"flex",alignItems:"center",gap:16,
        }}>
          <div style={{width:46,height:46,borderRadius:"50%",flexShrink:0,
            background:T.gold,display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:800,color:T.navyD,
            boxShadow:"0 2px 10px rgba(200,148,58,.4)"}}>SLU</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Playfair Display',serif",color:"#fff",
              fontSize:17,fontWeight:700,lineHeight:1.3}}>
              ISRM Officer's Command Center
            </div>
            <div style={{color:"rgba(255,255,255,.55)",fontSize:10,
              letterSpacing:".12em",textTransform:"uppercase",marginTop:2}}>
              Institutional Studies & Research Methods — RISE Center · Saint Louis University
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{color:T.goldL,fontSize:11,fontWeight:700}}>{SEM}, AY {AY}</div>
            <div style={{color:"rgba(255,255,255,.45)",fontSize:10,marginTop:3}}>
              {new Date().toLocaleDateString("en-PH",{dateStyle:"long"})}
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{background:T.navyD,display:"flex",padding:"0 26px",
          gap:2,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{
              padding:"11px 18px",background:"none",border:"none",
              color:view===t.id?T.gold:"rgba(255,255,255,.5)",
              cursor:"pointer",fontFamily:"'Lato',sans-serif",fontWeight:700,
              fontSize:10.5,letterSpacing:".1em",textTransform:"uppercase",
              whiteSpace:"nowrap",
              borderBottom:view===t.id?`3px solid ${T.gold}`:"3px solid transparent",
              transition:"color .2s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div style={{padding:"22px 26px",maxWidth:1120,margin:"0 auto"}}>
          {view==="dashboard" &&
            <DashboardView clients={clients} fin={fin}
              setView={setView} setSelectedClient={setSelClient}/>}
          {view==="clients" &&
            <ClientsView clients={clients} setClients={setClients}
              setSelectedClient={setSelClient}/>}
          {view==="urs" &&
            <URSView ursList={ursList} clients={clients}/>}
          {view==="financial" &&
            <FinancialView clients={clients} fin={fin}/>}
          {view==="reports" &&
            <ReportsView clients={clients} fin={fin} setReportType={setReportType}/>}
        </div>
      </div>

      {/* ── MODALS ── */}
      {selClient && (
        <ClientModal client={selClient} clients={clients}
          setClients={setClients} onClose={()=>setSelClient(null)}/>
      )}
      {reportType && (
        <ReportModal type={reportType} clients={clients} fin={fin}
          ursList={ursList} onClose={()=>setReportType(null)}/>
      )}
    </>
  );
}
