import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { AttendanceRecord, AttendanceStatus, EmployeeCard } from "../../shared/types";

type AttendancePageProps = {
  attendanceRecords: AttendanceRecord[];
  checkedIn: boolean;
  employeeDirectory: EmployeeCard[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setCheckedIn: React.Dispatch<React.SetStateAction<boolean>>;
};

export function AttendancePage({
  attendanceRecords,
  checkedIn,
  employeeDirectory,
  setAttendanceRecords,
  setCheckedIn,
}: AttendancePageProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "HR";
  const activeEmployeeId = currentUser?.employeeId ?? employeeDirectory[0]?.id ?? "";
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [error, setError] = useState("");

  const visibleRecords = isAdmin
    ? attendanceRecords
    : attendanceRecords.filter((record) => record.employeeId === activeEmployeeId);

  async function markAttendance(nextStatus: AttendanceStatus) {
    const statusByLabel = {
      Present: "PRESENT",
      Absent: "ABSENT",
      "Half-day": "HALF_DAY",
      Leave: "LEAVE",
    } as const;
    setError("");
    const response = await fetch("/attendance/check-in", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusByLabel[nextStatus] }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.message ?? "Could not update attendance");
      return;
    }

    const nextRecord = payload.attendance as AttendanceRecord;
    setCheckedIn(nextRecord.status === "Present" || nextRecord.status === "Half-day");
    setAttendanceRecords((records) =>
      records.some((record) => record.id === nextRecord.id)
        ? records.map((record) => (record.id === nextRecord.id ? nextRecord : record))
        : [nextRecord, ...records]
    );
  }

  return (
    <section className="wsPage dataPage">
      <div className="workspaceTitle">
        <div>
          <p>{isAdmin ? "For Admin / HR Officer" : "For Employees"}</p>
          <h1>Attendance</h1>
        </div>
        <div className="segmentedControls">
          <button
            className={view === "daily" ? "active" : ""}
            type="button"
            onClick={() => setView("daily")}
          >
            Daily
          </button>
          <button
            className={view === "weekly" ? "active" : ""}
            type="button"
            onClick={() => setView("weekly")}
          >
            Weekly
          </button>
        </div>
      </div>

      {!isAdmin ? (
        <div className="attendanceActions">
          <button type="button" onClick={() => markAttendance("Present")}>
            {checkedIn ? "Refresh Check In" : "Check In"}
          </button>
          <button type="button" onClick={() => markAttendance("Half-day")}>
            Mark Half-day
          </button>
          <button type="button" onClick={() => markAttendance("Absent")}>
            Mark Absent
          </button>
          <button type="button" onClick={() => markAttendance("Leave")}>
            Mark Leave
          </button>
        </div>
      ) : null}
      {error ? <p className="fieldError">{error}</p> : null}

      <table className="recordsTable">
        <thead>
          <tr>
            {isAdmin ? <th>Employee</th> : null}
            <th>Date</th>
            <th>Status</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Work Hours</th>
            <th>Extra Hours</th>
          </tr>
        </thead>
        <tbody>
          {visibleRecords.slice(0, view === "daily" ? 6 : 12).map((record) => (
            <tr key={record.id}>
              {isAdmin ? (
                <td>
                  {employeeDirectory.find((e) => e.id === record.employeeId)?.name ?? "Employee"}
                </td>
              ) : null}
              <td>{record.date}</td>
              <td>
                <span
                  className={`attendanceBadge ${record.status.toLowerCase().replace("-", "")}`}
                >
                  {record.status}
                </span>
              </td>
              <td>{record.checkIn}</td>
              <td>{record.checkOut}</td>
              <td>{record.workHours}</td>
              <td>{record.extraHours}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dataNote">
        Attendance records feed payroll calculations. Missing or unpaid leave days reduce payable days.
      </p>
    </section>
  );
}
