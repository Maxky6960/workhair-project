import { type NextRequest, NextResponse } from "next/server";
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
    .from("services")
    .select("id,name,category,price,duration_minutes,description,image_url,is_active")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null) as
    | { name?: string; category?: "men" | "women" | "other"; price?: number; duration_minutes?: number; description?: string | null; image_url?: string | null; is_active?: boolean }
    | null;

  if (!body?.name || typeof body.price !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("services").insert({
    name: body.name.trim(),
    category: body.category || "other",
    price: body.price,
    duration_minutes: body.duration_minutes || 30,
    description: body.description || null,
    image_url: body.image_url || null,
    is_active: body.is_active ?? true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await request.json().catch(() => null) as Partial<{ name: string; category: "men" | "women" | "other"; price: number; duration_minutes: number; description: string | null; image_url: string | null; is_active: boolean }> | null;
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { error } = await auth.supabase.from("services").update(body).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await auth.supabase.from("services").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
