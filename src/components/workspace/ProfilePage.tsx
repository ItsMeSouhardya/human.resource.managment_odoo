import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { EditInput } from "../shared";
import { ResumeTab } from "./profile/ResumeTab";
import { PrivateInfoTab } from "./profile/PrivateInfoTab";
import { SalaryInfoTab } from "./profile/SalaryInfoTab";
import { SecurityTab } from "./profile/SecurityTab";
import type { EmployeeCard, PayrollStructure, ProfileTab } from "../../shared/types";

type ProfilePageProps = {
  activeEmployee: EmployeeCard;
  isAdmin: boolean;
  payroll: PayrollStructure;
  profileTab: ProfileTab;
  setEmployeeDirectory: React.Dispatch<React.SetStateAction<EmployeeCard[]>>;
  setPayrollByEmployee: React.Dispatch<React.SetStateAction<Record<string, PayrollStructure>>>;
  setProfileTab: React.Dispatch<React.SetStateAction<ProfileTab>>;
};

export function ProfilePage({
  activeEmployee,
  isAdmin,
  payroll,
  profileTab,
  setEmployeeDirectory,
  setPayrollByEmployee,
  setProfileTab,
}: ProfilePageProps) {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(activeEmployee);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(activeEmployee);
    setIsEditing(false);
    setError("");
  }, [activeEmployee]);

  // For non-admin users viewing their own profile, overlay SessionUser data
  const displayName = !isAdmin && currentUser ? currentUser.name : activeEmployee.name;
  const displayEmail = !isAdmin && currentUser ? currentUser.email : activeEmployee.email;
  const displayPhone = !isAdmin && currentUser ? (currentUser.phone ?? "Not provided") : activeEmployee.phone;
  const displayRole = !isAdmin && currentUser ? currentUser.role : activeEmployee.role;
  const displayCode = !isAdmin && currentUser ? currentUser.employeeCode : activeEmployee.code;
  const companyCode = !isAdmin && currentUser ? currentUser.employeeCode : activeEmployee.code;
  const companyName = companyCode?.startsWith("OI") ? "Odooo HR" : "Your Organisation";

  async function saveProfile() {
    const allowedUpdate = isAdmin
      ? draft
      : { ...activeEmployee, phone: draft.phone, address: draft.address, avatarUrl: draft.avatarUrl };

    setError("");
    const response = await fetch(`/employees/${activeEmployee.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allowedUpdate),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.message ?? "Could not save profile");
      return;
    }

    setEmployeeDirectory((directory) =>
      directory.map((employee) => (employee.id === activeEmployee.id ? payload.employee : employee))
    );
    setDraft(payload.employee);
    setIsEditing(false);
  }

  const visibleTabs: ProfileTab[] = ["resume", "private", "salary", "security"];

  return (
    <section className="wsPage profilePage">
      <div className="workspaceTitle">
        <div>
          <p>{isEditing ? "Edit Profile" : "View Profile"}</p>
          <h1>My Profile</h1>
        </div>
        <div className="profileActions">
          {isEditing ? (
            <>
              <button type="button" onClick={saveProfile}>Save</button>
              <button type="button" onClick={() => { setDraft(activeEmployee); setIsEditing(false); }}>Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)}>Edit Profile</button>
          )}
        </div>
      </div>
      {error ? <p className="fieldError">{error}</p> : null}

      <div className="profileHeader">
        <button className="profilePhoto" type="button" title="Edit profile picture">
          {activeEmployee.avatarUrl ? (
            <img src={activeEmployee.avatarUrl} alt={`${displayName} profile`} />
          ) : (
            <Pencil size={28} />
          )}
        </button>

        <div className="profileIdentity">
          {isEditing && isAdmin ? (
            <EditInput value={draft.name} onChange={(value) => setDraft((c) => ({ ...c, name: value }))} />
          ) : (
            <h2>{displayName}</h2>
          )}
          {isEditing && isAdmin ? (
            <EditInput value={draft.role} onChange={(value) => setDraft((c) => ({ ...c, role: value }))} />
          ) : (
            <span>{displayRole}</span>
          )}
          {isEditing && isAdmin ? (
            <EditInput value={draft.email} onChange={(value) => setDraft((c) => ({ ...c, email: value }))} />
          ) : (
            <span>{displayEmail}</span>
          )}
          {isEditing ? (
            <EditInput value={draft.phone} onChange={(value) => setDraft((c) => ({ ...c, phone: value }))} />
          ) : (
            <span>{displayPhone}</span>
          )}
          {isEditing ? (
            <EditInput
              value={draft.avatarUrl ?? ""}
              placeholder="Profile picture URL"
              onChange={(value) => setDraft((c) => ({ ...c, avatarUrl: value }))}
            />
          ) : null}
        </div>

        <div className="profileMeta">
          <span>Company</span>
          <strong>{companyName}</strong>
          <span>Department</span>
          {isEditing && isAdmin ? (
            <EditInput value={draft.department} onChange={(value) => setDraft((c) => ({ ...c, department: value }))} />
          ) : (
            <strong>{activeEmployee.department}</strong>
          )}
          <span>Manager</span>
          {isEditing && isAdmin ? (
            <EditInput value={draft.manager} onChange={(value) => setDraft((c) => ({ ...c, manager: value }))} />
          ) : (
            <strong>{activeEmployee.manager}</strong>
          )}
          <span>Location</span>
          {isEditing && isAdmin ? (
            <EditInput value={draft.location} onChange={(value) => setDraft((c) => ({ ...c, location: value }))} />
          ) : (
            <strong>{activeEmployee.location}</strong>
          )}
          <span>Address</span>
          {isEditing ? (
            <EditInput value={draft.address} onChange={(value) => setDraft((c) => ({ ...c, address: value }))} />
          ) : (
            <strong>{activeEmployee.address}</strong>
          )}
        </div>
      </div>

      <div className="profileTabs" role="tablist" aria-label="Profile sections">
        {visibleTabs.map((tab) => (
          <button
            className={profileTab === tab ? "active" : ""}
            key={tab}
            type="button"
            onClick={() => setProfileTab(tab)}
          >
            {tab === "resume" ? "Resume" : tab === "private" ? "Private Info" : tab === "salary" ? "Salary Info" : "Security"}
          </button>
        ))}
      </div>

      {profileTab === "resume" ? <ResumeTab documents={activeEmployee.documents} /> : null}
      {profileTab === "private" ? (
        <PrivateInfoTab employeeCode={displayCode} activeEmployee={activeEmployee} />
      ) : null}
      {profileTab === "salary" ? (
        <SalaryInfoTab
          employeeId={activeEmployee.id}
          isAdmin={isAdmin}
          payroll={payroll}
          setPayrollByEmployee={setPayrollByEmployee}
        />
      ) : null}
      {profileTab === "security" ? <SecurityTab /> : null}
    </section>
  );
}
