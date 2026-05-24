import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: isAdmin, error } = await supabase.rpc("is_current_user_admin");
  if (error || isAdmin !== true) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  return { supabase };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("bookings")
    .select("id,customer_name,customer_phone,service_name,service_price,appointment_at,duration_minutes,status")
    .order("appointment_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data || [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null) as { id?: string; status?: string; appointmentAt?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (body.appointmentAt) patch.appointment_at = body.appointmentAt;

  const { error } = await auth.supabase.from("bookings").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
