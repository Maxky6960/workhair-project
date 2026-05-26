import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "./config";

const isInvalidRefreshTokenError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const authError = error as { code?: string; message?: string; status?: number };
  const message = authError.message?.toLowerCase() || "";

  return (
    authError.code === "refresh_token_not_found" ||
    (authError.status === 400 && message.includes("refresh token"))
  );
};

const clearSupabaseAuthCookies = (request: NextRequest, response: NextResponse) => {
  request.cookies.getAll().forEach(({ name }) => {
    if (!name.startsWith("sb-") || !name.includes("auth-token")) return;

    request.cookies.delete(name);
    response.cookies.delete(name);
  });
};

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const config = getSupabasePublicEnv();

  if (!config) {
    return response;
  }

  const supabase = createServerClient(
    config.url,
    config.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    const { error } = await supabase.auth.getUser();

    if (isInvalidRefreshTokenError(error)) {
      clearSupabaseAuthCookies(request, response);
    }
  } catch (error) {
    if (!isInvalidRefreshTokenError(error)) {
      throw error;
    }

    clearSupabaseAuthCookies(request, response);
  }

  return response;
}
