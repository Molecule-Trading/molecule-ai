import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, sessionCookie } from "@/lib/session";

const misses = new Map<string, { n: number; until: number }>();

function same(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const hit = misses.get(ip);
  if (hit && hit.until > Date.now()) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const emailEnv = process.env.MOLECULE_ADMIN_EMAIL || "";
  const passwordEnv = process.env.MOLECULE_ADMIN_PASSWORD || "";
  if (!emailEnv || !passwordEnv || !process.env.MOLECULE_SESSION_SECRET) {
    return NextResponse.json({ error: "Sign-in is not configured." }, { status: 503 });
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = String(body.email || "").trim().toLowerCase();
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ok = same(email, emailEnv.trim().toLowerCase()) && same(password, passwordEnv);
  if (!ok) {
    const n = (hit && hit.until > Date.now() ? hit.n : hit?.n || 0) + 1;
    misses.set(ip, { n, until: n >= 5 ? Date.now() + 15 * 60 * 1000 : Date.now() + 1000 });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  misses.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionCookie(emailEnv.trim().toLowerCase()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
