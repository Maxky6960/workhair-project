import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const bucketName = "service-images";
const maxFileSize = 5 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
  if (error || isAdmin !== true) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  return { supabase };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }

  const extension = allowedTypes[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Only JPG, PNG, and WebP images are allowed" }, { status: 400 });
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
  }

  const writer = makeServiceClient();
  if (!writer) {
    return NextResponse.json({ error: "Missing Supabase service role key" }, { status: 500 });
  }

  const filePath = `services/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await writer.storage.from(bucketName).upload(filePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = writer.storage.from(bucketName).getPublicUrl(filePath);

  return NextResponse.json({ imageUrl: data.publicUrl });
}
