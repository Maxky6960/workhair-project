import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Scissors, LayoutDashboard, Users, BarChart2, Settings, Menu, LogOut, Bell, Clock3, Phone, Ticket, CircleCheck, CircleAlert, House } from "lucide-react";
import { AIChatPopup } from "./AIChatPopup";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/queue", label: "คิวลูกค้า", icon: Users },
  { to: "/admin/menu", label: "จัดการเมนู", icon: Scissors },
  { to: "/admin/reports", label: "รายงาน", icon: BarChart2 },
  { to: "/admin/settings", label: "ตั้งค่า", icon: Settings },
];

function AdminSidebar({
  mobile = false,
  pathname,
  onNavigate,
  onLogout,
  adminName,
  adminEmail,
}: {
  mobile?: boolean;
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
  adminName: string;
  adminEmail: string;
}) {
  const isActive = (item: typeof navItems[0]) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  const initials = (adminName || "A").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${mobile ? "w-64" : "w-60"} flex flex-col h-full`}
      style={{ backgroundColor: "#4B2E2B" }}
    >
      <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,248,240,0.1)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#C08552" }}>
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div>
            <p style={{ color: "#FFF8F0", letterSpacing: "0.2em", fontSize: "0.85rem" }} className="uppercase">WORKHAIR</p>
            <p className="text-xs" style={{ color: "rgba(255,248,240,0.5)" }}>Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                backgroundColor: active ? "rgba(192,133,82,0.25)" : "transparent",
                color: active ? "#C08552" : "rgba(255,248,240,0.7)",
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: "rgba(255,248,240,0.1)" }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: "#C08552", color: "#fff" }}>{initials}</div>
          <div>
            <p className="text-xs" style={{ color: "#FFF8F0" }}>{adminName}</p>
            <p className="text-xs" style={{ color: "rgba(255,248,240,0.4)" }}>{adminEmail}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-opacity hover:opacity-80"
          style={{ color: "rgba(255,248,240,0.5)" }}
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("-");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    serviceName: string;
    appointmentAt: string;
    status: string;
  }>>([]);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);

  const statusMeta = (status: string) => {
    if (status === "pending") return { label: "รอยืนยัน", color: "#C08552", bg: "#fff4ea" };
    if (status === "confirmed") return { label: "ยืนยันแล้ว", color: "#2563EB", bg: "#eaf2ff" };
    if (status === "completed") return { label: "เสร็จสิ้น", color: "#16A34A", bg: "#e8f9ef" };
    if (status === "cancelled") return { label: "ยกเลิก", color: "#DC2626", bg: "#ffecec" };
    if (status === "no_show") return { label: "ไม่มา", color: "#6B7280", bg: "#f3f4f6" };
    return { label: status, color: "#8C5A3C", bg: "#f8f1ea" };
  };

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        if (active) router.replace("/login");
        return;
      }

      const { data, error } = await supabase.rpc("is_current_user_admin");

      if (error || data !== true) {
        if (active) router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,username,email")
        .eq("user_id", authData.user.id)
        .single();

      const fallbackName = authData.user.email?.split("@")[0] || "Admin";
      const fullName = profile?.full_name?.trim() || profile?.username?.trim() || fallbackName;
      const email = profile?.email?.trim() || authData.user.email || "-";

      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [{ count: waiting }, { count: today }, { data: upcomingRows }] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .gte("appointment_at", start.toISOString())
          .lt("appointment_at", end.toISOString()),
        supabase
          .from("bookings")
          .select("id,customer_name,customer_phone,service_name,appointment_at,status")
          .gte("appointment_at", now.toISOString())
          .order("appointment_at", { ascending: true })
          .limit(6),
      ]);

      if (!active) return;

      setAdminName(fullName);
      setAdminEmail(email);
      setNotificationItems((upcomingRows || []).map((row) => ({
        id: row.id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        serviceName: row.service_name,
        appointmentAt: row.appointment_at,
        status: row.status,
      })));
      setWaitingCount(waiting || 0);
      setTodayCount(today || 0);
      setNotificationBadgeCount((waiting || 0) + (today || 0));

      if (active) setBooting(false);
    };

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  const logout = async () => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  };

  if (booting) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="hidden md:flex flex-col flex-shrink-0 h-full" style={{ width: 240 }}>
        <AdminSidebar pathname={pathname} onNavigate={() => {}} onLogout={logout} adminName={adminName} adminEmail={adminEmail} />
      </div>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex-shrink-0">
            <AdminSidebar mobile pathname={pathname} onNavigate={() => setSidebarOpen(false)} onLogout={logout} adminName={adminName} adminEmail={adminEmail} />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 flex-shrink-0" style={{ backgroundColor: "#ffffff", borderBottom: "1px solid rgba(192,133,82,0.15)" }}>
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" style={{ color: "#4B2E2B" }} />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: "#f7efe7", color: "#8C5A3C", border: "1px solid rgba(192,133,82,0.25)" }}
            >
              <House className="w-3.5 h-3.5" />
              หน้าแรก
            </Link>
            <div className="relative">
              <button onClick={() => setNotificationOpen((v) => !v)} className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5e9db] transition-colors">
                <Bell className="w-4 h-4" style={{ color: "#8C5A3C" }} />
                {notificationBadgeCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: "#C08552" }} />}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-[26rem] rounded-2xl p-3 z-20" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(192,133,82,0.2)", boxShadow: "0 10px 30px rgba(75,46,43,0.12)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm" style={{ color: "#4B2E2B", fontWeight: 700 }}>แจ้งเตือนสำหรับช่าง</p>
                    <Link href="/admin/queue" className="text-xs" style={{ color: "#C08552" }}>ไปหน้าจัดการคิว</Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl p-2.5" style={{ backgroundColor: "#fff4ea", border: "1px solid rgba(192,133,82,0.25)" }}>
                      <p className="text-[11px]" style={{ color: "#8C5A3C" }}>รอยืนยัน</p>
                      <p className="text-base" style={{ color: "#4B2E2B", fontWeight: 700 }}>{waitingCount} คิว</p>
                    </div>
                    <div className="rounded-xl p-2.5" style={{ backgroundColor: "#f7efe7", border: "1px solid rgba(192,133,82,0.2)" }}>
                      <p className="text-[11px]" style={{ color: "#8C5A3C" }}>คิววันนี้</p>
                      <p className="text-base" style={{ color: "#4B2E2B", fontWeight: 700 }}>{todayCount} คิว</p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {notificationItems.length > 0 ? notificationItems.map((item) => {
                      const dt = new Date(item.appointmentAt);
                      const hh = String(dt.getHours()).padStart(2, "0");
                      const mm = String(dt.getMinutes()).padStart(2, "0");
                      const meta = statusMeta(item.status);
                      return (
                        <div key={item.id} className="rounded-xl p-2.5" style={{ backgroundColor: "#fdf7f1", border: "1px solid rgba(192,133,82,0.15)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs" style={{ color: "#4B2E2B", fontWeight: 700 }}>{item.customerName}</p>
                              <p className="text-[11px]" style={{ color: "#8C5A3C" }}>{item.serviceName}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]" style={{ color: "#8C5A3C" }}>
                            <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{hh}:{mm}</span>
                            <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{item.customerPhone}</span>
                            <span className="inline-flex items-center gap-1"><Ticket className="w-3 h-3" />{item.id.slice(0, 8).toUpperCase()}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <a href={`tel:${item.customerPhone}`} className="px-2.5 py-1 rounded-lg text-[11px]" style={{ backgroundColor: "#fff", color: "#4B2E2B", border: "1px solid rgba(192,133,82,0.2)" }}>โทร</a>
                            <Link href={`/admin/queue?booking=${encodeURIComponent(item.id)}`} className="px-2.5 py-1 rounded-lg text-[11px]" style={{ backgroundColor: "#C08552", color: "#fff" }}>จัดการคิวนี้</Link>
                            {item.status === "pending" ? (
                              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: "#C08552" }}><CircleAlert className="w-3 h-3" />ควรยืนยันคิว</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: "#16A34A" }}><CircleCheck className="w-3 h-3" />ดำเนินการแล้ว</span>
                            )}
                          </div>
                        </div>
                      );
                    }) : <p className="text-xs px-2 py-2 rounded-lg" style={{ color: "#8C5A3C", backgroundColor: "#fdf7f1" }}>ยังไม่มีคิวที่กำลังจะมาถึง</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: "#C08552" }}>{(adminName || "A").trim().charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ backgroundColor: "#FFF8F0" }}>
          {children}
        </main>
      </div>

      <AIChatPopup mode="admin" />
    </div>
  );
}
