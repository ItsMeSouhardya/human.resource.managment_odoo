import { useMemo, useState } from "react";
import { Search, Clock3, CalendarDays, LogOut, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { SummaryCard, StatusLegend } from "../shared";
import type { AppPage, AttendanceRecord, EmployeeCard, LeaveRequest } from "../../shared/types";

type DashboardPageProps = {
  employeeDirectory: EmployeeCard[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  checkedIn: boolean;
  selectedEmployeeId: string;
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setCheckedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setEmployeeDirectory: React.Dispatch<React.SetStateAction<EmployeeCard[]>>;
  setSelectedEmployeeId: React.Dispatch<React.SetStateAction<string>>;
  navigate: (page: AppPage) => void;
};

function statusIcon(status: EmployeeCard["status"]) {
  return status === "present" ? "green" : status === "leave" ? "blue" : "yellow";
}

export function DashboardPage({
  employeeDirectory,
  attendanceRecords,
  leaveRequests,
  checkedIn,
  selectedEmployeeId,
  setAttendanceRecords,
  setCheckedIn,
  setEmployeeDirectory,
  setSelectedEmployeeId,
  navigate,
}: DashboardPageProps) {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "HR";
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "Engineering",
    role: "Employee",
    address: "",
    systemRole: "EMPLOYEE",
  });

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employeeDirectory;
    return employeeDirectory.filter((employee) =>
      [employee.name, employee.email, employee.role, employee.department, employee.code]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [employeeDirectory, search]);

  async function markOwnAttendance(checkOut = false) {
    setError("");
    const response = await fetch(checkOut ? "/attendance/check-out" : "/attendance/check-in", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PRESENT" }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.message ?? "Could not update attendance");
      return;
    }

    const nextRecord = payload.attendance as AttendanceRecord;
    setCheckedIn(!checkOut);
    setAttendanceRecords((records) =>
      records.some((record) => record.id === nextRecord.id)
        ? records.map((record) => (record.id === nextRecord.id ? nextRecord : record))
        : [nextRecord, ...records]
    );
  }

  async function createEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setGeneratedPassword("");
    const response = await fetch("/employees", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.message ?? "Could not create employee");
      return;
    }

    setEmployeeDirectory((directory) => [payload.employee, ...directory]);
    setSelectedEmployeeId(payload.employee.id);
    setGeneratedPassword(payload.generatedPassword);
    setCreateForm({
      fullName: "",
      email: "",
      phone: "",
      department: "Engineering",
      role: "Employee",
      address: "",
      systemRole: "EMPLOYEE",
    });
  }

  if (!isAdmin) {
    return (
      <section className="wsPage employeeDashboard">
        <div className="workspaceTitle">
          <div>
            <p>Employee Dashboard</p>
            <h1>Quick access</h1>
          </div>
          <StatusLegend />
        </div>
        <div className="quickCards">
          <button type="button" onClick={() => navigate("profile")}>
            <UserRound />
            <span>Profile</span>
          </button>
          <button type="button" onClick={() => navigate("attendance")}>
            <Clock3 />
            <span>Attendance</span>
          </button>
          <button type="button" onClick={() => navigate("time-off")}>
            <CalendarDays />
            <span>Leave Requests</span>
          </button>
          <button type="button" onClick={logout}>
            <LogOut />
            <span>Logout</span>
          </button>
        </div>
        <div className="activityBox">
          <h2>Recent Activity &amp; Alerts</h2>
          <p>Attendance check-in is pending for today.</p>
          <p>Sick leave balance is available in Time Off.</p>
          <p>Payroll visibility for July is ready.</p>
        </div>
      </section>
    );
  }

  const presentCount = attendanceRecords.filter((record) => record.status === "Present").length;
  const pendingLeaves = leaveRequests.filter((request) => request.status === "Pending").length;

  return (
    <section className="wsPage adminDashboard">
      <div className="dashboardToolbar">
        <button className="newButton" type="button" onClick={() => setShowCreate((open) => !open)}>
          NEW
        </button>
        <label className="searchBox">
          <Search size={16} />
          <input placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

      {showCreate ? (
        <form className="leaveModal employeeCreateForm" onSubmit={createEmployee}>
          <h2>Create Employee</h2>
          <label>
            Name
            <input value={createForm.fullName} onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))} required />
          </label>
          <label>
            Email
            <input type="email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} required />
          </label>
          <label>
            Phone
            <input value={createForm.phone} onChange={(event) => setCreateForm((current) => ({ ...current, phone: event.target.value }))} required />
          </label>
          <label>
            Department
            <input value={createForm.department} onChange={(event) => setCreateForm((current) => ({ ...current, department: event.target.value }))} required />
          </label>
          <label>
            Job Role
            <input value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))} required />
          </label>
          <label>
            System Access
            <select value={createForm.systemRole} onChange={(event) => setCreateForm((current) => ({ ...current, systemRole: event.target.value }))}>
              <option value="EMPLOYEE">Employee</option>
              <option value="HR">HR Officer</option>
            </select>
          </label>
          <label>
            Address
            <input value={createForm.address} onChange={(event) => setCreateForm((current) => ({ ...current, address: event.target.value }))} />
          </label>
          <div className="approvalButtons">
            <button type="submit">Create</button>
            <button type="button" onClick={() => setShowCreate(false)}>
              Close
            </button>
          </div>
          {generatedPassword ? <p className="toast">Generated first password: {generatedPassword}</p> : null}
        </form>
      ) : null}
      {error ? <p className="fieldError">{error}</p> : null}

      <div className="employeeGrid">
        {filteredEmployees.map((employee) => (
          <button
            className={selectedEmployeeId === employee.id ? "employeeTile selected" : "employeeTile"}
            key={employee.id}
            type="button"
            onClick={() => {
              setSelectedEmployeeId(employee.id);
              navigate("profile");
            }}
          >
            <span className={`statusDot ${statusIcon(employee.status)}`} />
            <span className="employeeAvatar">
              <UserRound size={30} />
            </span>
            <strong>{employee.name}</strong>
            <small>{employee.role}</small>
          </button>
        ))}
      </div>

      <aside className="attendanceWidget">
        <button type="button" onClick={() => markOwnAttendance(false)}>
          Check IN →
        </button>
        <div className={checkedIn ? "successDot active" : "successDot"} />
        <span>{checkedIn ? "Checked in for today" : "Waiting for check-in"}</span>
        <button type="button" onClick={() => markOwnAttendance(true)}>
          Check Out →
        </button>
      </aside>

      <div className="adminSummaryGrid">
        <SummaryCard title="Employee list" value={`${employeeDirectory.length} active`} />
        <SummaryCard title="Attendance records" value={`${presentCount} present`} />
        <SummaryCard title="Leave approvals" value={`${pendingLeaves} pending`} />
      </div>

      <StatusLegend />
    </section>
  );
}
