import { NextRequest, NextResponse } from "next/server";
import { hostedResponse } from "@/lib/hosted";
import { runDesk } from "@/lib/desk/run";

export const maxDuration = 60;

async function handle(req: NextRequest, path: string[]) {
  const rel = "/" + path.join("/");
  const origin = process.env.MOLECULE_API_ORIGIN?.replace(/\/$/, "");
  if (origin) {
    const target = `${origin}${rel}${req.nextUrl.search}`;
    const init: RequestInit = {
      method: req.method,
      headers: { "Content-Type": "application/json" },
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.text();
    }
    const res = await fetch(target, init);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  }
  if (req.method === "POST" && rel === "/research") {
    let hypothesis = "";
    let attachment: string | undefined;
    try {
      const body = await req.json();
      hypothesis = typeof body?.hypothesis === "string" ? body.hypothesis : "";
      attachment = typeof body?.attachment === "string" ? body.attachment : undefined;
    } catch {
      hypothesis = "";
    }
    return NextResponse.json(await runDesk(hypothesis, attachment));
  }
  let hypothesis: string | undefined;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      hypothesis = typeof body?.hypothesis === "string" ? body.hypothesis : undefined;
    } catch {
      hypothesis = undefined;
    }
  }
  return NextResponse.json(hostedResponse(req.method, rel + req.nextUrl.search, hypothesis));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
