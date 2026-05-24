import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const makeServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: isAdmin, error } = await supabase.rpc("is_current_user_admin");
  if (error || isAdmin !== true) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, adminUserId: authData.user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const [{ data: shop }, { data: admin }] = await Promise.all([
    auth.supabase.from("shop_settings").select("shop_name,address,phone,open_hours,line_id,facebook").eq("id", 1).maybeSingle(),
    auth.supabase.from("admin_settings").select("telegram_enabled,daily_report,report_time,ai_model_name,ai_system_prompt,rag_enabled,rag_content").eq("id", 1).maybeSingle(),
  ]);

  return NextResponse.json({ shop, admin });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: {
    section?: "shop" | "hours" | "ai" | "notifications";
    shopInfo?: { name?: string; address?: string; phone?: string; lineId?: string; facebook?: string };
    hours?: unknown;
    aiSettings?: { modelName?: string; systemPrompt?: string; ragEnabled?: boolean; ragContent?: string };
    notifications?: { enabled?: boolean; dailyReport?: boolean; reportTime?: string };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const writer = makeServiceClient() ?? auth.supabase;

  if (body.section === "shop" || body.section === "hours") {
    const { error } = await writer.from("shop_settings").update({
      shop_name: body.shopInfo?.name?.trim() || "Workhair",
      address: body.shopInfo?.address?.trim() || null,
      phone: body.shopInfo?.phone?.trim() || null,
      line_id: body.shopInfo?.lineId?.trim() || null,
      facebook: body.shopInfo?.facebook?.trim() || null,
      open_hours: JSON.stringify(body.hours ?? {}),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (body.section === "notifications") {
    const { error } = await writer.from("admin_settings").update({
      telegram_enabled: Boolean(body.notifications?.enabled),
      daily_report: Boolean(body.notifications?.dailyReport),
      report_time: body.notifications?.reportTime || "21:00",
      updated_at: new Date().toISOString(),
    }).eq("id", 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (body.section === "ai") {
    const { error } = await writer.from("admin_settings").update({
      ai_model_name: body.aiSettings?.modelName || "auto",
      ai_system_prompt: body.aiSettings?.systemPrompt || "",
      rag_enabled: Boolean(body.aiSettings?.ragEnabled),
      rag_content: body.aiSettings?.ragContent || "",
      updated_at: new Date().toISOString(),
    }).eq("id", 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
