import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bookingNextStepLabel, bookingStatusLabel, sendTelegramMessage } from "@/lib/notifications/telegram";

type CreateBookingBody = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  durationMinutes?: number;
  date?: string;
  time?: string;
  note?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as CreateBookingBody | null;
  if (!body?.firstName || !body.lastName || !body.phone || !body.serviceId || !body.serviceName || typeof body.servicePrice !== "number" || !body.date || !body.time) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const appointmentAt = new Date(`${body.date}T${body.time}:00+07:00`).toISOString();
  const { data: bookingResult, error } = await supabase
    .from("bookings")
    .insert({
      customer_name: `${body.firstName} ${body.lastName}`,
      customer_phone: body.phone,
      service_id: body.serviceId,
      service_name: body.serviceName,
      service_price: body.servicePrice,
      duration_minutes: body.durationMinutes || 30,
      appointment_at: appointmentAt,
      notes: body.note || null,
      created_by: user.id,
    })
    .select("id,created_at,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: adminSettings } = await supabase
    .from("admin_settings")
    .select("telegram_enabled")
    .eq("id", 1)
    .maybeSingle();

  if (adminSettings?.telegram_enabled) {
    const status = bookingResult?.status || "pending";
    const statusLabel = bookingStatusLabel(status);
    const nextStep = bookingNextStepLabel(status);
    const noteText = body.note?.trim() ? body.note.trim() : "-";
    const bookingId = bookingResult?.id || "-";
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const queueUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/admin/queue` : undefined;
    const queueWithSearchUrl = baseUrl && bookingId !== "-"
      ? `${baseUrl.replace(/\/$/, "")}/admin/queue?booking=${encodeURIComponent(bookingId)}`
      : queueUrl;
    const message = [
      "<b>NEW BOOKING</b>",
      "",
      `<b>ลูกค้า:</b> ${body.firstName} ${body.lastName}`,
      `<b>โทร:</b> ${body.phone}`,
      `<b>บริการ:</b> ${body.serviceName} (฿${body.servicePrice})`,
      `<b>นัดหมาย:</b> ${body.date} ${body.time}`,
      `<b>รหัสคิว:</b> ${bookingId}`,
      `<b>หมายเหตุ</b>: ${noteText}`,
      "",
      `<b>สถานะตอนนี้:</b> ${statusLabel}`,
      `<b>ทำต่อ:</b> ${nextStep}`,
    ].join("\n");

    const inlineKeyboard = {
      inline_keyboard: [
        [
          ...(queueWithSearchUrl ? [{ text: "เปิดคิวในระบบ", url: queueWithSearchUrl }] : []),
          { text: "โทรหาลูกค้า", url: `tel:${body.phone}` },
        ],
        ...(queueWithSearchUrl
          ? [[
              { text: "ไปเปลี่ยนเป็น ยืนยันแล้ว", url: queueWithSearchUrl },
              { text: "ไปเปลี่ยนเป็น ยกเลิก", url: queueWithSearchUrl },
            ]]
          : []),
      ],
    };

    await sendTelegramMessage(message, inlineKeyboard);
  }

  return NextResponse.json({ booking: bookingResult });
}
