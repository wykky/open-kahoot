import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // Protect /host routes — must be signed in
  if (req.nextUrl.pathname.startsWith("/host") && !req.auth) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/host/:path*"],
};
