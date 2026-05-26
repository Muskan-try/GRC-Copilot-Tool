import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "../api";
import { useToast } from "../components/Toast";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const TYPE_CONFIG = {
  audit_date: { label: "Audit Date", color: "#3b82f6", bg: "#eff6ff" },
  certification_expiry: { label: "Cert Expiry", color: "#ef4444", bg: "#fef2f2" },
  policy_review: { label: "Policy Review", color: "#f59e0b", bg: "#fff7ed" },
  regulatory_filing: { label: "Reg Filing", color: "#8b5cf6", bg: "#f5f3ff" },
  custom: { label: "Custom", color: "#64748b", bg: "#f8fafc" },
};

function EventDot({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.custom;
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: cfg.color, marginRight: 4 }} />;
}

export default function ComplianceCalendar() {
  const navigate = useNavigate();
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", event_type: "audit_date", description: "", event_date: "", reminder_days: 30, framework: "" });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCalendarEvents({ year, month, type: filterType || undefined });
      setEvents(data.events || []);
    } catch (e) {
      toast.addToast("Failed to load events", "error");
    } finally {
      setLoading(false);
    }
  }, [year, month, filterType, toast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const eventsByDate = {};
  events.forEach(e => {
    const d = e.event_date.substring(0, 10);
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(e);
  });

  const prevMonth = () => { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1); };

  const handleSave = async () => {
    if (!form.title || !form.event_date) return toast.addToast("Title and date required", "error");
    try {
      if (editing) {
        await updateCalendarEvent(editing, form);
        toast.addToast("Event updated", "success");
      } else {
        await createCalendarEvent(form);
        toast.addToast("Event created", "success");
      }
      setShowForm(false); setEditing(null); setForm({ title: "", event_type: "audit_date", description: "", event_date: "", reminder_days: 30, framework: "" });
      fetchEvents();
    } catch (err) {
      toast.addToast("Failed to save event: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCalendarEvent(id);
      toast.addToast("Event deleted", "success");
      fetchEvents();
    } catch (err) {
      toast.addToast("Failed to delete event", "error");
    }
  };

  const openEdit = (ev) => {
    setEditing(ev.id);
    setForm({ title: ev.title, event_type: ev.event_type, description: ev.description || "", event_date: ev.event_date.substring(0,10), reminder_days: ev.reminder_days, framework: ev.framework || "" });
    setShowForm(true);
  };

  return (
    <div style={{ padding: "40px 32px", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e293b", margin: "0 0 4px 0" }}>Compliance Calendar</h1>
            <p style={{ fontSize: "0.9rem", color: "#64748b", margin: 0 }}>Track audit dates, certification expiries, policy reviews, and regulatory deadlines</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setLoading(true); }}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#1e293b" }}>
              <option value="">All Types</option>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className="btn btn-primary" style={{ width: "auto", margin: 0 }} onClick={() => { setEditing(null); setForm({ title: "", event_type: "audit_date", description: "", event_date: "", reminder_days: 30, framework: "" }); setShowForm(true); }}>+ Add Event</button>
            <button className="btn btn-back" onClick={() => navigate("/start")}>Back</button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            {/* Month Nav */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <button onClick={prevMonth} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, color: "#64748b" }}>&larr;</button>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>{MONTHS[month-1]} {year}</h2>
              <button onClick={nextMonth} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, color: "#64748b" }}>&rarr;</button>
            </div>

            {/* Day Headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", padding: "4px 0" }}>{d}</div>)}
            </div>

            {/* Date Cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayEvents = eventsByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                return (
                  <div key={day} style={{
                    minHeight: 80, padding: 6, borderRadius: 8,
                    background: isToday ? "#eff6ff" : "#fff",
                    border: isToday ? "2px solid #3b82f6" : "1px solid #f1f5f9",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                    onClick={() => {
                      setForm(f => ({ ...f, event_date: dateStr }));
                      setEditing(null);
                      setShowForm(true);
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: isToday ? 800 : 600, color: isToday ? "#3b82f6" : "#1e293b", marginBottom: 4 }}>{day}</div>
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} title={ev.title} onClick={e => { e.stopPropagation(); openEdit(ev); }}
                        style={{ fontSize: "0.65rem", padding: "2px 4px", borderRadius: 3, marginBottom: 2, background: (TYPE_CONFIG[ev.event_type] || TYPE_CONFIG.custom).bg, color: (TYPE_CONFIG[ev.event_type] || TYPE_CONFIG.custom).color, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 600 }}>+{dayEvents.length - 3} more</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar: Event List & Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Legend */}
            <div className="card" style={{ padding: 16, borderRadius: 10, maxWidth: "none" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: "0 0 12px 0" }}>Event Types</h3>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: "0.8rem", color: "#64748b" }}>
                  <EventDot type={k} /> {v.label}
                </div>
              ))}
            </div>

            {/* Upcoming events */}
            <div className="card" style={{ padding: 16, borderRadius: 10, maxWidth: "none", flex: 1 }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: "0 0 12px 0" }}>
                {MONTHS[month-1]} Events ({events.length})
              </h3>
              {loading ? <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Loading...</p> : events.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>No events this month</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {events.map(ev => (
                    <div key={ev.id} style={{ padding: "10px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <EventDot type={ev.event_type} />
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>{ev.title}</span>
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: 14 }}>
                            {(TYPE_CONFIG[ev.event_type] || TYPE_CONFIG.custom).label} &middot; {new Date(ev.event_date).toLocaleDateString()}
                            {ev.framework && <span> &middot; {ev.framework}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(ev.id)}
                          style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.8rem", cursor: "pointer", padding: "2px 6px" }}>&times;</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showForm && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => setShowForm(false)}>
            <div className="card" style={{ maxWidth: 480, padding: 32, position: "relative" }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8" }}>&times;</button>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>{editing ? "Edit Event" : "New Event"}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input placeholder="Event title" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem" }} />
                <select value={form.event_type} onChange={e => setForm(f => ({...f, event_type: e.target.value}))}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#1e293b" }}>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input type="date" value={form.event_date} onChange={e => setForm(f => ({...f, event_date: e.target.value}))}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem" }} />
                <input placeholder="Framework (optional)" value={form.framework} onChange={e => setForm(f => ({...f, framework: e.target.value}))}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem" }} />
                <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", resize: "vertical" }} />
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Reminder before (days)</label>
                  <select value={form.reminder_days} onChange={e => setForm(f => ({...f, reminder_days: parseInt(e.target.value)}))}
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", width: "100%" }}>
                    <option value={0}>Same day</option><option value={7}>7 days before</option><option value={14}>14 days before</option>
                    <option value={30}>30 days before</option><option value={60}>60 days before</option><option value={90}>90 days before</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button className="btn btn-primary" style={{ width: "auto", margin: 0, flex: 1 }} onClick={handleSave}>
                    {editing ? "Update" : "Create"}
                  </button>
                  <button className="btn btn-back" style={{ margin: 0 }} onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
