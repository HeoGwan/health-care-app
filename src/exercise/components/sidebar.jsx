// src/components/sidebar.jsx
import React from "react";

const Sidebar = ({ currentPage, onChangePage }) => {
  const go = (page) => () => {
    if (onChangePage) onChangePage(page);
  };

  const isDashboard = currentPage === "dashboard";
  const isUserSelect = currentPage === "userSelect";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-circle">F</div>
        <div className="logo-text">
          <div className="logo-title">FitTracker</div>
          <div className="logo-sub">AI 운동 분석</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* 대시보드 */}
        <div
          className={`nav-item ${isDashboard ? "active" : ""}`}
          onClick={go("dashboard")}
        >
          <span
            className={`nav-indicator${
              isDashboard ? "" : " secondary"
            }`}
          />
          <span>대시보드</span>
        </div>

        {/* 사용자 선택 */}
        <div
          className={`nav-item ${isUserSelect ? "active" : ""}`}
          onClick={go("userSelect")}
        >
          <span
            className={`nav-indicator${
              isUserSelect ? "" : " secondary"
            }`}
          />
          <span>사용자 선택</span>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
