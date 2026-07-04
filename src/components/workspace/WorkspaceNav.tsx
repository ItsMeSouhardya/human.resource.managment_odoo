import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { AppPage } from "../../shared/types";
import logoUrl from "../../assets/logo.png";

type WorkspaceNavProps = {
  page: AppPage;
  navigate: (page: AppPage) => void;
};

export function WorkspaceNav({ page, navigate }: WorkspaceNavProps) {
  const { currentUser, logout } = useAuth();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  function handleNavigate(nextPage: AppPage) {
    navigate(nextPage);
    setAvatarMenuOpen(false);
  }

  return (
    <header className="workspaceNav">
      <button className="wsNavBrand" type="button" onClick={() => handleNavigate("dashboard")}>
        <img src={logoUrl} alt="" />
        Odooo HR
      </button>
      <nav aria-label="Workspace navigation">
        <button
          className={page === "dashboard" ? "active" : ""}
          type="button"
          onClick={() => handleNavigate("dashboard")}
        >
          Employees
        </button>
        <button
          className={page === "attendance" ? "active" : ""}
          type="button"
          onClick={() => handleNavigate("attendance")}
        >
          Attendance
        </button>
        <button
          className={page === "time-off" ? "active" : ""}
          type="button"
          onClick={() => handleNavigate("time-off")}
        >
          Time Off
        </button>
      </nav>
      <div className="wsNavAvatarWrap">
        <button
          className="wsNavAvatarBtn"
          type="button"
          onClick={() => setAvatarMenuOpen((open) => !open)}
          aria-label="Open profile menu"
        >
          <span>{currentUser?.name.slice(0, 1).toUpperCase() ?? "U"}</span>
        </button>
        {avatarMenuOpen ? (
          <div className="wsNavDropdown">
            <button type="button" onClick={() => handleNavigate("profile")}>
              My Profile
            </button>
            <button type="button" onClick={logout}>
              Log Out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
