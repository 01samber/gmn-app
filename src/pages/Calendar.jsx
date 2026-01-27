import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import PageTransition from "../components/PageTransition";
import Modal from "../components/Modal";

const WO_STORAGE_KEY = "gmn_workorders_v1";
const EVENTS_STORAGE_KEY = "gmn_calendar_events";

/* ---------------- utils ---------------- */
function safeParseJSON(raw, fallback) {
  try {
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function loadWorkOrders() {
  const parsed = safeParseJSON(localStorage.getItem(WO_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveWorkOrders(list) {
  localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(list));
}

function sanitizeText(v, maxLen = 240) {
  return String(v ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatDateOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function formatTimeOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function minutesDiff(a, b) {
  // a - b in minutes
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((da - db) / 60000);
}

function statusNormalize(s) {
  const v = String(s || "").toLowerCase().trim();
  if (v === "pending") return "pending";
  if (v === "in_progress" || v === "in progress") return "in_progress";
  if (v === "completed") return "completed";
  return v || "pending";
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function localToISO(datetimeLocal) {
  if (!datetimeLocal || !datetimeLocal.trim()) return "";
  const d = new Date(datetimeLocal);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function isoToLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Expected WO fields (best-effort):
 * - id, wo, client, trade, status
 * - technicianName (optional)
 * - etaAt (ISO string)  <-- this page will set it
 * - notes (optional)
 */

function Badge({ tone = "slate", children, title }) {
  const tones = {
    slate:
      "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800",
    amber:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40",
    brand:
      "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-600/15 dark:text-brand-100 dark:ring-brand-600/30",
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900/40",
    rose:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/25 dark:text-rose-200 dark:ring-rose-900/40",
    violet:
      "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-200 dark:ring-violet-900/40",
  };

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap",
        tones[tone] || tones.slate,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Section({ title, right, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="text-sm font-bold">{title}</div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ---------------- main ---------------- */
export default function Calendar() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh on focus (useful when you update WOs elsewhere)
  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Refresh when localStorage changes (other tabs)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === WO_STORAGE_KEY || e.key === EVENTS_STORAGE_KEY) setRefreshKey((k) => k + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [q, setQ] = useState("");
  const [openEta, setOpenEta] = useState(false);
  const [openAddEvent, setOpenAddEvent] = useState(false);
  const [openEditEvent, setOpenEditEvent] = useState(false);
  const [editingWo, setEditingWo] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const workOrders = useMemo(() => {
    const list = loadWorkOrders().map((w) => ({
      ...w,
      status: statusNormalize(w.status),
    }));
    return list;
  }, [refreshKey]);

  const now = useMemo(() => new Date(), [refreshKey]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return workOrders;

    return workOrders.filter((w) => {
      const blob = [
        w.wo,
        w.client,
        w.trade,
        w.status,
        w.technicianName,
        w.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(text);
    });
  }, [workOrders, q]);

  const active = useMemo(() => {
    return filtered.filter((w) => w.status !== "completed");
  }, [filtered]);

  const pending = useMemo(() => {
    return active.filter((w) => w.status === "pending");
  }, [active]);

  const inProgress = useMemo(() => {
    return active.filter((w) => w.status === "in_progress");
  }, [active]);

  const withEta = useMemo(() => {
    return active
      .filter((w) => w.etaAt)
      .filter((w) => !Number.isNaN(new Date(w.etaAt).getTime()));
  }, [active]);

  const overdue = useMemo(() => {
    const nowIso = now.toISOString();
    return withEta
      .filter((w) => minutesDiff(w.etaAt, nowIso) < 0)
      .sort((a, b) => new Date(a.etaAt) - new Date(b.etaAt));
  }, [withEta, now]);

  const dueToday = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return withEta
      .filter((w) => {
        const t = new Date(w.etaAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      })
      .sort((a, b) => new Date(a.etaAt) - new Date(b.etaAt));
  }, [withEta, now]);

  const upcoming = useMemo(() => {
    const nowIso = now.toISOString();
    return withEta
      .filter((w) => minutesDiff(w.etaAt, nowIso) >= 0)
      .sort((a, b) => new Date(a.etaAt) - new Date(b.etaAt));
  }, [withEta, now]);

  // Events state
  const [events, setEvents] = useState(() => {
    const stored = safeParseJSON(localStorage.getItem(EVENTS_STORAGE_KEY), []);
    return Array.isArray(stored) ? stored : [];
  });

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  // Combine WOs and events for a unified calendar view
  const calendarItems = useMemo(() => {
    const woItems = workOrders
      .filter(w => w.etaAt)
      .map(w => ({
        id: w.id,
        type: 'workorder',
        title: w.wo || `WO: ${w.client || 'Untitled'}`,
        description: `${w.client || ''} • ${w.trade || ''} • ${w.technicianName || 'No tech'}`,
        dateTime: w.etaAt,
        status: w.status,
        color: w.status === 'completed' ? 'emerald' : 
               w.status === 'in_progress' ? 'brand' : 
               'amber',
        priority: w.priority || 'medium',
        rawData: w
      }));

    const eventItems = events.map(e => ({
      id: e.id,
      type: 'event',
      title: e.title,
      description: e.description || '',
      dateTime: e.dateTime,
      color: e.color || 'violet',
      priority: e.priority || 'medium',
      rawData: e
    }));

    return [...woItems, ...eventItems].sort((a, b) => 
      new Date(a.dateTime) - new Date(b.dateTime)
    );
  }, [workOrders, events]);

  // Today's calendar items (WOs + Events)
  const todayCalendar = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return calendarItems.filter(item => {
      const t = new Date(item.dateTime).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  }, [calendarItems, now]);

  // Upcoming calendar items
  const upcomingCalendar = useMemo(() => {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    return calendarItems.filter(item => {
      const t = new Date(item.dateTime).getTime();
      return t >= tomorrow.getTime() && t <= nextWeek.getTime();
    });
  }, [calendarItems, now]);

  const stats = useMemo(() => {
    const total = workOrders.length;
    const open = workOrders.filter((w) => w.status !== "completed").length;
    const pendingCount = workOrders.filter((w) => w.status === "pending").length;
    const inProgCount = workOrders.filter((w) => w.status === "in_progress").length;
    const eventsCount = events.length;
    const todayCount = todayCalendar.length;
    const overdueCount = overdue.length;
    
    return { total, open, pendingCount, inProgCount, eventsCount, todayCount, overdueCount };
  }, [workOrders, events, todayCalendar, overdue]);

  // Work Order functions
  function upsertWO(patch) {
    const id = patch?.id;
    if (!id) return;

    const next = workOrders.map((w) =>
      w.id === id
        ? {
            ...w,
            ...patch,
            notes: sanitizeText(patch.notes ?? w.notes, 600),
            etaAt: patch.etaAt ?? w.etaAt ?? "",
            updatedAt: new Date().toISOString(),
          }
        : w
    );

    saveWorkOrders(next);
    setRefreshKey((k) => k + 1);
  }

  function updateWOStatus(id, status) {
    upsertWO({ id, status: statusNormalize(status) });
  }

  // Event functions
  function addEvent(eventData) {
    const newEvent = {
      id: generateId(),
      ...eventData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  }

  function updateEvent(id, updates) {
    setEvents(prev => prev.map(e => 
      e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
    ));
  }

  function deleteEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  // Modal openers
  function openEtaModal(wo) {
    setEditingWo(wo);
    setOpenEta(true);
  }

  function openAddEventModal() {
    setOpenAddEvent(true);
  }

  function openEditEventModal(event) {
    setEditingEvent(event);
    setOpenEditEvent(true);
  }

  // Quick actions
  function markAsCompleted(wo) {
    if (window.confirm(`Mark WO ${wo.wo || wo.id} as completed?`)) {
      updateWOStatus(wo.id, 'completed');
    }
  }

  function markAsInProgress(wo) {
    if (window.confirm(`Mark WO ${wo.wo || wo.id} as in progress?`)) {
      updateWOStatus(wo.id, 'in_progress');
    }
  }

  function clearEta(wo) {
    if (window.confirm(`Clear ETA for WO ${wo.wo || wo.id}?`)) {
      upsertWO({ id: wo.id, etaAt: '' });
    }
  }

  function viewDetails(wo) {
    alert(`WO Details:\n\n` +
          `WO#: ${wo.wo || 'N/A'}\n` +
          `Client: ${wo.client || 'N/A'}\n` +
          `Trade: ${wo.trade || 'N/A'}\n` +
          `Status: ${wo.status || 'N/A'}\n` +
          `Technician: ${wo.technicianName || 'N/A'}\n` +
          `ETA: ${wo.etaAt ? formatWhen(wo.etaAt) : 'Not set'}\n` +
          `Notes: ${wo.notes || 'None'}`);
  }

  function quickReschedule(wo, hoursToAdd) {
    const newDate = new Date();
    newDate.setHours(newDate.getHours() + hoursToAdd);
    const etaAt = newDate.toISOString();
    
    if (window.confirm(`Reschedule to ${formatWhen(etaAt)}?`)) {
      upsertWO({ id: wo.id, etaAt });
    }
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Calendar"
          subtitle="To-do view for Work Orders: Pending, In Progress, ETAs, and Overdue."
          actions={
            <>
              <button
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 ui-hover ui-focus tap-feedback dark:bg-slate-800 dark:text-slate-200"
                onClick={() => {
                  // Refresh button
                  setRefreshKey(k => k + 1);
                  alert("Calendar refreshed!");
                }}
              >
                ↻ Refresh
              </button>
              <button
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white ui-hover ui-focus tap-feedback"
                onClick={openAddEventModal}
              >
                + Add Event
              </button>
            </>
          }
        />

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Total WOs: <span className="ml-1 tabular-nums">{stats.total}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Open: <span className="ml-1 tabular-nums">{stats.open}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            Pending: <span className="ml-1 tabular-nums">{stats.pendingCount}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-600/30 dark:bg-brand-600/15 dark:text-brand-100">
            In Progress: <span className="ml-1 tabular-nums">{stats.inProgCount}</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
            Events: <span className="ml-1 tabular-nums">{stats.eventsCount}</span>
          </span>
          {stats.overdueCount > 0 ? (
            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/25 dark:text-rose-200">
              Overdue: <span className="ml-1 tabular-nums">{stats.overdueCount}</span>
            </span>
          ) : null}
        </div>

        {/* Search and Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ui-hover">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-9">
              <input
                className="input"
                placeholder="Search WO#, client, trade, status, technician, or event…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <span className="font-semibold">Showing</span>
              <span className="tabular-nums">{filtered.length}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setQ('')}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear search
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
            <button
              onClick={() => {
                const overdueOnly = workOrders.filter(w => 
                  w.etaAt && minutesDiff(w.etaAt, now.toISOString()) < 0
                );
                alert(`Found ${overdueOnly.length} overdue WOs`);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400"
            >
              Find all overdue
            </button>
          </div>
        </div>

        {/* TODAY'S CALENDAR */}
        <Section
          title="Today's Schedule"
          right={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {stats.todayCount} items
              </span>
              {stats.todayCount > 0 && (
                <button
                  onClick={() => {
                    const times = todayCalendar.map(item => 
                      `${formatTimeOnly(item.dateTime)} - ${item.title}`
                    ).join('\n');
                    alert(`Today's schedule:\n\n${times}`);
                  }}
                  className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400"
                >
                  View timeline
                </button>
              )}
            </div>
          }
        >
          {todayCalendar.length ? (
            <div className="space-y-2">
              {todayCalendar.map((item) => (
                <CalendarCard
                  key={item.id}
                  item={item}
                  now={now}
                  onEdit={() => {
                    if (item.type === 'workorder') {
                      openEtaModal(item.rawData);
                    } else {
                      openEditEventModal(item.rawData);
                    }
                  }}
                  onDelete={() => {
                    if (item.type === 'event') {
                      deleteEvent(item.id);
                    }
                  }}
                  onQuickAction={(action) => {
                    if (item.type === 'workorder') {
                      const wo = item.rawData;
                      switch(action) {
                        case 'complete': markAsCompleted(wo); break;
                        case 'inprogress': markAsInProgress(wo); break;
                        case 'clear': clearEta(wo); break;
                        case 'details': viewDetails(wo); break;
                        case 'reschedule1h': quickReschedule(wo, 1); break;
                        case 'reschedule4h': quickReschedule(wo, 4); break;
                      }
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Nothing scheduled for today.
            </div>
          )}
        </Section>

        {/* OVERDUE */}
        <Section
          title="Overdue ETAs"
          right={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {overdue.length} items
              </span>
              {overdue.length > 0 && (
                <button
                  onClick={() => {
                    // Mass reschedule overdue items to today EOD
                    if (window.confirm(`Reschedule all ${overdue.length} overdue items to today end of day?`)) {
                      const eod = new Date(now);
                      eod.setHours(23, 59, 0, 0);
                      overdue.forEach(wo => {
                        upsertWO({ id: wo.id, etaAt: eod.toISOString() });
                      });
                      alert(`Rescheduled ${overdue.length} items to EOD`);
                    }
                  }}
                  className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400"
                >
                  Reschedule all
                </button>
              )}
            </div>
          }
        >
          {overdue.length ? (
            <div className="space-y-2">
              {overdue.map((w) => (
                <WOCard 
                  key={w.id} 
                  wo={w} 
                  now={now} 
                  onEta={() => openEtaModal(w)}
                  onComplete={() => markAsCompleted(w)}
                  onDetails={() => viewDetails(w)}
                  onQuickReschedule={(hours) => quickReschedule(w, hours)}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              None. Keep it that way.
            </div>
          )}
        </Section>

        {/* TODAY (WOs only) */}
        <Section
          title="Today's Work Orders"
          right={
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {dueToday.length} items
            </span>
          }
        >
          {dueToday.length ? (
            <div className="space-y-2">
              {dueToday.map((w) => (
                <WOCard 
                  key={w.id} 
                  wo={w} 
                  now={now} 
                  onEta={() => openEtaModal(w)}
                  onComplete={() => markAsCompleted(w)}
                  onDetails={() => viewDetails(w)}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              No ETAs scheduled for today.
            </div>
          )}
        </Section>

        {/* PENDING + IN PROGRESS */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Section
            title="Pending (To Assign / Schedule)"
            right={
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {pending.length} items
              </span>
            }
          >
            {pending.length ? (
              <div className="space-y-2">
                {pending.map((w) => (
                  <WOCard 
                    key={w.id} 
                    wo={w} 
                    now={now} 
                    onEta={() => openEtaModal(w)}
                    onComplete={() => markAsCompleted(w)}
                    onInProgress={() => markAsInProgress(w)}
                    onDetails={() => viewDetails(w)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                No pending WOs.
              </div>
            )}
          </Section>

          <Section
            title="In Progress (Track ETA)"
            right={
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {inProgress.length} items
              </span>
            }
          >
            {inProgress.length ? (
              <div className="space-y-2">
                {inProgress.map((w) => (
                  <WOCard 
                    key={w.id} 
                    wo={w} 
                    now={now} 
                    onEta={() => openEtaModal(w)}
                    onComplete={() => markAsCompleted(w)}
                    onDetails={() => viewDetails(w)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                No WOs in progress.
              </div>
            )}
          </Section>
        </div>

        {/* UPCOMING CALENDAR */}
        <Section
          title="Upcoming (This Week)"
          right={
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {upcomingCalendar.length} items
            </span>
          }
        >
          {upcomingCalendar.length ? (
            <div className="space-y-2">
              {upcomingCalendar.map((item) => (
                <CalendarCard
                  key={item.id}
                  item={item}
                  now={now}
                  onEdit={() => {
                    if (item.type === 'workorder') {
                      openEtaModal(item.rawData);
                    } else {
                      openEditEventModal(item.rawData);
                    }
                  }}
                  onDelete={() => {
                    if (item.type === 'event') {
                      deleteEvent(item.id);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              No upcoming items scheduled.
            </div>
          )}
        </Section>

        {/* UPCOMING (WOs only) */}
        <Section
          title="Upcoming Work Orders"
          right={
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {upcoming.length} items
            </span>
          }
        >
          {upcoming.length ? (
            <div className="space-y-2">
              {upcoming.slice(0, 10).map((w) => (
                <WOCard 
                  key={w.id} 
                  wo={w} 
                  now={now} 
                  onEta={() => openEtaModal(w)}
                  onComplete={() => markAsCompleted(w)}
                  onDetails={() => viewDetails(w)}
                />
              ))}
              {upcoming.length > 10 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Showing 10 of {upcoming.length}. <button 
                    onClick={() => alert(`Total upcoming: ${upcoming.length}`)}
                    className="text-brand-600 hover:text-brand-800 dark:text-brand-400"
                  >
                    View all
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              No upcoming ETAs set.
            </div>
          )}
        </Section>

        {/* Modals */}
        <EtaModal
          open={openEta}
          onClose={() => {
            setOpenEta(false);
            setEditingWo(null);
          }}
          wo={editingWo}
          onSave={(patch) => {
            upsertWO(patch);
            setOpenEta(false);
            setEditingWo(null);
          }}
        />

        <AddEventModal
          open={openAddEvent}
          onClose={() => setOpenAddEvent(false)}
          onSave={(eventData) => {
            addEvent(eventData);
            setOpenAddEvent(false);
          }}
        />

        <EditEventModal
          open={openEditEvent}
          onClose={() => {
            setOpenEditEvent(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          onSave={(id, updates) => {
            updateEvent(id, updates);
            setOpenEditEvent(false);
            setEditingEvent(null);
          }}
          onDelete={(id) => {
            if (window.confirm("Delete this event?")) {
              deleteEvent(id);
              setOpenEditEvent(false);
              setEditingEvent(null);
            }
          }}
        />
      </div>
    </PageTransition>
  );
}

/* ---------------- components ---------------- */
function WOCard({ wo, now, onEta, onComplete, onInProgress, onDetails, onQuickReschedule }) {
  const status = statusNormalize(wo.status);

  const etaTitle = wo.etaAt ? `ETA: ${formatWhen(wo.etaAt)}` : "No ETA set";

  let etaTone = "slate";
  let etaText = "ETA: —";

  if (wo.etaAt) {
    const diff = minutesDiff(wo.etaAt, now.toISOString());
    if (diff != null) {
      if (diff < 0) {
        etaTone = "rose";
        etaText = `Overdue by ${Math.abs(diff)}m`;
      } else if (diff <= 60) {
        etaTone = "amber";
        etaText = `Due in ${diff}m`;
      } else {
        etaTone = "brand";
        etaText = `In ${Math.round(diff / 60)}h`;
      }
    } else {
      etaText = `ETA: ${formatWhen(wo.etaAt)}`;
    }
  }

  const statusBadge =
    status === "pending" ? (
      <Badge tone="amber">Pending</Badge>
    ) : status === "in_progress" ? (
      <Badge tone="brand">In Progress</Badge>
    ) : status === "completed" ? (
      <Badge tone="emerald">Completed</Badge>
    ) : (
      <Badge>{wo.status || "—"}</Badge>
    );

  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        "ui-hover",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onDetails && onDetails()}
              className="font-bold hover:text-brand-600 dark:hover:text-brand-400"
              title="View details"
            >
              {wo.wo || "WO"}
            </button>
            {statusBadge}
            <Badge tone={etaTone} title={etaTitle}>
              {etaText}
            </Badge>
          </div>

          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200 truncate">
            {wo.client || "—"}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {wo.trade || "—"} • Tech: {wo.technicianName || "—"}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <button 
              className="btn-ghost px-2 py-1 text-xs"
              onClick={onEta}
              title="Set ETA"
            >
              ⏱️
            </button>
            {onComplete && (
              <button 
                className="btn-ghost px-2 py-1 text-xs text-emerald-600"
                onClick={onComplete}
                title="Mark as completed"
              >
                ✓
              </button>
            )}
            {onInProgress && (
              <button 
                className="btn-ghost px-2 py-1 text-xs text-brand-600"
                onClick={onInProgress}
                title="Mark as in progress"
              >
                →
              </button>
            )}
          </div>
          {onQuickReschedule && (
            <div className="flex gap-1">
              <button
                onClick={() => onQuickReschedule(1)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                title="Reschedule +1 hour"
              >
                +1h
              </button>
              <button
                onClick={() => onQuickReschedule(4)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                title="Reschedule +4 hours"
              >
                +4h
              </button>
            </div>
          )}
        </div>
      </div>

      {wo.notes ? (
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Notes:</span> {wo.notes}
        </div>
      ) : null}
    </div>
  );
}

// Calendar Card component for unified display
function CalendarCard({ item, now, onEdit, onDelete, onQuickAction }) {
  const isEvent = item.type === 'event';
  const diff = minutesDiff(item.dateTime, now.toISOString());
  
  let timeBadge = null;
  if (diff != null) {
    if (diff < 0) {
      timeBadge = <Badge tone="rose">Past</Badge>;
    } else if (diff <= 60) {
      timeBadge = <Badge tone="amber">Soon</Badge>;
    } else if (diff <= 120) {
      timeBadge = <Badge tone="brand">In {Math.round(diff / 60)}h</Badge>;
    } else {
      timeBadge = <Badge tone="slate">{formatDateOnly(item.dateTime)}</Badge>;
    }
  }

  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        "ui-hover",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={item.color}>
              {isEvent ? "📅 Event" : "🔧 Work Order"}
            </Badge>
            {item.priority === 'high' && (
              <Badge tone="rose">High Priority</Badge>
            )}
            {timeBadge}
          </div>

          <div className="mt-2 font-bold text-slate-800 dark:text-slate-100">
            {item.title}
          </div>
          
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {item.description}
          </div>
          
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            ⏰ {formatWhen(item.dateTime)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            {onEdit && (
              <button 
                className="btn-ghost px-2 py-1 text-xs"
                onClick={onEdit}
                title="Edit"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                className="btn-ghost px-2 py-1 text-xs text-rose-600"
                onClick={() => {
                  if (window.confirm(`Delete "${item.title}"?`)) {
                    onDelete();
                  }
                }}
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
          
          {!isEvent && onQuickAction && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onQuickAction('complete')}
                className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200"
                title="Mark as completed"
              >
                Complete
              </button>
              <button
                onClick={() => onQuickAction('details')}
                className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                title="View details"
              >
                Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EtaModal({ open, onClose, wo, onSave }) {
  const [etaLocal, setEtaLocal] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) return;
    setEtaLocal(wo?.etaAt ? isoToLocal(wo.etaAt) : "");
    setNotes(wo?.notes || "");
    setStatus(wo?.status || "pending");
  }, [open, wo]);

  if (!wo) return null;

  return (
    <Modal
      open={open}
      title="Edit Work Order"
      subtitle={`${wo.wo || "WO"} • ${wo.client || "—"} • ${wo.trade || "—"}`}
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Status
          </div>
          <div className="mt-1">
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            ETA (date & time)
          </div>
          <div className="mt-1">
            <input
              type="datetime-local"
              className="input"
              value={etaLocal}
              onChange={(e) => setEtaLocal(e.target.value)}
            />
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Leave empty to clear ETA.
          </div>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Notes (ops)
          </div>
          <div className="mt-1">
            <textarea
              rows={3}
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, contact, urgency, tech constraints…"
            />
          </div>
        </label>

        <div className="flex items-center justify-between gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5">
            Cancel
          </button>

          <div className="flex gap-2">
            <button
              className="btn-ghost px-4 py-2.5 text-rose-600"
              onClick={() => {
                if (window.confirm("Clear ETA for this work order?")) {
                  onSave({
                    id: wo.id,
                    etaAt: "",
                    notes: sanitizeText(notes, 600),
                    status: statusNormalize(status),
                  });
                }
              }}
            >
              Clear ETA
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                const etaAt = localToISO(etaLocal);
                onSave({
                  id: wo.id,
                  etaAt,
                  notes: sanitizeText(notes, 600),
                  status: statusNormalize(status),
                });
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Add Event Modal
function AddEventModal({ open, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const [priority, setPriority] = useState("medium");
  const [color, setColor] = useState("violet");

  useEffect(() => {
    if (!open) return;
    // Set default date/time to next hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    
    const pad = (n) => String(n).padStart(2, "0");
    const defaultDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    setDateTimeLocal(defaultDateTime);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setColor("violet");
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("Please enter an event title");
      return;
    }

    if (!dateTimeLocal.trim()) {
      alert("Please select a date and time");
      return;
    }

    const eventData = {
      title: sanitizeText(title, 100),
      description: sanitizeText(description, 500),
      dateTime: localToISO(dateTimeLocal),
      priority,
      color,
    };

    onSave(eventData);
  };

  return (
    <Modal
      open={open}
      title="Add New Event"
      subtitle="Schedule meetings, site visits, team events, or reminders."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Event Title *
          </div>
          <div className="mt-1">
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team meeting, Site visit, Client demo..."
              autoFocus
            />
          </div>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Date & Time *
          </div>
          <div className="mt-1">
            <input
              type="datetime-local"
              className="input"
              value={dateTimeLocal}
              onChange={(e) => setDateTimeLocal(e.target.value)}
            />
          </div>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Priority
            </div>
            <div className="mt-1">
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Color
            </div>
            <div className="mt-1">
              <select
                className="input"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                <option value="violet">Violet</option>
                <option value="brand">Brand</option>
                <option value="emerald">Emerald</option>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
              </select>
            </div>
          </label>
        </div>

        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Description (Optional)
          </div>
          <div className="mt-1">
            <textarea
              rows={3}
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Location, agenda, attendees, special instructions..."
            />
          </div>
        </label>

        <div className="flex items-center justify-between gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5">
            Cancel
          </button>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!title.trim() || !dateTimeLocal.trim()}
          >
            Add Event
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Edit Event Modal
function EditEventModal({ open, onClose, event, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const [priority, setPriority] = useState("medium");
  const [color, setColor] = useState("violet");

  useEffect(() => {
    if (!open || !event) return;
    
    setTitle(event.title || "");
    setDescription(event.description || "");
    setDateTimeLocal(event.dateTime ? isoToLocal(event.dateTime) : "");
    setPriority(event.priority || "medium");
    setColor(event.color || "violet");
  }, [open, event]);

  if (!event) return null;

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("Please enter an event title");
      return;
    }

    if (!dateTimeLocal.trim()) {
      alert("Please select a date and time");
      return;
    }

    const updates = {
      title: sanitizeText(title, 100),
      description: sanitizeText(description, 500),
      dateTime: localToISO(dateTimeLocal),
      priority,
      color,
    };

    onSave(event.id, updates);
  };

  return (
    <Modal
      open={open}
      title="Edit Event"
      subtitle="Update event details"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Event Title *
          </div>
          <div className="mt-1">
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team meeting, Site visit, Client demo..."
              autoFocus
            />
          </div>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Date & Time *
          </div>
          <div className="mt-1">
            <input
              type="datetime-local"
              className="input"
              value={dateTimeLocal}
              onChange={(e) => setDateTimeLocal(e.target.value)}
            />
          </div>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Priority
            </div>
            <div className="mt-1">
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Color
            </div>
            <div className="mt-1">
              <select
                className="input"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                <option value="violet">Violet</option>
                <option value="brand">Brand</option>
                <option value="emerald">Emerald</option>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
              </select>
            </div>
          </label>
        </div>

        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Description (Optional)
          </div>
          <div className="mt-1">
            <textarea
              rows={3}
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Location, agenda, attendees, special instructions..."
            />
          </div>
        </label>

        <div className="flex items-center justify-between gap-2">
          <div>
            {onDelete && (
              <button
                onClick={() => onDelete(event.id)}
                className="btn-ghost px-4 py-2.5 text-rose-600"
              >
                Delete
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost px-4 py-2.5">
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!title.trim() || !dateTimeLocal.trim()}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}