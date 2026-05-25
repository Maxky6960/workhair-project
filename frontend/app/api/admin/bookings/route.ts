import { NextRequest, NextResponse } from "next/server";
import { requireAdminServer } from "@/lib/auth/admin";
import { bookingNextStepLabel, bookingStatusLabel, sendTelegramMessage } from "@/lib/notifications/telegram";

export async function GET() {
  const auth = await requireAdminServer();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("bookings")
    .select("id,customer_name,customer_phone,service_name,service_price,appointment_at,duration_minutes,status")
    .order("appointment_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data || [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminServer();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null) as { id?: string; status?: string; appointmentAt?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (body.appointmentAt) patch.appointment_at = body.appointmentAt;

  const { data: before } = await auth.supabase
    .from("bookings")
    .select("customer_name,customer_phone,service_name,appointment_at,status")
    .eq("id", body.id)
    .maybeSingle();

  const { error } = await auth.supabase.from("bookings").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.status) {
    const { data: adminSettings } = await auth.supabase
      .from("admin_settings")
      .select("telegram_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (adminSettings?.telegram_enabled && before) {
      const appointment = new Date(before.appointment_at);
      const date = appointment.toLocaleDateString("th-TH");
      const time = `${String(appointment.getHours()).padStart(2, "0")}:${String(appointment.getMinutes()).padStart(2, "0")}`;
      const previousStatus = bookingStatusLabel(before.status);
      const nextStatus = bookingStatusLabel(body.status);
      const nextStep = bookingNextStepLabel(body.status);
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
      const queueUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/admin/queue` : undefined;
      const message = [
        "<b>QUEUE STATUS UPDATED</b>",
        "",
        `<b>ลูกค้า:</b> ${before.customer_name}`,
        `<b>โทร:</b> ${before.customer_phone}`,
        `<b>บริการ:</b> ${before.service_name}`,
        `<b>นัดหมาย:</b> ${date} ${time}`,
        "",
        `<b>สถานะ:</b> ${previousStatus} -> ${nextStatus}`,
        `<b>ทำต่อ:</b> ${nextStep}`,
      ].join("\n");

      const inlineKeyboard = {
        inline_keyboard: [
          [
            ...(queueUrl ? [{ text: "เปิดคิวในระบบ", url: queueUrl }] : []),
            { text: "โทรหาลูกค้า", url: `tel:${before.customer_phone}` },
          ],
        ],
      };

      await sendTelegramMessage(message, inlineKeyboard);
    }
  }

  return NextResponse.json({ ok: true });
}
