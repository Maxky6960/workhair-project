import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "./config";

export function createClient() {
  const { url, publishableKey } = requireSupabasePublicEnv();

  return createBrowserClient(
    url,
    publishableKey,
  );
}
