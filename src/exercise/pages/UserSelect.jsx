// src/pages/UserSelect.jsx
import React, { useState } from "react";
import "../styles/Dashboard.css";
import Sidebar from "../components/sidebar.jsx";

const UserCard = ({ user, isSelected, onStart, onDetail }) => {
  return (
    <div className={`card user-card ${isSelected ? "user-card-selected" : ""}`}>
      <div className="user-card-top">
        <div className="avatar-wrapper">
          <div className="avatar-circle">{user.name.charAt(0)}</div>
          {isSelected && <div className="avatar-check">✓</div>}
        </div>
        <div className="user-main">
          <div className="user-name">{user.name}</div>
          <div className="user-level">{user.level}</div>
        </div>
      </div>

      <div className="user-stats-row">
        <div className="user-stat-block">
          <div className="user-stat-label">총 세션</div>
          <div className="user-stat-value">{user.sessions}</div>
          <div className="user-stat-sub">{user.totalHours}h 운동시간</div>
        </div>
        <div className="user-stat-block">
          <div className="user-stat-label">운동 정확도</div>
          <div className="user-stat-value user-stat-highlight">
            {user.accuracy.toFixed(1)}%
          </div>
          <div className="user-stat-sub">{user.lastExercise} 마지막 운동</div>
        </div>
      </div>

      <div className="user-card-actions">
        <button
          className="primary-pill-button"
          onClick={() => onStart(user.id)}  // ⬅ 여기서 시작 핸들러 호출
        >
          ▶ 운동 시작
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => onDetail(user)}
        >
          상세 보기
        </button>
      </div>
    </div>
  );
};

const AddUserCard = ({ onClick }) => (
  <div className="card add-user-card" onClick={onClick}>
    <div className="add-user-plus">+</div>
    <div className="add-user-title">새 사용자 추가</div>
    <div className="add-user-desc">
      새로운 사용자를 등록하여 운동을 시작해보세요
    </div>
  </div>
);

