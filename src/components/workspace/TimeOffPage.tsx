import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type {
  AttendanceRecord,
  EmployeeCard,
  LeaveRequest,
  LeaveStatus,
} from "../../shared/types";

type TimeOffPageProps = {
  activeEmployee: EmployeeCard;
  attendanceRecords: AttendanceRecord[];
  employeeDirectory: EmployeeCard[];
  leaveRequests: LeaveRequest[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setEmployeeDirectory: React.Dispatch<React.SetStateAction<EmployeeCard[]>>;
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
};

export function TimeOffPage({
  activeEmployee,
  attendanceRecords,
  employeeDirectory,
  leaveRequests,
  setAttendanceRecords,
  setEmployeeDirectory,
  setLeaveRequests,
}: TimeOffPageProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "HR";
  const [showApply, setShowApply] = useState(false);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Paid" as LeaveRequest["leaveType"],
    startDate: "2026-07-13",
    endDate: "2026-07-14",
    remarks: "",
  });

  const visibleRequests = isAdmin
    ? leaveRequests
    : leaveRequests.filter((request) => request.employeeId === activeEmployee.id);
  const balanceByType = Object.fromEntries(
    (activeEmployee.leaveBalances ?? []).map((balance) => [
      balance.leaveType,
      Math.max(balance.totalDays - balance.usedDays, 0),
    ])
  );

  const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

  async function applyLeave() {
    setError("");
    const response = await fetch("/leave-requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leaveForm),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.message ?? "Could not submit leave request");
      return;
    }

    setLeaveRequests((records) => [payload.leaveRequest, ...records]);
    setShowApply(false);
  }

  async function reviewLeave(request: LeaveRequest, status: LeaveStatus) {
    setError("");
    const response = await fetch(`/leave-requests/${request.id}/${status === "Approved" ? "approve" : "reject"}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: commentDraft[request.id] }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.message ?? "Could not review leave request");
      return;
    }

    const reviewedRequest = payload.leaveRequest as LeaveRequest;
    setLeaveRequests((records) =>
      records.map((record) =>
        record.id === request.id ? reviewedRequest : record
      )
    );
    if (status === "Approved") {
      setAttendanceRecords((records) => [
        {
          id: `att-leave-${Date.now()}`,
          employeeId: request.employeeId,
          date: request.startDate,
          status: "Leave",
          checkIn: "-",
          checkOut: "-",
          workHours: "00:00",
          extraHours: "00:00",
        },
        ...records,
      ]);
      setEmployeeDirectory((directory) =>
        directory.map((employee) =>
          employee.id === request.employeeId
            ? { ...employee, status: "leave" }
            : employee
        )
      );
    }
  }

  return (
    <section className="wsPage dataPage">
      <div className="workspaceTitle">
        <div>
          <p>{isAdmin ? "Reject & Approve buttons" : "For Employees View"}</p>
          <h1>Time Off</h1>
        </div>
        {!isAdmin ? (
          <button type="button" onClick={() => setShowApply((open) => !open)}>
            Apply
          </button>
        ) : (
          <button type="button">NEW</button>
        )}
      </div>

      {!isAdmin ? (
        <div className="calendarPanel">
          <div className="leaveBalances">
            <strong>
              Paid time Off <span>{balanceByType.Paid ?? 0} Days Available</span>
            </strong>
            <strong>
              Sick time off <span>{balanceByType.Sick ?? 0} Days Available</span>
            </strong>
            <strong>
              Unpaid Leaves <span>{balanceByType.Unpaid ?? 0} Days Available</span>
            </strong>
          </div>
          <div className="monthCalendar" aria-label="Monthly attendance calendar">
            {monthDays.map((day) => {
              const dayDate = `2026-07-${String(day).padStart(2, "0")}`;
              const attendance = attendanceRecords.find(
                (record) =>
                  record.employeeId === activeEmployee.id && record.date === dayDate
              );
              return (
                <button
                  className={
                    attendance?.status === "Present"
                      ? "present"
                      : attendance?.status === "Absent"
                      ? "absent"
                      : attendance?.status === "Leave"
                      ? "leave"
                      : ""
                  }
                  type="button"
                  key={day}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {showApply ? (
        <div className="leaveModal">
          <h2>Time Off Type Request</h2>
          <label>
            Time off Type
            <select
              value={leaveForm.leaveType}
              onChange={(event) =>
                setLeaveForm((current) => ({
                  ...current,
                  leaveType: event.target.value as LeaveRequest["leaveType"],
                }))
              }
            >
              <option>Paid</option>
              <option>Sick</option>
              <option>Unpaid</option>
            </select>
          </label>
          <label>
            Start Date
            <input
              type="date"
              value={leaveForm.startDate}
              onChange={(event) =>
                setLeaveForm((current) => ({ ...current, startDate: event.target.value }))
              }
            />
          </label>
          <label>
            End Date
            <input
              type="date"
              value={leaveForm.endDate}
              onChange={(event) =>
                setLeaveForm((current) => ({ ...current, endDate: event.target.value }))
              }
            />
          </label>
          <label>
            Remarks
            <textarea
              value={leaveForm.remarks}
              onChange={(event) =>
                setLeaveForm((current) => ({ ...current, remarks: event.target.value }))
              }
            />
          </label>
          <div className="approvalButtons">
            <button type="button" onClick={applyLeave}>
              Submit
            </button>
            <button type="button" onClick={() => setShowApply(false)}>
              Discard
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="fieldError">{error}</p> : null}

      <table className="recordsTable">
        <thead>
          <tr>
            {isAdmin ? <th>Employee</th> : null}
            <th>Time Off Type</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Remarks</th>
            <th>Status</th>
            {isAdmin ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {visibleRequests.map((request) => (
            <tr key={request.id}>
              {isAdmin ? (
                <td>
                  {employeeDirectory.find((e) => e.id === request.employeeId)?.name ??
                    request.employeeName}
                </td>
              ) : null}
              <td>{request.leaveType} time off</td>
              <td>{request.startDate}</td>
              <td>{request.endDate}</td>
              <td>{request.remarks || request.adminComment || "-"}</td>
              <td>
                <span className={`leaveStatus ${request.status.toLowerCase()}`}>
                  {request.status}
                </span>
              </td>
              {isAdmin ? (
                <td>
                  <input
                    className="commentInput"
                    placeholder="Add comment"
                    value={commentDraft[request.id] ?? ""}
                    onChange={(event) =>
                      setCommentDraft((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="approvalButtons">
                    <button type="button" onClick={() => reviewLeave(request, "Approved")}>
                      Approve
                    </button>
                    <button type="button" onClick={() => reviewLeave(request, "Rejected")}>
                      Reject
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
