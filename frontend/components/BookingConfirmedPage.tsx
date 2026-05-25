import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle, Calendar, Clock, Scissors, Phone, User, Home } from "lucide-react";

interface BookingState {
  name: string;
  phone: string;
  service: string;
  price: number;
  date: string;
  time: string;
  note?: string;
  bookingId?: string;
  createdAt?: string;
}

export function BookingConfirmedPage() {
  const searchParams = useSearchParams();
  const state = {
    name: searchParams.get("name") ?? "",
    phone: searchParams.get("phone") ?? "",
    service: searchParams.get("service") ?? "",
    price: Number(searchParams.get("price") ?? "0"),
    date: searchParams.get("date") ?? "",
    time: searchParams.get("time") ?? "",
    note: searchParams.get("note") ?? "",
    bookingId: searchParams.get("booking_id") ?? "",
    createdAt: searchParams.get("created_at") ?? "",
  } as BookingState;

  const formatDate = (d: string) => {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const queueId = state.bookingId ? `Q${state.bookingId.slice(0, 8).toUpperCase()}` : "Q000";

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="max-w-md w-full">
        {/* Success animation */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "rgba(192,133,82,0.15)", border: "3px solid #C08552" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
            >
              <CheckCircle className="w-12 h-12" style={{ color: "#C08552" }} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h1 className="mb-2" style={{ color: "#4B2E2B", fontSize: "1.75rem", fontWeight: 700 }}>
              จองคิวเสร็จสิ้น!
            </h1>
            <p className="text-sm" style={{ color: "#8C5A3C" }}>ขอบคุณที่ใช้บริการ Workhair นะคะ</p>
          </motion.div>
        </div>

        {/* Booking card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="rounded-3xl overflow-hidden mb-6"
          style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 30px rgba(75,46,43,0.1)" }}
        >
          <div className="px-6 py-4 text-center" style={{ backgroundColor: "#4B2E2B" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#C08552" }}>หมายเลขคิว</p>
            <p style={{ color: "#FFF8F0", fontSize: "2rem", fontWeight: 700 }}>{queueId}</p>
          </div>

          {state ? (
            <div className="p-6 space-y-4">
              {[
                { icon: User, label: "ชื่อ-นามสกุล", value: state.name },
                { icon: Phone, label: "เบอร์โทรศัพท์", value: state.phone },
                { icon: Scissors, label: "ทรงผม", value: `${state.service} (฿${state.price})` },
                { icon: Calendar, label: "วันที่", value: formatDate(state.date) },
                { icon: Clock, label: "เวลา", value: `${state.time} น.` },
                { icon: Calendar, label: "จองเมื่อ", value: state.createdAt ? new Date(state.createdAt).toLocaleString("th-TH") : "-" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3 pb-3 border-b" style={{ borderColor: "rgba(192,133,82,0.15)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "#f5e9db" }}>
                      <Icon className="w-4 h-4" style={{ color: "#C08552" }} />
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "#8C5A3C" }}>{item.label}</p>
                      <p className="text-sm" style={{ color: "#4B2E2B", fontWeight: 500 }}>{item.value}</p>
                    </div>
                  </div>
                );
              })}
              {state.note && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "#8C5A3C" }}>หมายเหตุ</p>
                  <p className="text-sm" style={{ color: "#4B2E2B" }}>{state.note}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-sm" style={{ color: "#8C5A3C" }}>ไม่มีข้อมูลการจอง</div>
          )}
        </motion.div>

        {/* Notice */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="rounded-2xl p-4 mb-6 text-center text-sm"
          style={{ backgroundColor: "rgba(192,133,82,0.1)", border: "1px solid rgba(192,133,82,0.2)" }}
        >
          <p style={{ color: "#8C5A3C" }}>ทางร้านจะโทรยืนยันภายใน 30 นาที หากไม่ได้รับการยืนยัน กรุณาโทร <span style={{ color: "#C08552", fontWeight: 600 }}>02-XXX-XXXX</span></p>
        </motion.div>

        {/* Back button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="text-center"
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/queue"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm transition-opacity hover:opacity-85"
              style={{ backgroundColor: "#4B2E2B", color: "#ffffff", fontWeight: 600 }}
            >
              ดูคิวของฉัน
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm transition-opacity hover:opacity-85"
              style={{ backgroundColor: "#C08552", color: "#ffffff", fontWeight: 600 }}
            >
              <Home className="w-4 h-4" />
              กลับหน้าหลัก
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
