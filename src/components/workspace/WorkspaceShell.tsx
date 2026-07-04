import { useAuth } from "../../context/AuthContext";
import { WorkspaceNav } from "./WorkspaceNav";
import { DashboardPage } from "./DashboardPage";
import { ProfilePage } from "./ProfilePage";
import { AttendancePage } from "./AttendancePage";
import { TimeOffPage } from "./TimeOffPage";
import type {
  AppPage,
  AttendanceRecord,
  EmployeeCard,
  LeaveRequest,
  PayrollStructure,
  ProfileTab,
} from "../../shared/types";

const emptyPayroll: PayrollStructure = {
  monthlyWage: 0,
  workingDaysPerWeek: 5,
  breakTimeHours: 1,
  pfRate: 12,
  professionalTax: 200,
};

type WorkspaceShellProps = {
  page: AppPage;
  activeEmployee: EmployeeCard;
  attendanceRecords: AttendanceRecord[];
  checkedIn: boolean;
  employeeDirectory: EmployeeCard[];
  leaveRequests: LeaveRequest[];
  payrollByEmployee: Record<string, PayrollStructure>;
  profileTab: ProfileTab;
  selectedEmployeeId: string;
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setCheckedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setEmployeeDirectory: React.Dispatch<React.SetStateAction<EmployeeCard[]>>;
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  setPayrollByEmployee: React.Dispatch<React.SetStateAction<Record<string, PayrollStructure>>>;
  setProfileTab: React.Dispatch<React.SetStateAction<ProfileTab>>;
  setSelectedEmployeeId: React.Dispatch<React.SetStateAction<string>>;
  navigate: (page: AppPage) => void;
};

export function WorkspaceShell({
  page,
  activeEmployee,
  attendanceRecords,
  checkedIn,
  employeeDirectory,
  leaveRequests,
  payrollByEmployee,
  profileTab,
  selectedEmployeeId,
  setAttendanceRecords,
  setCheckedIn,
  setEmployeeDirectory,
  setLeaveRequests,
  setPayrollByEmployee,
  setProfileTab,
  setSelectedEmployeeId,
  navigate,
}: WorkspaceShellProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "HR";

  return (
    <div className="workspaceShell">
      <WorkspaceNav page={page} navigate={navigate} />
      <div className="wsContent">
        {page === "dashboard" ? (
          <DashboardPage
            attendanceRecords={attendanceRecords}
            checkedIn={checkedIn}
            employeeDirectory={employeeDirectory}
            leaveRequests={leaveRequests}
            selectedEmployeeId={selectedEmployeeId}
            setAttendanceRecords={setAttendanceRecords}
            setCheckedIn={setCheckedIn}
            setEmployeeDirectory={setEmployeeDirectory}
            setSelectedEmployeeId={setSelectedEmployeeId}
            navigate={navigate}
          />
        ) : null}

        {page === "profile" ? (
          <ProfilePage
            activeEmployee={activeEmployee}
            isAdmin={isAdmin}
            payroll={payrollByEmployee[activeEmployee.id] ?? emptyPayroll}
            profileTab={profileTab}
            setEmployeeDirectory={setEmployeeDirectory}
            setPayrollByEmployee={setPayrollByEmployee}
            setProfileTab={setProfileTab}
          />
        ) : null}

        {page === "attendance" ? (
          <AttendancePage
            attendanceRecords={attendanceRecords}
            checkedIn={checkedIn}
            employeeDirectory={employeeDirectory}
            setAttendanceRecords={setAttendanceRecords}
            setCheckedIn={setCheckedIn}
          />
        ) : null}

        {page === "time-off" ? (
          <TimeOffPage
            activeEmployee={activeEmployee}
            attendanceRecords={attendanceRecords}
            employeeDirectory={employeeDirectory}
            leaveRequests={leaveRequests}
            setAttendanceRecords={setAttendanceRecords}
            setEmployeeDirectory={setEmployeeDirectory}
            setLeaveRequests={setLeaveRequests}
          />
        ) : null}
      </div>
    </div>
  );
}
