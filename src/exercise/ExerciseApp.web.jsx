import React, { useEffect, useState } from "react";

// FitTracker 레이아웃 페이지
import Dashboard from "./pages/Dashboard";
import UserSelect from "./pages/UserSelect";

// 기존 운동 코치 플로우 페이지
import ExerciseSelect from "./pages/ExerciseSelect";
import LiveSession from "./pages/LiveSession";
import ResultSummary from "./pages/ResultSummary";
import UserRegister from "./pages/UserRegister";
import { DEFAULT_EXERCISE } from "./exercises";

const PAGE_ROUTES = Object.freeze({
  dashboard: "/exercise/home",
  userSelect: "/exercise/users",
  userRegister: "/exercise/register",
  select: "/exercise/select",
  session: "/exercise/session",
  result: "/exercise/result",
});

const ROUTE_PAGES = Object.freeze(
  Object.fromEntries(Object.entries(PAGE_ROUTES).map(([page, route]) => [route, page])),
);

function getPageFromLocation() {
  if (typeof window === "undefined") return "dashboard";
  return ROUTE_PAGES[window.location.pathname] || "dashboard";
}

function getRouteHref(path) {
  if (typeof window === "undefined") return path;
  return `${path}${window.location.search}${window.location.hash}`;
}

export default function App() {
  // page 값:
  // "dashboard" | "userSelect" | "select" | "session" | "result"
  // 초기 화면을 ExerciseSelect로 하고 싶으면 "select"로 바꾸면 됨
  const [page, setPage] = useState(getPageFromLocation);

  const [users, setUsers] = useState([
    {
      id: 1,
      name: "김민지",
      level: "초급자",
      sessions: 23,
      accuracy: 89.2,
      totalHours: 12,
      lastExercise: "1일 전",
    },
    {
      id: 2,
      name: "박준호",
      level: "중급자",
      sessions: 47,
      accuracy: 92.1,
      totalHours: 28,
      lastExercise: "2일 전",
    },
    {
      id: 3,
      name: "이수정",
      level: "중급자",
      sessions: 78,
      accuracy: 95.7,
      totalHours: 45,
      lastExercise: "오늘",
    },
    {
      id: 4,
      name: "최동현",
      level: "초급자",
      sessions: 12,
      accuracy: 84.3,
      totalHours: 8,
      lastExercise: "5일 전",
    },
    {
      id: 5,
      name: "정유진",
      level: "중급자",
      sessions: 35,
      accuracy: 90.8,
      totalHours: 22,
      lastExercise: "3일 전",
    },
    {
      id: 6,
      name: "윤성민",
      level: "고급자",
      sessions: 62,
      accuracy: 93.4,
      totalHours: 38,
      lastExercise: "1일 전",
    },
    {
      id: 7,
      name: "한소영",
      level: "초급자",
      sessions: 8,
      accuracy: 81.7,
      totalHours: 5,
      lastExercise: "7일 전",
    },
  ])

  const [selectedExercise, setSelectedExercise] = useState(DEFAULT_EXERCISE);

  const [metrics, setMetrics] = useState({
    repeat: 0,
    success: 0,
    fail: 0,
    accuracy: 0,
  });

  useEffect(() => {
    if (page !== "session") return;
    // 세션 중 실시간 metric 업데이트 필요하면 여기서 setInterval 사용
    // cleanup 잊지 말고:
    // const id = setInterval(...);
    // return () => clearInterval(id);
  }, [page]);

  useEffect(() => {
    const handlePopState = () => setPage(getPageFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const expectedPath = PAGE_ROUTES[page] || PAGE_ROUTES.dashboard;
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState({ exercisePage: page }, "", getRouteHref(expectedPath));
    }
    window.scrollTo(0, 0);
  }, [page]);

  const navigateTo = (nextPage) => {
    const nextPath = PAGE_ROUTES[nextPage] || PAGE_ROUTES.dashboard;
    window.history.pushState({ exercisePage: nextPage }, "", getRouteHref(nextPath));
    setPage(nextPage);
  };

  const startSession = (exercise = selectedExercise) => {
    setSelectedExercise(exercise || DEFAULT_EXERCISE);
    navigateTo("session");
  };

  const finishSession = async () => {
    let calculatedScore = 0;

    // UserPose 에서 window.getExerciseScore 를 등록해 둔 경우
    if (typeof window.getExerciseScore === "function") {
      try {
        calculatedScore = await window.getExerciseScore();
      } catch (error) {
        console.error("점수 계산 중 에러 발생:", error);
      }
    }

    setMetrics((prev) => ({
      ...prev,
      accuracy: calculatedScore,
      // 반복/성공/실패 카운트 로직 추가되면 여기서 같이 업데이트
      repeat: prev.repeat,
      success: prev.success,
      fail: prev.fail,
    }));

    navigateTo("result");
  };

  const resetApp = () => {
    // 결과 화면에서 돌아갈 때 어디로 갈지
    // Exercise 선택 화면으로
    navigateTo("select");
  };

  // Sidebar가 부르는 페이지 변경 핸들러
  const handleChangePage = (nextPage) => {
    // "dashboard", "userSelect", 필요하면 "select" 등 전달 가능
    navigateTo(nextPage);
  };

  const addUser = (user) => {
    setUsers(prev => [
      ...prev,
      {
        id: prev.length + 1,
        name: user.name,
        level: user.level,
        sessions: 0,
        accuracy: 0,
        totalHours: 0,
        lastExercise: "0일 전",
      }
    ])
  }

  /* -------------------------
   *  FitTracker 대시보드 계열
   * ------------------------- */

  // if (page === "dashboard") {
  //   return (
  //     <Dashboard
  //       currentPage="dashboard"
  //       onChangePage={handleChangePage}
  //     />
  //   );
  // }

  // if (page === "userSelect") {
  //   return (
  //     <UserSelect
  //       currentPage="userSelect"
  //       onChangePage={handleChangePage}
  //     />
  //   );
  // }

  /* -------------------------
   *  AI 운동 코치 플로우
   * ------------------------- */

  return (
    <div className="exercise-root min-h-screen bg-[#ffffff] text-gray-900">
      <header className="exercise-header">
        <div className="exercise-header__inner">
          <span className="exercise-header__mark">
            ☘︎
          </span>
          <span className="exercise-header__title">AI 운동 코치</span>
        </div>
      </header>

      {page === "dashboard" && (
        <Dashboard
          currentPage="dashboard"
          onChangePage={handleChangePage}
        />
      )}

      {page === "userSelect" && (
        <UserSelect
          currentPage="userSelect"
          onChangePage={handleChangePage}
          onStartExercise={() => navigateTo("select")}
          users={users}
        />
      )}

      {page === "userRegister" && (
        <UserRegister
          currentPage="userRegister"
          onChangePage={handleChangePage}
          addUser={addUser}
        />
      )}

      {page === "select" && (
        <ExerciseSelect
          selected={selectedExercise}
          onSelect={setSelectedExercise}
          onStart={startSession}
        />
      )}

      {page === "session" && (
        <LiveSession
          selected={selectedExercise}
          metrics={metrics}
          onFinish={finishSession}
        />
      )}

      {page === "result" && (
        <ResultSummary
          metrics={metrics}
          selectedExercise={selectedExercise}
          onBack={resetApp}
        />
      )}
    </div>
  );
}
