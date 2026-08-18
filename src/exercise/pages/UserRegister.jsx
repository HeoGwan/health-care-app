// src/pages/UserRegister.jsx
import React, { useState } from "react";
import "../styles/Dashboard.css";
import Sidebar from "../components/sidebar.jsx";

const UserRegister = ({ currentPage = "userSelect", onChangePage, addUser }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    age: "25",
    gender: "",
    level: "",
    height: "170",
    weight: "70",
    mainGoal: "",
    weeklyTarget: "",
    tags: [],
    healthNote: "",
    hasChronic: false,
    hasMedicine: false,
  });

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const toggleTag = (tag) => () => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const updateCheckbox = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.checked }));
  };

  const goBackToList = () => {
    onChangePage && onChangePage("userSelect");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("새 사용자 등록 데이터:", form);
    // alert("임시: 콘솔에서 전송 데이터 확인하세요.");
    alert('사용자 등록 완료');
    addUser(form);
    goBackToList();
  };

  return (
    <div className="dashboard">
      <Sidebar
        currentPage={currentPage}
        onChangePage={onChangePage}
      />

      <main className="main">
        {/* 상단 헤더 + 브레드크럼 */}
        <header className="header register-header">
          <div>
            <div className="breadcrumb">
              <button
                type="button"
                className="breadcrumb-link"
                onClick={goBackToList}
              >
                사용자 목록으로
              </button>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">새 사용자 등록</span>
            </div>
            <h1 className="page-title">새 사용자 등록</h1>
            <p className="page-subtitle">
              운동 분석을 위한 새로운 사용자를 등록해주세요
            </p>
          </div>
        </header>

        <form className="card user-form" onSubmit={handleSubmit}>
          {/* 섹션 1: 기본 정보 */}
          <section className="user-form-section">
            <div className="user-form-section-header">
              <div className="section-icon blue">👤</div>
              <div>
                <div className="section-title">기본 정보</div>
                <div className="section-desc">
                  사용자의 기본 정보를 입력해주세요
                </div>
              </div>
            </div>

            <div className="user-form-body">
              <div className="avatar-upload">
                <div className="avatar-upload-circle">
                  <span className="camera-icon">📷</span>
                </div>
                <div className="avatar-upload-text">
                  프로필 사진을 추가해주세요
                  <span className="avatar-upload-sub">
                    JPG, PNG 형식 (최대 5MB)
                  </span>
                </div>
                <button
                  type="button"
                  className="avatar-upload-button"
                >
                  +
                </button>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>
                    이름 <span className="required-dot">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="사용자 이름을 입력하세요"
                    value={form.name}
                    onChange={updateField("name")}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>이메일</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={updateField("email")}
                  />
                </div>

                <div className="form-field">
                  <label>나이</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={updateField("age")}
                  />
                </div>
                <div className="form-field">
                  <label>성별</label>
                  <select
                    value={form.gender}
                    onChange={updateField("gender")}
                  >
                    <option value="">선택하세요</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                    <option value="other">기타</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>운동 레벨</label>
                  <select
                    value={form.level}
                    onChange={updateField("level")}
                  >
                    <option value="">선택하세요</option>
                    <option value="beginner">초급자</option>
                    <option value="intermediate">중급자</option>
                    <option value="advanced">고급자</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>키 (cm)</label>
                  <input
                    type="number"
                    value={form.height}
                    onChange={updateField("height")}
                  />
                </div>

                <div className="form-field">
                  <label>몸무게 (kg)</label>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={updateField("weight")}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 섹션 2: 운동 목표 */}
          <section className="user-form-section">
            <div className="user-form-section-header">
              <div className="section-icon green">🎯</div>
              <div>
                <div className="section-title">운동 목표</div>
                <div className="section-desc">
                  사용자의 운동 목표를 설정해주세요
                </div>
              </div>
            </div>

            <div className="user-form-body">
              <div className="form-grid-2">
                <div className="form-field">
                  <label>주요 운동 목표</label>
                  <select
                    value={form.mainGoal}
                    onChange={updateField("mainGoal")}
                  >
                    <option value="">선택하세요</option>
                    <option value="diet">체중 감량</option>
                    <option value="muscle">근력/근육 증가</option>
                    <option value="health">건강 관리</option>
                    <option value="posture">자세 교정</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>주간 운동 목표 (회)</label>
                  <select
                    value={form.weeklyTarget}
                    onChange={updateField("weeklyTarget")}
                  >
                    <option value="">선택하세요</option>
                    <option value="1-2">1–2회</option>
                    <option value="3-4">3–4회</option>
                    <option value="5+">5회 이상</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>관심 운동 종류</label>
                <div className="checkbox-group">
                  {[
                    "요가",
                    "필라테스",
                    "유산소",
                    "근력 운동",
                    "스트레칭",
                    "댄스",
                    "무술",
                    "기타",
                  ].map((tag) => (
                    <label
                      key={tag}
                      className={`checkbox-pill ${
                        form.tags.includes(tag) ? "checked" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.tags.includes(tag)}
                        onChange={toggleTag(tag)}
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 섹션 3: 건강 정보 */}
          <section className="user-form-section">
            <div className="user-form-section-header">
              <div className="section-icon purple">💊</div>
              <div>
                <div className="section-title">건강 정보</div>
                <div className="section-desc">
                  운동 안전을 위한 건강 정보를 입력해주세요 (선택사항)
                </div>
              </div>
            </div>

            <div className="user-form-body">
              <div className="form-field">
                <label>운동 시 주의해야 할 사항이나 과거 부상 이력</label>
                <textarea
                  rows={3}
                  placeholder="예: 무릎 부상 이력, 허리 통증, 심장 질환 등"
                  value={form.healthNote}
                  onChange={updateField("healthNote")}
                />
              </div>

              <div className="checkbox-row">
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.hasChronic}
                    onChange={updateCheckbox("hasChronic")}
                  />
                  <span>만성 질환이 있습니다</span>
                </label>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.hasMedicine}
                    onChange={updateCheckbox("hasMedicine")}
                  />
                  <span>현재 복용 중인 약물이 있습니다</span>
                </label>
              </div>
            </div>
          </section>

          {/* 하단 버튼 */}
          <div className="form-footer">
            <div className="form-required-text">
              <span className="required-dot">*</span> 표시된 항목은 필수 입력
              사항입니다.
            </div>
            <div className="form-footer-buttons">
              <button
                type="button"
                className="form-button ghost"
                onClick={goBackToList}
              >
                취소
              </button>
              <button
                type="button"
                className="form-button outline"
                onClick={() => alert("미리보기는 아직 더미입니다.")}
              >
                미리보기
              </button>
              <button type="submit" className="form-button primary">
                사용자 등록
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default UserRegister;
