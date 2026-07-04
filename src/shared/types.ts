export type UserRole = "ADMIN" | "HR" | "EMPLOYEE";
export type AttendanceStatusEnum = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
export type LeaveType = "PAID" | "SICK" | "UNPAID";
export type LeaveStatusEnum = "PENDING" | "APPROVED" | "REJECTED";

export type SessionUser = {
  id: string;
  email: string;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  employeeId: string;
  employeeCode: string;
  name: string;
  phone?: string | null;
};

export type AppPage = "home" | "dashboard" | "profile" | "attendance" | "time-off";
export type ProfileTab = "resume" | "private" | "salary" | "security";
export type AuthMode = "signin" | "signup";
export type FieldErrors = Record<string, string>;

export type EmployeeCard = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  address: string;
  avatarUrl?: string;
  department: string;
  manager: string;
  location: string;
  status: "present" | "leave" | "absent";
  code: string;
  documents?: { id: string; name: string; type: string; fileUrl: string }[];
  leaveBalances?: { leaveType: "Paid" | "Sick" | "Unpaid"; totalDays: number; usedDays: number }[];
};

export type AttendanceStatus = "Present" | "Absent" | "Half-day" | "Leave";

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  workHours: string;
  extraHours: string;
};

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: "Paid" | "Sick" | "Unpaid";
  startDate: string;
  endDate: string;
  remarks: string;
  status: LeaveStatus;
  adminComment?: string;
};

export type PayrollStructure = {
  monthlyWage: number;
  workingDaysPerWeek: number;
  breakTimeHours: number;
  pfRate: number;
  professionalTax: number;
};

export type SignupSuccess = {
  employeeCode: string;
  verificationToken: string;
  email: string;
};

export type PendingVerification = {
  email: string;
  employeeCode?: string;
  token: string;
};
