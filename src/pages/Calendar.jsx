import { useEffect, useState, useCallback } from "react";
import { Plus, CalendarDays, Clock, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Edit2, Trash2 } from "lucide-react";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage, { InlineError } from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import { calendarApi, workOrdersApi } from "../api";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  normal: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", dateTime: "", endTime: "", priority: "normal", color: "#0ea5e9"
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calendarApi.getAll();
      setEvents(res.data || []);
      setWorkOrders(res.workOrders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate(date = null) {
    setEditingEvent(null);
    const dateStr = date ? new Date(date).toISOString().slice(0, 16) : "";
    setForm({ title: "", description: "", dateTime: dateStr, endTime: "", priority: "normal", color: "#0ea5e9" });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(event) {
    setEditingEvent(event);
    setForm({
      title: event.title || "",
      description: event.description || "",
      dateTime: event.dateTime ? new Date(event.dateTime).toISOString().slice(0, 16) : "",
      endTime: event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : "",
      priority: event.priority || "normal",
      color: event.color || "#0ea5e9",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.dateTime) {
      setFormError("Title and date/time are required");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const data = {
        title: form.title,
        description: form.description,
        dateTime: form.dateTime,
        endTime: form.endTime || null,
        priority: form.priority,
        color: form.color,
      };

      if (editingEvent) {
        await calendarApi.update(editingEvent.id, data);
      } else {
        await calendarApi.create(data);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event) {
    if (!confirm(`Delete "${event.title}"?`)) return;
    try {
      await calendarApi.delete(event.id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleComplete(event) {
    try {
      await calendarApi.update(event.id, { isCompleted: !event.isCompleted });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Calendar helpers
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  function getEventsForDay(day) {
    if (!day) return [];
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayEvents = events.filter(e => {
      const eventDate = new Date(e.dateTime);
      return eventDate.toDateString() === date.toDateString();
    });
    const dayWos = workOrders.filter(wo => {
      if (!wo.etaAt) return false;
      const etaDate = new Date(wo.etaAt);
      return etaDate.toDateString() === date.toDateString();
    });
    return [...dayEvents.map(e => ({ ...e, type: "event" })), ...dayWos.map(wo => ({ ...wo, type: "workorder", title: wo.woNumber }))];
  }

  const today = new Date();
  const isToday = (day) => day && today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  // Separate upcoming events and overdue work orders
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.dateTime) >= now && !e.isCompleted).slice(0, 5);
  const overdueWos = workOrders.filter(wo => wo.etaAt && new Date(wo.etaAt) < now && wo.status !== "completed");

  if (loading) return <PageLoader message="Loading calendar..." />;

  return (
    <PageTransition>
      <PageHeader
        title="Calendar"
        icon={CalendarDays}
        subtitle="Schedule and track events"
        actions={
          <button onClick={() => openCreate()} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Event
          </button>
        }
      />

      {error && <ErrorMessage error={error} onRetry={loadData} className="mb-6" />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 card p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Today
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={idx}
                  className={[
                    "min-h-[80px] p-1 rounded-lg border transition-colors cursor-pointer",
                    day ? "hover:bg-slate-50 dark:hover:bg-slate-800/50" : "",
                    isToday(day) ? "bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800" : "border-slate-100 dark:border-slate-800",
                  ].join(" ")}
                  onClick={() => day && openCreate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                >
                  {day && (
                    <>
                      <div className={[
                        "text-sm font-medium mb-1",
                        isToday(day) ? "text-brand-600 dark:text-brand-400" : "",
                      ].join(" ")}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((item, i) => (
                          <div
                            key={i}
                            className={[
                              "text-[10px] px-1.5 py-0.5 rounded truncate",
                              item.type === "workorder"
                                ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                                : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
                            ].join(" ")}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.type === "event") openEdit(item);
                            }}
                          >
                            {item.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-slate-500">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Overdue Work Orders */}
          {overdueWos.length > 0 && (
            <div className="card p-5 border-rose-200 dark:border-rose-800 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20">
              <h3 className="font-semibold flex items-center gap-2 text-rose-700 dark:text-rose-300 mb-4">
                <AlertTriangle size={18} /> Overdue ({overdueWos.length})
              </h3>
              <div className="space-y-3">
                {overdueWos.slice(0, 5).map((wo) => (
                  <div key={wo.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/60 dark:bg-slate-900/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{wo.woNumber}</p>
                      <p className="text-xs text-slate-500 truncate">{wo.client}</p>
                    </div>
                    <span className="text-xs text-rose-600 dark:text-rose-400">
                      {new Date(wo.etaAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          <div className="card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Clock size={18} className="text-brand-500" /> Upcoming Events
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(event.dateTime).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleComplete(event)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <CheckCircle size={14} className={event.isCompleted ? "text-emerald-500" : "text-slate-400"} />
                      </button>
                      <button
                        onClick={() => openEdit(event)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(event)}
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingEvent ? "Edit Event" : "New Event"} size="md">
        <form onSubmit={handleSave} className="space-y-5">
          {formError && <InlineError error={formError} onDismiss={() => setFormError(null)} />}

          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="Event title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Event details..."
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date/Time *</label>
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date/Time</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="input"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="input h-11 p-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : editingEvent ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
