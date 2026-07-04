import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { LandingPage } from "../components/landing/LandingPage";
import { WorkspaceShell } from "../components/workspace/WorkspaceShell";
import type {
  AppPage,
  AttendanceRecord,
  EmployeeCard,
  LeaveRequest,
  PayrollStructure,
  ProfileTab,
} from "../shared/types";

const fallbackPayroll: PayrollStructure = {
  monthlyWage: 0,
  workingDaysPerWeek: 5,
  breakTimeHours: 1,
  pfRate: 12,
  professionalTax: 200,
};

export function App() {
  const [page, setPage] = useState<AppPage>("home");
  const [profileTab, setProfileTab] = useState<ProfileTab>("resume");
  const [employeeDirectory, setEmployeeDirectory] = useState<EmployeeCard[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollByEmployee, setPayrollByEmployee] = useState<Record<string, PayrollStructure>>({});
  const [checkedIn, setCheckedIn] = useState(false);

  const setPageRef = useRef(setPage);
  setPageRef.current = setPage;

  function handlePageChange(nextPage: AppPage) {
    setPageRef.current(nextPage);
  }

  return (
    <AuthProvider onPageChange={handlePageChange}>
      <AppContent
        page={page}
        profileTab={profileTab}
        employeeDirectory={employeeDirectory}
        selectedEmployeeId={selectedEmployeeId}
        attendanceRecords={attendanceRecords}
        leaveRequests={leaveRequests}
        payrollByEmployee={payrollByEmployee}
        checkedIn={checkedIn}
        setPage={setPage}
        setProfileTab={setProfileTab}
        setEmployeeDirectory={setEmployeeDirectory}
        setSelectedEmployeeId={setSelectedEmployeeId}
        setAttendanceRecords={setAttendanceRecords}
        setLeaveRequests={setLeaveRequests}
        setPayrollByEmployee={setPayrollByEmployee}
        setCheckedIn={setCheckedIn}
      />
    </AuthProvider>
  );
}

type AppContentProps = {
  page: AppPage;
  profileTab: ProfileTab;
  employeeDirectory: EmployeeCard[];
  selectedEmployeeId: string;
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  payrollByEmployee: Record<string, PayrollStructure>;
  checkedIn: boolean;
  setPage: React.Dispatch<React.SetStateAction<AppPage>>;
  setProfileTab: React.Dispatch<React.SetStateAction<ProfileTab>>;
  setEmployeeDirectory: React.Dispatch<React.SetStateAction<EmployeeCard[]>>;
  setSelectedEmployeeId: React.Dispatch<React.SetStateAction<string>>;
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  setPayrollByEmployee: React.Dispatch<React.SetStateAction<Record<string, PayrollStructure>>>;
  setCheckedIn: React.Dispatch<React.SetStateAction<boolean>>;
};

function AppContent({
  page,
  profileTab,
  employeeDirectory,
  selectedEmployeeId,
  attendanceRecords,
  leaveRequests,
  payrollByEmployee,
  checkedIn,
  setPage,
  setProfileTab,
  setEmployeeDirectory,
  setSelectedEmployeeId,
  setAttendanceRecords,
  setLeaveRequests,
  setPayrollByEmployee,
  setCheckedIn,
}: AppContentProps) {
  const { currentUser, isLoading } = useAuth();
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "HR";
  const selectedEmployee = employeeDirectory.find((employee) => employee.id === selectedEmployeeId) ?? employeeDirectory[0];
  const ownEmployee = employeeDirectory.find((employee) => employee.id === currentUser?.employeeId) ?? employeeDirectory[0];
  const activeEmployee = isAdmin ? selectedEmployee : ownEmployee;

  useEffect(() => {
    if (!currentUser) {
      setEmployeeDirectory([]);
      setAttendanceRecords([]);
      setLeaveRequests([]);
      setPayrollByEmployee({});
      setSelectedEmployeeId("");
      return;
    }

    const sessionUser = currentUser;
    let cancelled = false;

    async function loadWorkspaceData() {
      setWorkspaceLoading(true);
      setWorkspaceError("");

      try {
        const [employeesRes, attendanceRes, leavesRes, payrollRes] = await Promise.all([
          fetch("/employees", { credentials: "include" }),
          fetch(isAdmin ? "/attendance" : "/attendance/me", { credentials: "include" }),
          fetch(isAdmin ? "/leave-requests" : "/leave-requests/me", { credentials: "include" }),
          fetch(isAdmin ? "/payroll" : "/payroll/me", { credentials: "include" }),
        ]);

        if (!employeesRes.ok || !attendanceRes.ok || !leavesRes.ok || !payrollRes.ok) {
          throw new Error("Could not load workspace data from the database");
        }

        const employeesData = await employeesRes.json();
        const attendanceData = await attendanceRes.json();
        const leavesData = await leavesRes.json();
        const payrollData = await payrollRes.json();

        if (cancelled) return;

        const loadedEmployees: EmployeeCard[] = employeesData.employees ?? [];
        setEmployeeDirectory(loadedEmployees);
        setAttendanceRecords(attendanceData.attendanceRecords ?? []);
        setLeaveRequests(leavesData.leaveRequests ?? []);
        setPayrollByEmployee(
          payrollData.payrollByEmployee ??
            { [sessionUser.employeeId]: payrollData.payroll ?? fallbackPayroll }
        );
        setSelectedEmployeeId((current) => current || loadedEmployees[0]?.id || sessionUser.employeeId);
        setCheckedIn((attendanceData.attendanceRecords ?? []).some((record: AttendanceRecord) => record.status === "Present"));
      } catch (error) {
        if (!cancelled) {
          setWorkspaceError(error instanceof Error ? error.message : "Could not load workspace data");
        }
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    }

    loadWorkspaceData();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    isAdmin,
    setAttendanceRecords,
    setEmployeeDirectory,
    setLeaveRequests,
    setPayrollByEmployee,
    setSelectedEmployeeId,
    setCheckedIn,
  ]);

  function navigate(nextPage: AppPage) {
    setPage(nextPage);
    if (nextPage === "profile") {
      setProfileTab("resume");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "#44474c" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #e2e8f0",
              borderTop: "3px solid #041627",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14 }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (currentUser && page !== "home" && (workspaceLoading || !activeEmployee || workspaceError)) {
    return (
      <div className="workspaceShell">
        <div className="wsContent">
          <section className="workspacePanel">
            <h1>{workspaceLoading ? "Loading workspace data..." : "Workspace needs attention"}</h1>
            {workspaceError ? <p className="fieldError">{workspaceError}</p> : null}
          </section>
        </div>
      </div>
    );
  }

  if (currentUser && page !== "home") {
    return (
      <WorkspaceShell
        activeEmployee={activeEmployee}
        attendanceRecords={attendanceRecords}
        checkedIn={checkedIn}
        employeeDirectory={employeeDirectory}
        leaveRequests={leaveRequests}
        page={page}
        payrollByEmployee={payrollByEmployee}
        profileTab={profileTab}
        selectedEmployeeId={selectedEmployeeId}
        setAttendanceRecords={setAttendanceRecords}
        setCheckedIn={setCheckedIn}
        setEmployeeDirectory={setEmployeeDirectory}
        setLeaveRequests={setLeaveRequests}
        setPayrollByEmployee={setPayrollByEmployee}
        setProfileTab={setProfileTab}
        setSelectedEmployeeId={setSelectedEmployeeId}
        navigate={navigate}
      />
    );
  }

  return <LandingPage navigate={navigate} />;
}
