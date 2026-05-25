import { useEffect, useMemo, useState } from "react";
import { Download, TrendingUp, Users, Scissors } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export function AdminReports() {
  const [bookings, setBookings] = useState<Array<{ id: string; customer_name: string; service_name: string; service_price: number; appointment_at: string; status: string }>>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const loadBookings = async () => {
      const response = await fetch("/api/admin/bookings");
      if (!response.ok) return;

      const payload = await response.json() as { bookings?: Array<{ id: string; customer_name: string; service_name: string; service_price: number; appointment_at: string; status: string }> };
      setBookings(payload.bookings || []);
    };

    loadBookings();
  }, []);

  const monthlyRows = useMemo(() => bookings.filter((b) => new Date(b.appointment_at).getMonth() === selectedMonth), [bookings, selectedMonth]);
  const rangeRows = useMemo(
    () => monthlyRows.filter((b) => {
      const day = b.appointment_at.slice(0, 10);
      return (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
    }),
    [monthlyRows, fromDate, toDate],
  );
  const completedMonthly = useMemo(() => rangeRows.filter((b) => b.status === "completed"), [rangeRows]);
  const monthlyRevenue = useMemo(() => completedMonthly.reduce((sum, row) => sum + row.service_price, 0), [completedMonthly]);

  const dailySales = useMemo(() => {
    const grouped = new Map<string, { revenue: number; customers: number }>();
    for (const row of completedMonthly) {
      const dayKey = row.appointment_at.slice(0, 10);
      const prev = grouped.get(dayKey) || { revenue: 0, customers: 0 };
      grouped.set(dayKey, { revenue: prev.revenue + row.service_price, customers: prev.customers + 1 });
    }
    return [...grouped.entries()].slice(-7).map(([dayKey, val]) => ({
      day: new Date(`${dayKey}T00:00:00`).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" }),
      revenue: val.revenue,
      customers: val.customers,
    }));
  }, [completedMonthly]);

  const weeklyTrend = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    for (const row of completedMonthly) {
      const day = new Date(row.appointment_at).getDate();
      const idx = Math.min(4, Math.floor((day - 1) / 7));
      buckets[idx] += row.service_price;
    }
    return buckets.map((revenue, i) => ({ week: `สัปดาห์ ${i + 1}`, revenue }));
  }, [completedMonthly]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rangeRows.slice(start, start + pageSize);
  }, [rangeRows, page]);

  const totalPages = Math.max(1, Math.ceil(rangeRows.length / pageSize));

  const exportCsv = async () => {
    const params = new URLSearchParams({
      month: String(selectedMonth + 1),
      year: String(new Date().getFullYear()),
      from: fromDate,
      to: toDate,
    });
    const response = await fetch(`/api/admin/reports/export?${params.toString()}`);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workhair-report-${new Date().getFullYear()}-${String(selectedMonth + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ color: "#4B2E2B", fontSize: "1.5rem", fontWeight: 700 }}>รายงาน</h1>
          <p className="text-sm mt-1" style={{ color: "#8C5A3C" }}>สรุปยอดการให้บริการรายเดือนจากข้อมูลจริง</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setPage(1);
              setFromDate(e.target.value);
            }}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#ffffff", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.2)" }}
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setPage(1);
              setToDate(e.target.value);
            }}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#ffffff", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.2)" }}
          />
          <select
            value={selectedMonth}
            onChange={e => {
              setPage(1);
              setSelectedMonth(Number(e.target.value));
            }}
            className="px-4 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "#ffffff", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.2)", appearance: "none" }}
          >
            {monthNames.map((m, i) => <option key={m} value={i}>{m} {new Date().getFullYear()}</option>)}
          </select>
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-opacity hover:opacity-80" style={{ backgroundColor: "#f5e9db", color: "#8C5A3C" }}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "รายได้รวม", value: `฿${monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: "#C08552" },
            { label: "ลูกค้าทั้งหมด", value: `${rangeRows.length} คน`, icon: Users, color: "#8C5A3C" },
            { label: "เสร็จสิ้น", value: `${completedMonthly.length} คน`, icon: Scissors, color: "#22C55E" },
            { label: "ยกเลิก", value: `${rangeRows.filter((b) => b.status === "cancelled").length} คน`, icon: Scissors, color: "#EF4444" },
          ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${s.color}18` }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <p style={{ color: "#4B2E2B", fontSize: "1.375rem", fontWeight: 700 }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8C5A3C" }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
          <h2 className="mb-5" style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>ยอดขายรายวัน (7 วันล่าสุด)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailySales} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,133,82,0.15)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#8C5A3C", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8C5A3C", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid rgba(192,133,82,0.3)", borderRadius: "12px", color: "#4B2E2B" }} formatter={(v) => [`฿${Number(v ?? 0).toLocaleString()}`, "รายได้"]} />
              <Bar dataKey="revenue" fill="#C08552" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
          <h2 className="mb-5" style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>แนวโน้มรายสัปดาห์</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,133,82,0.15)" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "#8C5A3C", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8C5A3C", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid rgba(192,133,82,0.3)", borderRadius: "12px", color: "#4B2E2B" }} formatter={(v) => [`฿${Number(v ?? 0).toLocaleString()}`, "รายได้"]} />
              <Line dataKey="revenue" stroke="#C08552" strokeWidth={2.5} dot={{ fill: "#C08552", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(192,133,82,0.15)" }}>
          <h2 style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>รายการลูกค้า ({monthNames[selectedMonth]} {new Date().getFullYear()})</h2>
          <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: "#f5e9db", color: "#8C5A3C" }}>{rangeRows.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f5e9db" }}>
                {["#", "วันที่", "ชื่อลูกค้า", "ทรงผม", "ราคา", "สถานะ"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs" style={{ color: "#8C5A3C", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((q) => (
                <tr key={q.id} style={{ borderBottom: "1px solid rgba(192,133,82,0.1)" }}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "#8C5A3C" }}>{q.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#4B2E2B" }}>{new Date(q.appointment_at).toLocaleString("th-TH")}</td>
                  <td className="px-4 py-3" style={{ color: "#4B2E2B", fontWeight: 500 }}>{q.customer_name}</td>
                  <td className="px-4 py-3" style={{ color: "#4B2E2B" }}>{q.service_name}</td>
                  <td className="px-4 py-3" style={{ color: "#C08552", fontWeight: 600 }}>฿{q.service_price}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{
                      backgroundColor: q.status === "completed" ? "#22C55E18" : q.status === "cancelled" ? "#EF444418" : "#C0855218",
                      color: q.status === "completed" ? "#22C55E" : q.status === "cancelled" ? "#EF4444" : "#C08552",
                    }}>
                      {q.status === "completed" ? "เสร็จสิ้น" : q.status === "cancelled" ? "ยกเลิก" : q.status === "confirmed" ? "ยืนยันแล้ว" : q.status === "no_show" ? "ไม่มา" : "รอยืนยัน"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "#8C5A3C" }}>หน้า {page} / {totalPages} ({rangeRows.length} รายการ)</p>
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
    </div>
  );
}
