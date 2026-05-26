import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Calendar, User, Phone, Scissors, Clock, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BookingForm {
  firstName: string;
  lastName: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  note: string;
}

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
];

export function BookPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preService = searchParams.get("service") || "";
  const [services, setServices] = useState<Array<{ id: string; name: string; category: "men" | "women" | "other"; price: number; duration_minutes: number }>>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<BookingForm>({
    defaultValues: { service: preService, date: "", time: "", note: "" },
  });

  useEffect(() => {
    const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const checkAuth = async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.replace(`/signup?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setAuthChecked(true);
    };

    const fetchServices = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("services")
        .select("id,name,category,price,duration_minutes")
        .eq("is_active", true)
        .order("name");
      if (data) {
        setServices(data as Array<{ id: string; name: string; category: "men" | "women" | "other"; price: number; duration_minutes: number }>);
      }
    };

    checkAuth();
    fetchServices();
  }, [pathname, router, searchParams]);

  const groupedServices = useMemo(() => ({
    men: services.filter((s) => s.category === "men"),
    women: services.filter((s) => s.category === "women"),
    other: services.filter((s) => s.category === "other"),
  }), [services]);

  const onSubmit = async (data: BookingForm) => {
    setSubmitting(true);
    setErrorMessage(null);
    const service = services.find(s => s.name === data.service);
    let bookingRow: { id: string; created_at: string } | null = null;

    if (!service) {
      setSubmitting(false);
      setErrorMessage("ไม่พบทรงผมที่เลือก");
      return;
    }

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        durationMinutes: service.duration_minutes,
        date: data.date,
        time: data.time,
        note: data.note,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setSubmitting(false);
      setErrorMessage(payload?.error?.includes("overlaps") ? "ช่วงเวลานี้มีคิวแล้ว กรุณาเลือกเวลาใหม่" : "จองไม่สำเร็จ กรุณาลองใหม่");
      if (response.status === 401) {
        const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
        router.replace(`/signup?next=${encodeURIComponent(nextPath)}`);
      }
      return;
    }

    const payload = await response.json() as { booking?: { id: string; created_at: string } };
    bookingRow = payload.booking || null;

      const params = new URLSearchParams({
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        service: data.service,
        price: String(service?.price ?? 0),
        date: data.date,
        time: data.time,
        note: data.note ?? "",
        booking_id: bookingRow?.id ?? "",
        created_at: bookingRow?.created_at ?? "",
      });
    router.push(`/booking-confirmed?${params.toString()}`);
    setSubmitting(false);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all";
  const inputStyle = {
    backgroundColor: "#f5e9db",
    color: "#4B2E2B",
    border: "1.5px solid rgba(192,133,82,0.25)",
  };
  const inputFocusStyle = { borderColor: "#C08552" };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F0", color: "#8C5A3C" }}>กำลังตรวจสอบการเข้าสู่ระบบ...</div>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="py-14" style={{ backgroundColor: "#4B2E2B" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#C08552" }}>จองคิว</p>
          <h1 style={{ color: "#FFF8F0", fontWeight: 600, fontSize: "2rem" }}>จองคิวตัดผม</h1>
          <p className="mt-2 text-sm" style={{ color: "rgba(255,248,240,0.6)" }}>กรอกข้อมูลด้านล่าง เราจะยืนยันการจองให้โดยเร็ว</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl p-8" style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 30px rgba(75,46,43,0.1)" }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                  <User className="w-3.5 h-3.5" /> ชื่อ
                </label>
                <input
                  {...register("firstName", { required: "กรุณากรอกชื่อ" })}
                  placeholder="ชื่อ"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => Object.assign(e.target.style, { borderColor: "rgba(192,133,82,0.25)" })}
                />
                {errors.firstName && <p className="text-xs mt-1" style={{ color: "#d4183d" }}>{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                  <User className="w-3.5 h-3.5" /> นามสกุล
                </label>
                <input
                  {...register("lastName", { required: "กรุณากรอกนามสกุล" })}
                  placeholder="นามสกุล"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => Object.assign(e.target.style, { borderColor: "rgba(192,133,82,0.25)" })}
                />
                {errors.lastName && <p className="text-xs mt-1" style={{ color: "#d4183d" }}>{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                <Phone className="w-3.5 h-3.5" /> เบอร์โทรศัพท์
              </label>
              <input
                {...register("phone", { required: "กรุณากรอกเบอร์โทรศัพท์", pattern: { value: /^[0-9]{9,10}$/, message: "เบอร์โทรศัพท์ไม่ถูกต้อง" } })}
                placeholder="08X-XXX-XXXX"
                type="tel"
                className={inputClass}
                style={inputStyle}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, { borderColor: "rgba(192,133,82,0.25)" })}
              />
              {errors.phone && <p className="text-xs mt-1" style={{ color: "#d4183d" }}>{errors.phone.message}</p>}
            </div>

            {/* Service */}
            <div>
              <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                <Scissors className="w-3.5 h-3.5" /> เลือกทรงผม
              </label>
              <select
                {...register("service", { required: "กรุณาเลือกทรงผม" })}
                className={inputClass}
                style={{ ...inputStyle, appearance: "none" }}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, { borderColor: "rgba(192,133,82,0.25)" })}
              >
                 <option value="">-- เลือกทรงผม --</option>
                 <optgroup label="ทรงผมผู้ชาย">
                   {groupedServices.men.map(s => (
                     <option key={s.id} value={s.name}>{s.name} — ฿{s.price}</option>
                   ))}
                 </optgroup>
                 <optgroup label="ทรงผมผู้หญิง">
                   {groupedServices.women.map(s => (
                     <option key={s.id} value={s.name}>{s.name} — ฿{s.price}</option>
                   ))}
                 </optgroup>
                 {groupedServices.other.length > 0 && (
                   <optgroup label="ทรงผมอื่นๆ">
                     {groupedServices.other.map(s => (
                       <option key={s.id} value={s.name}>{s.name} — ฿{s.price}</option>
                     ))}
                   </optgroup>
                 )}
               </select>
               {errors.service && <p className="text-xs mt-1" style={{ color: "#d4183d" }}>{errors.service.message}</p>}
             </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                  <Calendar className="w-3.5 h-3.5" /> วันที่
                </label>
                <input
                  {...register("date", { required: "กรุณาเลือกวันที่" })}
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => Object.assign(e.target.style, { borderColor: "rgba(192,133,82,0.25)" })}
                />
                {errors.date && <p className="text-xs mt-1" style={{ color: "#d4183d" }}>{errors.date.message}</p>}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                  <Clock className="w-3.5 h-3.5" /> เวลา
                </label>
                <select
                  {...register("time", { required: "กรุณาเลือกเวลา" })}
                  className={inputClass}
                  style={{ ...inputStyle, appearance: "none" }}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => Object.assign(e.target.style, { borderColor: "rgba(192,133,82,0.25)" })}
                >
                  <option value="">-- เลือกเวลา --</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t} น.</option>)}
                </select>
                {errors.time && <p className="text-xs mt-1" style={{ color: "#d4183d" }}>{errors.time.message}</p>}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#8C5A3C" }}>
                <FileText className="w-3.5 h-3.5" /> หมายเหตุ (ไม่บังคับ)
              </label>
              <textarea
                {...register("note")}
                rows={3}
                placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ต้องการทรงแบบไหน..."
                className={inputClass + " resize-none"}
                style={inputStyle}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, { borderColor: "rgba(192,133,82,0.25)" })}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl text-sm transition-opacity hover:opacity-85"
              style={{ backgroundColor: "#C08552", color: "#ffffff", fontWeight: 600 }}
            >
              {submitting ? "กำลังบันทึก..." : "ยืนยันการจอง"}
            </button>

            {errorMessage && <p className="text-center text-xs" style={{ color: "#d4183d" }}>{errorMessage}</p>}

            <p className="text-center text-xs" style={{ color: "#8C5A3C" }}>
              หลังจากจองแล้ว ทางร้านจะติดต่อกลับเพื่อยืนยันภายใน 30 นาที
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
