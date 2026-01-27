// src/lib/storage.js
export const STORAGE_KEYS = {
  WORK_ORDERS: "gmn_workorders_v1",
  TECHNIANS: "gmn_techs_v1",
  PROPOSALS: "gmn_proposals_v1",
  COSTS: "gmn_costs_v1",
  FILES: "gmn_files_v1",
};

export function safeParse(raw, fallback) {
  try {
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadWorkOrders() {
  const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.WORK_ORDERS), []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveWorkOrders(data) {
  localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(data));
}

// ... same for other entities