const UserSelect = ({ currentPage, onChangePage, onStartExercise, users }) => {
  // const [users, setUsers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState("모든 레벨");
  const [sortOrder, setSortOrder] = useState("최근 활동순");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [detailUser, setDetailUser] = useState(null);
  const pageSize = 6;
  const getLastExerciseDays = (lastExercise) => {
    if (lastExercise === "오늘") return 0;
    return Number.parseInt(lastExercise, 10) || Number.MAX_SAFE_INTEGER;
  };

  // useEffect(() => {
  //   // 나중에 API 호출로 교체
  //   setUsers(mockUsers);
  //   if (mockUsers.length > 0) {
  //     setSelectedUserId(mockUsers[0].id);
  //   }
  // }, []);

  const filteredUsers = users
    .filter((user) =>
      user.name.toLowerCase().includes(searchKeyword.toLowerCase())
    )
    .filter(
      (user) => selectedLevel === "모든 레벨" || user.level === selectedLevel
    )
    .sort((a, b) => {
      if (sortOrder === "이름순") {
        return a.name.localeCompare(b.name, "ko");
      }
      if (sortOrder === "정확도 높은 순") {
        return b.accuracy - a.accuracy;
      }
      return (
        getLastExerciseDays(a.lastExercise) -
        getLastExerciseDays(b.lastExercise)
      );
    });
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPageNumber, pageCount);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const visibleUsers = filteredUsers.slice(pageStart, pageStart + pageSize);

  const goRegister = () => {
    onChangePage && onChangePage("userRegister");
  };

  const handleStart = (userId) => {
    setSelectedUserId(userId);               // 목록에서 선택 표시
    if (onStartExercise) onStartExercise(userId); // App에 알려서 page="select"로
  };

  return (
    <div className="dashboard">
      <Sidebar currentPage={currentPage} onChangePage={onChangePage} />

      <main className="main">
        {/* 상단 헤더 */}
        <header className="header">
          <div>
            <h1 className="page-title">사용자 선택</h1>
            <p className="page-subtitle">
              운동을 시작할 사용자를 선택하세요
            </p>
          </div>

          <div className="user-header-right">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="사용자 검색..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPageNumber(1);
                }}
              />
            </div>
            <button
              className="green-button"
              type="button"
              onClick={goRegister}
            >
              + 새 사용자 추가
            </button>
          </div>
        </header>

        {/* 필터 / 정렬 툴바 */}
        <section className="user-toolbar">
          <div className="toolbar-left">
            <select
              className="filter-select"
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setCurrentPageNumber(1);
              }}
            >
              <option>모든 레벨</option>
              <option>초급자</option>
              <option>중급자</option>
              <option>고급자</option>
            </select>
            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPageNumber(1);
              }}
            >
              <option>최근 활동순</option>
              <option>이름순</option>
              <option>정확도 높은 순</option>
            </select>
            <div className="toolbar-count">
              총 <strong>{filteredUsers.length}</strong>명
            </div>
          </div>

          <div className="toolbar-right">
            <button
              className={`view-toggle ${viewMode === "grid" ? "active" : ""}`}
              type="button"
              aria-label="카드 보기"
              onClick={() => setViewMode("grid")}
            >
              ▦
            </button>
            <button
              className={`view-toggle ${viewMode === "list" ? "active" : ""}`}
              type="button"
              aria-label="목록 보기"
              onClick={() => setViewMode("list")}
            >
              ☰
            </button>
          </div>
        </section>

        {/* 사용자 카드 그리드 */}
        <section className={`user-grid ${viewMode === "list" ? "list" : ""}`}>
          {visibleUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isSelected={user.id === selectedUserId}
              onStart={handleStart}
              onDetail={setDetailUser}
            />
          ))}
          <AddUserCard onClick={goRegister} />
        </section>

        {/* 하단 정보 + 페이지네이션 */}
        <div className="user-footer">
          <div className="user-footer-text">
            {filteredUsers.length === 0
              ? "표시할 사용자가 없습니다"
              : `${filteredUsers.length}명 중 ${pageStart + 1}–${Math.min(
                  pageStart + pageSize,
                  filteredUsers.length
                )}명 표시`}
          </div>
          <div className="pagination">
            <button
              className="page-button"
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() =>
                setCurrentPageNumber((page) => Math.max(1, page - 1))
              }
            >
              &lt;
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  className={`page-button ${
                    page === safeCurrentPage ? "active" : ""
                  }`}
                  type="button"
                  onClick={() => setCurrentPageNumber(page)}
                >
                  {page}
                </button>
              )
            )}
            <button
              className="page-button"
              type="button"
              disabled={safeCurrentPage === pageCount}
              onClick={() =>
                setCurrentPageNumber((page) => Math.min(pageCount, page + 1))
              }
            >
              &gt;
            </button>
          </div>
        </div>

        {detailUser && (
          <div
            className="user-detail-backdrop"
            role="presentation"
            onClick={() => setDetailUser(null)}
          >
            <section
              className="card user-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-detail-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="user-detail-header">
                <h2 id="user-detail-title">{detailUser.name} 상세 정보</h2>
                <button
                  className="user-detail-close"
                  type="button"
                  aria-label="상세 정보 닫기"
                  onClick={() => setDetailUser(null)}
                >
                  ×
                </button>
              </div>
              <dl className="user-detail-list">
                <div>
                  <dt>운동 레벨</dt>
                  <dd>{detailUser.level}</dd>
                </div>
                <div>
                  <dt>총 세션</dt>
                  <dd>{detailUser.sessions}회</dd>
                </div>
                <div>
                  <dt>총 운동 시간</dt>
                  <dd>{detailUser.totalHours}시간</dd>
                </div>
                <div>
                  <dt>운동 정확도</dt>
                  <dd>{detailUser.accuracy.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt>마지막 운동</dt>
                  <dd>{detailUser.lastExercise}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserSelect;
