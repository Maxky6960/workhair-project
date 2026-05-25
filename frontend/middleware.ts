import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/_next/image") {
    const imageUrl = request.nextUrl.searchParams.get("url");

    if (imageUrl) {
      try {
        const parsedUrl = new URL(imageUrl);
        if (parsedUrl.protocol === "https:" && parsedUrl.hostname === "images.unsplash.com") {
          return NextResponse.redirect(parsedUrl);
        }
      } catch {
        // Fall through to Next's default handling for malformed image URLs.
      }
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/_next/image", "/((?!_next/static|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
