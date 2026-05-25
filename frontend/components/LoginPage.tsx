"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Scissors, User, Lock, Phone, Mail, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LoginForm { email: string; password: string; }
interface RegisterForm { name: string; email: string; phone: string; password: string; confirmPassword: string; }

type SupabaseAuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

interface LoginPageProps {
  defaultTab?: "login" | "register";
  initialErrorMessage?: string | null;
  redirectTo?: string | null;
}

export function LoginPage({ defaultTab = "login", initialErrorMessage = null, redirectTo = null }: LoginPageProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [showPass, setShowPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const getSupabaseClient = () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setErrorMessage("ยังไม่ได้ตั้งค่า Supabase URL/API key");
      return null;
    }

    return createClient();
  };

  const resolveLanding = async (supabase: ReturnType<typeof createClient>) => {
    const { data, error } = await supabase.rpc("is_current_user_admin");

    if (!error && data === true) {
      return "/admin";
    }

    return redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  };

  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>();

  const visibleErrorMessage = errorMessage || initialErrorMessage;

  const getAuthErrorMessage = (error: SupabaseAuthErrorLike | null, mode: "login" | "register") => {
    if (!error) {
      return mode === "login"
        ? "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
        : "สมัครสมาชิกไม่สำเร็จ";
    }

    const code = error.code?.toLowerCase() || "";
    const message = error.message?.toLowerCase() || "";

    if (code === "over_email_send_rate_limit" || error.status === 429 || message.includes("email rate limit exceeded")) {
      return "ส่งอีเมลยืนยันบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
    }

    if (code === "user_already_registered" || message.includes("user already registered")) {
      return "อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบแทน";
    }

    if (mode === "login") {
      return "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน";
    }

    return error.message || "สมัครสมาชิกไม่สำเร็จ";
  };

  const onLogin = async (data: LoginForm) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const email = data.email.trim().toLowerCase();

    if (!email.includes("@")) {
      setErrorMessage("กรุณาใช้อีเมลในการเข้าสู่ระบบ");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error) {
      setErrorMessage(getAuthErrorMessage(error, "login"));
      setLoading(false);
      return;
    }

    const { data: authUser } = await supabase.auth.getUser();
    const landing = authUser.user?.id ? await resolveLanding(supabase) : "/";
    router.push(landing);
    router.refresh();
    setLoading(false);
  };

  const onRegister = async (data: RegisterForm) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (data.password !== data.confirmPassword) {
      setErrorMessage("รหัสผ่านไม่ตรงกัน");
      setLoading(false);
      return;
    }

    const normalizedEmail = data.email.trim().toLowerCase();

    const { data: signup, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`,
        data: {
          full_name: data.name.trim(),
          phone: data.phone.trim(),
        },
      },
    });

    if (error) {
      setErrorMessage(getAuthErrorMessage(error, "register"));
      setLoading(false);
      return;
    }

    if (signup.session && signup.user) {
      const landing = await resolveLanding(supabase);
      router.push(landing);
      router.refresh();
    } else {
      setTab("login");
      setSuccessMessage("สมัครสมาชิกเรียบร้อยแล้ว กรุณาตรวจอีเมลเพื่อยืนยันบัญชี");
    }

    setLoading(false);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all";
  const inputStyle = { backgroundColor: "#f5e9db", color: "#4B2E2B", border: "1.5px solid rgba(192,133,82,0.25)" };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#C08552" }}>
            <Scissors className="w-7 h-7 text-white" />
          </div>
          <h1 style={{ color: "#4B2E2B", fontSize: "1.5rem", fontWeight: 700 }}>WORKHAIR</h1>
          <p className="text-xs mt-1" style={{ color: "#8C5A3C" }}>ยินดีต้อนรับสู่ระบบจัดการ</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 30px rgba(75,46,43,0.1)" }}>
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "rgba(192,133,82,0.15)" }}>
            {(["login", "register"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-4 text-sm transition-colors"
                style={{
                  color: tab === t ? "#C08552" : "#8C5A3C",
                  borderBottom: tab === t ? "2px solid #C08552" : "2px solid transparent",
                  fontWeight: tab === t ? 600 : 400,
                }}
              >
                {t === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
              </button>
            ))}
          </div>

          <div className="p-7">
            {tab === "login" ? (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                    <Mail className="w-3.5 h-3.5" /> อีเมล
                  </label>
                  <input
                    {...loginForm.register("email", { required: true })}
                    type="email"
                    placeholder="your@email.com"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                    <Lock className="w-3.5 h-3.5" /> รหัสผ่าน
                  </label>
                  <div className="relative">
                    <input
                      {...loginForm.register("password", { required: true })}
                      type={showPass ? "text" : "password"}
                      placeholder="รหัสผ่าน"
                      className={inputClass + " pr-12"}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "#8C5A3C" }}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl text-sm transition-opacity hover:opacity-85 mt-2 disabled:opacity-60"
                  style={{ backgroundColor: "#C08552", color: "#ffffff", fontWeight: 600 }}
                >
                  {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>

                {successMessage && (
                  <p className="text-xs" style={{ color: "#16a34a" }}>
                    {successMessage}
                  </p>
                )}
                {visibleErrorMessage && (
                  <p className="text-xs" style={{ color: "#d4183d" }}>
                    {visibleErrorMessage}
                  </p>
                )}

                {/* Admin hint */}
                <div className="rounded-xl p-3" style={{ backgroundColor: "#f5e9db" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3.5 h-3.5" style={{ color: "#C08552" }} />
                    <p className="text-xs" style={{ color: "#8C5A3C", fontWeight: 600 }}>เข้าสู่ระบบด้วยอีเมลเท่านั้น</p>
                  </div>
                  <p className="text-xs" style={{ color: "#8C5A3C" }}>กรอกอีเมลและรหัสผ่าน</p>
                </div>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                    <User className="w-3.5 h-3.5" /> ชื่อ-นามสกุล
                  </label>
                  <input
                    {...registerForm.register("name", { required: true })}
                    placeholder="ชื่อ-นามสกุล"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                    <Mail className="w-3.5 h-3.5" /> อีเมล
                  </label>
                  <input
                    {...registerForm.register("email", { required: true })}
                    type="email"
                    placeholder="your@email.com"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                    <Phone className="w-3.5 h-3.5" /> เบอร์โทรศัพท์
                  </label>
                  <input
                    {...registerForm.register("phone", { required: true })}
                    placeholder="08X-XXX-XXXX"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                    <Lock className="w-3.5 h-3.5" /> รหัสผ่าน
                  </label>
                  <input
                    {...registerForm.register("password", { required: true })}
                    type="password"
                    placeholder="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                    <Lock className="w-3.5 h-3.5" /> ยืนยันรหัสผ่าน
                  </label>
                  <input
                    {...registerForm.register("confirmPassword", { required: true })}
                    type="password"
                    placeholder="ยืนยันรหัสผ่าน"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl text-sm transition-opacity hover:opacity-85 disabled:opacity-60"
                  style={{ backgroundColor: "#C08552", color: "#ffffff", fontWeight: 600 }}
                >
                  {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                </button>

                {successMessage && (
                  <p className="text-xs" style={{ color: "#16a34a" }}>
                    {successMessage}
                  </p>
                )}

                {visibleErrorMessage && (
                  <p className="text-xs" style={{ color: "#d4183d" }}>
                    {visibleErrorMessage}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-sm space-y-2" style={{ color: "#8C5A3C" }}>
          <p>
            <Link href="/" style={{ color: "#C08552" }}>← กลับหน้าหลัก</Link>
          </p>
          <p>
            {tab === "login" ? (
              <Link href={redirectTo ? `/signup?next=${encodeURIComponent(redirectTo)}` : "/signup"} style={{ color: "#C08552" }}>ยังไม่มีบัญชี? สมัครสมาชิก</Link>
            ) : (
              <Link href={redirectTo ? `/login?next=${encodeURIComponent(redirectTo)}` : "/login"} style={{ color: "#C08552" }}>มีบัญชีแล้ว? เข้าสู่ระบบ</Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
