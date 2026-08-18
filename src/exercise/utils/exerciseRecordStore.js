const LOCAL_STORAGE_KEY = "routine-care.exercise-records";

function getApiUrl() {
  return (import.meta.env.VITE_EXERCISE_RECORD_API_URL || "").trim();
}

export function isExerciseRecordApiConfigured() {
  return Boolean(getApiUrl());
}

function createRecord(record) {
  const createdAt = new Date().toISOString();
  const id = window.crypto?.randomUUID?.() || `exercise-${Date.now()}`;
  return { id, created_at: createdAt, ...record };
}

function saveToLocalStorage(record) {
  let current = [];
  try {
    current = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  } catch {
    current = [];
  }
  const records = Array.isArray(current) ? current : [];
  records.push(record);
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  return record;
}

export async function saveExerciseRecord(record) {
  const payload = createRecord(record);
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    return { mode: "local", data: saveToLocalStorage(payload) };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : payload;
  return { mode: "api", data };
}

export { LOCAL_STORAGE_KEY };
