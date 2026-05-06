import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/unauthorized", "/api/auth"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // อนุญาต public paths ผ่านไปได้เลย
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ดึง session cookie ของ better-auth (cookie name: "better-auth.session_token")
  const sessionCookie =
    request.cookies.get("better-auth.session_token")?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // เช็ค allowlist ผ่าน API (เฉพาะกรณีที่มี session แล้ว)
  try {
    const res = await fetch(
      `${request.nextUrl.origin}/api/auth/get-session`,
      {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      }
    );
    if (res.ok) {
      const session = await res.json();
      const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      if (
        session?.user?.email &&
        !allowedEmails.includes(session.user.email)
      ) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  } catch {
    // ถ้า fetch ล้มเหลว อนุญาตให้ผ่าน (session cookie มีอยู่แล้ว)
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts).*)",
  ],
};
