import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "molecule_session";
const MAX_AGE = 60 * 60 * 12;

type Payload = { email: string; exp: number };

function secret() {
  return process.env.MOLECULE_SESSION_SECRET || "";
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function sessionCookie(email: string) {
  const body = Buffer.from(JSON.stringify({ email, exp: Date.now() + MAX_AGE * 1000 } satisfies Payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): Payload | null {
  if (!token || !secret()) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (!payload.email || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function currentSession() {
  const jar = await cookies();
  return readSessionToken(jar.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;
