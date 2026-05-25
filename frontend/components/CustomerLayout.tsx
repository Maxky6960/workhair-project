import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Scissors, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const navLinks = [
    { to: "/", label: "หน้าหลัก" },
    { to: "/menu", label: "เมนูทรงผม" },
    { to: "/book", label: "จองคิว" },
    { to: "/queue", label: "คิวของฉัน" },
  ];

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    let active = true;

    const loadAuthState = async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!active) return;

      if (!user) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      setIsLoggedIn(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (!active) return;

      setIsAdmin(Boolean(profile?.is_admin));
      setAuthReady(true);
    };

    void loadAuthState();

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8F0" }}>
      <nav
        className="sticky top-0 z-50"
        style={{ backgroundColor: "#ffffff", borderBottom: "1px solid rgba(192,133,82,0.2)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#C08552" }}>
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <span style={{ color: "#4B2E2B", letterSpacing: "0.25em", fontSize: "1rem" }} className="uppercase tracking-widest">
                WORKHAIR
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  href={link.to}
                  className="text-sm transition-all duration-200"
                  style={{
                    color: isActive(link.to) ? "#C08552" : "#4B2E2B",
                    borderBottom: isActive(link.to) ? "2px solid #C08552" : "2px solid transparent",
                    paddingBottom: "2px",
                  }}
                >
                  {link.label}
                </Link>
              ))}
              {authReady && !isLoggedIn && (
                <Link
                  href="/login"
                  className="px-5 py-2 rounded-full text-sm transition-opacity hover:opacity-85"
                  style={{ backgroundColor: "#C08552", color: "#ffffff" }}
                >
                  เข้าสู่ระบบ
                </Link>
              )}
              {authReady && isLoggedIn && isAdmin && (
                <Link
                  href="/admin"
                  className="px-5 py-2 rounded-full text-sm transition-opacity hover:opacity-85"
                  style={{ backgroundColor: "#4B2E2B", color: "#FFF8F0" }}
                >
                  เข้า Dashboard
                </Link>
              )}
              {authReady && isLoggedIn && (
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-full text-sm transition-opacity hover:opacity-85"
                  style={{ backgroundColor: "#f5e9db", color: "#8C5A3C" }}
                >
                  ออกจากระบบ
                </button>
              )}
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen
                ? <X className="w-5 h-5" style={{ color: "#4B2E2B" }} />
                : <Menu className="w-5 h-5" style={{ color: "#4B2E2B" }} />}
            </button>
          </div>

          {mobileOpen && (
            <div className="md:hidden pb-4 space-y-1 border-t" style={{ borderColor: "rgba(192,133,82,0.15)" }}>
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  href={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-3 text-sm rounded-lg"
                  style={{ color: isActive(link.to) ? "#C08552" : "#4B2E2B", backgroundColor: isActive(link.to) ? "rgba(192,133,82,0.08)" : "transparent" }}
                >
                  {link.label}
                </Link>
              ))}
              {authReady && !isLoggedIn && (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-3 text-sm"
                  style={{ color: "#C08552" }}
                >
                  เข้าสู่ระบบ / สมัครสมาชิก
                </Link>
              )}
              {authReady && isLoggedIn && isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-3 text-sm"
                  style={{ color: "#4B2E2B", fontWeight: 600 }}
                >
                  ปุ่มพิเศษ: เข้า Dashboard
                </Link>
              )}
              {authReady && isLoggedIn && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    void logout();
                  }}
                  className="block px-2 py-3 text-sm"
                  style={{ color: "#8C5A3C" }}
                >
                  ออกจากระบบ
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      <main>
        {children}
      </main>

      <footer className="mt-16 py-12" style={{ backgroundColor: "#4B2E2B" }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#C08552" }}>
              <Scissors className="w-3.5 h-3.5 text-white" />
            </div>
            <span style={{ color: "#FFF8F0", letterSpacing: "0.25em" }} className="text-sm uppercase">WORKHAIR</span>
          </div>
          <p className="text-sm mb-1" style={{ color: "rgba(255,248,240,0.6)" }}>ร้านตัดผม หญิง ชาย | เปิดทุกวัน 09:00 - 20:00 น.</p>
          <p className="text-xs" style={{ color: "rgba(255,248,240,0.35)" }}>© 2026 Workhair. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
