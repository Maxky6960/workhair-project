import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const toLoginErrorUrl = (url: URL) => {
  const error = url.searchParams.get("error") || "access_denied";
  const errorCode = url.searchParams.get("error_code") || "";
  const errorDescription = url.searchParams.get("error_description") || "ไม่สามารถยืนยันอีเมลได้";
  const params = new URLSearchParams();

  params.set("error", error);
  if (errorCode) params.set("error_code", errorCode);
  if (errorDescription) params.set("error_description", errorDescription);

  return `/login?${params.toString()}`;
};

const resolveLanding = async (supabase: Awaited<ReturnType<typeof createClient>>) => {
  const { data, error } = await supabase.rpc("is_current_user_admin");

  return !error && data === true ? "/admin" : "/";
};

const safeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextPath = safeNextPath(url.searchParams.get("next"));

  if (error) {
    return NextResponse.redirect(new URL(toLoginErrorUrl(url), request.url));
  }

  const supabase = await createClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(new URL(toLoginErrorUrl(url), request.url));
    }
  } else if (tokenHash && type === "email") {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (verifyError) {
      return NextResponse.redirect(new URL(toLoginErrorUrl(url), request.url));
    }
  } else {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const landing = await resolveLanding(supabase);
  return NextResponse.redirect(new URL(landing === "/" && nextPath ? nextPath : landing, request.url));
}
