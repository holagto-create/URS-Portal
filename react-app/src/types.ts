export interface Client {
  row: number;
  'Record ID': string;
  Date: string;
  'Client Name': string;
  'ID Number': string;
  'Contact No.': string;
  Email: string;
  'Department/School': string;
  'Research Title': string;
  'Funding Source': string;
  Category: string;
  Affiliation: string;
  'Service Type': string;
  Hours: number;
  'Total Fee (₱)': number;
  'OR Number': string;
  'Payment Date': string;
  'Payment Status': string;
  'Assigned URS': string;
  'URS Share 60% (₱)': number;
  'Unit Share 40% (₱)': number;
  Semester: string;
  AY: string;
  Status: string;
  Remarks: string;
}

export interface URS {
  'URS ID': string;
  'Full Name': string;
  Department: string;
  'Highest Degree': string;
  Specialization: string;
  Email: string;
  'Contact No.': string;
  'Available Days/Hours': string;
  Status: string;
  'AY Appointed': string;
}

export interface FinancialSummary {
  grossFees: number;
  ursHonoraria: number;
  unitShare: number;
  paidCount: number;
  pendingCount: number;
  completedCount: number;
  inProgressCount: number;
  newCount: number;
  totalCount: number;
}

export interface DashboardData {
  clients: Client[];
  urs: URS[];
  financial: FinancialSummary;
  config: {
    ursPct: number;
    unitPct: number;
    ay: string;
    sem: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
}
