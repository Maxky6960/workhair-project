import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, CheckCircle, XCircle, Clock, Filter, Pencil } from "lucide-react";

interface QueueEntry {
  id: string;
  displayId: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  appointmentAt: string;
  durationMinutes: number;
  price: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  gender: "male" | "female";
}

const statusColor: Record<string, string> = {
  pending: "#C08552",
  confirmed: "#3B82F6",
  completed: "#22C55E",
  cancelled: "#EF4444",
  no_show: "#6B7280",
};
const statusLabel: Record<string, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  no_show: "ไม่มา",
};

export function AdminQueue() {
  const searchParams = useSearchParams();
  const bookingFromQuery = searchParams.get("booking") || "";
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "completed">("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<QueueEntry | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [highlightBookingId, setHighlightBookingId] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      const response = await fetch("/api/admin/bookings");
      if (!response.ok || !active) return;

      const payload = await response.json() as { bookings?: Array<{ id: string; customer_name: string; customer_phone: string; service_name: string; service_price: number; appointment_at: string; duration_minutes: number; status: QueueEntry["status"] }> };
      if (!active) return;

      const nextQueue = (payload.bookings || []).map((row) => {
        const dateObj = new Date(row.appointment_at);
        return {
          id: row.id,
          displayId: row.id.slice(0, 8).toUpperCase(),
          name: row.customer_name,
          phone: row.customer_phone,
          service: row.service_name,
          date: dateObj.toISOString().split("T")[0],
          time: dateObj.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
          price: row.service_price,
          appointmentAt: row.appointment_at,
          durationMinutes: row.duration_minutes ?? 30,
          status: row.status,
          gender: "male",
        } as QueueEntry;
      });

      setQueue(nextQueue);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!bookingFromQuery) return;
    setHighlightBookingId(bookingFromQuery);
    setSearch(bookingFromQuery.slice(0, 8));
    setPage(1);

    const timeout = setTimeout(() => setHighlightBookingId(""), 12000);
    return () => clearTimeout(timeout);
  }, [bookingFromQuery]);

  const filtered = queue.filter(q => {
    const matchFilter = filter === "all" || q.status === filter;
    const matchSearch = !search || q.name.toLowerCase().includes(search.toLowerCase()) || q.phone.includes(search) || q.displayId.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !fromDate || q.date >= fromDate;
    const matchTo = !toDate || q.date <= toDate;
    return matchFilter && matchSearch && matchFrom && matchTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const updateStatus = async (id: string, status: QueueEntry["status"]) => {
    setErrorMessage(null);
    const target = queue.find((q) => q.id === id);
    if (!target) return;
    const response = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id, status }),
    });
    if (!response.ok) {
      setErrorMessage("อัปเดตสถานะไม่สำเร็จ");
      return;
    }
    await (async () => {
      const response = await fetch("/api/admin/bookings");
      if (!response.ok) return;

      const payload = await response.json() as { bookings?: Array<{ id: string; customer_name: string; customer_phone: string; service_name: string; service_price: number; appointment_at: string; duration_minutes: number; status: QueueEntry["status"] }> };
      const nextQueue = (payload.bookings || []).map((row) => {
        const dateObj = new Date(row.appointment_at);
        return {
          id: row.id,
          displayId: row.id.slice(0, 8).toUpperCase(),
          name: row.customer_name,
          phone: row.customer_phone,
          service: row.service_name,
          date: dateObj.toISOString().split("T")[0],
          time: dateObj.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
          price: row.service_price,
          appointmentAt: row.appointment_at,
          durationMinutes: row.duration_minutes ?? 30,
          status: row.status,
          gender: "male",
        } as QueueEntry;
      });

      setQueue(nextQueue);
    })();
  };

  const openEdit = (item: QueueEntry) => {
    setEditTarget(item);
    setEditDate(item.date);
    setEditTime(item.time);
  };

  const saveSchedule = async () => {
    if (!editTarget) return;
    setErrorMessage(null);
    const appointmentAt = new Date(`${editDate}T${editTime}:00+07:00`).toISOString();
    const response = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editTarget.id, appointmentAt }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setErrorMessage(payload?.error?.includes("overlaps") ? "ช่วงเวลานี้มีคิวแล้ว กรุณาเลือกเวลาใหม่" : "ย้ายคิวไม่สำเร็จ");
      return;
    }

    setEditTarget(null);
    await (async () => {
      const response = await fetch("/api/admin/bookings");
      if (!response.ok) return;

      const payload = await response.json() as { bookings?: Array<{ id: string; customer_name: string; customer_phone: string; service_name: string; service_price: number; appointment_at: string; duration_minutes: number; status: QueueEntry["status"] }> };
      const nextQueue = (payload.bookings || []).map((row) => {
        const dateObj = new Date(row.appointment_at);
        return {
          id: row.id,
          displayId: row.id.slice(0, 8).toUpperCase(),
          name: row.customer_name,
          phone: row.customer_phone,
          service: row.service_name,
          date: dateObj.toISOString().split("T")[0],
          time: dateObj.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
          price: row.service_price,
          appointmentAt: row.appointment_at,
          durationMinutes: row.duration_minutes ?? 30,
          status: row.status,
          gender: "male",
        } as QueueEntry;
      });

      setQueue(nextQueue);
    })();
  };

  const counts = useMemo(() => ({
    all: queue.length,
    pending: queue.filter(q => q.status === "pending").length,
    confirmed: queue.filter(q => q.status === "confirmed").length,
    completed: queue.filter(q => q.status === "completed").length,
  }), [queue]);

  return (
    <div className="space-y-6">
      {errorMessage && <p className="text-sm" style={{ color: "#d4183d" }}>{errorMessage}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ color: "#4B2E2B", fontSize: "1.5rem", fontWeight: 700 }}>คิวลูกค้า</h1>
          <p className="text-sm mt-1" style={{ color: "#8C5A3C" }}>จัดการคิวและสถานะการให้บริการ</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setPage(1);
              setFromDate(e.target.value);
            }}
            className="px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#ffffff", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.2)" }}
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setPage(1);
              setToDate(e.target.value);
            }}
            className="px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#ffffff", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.2)" }}
          />
          <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8C5A3C" }} />
          <input
            value={search}
            onChange={e => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none w-64"
            style={{ backgroundColor: "#ffffff", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.2)" }}
          />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "confirmed", "completed"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all"
            style={
              filter === f
                ? { backgroundColor: "#C08552", color: "#ffffff" }
                : { backgroundColor: "#ffffff", color: "#8C5A3C", border: "1px solid rgba(192,133,82,0.2)" }
            }
          >
            <Filter className="w-3.5 h-3.5" />
            {f === "all" ? "ทั้งหมด" : statusLabel[f]}
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: filter === f ? "rgba(255,255,255,0.25)" : "#f5e9db" }}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Queue table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f5e9db" }}>
                {["คิว", "วันที่/เวลา", "ชื่อลูกค้า", "เบอร์โทร", "ทรงผม", "ราคา", "สถานะ", "จัดการ"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs" style={{ color: "#8C5A3C", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: "#8C5A3C" }}>
                    ไม่พบข้อมูลคิว
                  </td>
                </tr>
              ) : (
                paged.map((q, i) => (
                  <tr key={q.id} style={{ borderBottom: "1px solid rgba(192,133,82,0.1)", backgroundColor: q.id === highlightBookingId ? "#fff1e3" : i % 2 === 0 ? "transparent" : "rgba(192,133,82,0.02)" }}>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ backgroundColor: "#f5e9db", color: "#4B2E2B" }}>{q.displayId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: "#4B2E2B" }}>{q.date}</p>
                      <p className="text-xs" style={{ color: "#8C5A3C" }}>{q.time} น.</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0" style={{ backgroundColor: q.gender === "female" ? "#C08552" : "#8C5A3C" }}>
                          {q.name[0]}
                        </div>
                        <span style={{ color: "#4B2E2B", fontWeight: 500 }}>{q.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8C5A3C" }}>{q.phone}</td>
                    <td className="px-4 py-3" style={{ color: "#4B2E2B" }}>{q.service}</td>
                    <td className="px-4 py-3" style={{ color: "#C08552", fontWeight: 600 }}>฿{q.price}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: `${statusColor[q.status]}18`, color: statusColor[q.status] }}>
                        {statusLabel[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {q.status === "pending" && (
                          <button
                            onClick={() => updateStatus(q.id, "confirmed")}
                            title="ยืนยัน"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ backgroundColor: "#3B82F620", color: "#3B82F6" }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {q.status === "confirmed" && (
                          <button
                            onClick={() => updateStatus(q.id, "completed")}
                            title="เสร็จสิ้น"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ backgroundColor: "#22C55E20", color: "#22C55E" }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {q.status !== "completed" && q.status !== "cancelled" && (
                          <button
                            onClick={() => updateStatus(q.id, "cancelled")}
                            title="ยกเลิก"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ backgroundColor: "#EF444420", color: "#EF4444" }}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {(q.status === "completed" || q.status === "cancelled") && (
                          <button
                            onClick={() => updateStatus(q.id, "pending")}
                            title="รีเซ็ต"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ backgroundColor: "#C0855220", color: "#C08552" }}
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(q)}
                          title="ย้ายเวลา"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                          style={{ backgroundColor: "#8C5A3C20", color: "#8C5A3C" }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "#8C5A3C" }}>หน้า {page} / {totalPages} ({filtered.length} รายการ)</p>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: page <= 1 ? "#f1ede8" : "#f5e9db", color: "#8C5A3C" }}
          >ก่อนหน้า</button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: page >= totalPages ? "#f1ede8" : "#f5e9db", color: "#8C5A3C" }}
          >ถัดไป</button>
        </div>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(75,46,43,0.4)" }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(192,133,82,0.15)" }}>
              <h3 style={{ color: "#4B2E2B", fontWeight: 600 }}>ย้ายเวลาคิว {editTarget.displayId}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>วันที่</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: "#f5e9db", border: "1.5px solid rgba(192,133,82,0.25)", color: "#4B2E2B" }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "#8C5A3C" }}>เวลา</label>
                <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: "#f5e9db", border: "1.5px solid rgba(192,133,82,0.25)", color: "#4B2E2B" }} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ backgroundColor: "#f5e9db", color: "#8C5A3C" }}>ยกเลิก</button>
              <button onClick={saveSchedule} className="flex-1 py-2.5 rounded-xl text-sm" style={{ backgroundColor: "#C08552", color: "#ffffff", fontWeight: 600 }}>บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
