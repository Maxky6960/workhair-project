"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Scissors, XCircle, BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BookingRow = {
  id: string;
  service_name: string;
  service_price: number;
  appointment_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  created_at: string;
  notes: string | null;
  canCancel: boolean;
  createdLabel: string;
  cancelDeadlineLabel: string;
  appointmentLabel: string;
};

const cancelWindowMinutes = 30;

const enrichBookings = (rows: Array<{ id: string; service_name: string; service_price: number; appointment_at: string; status: BookingRow["status"]; created_at: string; notes: string | null }>) => {
  const now = Date.now();

  return rows.map((booking) => {
    const createdAt = new Date(booking.created_at);
    const cancelDeadline = new Date(createdAt.getTime() + cancelWindowMinutes * 60 * 1000);

    return {
      ...booking,
      canCancel: (booking.status === "pending" || booking.status === "confirmed") && cancelDeadline.getTime() > now,
      createdLabel: createdAt.toLocaleString("th-TH"),
      cancelDeadlineLabel: cancelDeadline.toLocaleString("th-TH"),
      appointmentLabel: new Date(booking.appointment_at).toLocaleString("th-TH", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    } as BookingRow;
  });
};

export function CustomerQueuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.replace("/login?next=/queue");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("id,service_name,service_price,appointment_at,status,created_at,notes")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setBookings(enrichBookings((data || []) as Array<{ id: string; service_name: string; service_price: number; appointment_at: string; status: BookingRow["status"]; created_at: string; notes: string | null }>));
      }

      setLoading(false);
    })();
  }, [router]);

  const cancelBooking = async (bookingId: string) => {
    setUpdatingId(bookingId);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) {
      setErrorMessage(error.message.includes("new row violates row-level security") ? "ยกเลิกได้เฉพาะภายใน 30 นาทีหลังจอง" : "ยกเลิกไม่สำเร็จ");
      setUpdatingId(null);
      return;
    }

    const { data: nextRows } = await supabase
      .from("bookings")
      .select("id,service_name,service_price,appointment_at,status,created_at,notes")
      .order("created_at", { ascending: false });

    setBookings(enrichBookings((nextRows || []) as Array<{ id: string; service_name: string; service_price: number; appointment_at: string; status: BookingRow["status"]; created_at: string; notes: string | null }>));
    setUpdatingId(null);
  };

  if (loading) {
    return <div className="py-20 text-center" style={{ color: "#8C5A3C" }}>กำลังโหลดคิวของคุณ...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#C08552" }}>คิวของฉัน</p>
        <h1 style={{ color: "#4B2E2B", fontSize: "1.75rem", fontWeight: 700 }}>รายการคิวที่จองไว้</h1>
        <p className="text-sm mt-2" style={{ color: "#8C5A3C" }}>ดูเวลาที่จองไว้และยกเลิกได้ภายใน 30 นาทีหลังการจอง</p>
      </div>

      {errorMessage && <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}>{errorMessage}</div>}

      {bookings.length === 0 ? (
        <div className="rounded-3xl p-8 text-center" style={{ backgroundColor: "#fff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
          <p style={{ color: "#4B2E2B", fontWeight: 600 }}>ยังไม่มีคิวที่จองไว้</p>
          <p className="text-sm mt-2" style={{ color: "#8C5A3C" }}>ไปที่หน้าจองเพื่อสร้างคิวใหม่ได้เลย</p>
          <Link href="/book" className="inline-flex mt-5 px-5 py-3 rounded-full text-sm" style={{ backgroundColor: "#C08552", color: "#fff" }}>จองคิว</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-3xl p-6" style={{ backgroundColor: "#fff", boxShadow: "0 2px 16px rgba(75,46,43,0.07)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: "#f5e9db", color: "#8C5A3C" }}>#{booking.id.slice(0, 8).toUpperCase()}</span>
                    <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: booking.status === "cancelled" ? "#fee2e2" : "#dcfce7", color: booking.status === "cancelled" ? "#b91c1c" : "#15803d" }}>
                      {booking.status === "cancelled" ? "ยกเลิกแล้ว" : booking.status === "confirmed" ? "ยืนยันแล้ว" : booking.status === "completed" ? "เสร็จสิ้น" : "รอยืนยัน"}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2" style={{ color: "#4B2E2B" }}><Scissors className="w-4 h-4" style={{ color: "#C08552" }} /> {booking.service_name} ฿{booking.service_price}</div>
                    <div className="flex items-center gap-2" style={{ color: "#4B2E2B" }}><Calendar className="w-4 h-4" style={{ color: "#C08552" }} /> {booking.appointmentLabel}</div>
                    <div className="flex items-center gap-2" style={{ color: "#4B2E2B" }}><Clock className="w-4 h-4" style={{ color: "#C08552" }} /> จองเมื่อ {booking.createdLabel}</div>
                    <div className="flex items-center gap-2" style={{ color: "#4B2E2B" }}><BadgeCheck className="w-4 h-4" style={{ color: "#C08552" }} /> ยกเลิกได้ถึง {booking.cancelDeadlineLabel}</div>
                  </div>

                  {booking.notes && <p className="text-sm rounded-2xl px-4 py-3" style={{ backgroundColor: "#f9f4ee", color: "#8C5A3C" }}>{booking.notes}</p>}
                </div>

                <div className="sm:text-right space-y-3">
                  <p className="text-xs" style={{ color: "#8C5A3C" }}>วันที่นัด</p>
                  <p style={{ color: "#4B2E2B", fontWeight: 600 }}>{new Date(booking.appointment_at).toLocaleDateString("th-TH")}</p>
                  {booking.canCancel ? (
                    <button
                      onClick={() => void cancelBooking(booking.id)}
                      disabled={updatingId === booking.id}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm disabled:opacity-60"
                      style={{ backgroundColor: "#EF4444", color: "#fff" }}
                    >
                      <XCircle className="w-4 h-4" />
                      {updatingId === booking.id ? "กำลังยกเลิก..." : "ยกเลิกคิว"}
                    </button>
                  ) : (
                    <p className="text-xs" style={{ color: "#8C5A3C" }}>ยกเลิกไม่ได้แล้ว</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
