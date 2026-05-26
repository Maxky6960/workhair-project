import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Users, ArrowUp, Scissors } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Booking = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  service_price: number;
  appointment_at: string;
  status: string;
};

const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getBangkokDateKey(value: string | Date) {
  const parts = bangkokDateFormatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
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

export function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadBookings = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/admin/bookings");
        const payload = await response.json().catch(() => null) as { bookings?: Booking[]; error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "โหลดข้อมูล Dashboard ไม่สำเร็จ");
        }

        if (active) setBookings(payload?.bookings || []);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "โหลดข้อมูล Dashboard ไม่สำเร็จ");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBookings();

    return () => {
      active = false;
    };
  }, []);

  const todayIso = getBangkokDateKey(new Date());
  const todayBookings = useMemo(() => bookings.filter((b) => getBangkokDateKey(b.appointment_at) === todayIso), [bookings, todayIso]);
  const completedToday = useMemo(() => todayBookings.filter((b) => b.status === "completed"), [todayBookings]);
  const revenueToday = useMemo(() => completedToday.reduce((sum, b) => sum + b.service_price, 0), [completedToday]);
  const completedBookings = useMemo(() => bookings.filter((b) => b.status === "completed"), [bookings]);
  const totalRevenue = useMemo(() => completedBookings.reduce((sum, b) => sum + b.service_price, 0), [completedBookings]);
  const avgTicket = useMemo(() => (completedToday.length ? Math.round(revenueToday / completedToday.length) : 0), [completedToday.length, revenueToday]);

  const dailySales = useMemo(() => {
    const dateKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${todayIso}T00:00:00+07:00`);
      d.setDate(d.getDate() - (6 - i));
      return getBangkokDateKey(d);
    });

    return dateKeys.map((key) => {
      const rows = bookings.filter((b) => getBangkokDateKey(b.appointment_at) === key && b.status === "completed");
      const revenue = rows.reduce((sum, row) => sum + row.service_price, 0);
      const label = new Date(`${key}T00:00:00`).toLocaleDateString("th-TH", { weekday: "short" });
      return { day: label, revenue, customers: rows.length };
    });
  }, [bookings, todayIso]);

  const recentQueue = useMemo(() => bookings.slice(0, 6).map((b) => {
    const dt = new Date(b.appointment_at);
    return {
      id: b.id,
      time: dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
      name: b.customer_name,
      phone: b.customer_phone,
      service: b.service_name,
      price: b.service_price,
      status: b.status,
    };
  }), [bookings]);

  const serviceTop = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of bookings) map.set(row.service_name, (map.get(row.service_name) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [bookings]);

  const stats = [
    { label: "ยอดขายวันนี้", value: `฿${revenueToday.toLocaleString()}`, sub: `คิวเสร็จแล้ว ${completedToday.length} คน`, icon: TrendingUp, color: "#C08552" },
    { label: "ลูกค้าวันนี้", value: `${todayBookings.length} คน`, sub: `รอยืนยัน ${todayBookings.filter((b) => b.status === "pending").length} คน`, icon: Users, color: "#8C5A3C" },
    { label: "ค่าเฉลี่ยต่อบิล", value: `฿${avgTicket.toLocaleString()}`, sub: "จากคิวสำเร็จวันนี้", icon: Scissors, color: "#C08552" },
    { label: "ยอดขายทั้งหมด", value: `฿${totalRevenue.toLocaleString()}`, sub: `คิวทั้งหมด ${bookings.length} รายการ`, icon: Scissors, color: "#8C5A3C" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ color: "#4B2E2B", fontSize: "1.5rem", fontWeight: 700 }}>Sales Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#8C5A3C" }}>สรุปยอดการให้บริการวันนี้ — {new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: "#f5e9db", color: "#8C5A3C" }}>
          กำลังโหลดข้อมูล Dashboard...
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: "#22C55E" }}>
                  <ArrowUp className="w-3 h-3" />
                </div>
              </div>
              <p style={{ color: "#4B2E2B", fontSize: "1.375rem", fontWeight: 700 }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8C5A3C" }}>{s.label}</p>
              <p className="text-xs mt-1" style={{ color: s.color }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>ยอดขายรายวัน</h2>
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#f5e9db", color: "#8C5A3C" }}>7 วันล่าสุด</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailySales} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,133,82,0.15)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#8C5A3C", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8C5A3C", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid rgba(192,133,82,0.3)", borderRadius: "12px", color: "#4B2E2B" }} formatter={(value) => [`฿${Number(value ?? 0).toLocaleString()}`, "รายได้"]} />
              <Bar dataKey="revenue" fill="#C08552" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
          <h2 className="mb-5" style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>สัดส่วนสถานะคิววันนี้</h2>
          <div className="space-y-4">
            {[
              { label: "รอยืนยัน", count: todayBookings.filter((b) => b.status === "pending").length, color: "#C08552" },
              { label: "ยืนยันแล้ว", count: todayBookings.filter((b) => b.status === "confirmed").length, color: "#3B82F6" },
              { label: "เสร็จสิ้น", count: todayBookings.filter((b) => b.status === "completed").length, color: "#22C55E" },
            ].map((item) => {
              const pct = todayBookings.length ? Math.round((item.count / todayBookings.length) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: "#4B2E2B" }}>{item.label}</span>
                    <span style={{ color: "#8C5A3C" }}>{item.count} คน ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: "#f5e9db" }}>
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t" style={{ borderColor: "rgba(192,133,82,0.15)" }}>
              <p className="text-xs mb-2" style={{ color: "#8C5A3C" }}>ทรงผมยอดนิยม</p>
              {serviceTop.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white" style={{ backgroundColor: "#C08552" }}>{i + 1}</span>
                    <span className="text-sm" style={{ color: "#4B2E2B" }}>{name}</span>
                  </div>
                  <span className="text-xs" style={{ color: "#8C5A3C" }}>{count} ครั้ง</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(192,133,82,0.15)" }}>
          <h2 style={{ color: "#4B2E2B", fontSize: "1rem", fontWeight: 600 }}>ลูกค้าล่าสุด</h2>
          <a href="/admin/queue" className="text-xs" style={{ color: "#C08552" }}>ดูทั้งหมด →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f5e9db" }}>
                {["เวลา", "ชื่อลูกค้า", "เบอร์โทร", "ทรงผม", "ราคา", "สถานะ"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs" style={{ color: "#8C5A3C", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentQueue.map((q, i) => (
                <tr key={q.id} style={{ borderBottom: "1px solid rgba(192,133,82,0.1)", backgroundColor: i % 2 === 0 ? "transparent" : "rgba(192,133,82,0.03)" }}>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8C5A3C" }}>{q.time}</td>
                  <td className="px-4 py-3" style={{ color: "#4B2E2B", fontWeight: 500 }}>{q.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8C5A3C" }}>{q.phone}</td>
                  <td className="px-4 py-3" style={{ color: "#4B2E2B" }}>{q.service}</td>
                  <td className="px-4 py-3" style={{ color: "#C08552", fontWeight: 600 }}>฿{q.price}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: `${statusColor[q.status] || "#9CA3AF"}18`, color: statusColor[q.status] || "#9CA3AF" }}>
                      {statusLabel[q.status] || q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
