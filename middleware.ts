import { NextRequest, NextResponse } from "next/server";

let cachedUrl: { url: string; ts: number } | null = null;

async function getTargetUrl(origin: string): Promise<string> {
  try {
    if (cachedUrl && Date.now() - cachedUrl.ts < 10_000) return cachedUrl.url;
    const res = await fetch(`${origin}/panel-api/redirect`);
    const data = await res.json();
    cachedUrl = { url: data.redirectUrl || "https://example.com", ts: Date.now() };
    return cachedUrl.url;
  } catch {
    return cachedUrl?.url || "https://example.com";
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/panel")) {
    return NextResponse.next();
  }

  try {
    const targetBase = await getTargetUrl(req.nextUrl.origin);
    const origin = new URL(targetBase).origin;
    const target = new URL(pathname + req.nextUrl.search, targetBase);

    const proxyRes = await fetch(target.toString(), {
      headers: {
        "User-Agent": req.headers.get("user-agent") || "",
        "Accept": req.headers.get("accept") || "*/*",
        "Accept-Language": req.headers.get("accept-language") || "en",
        "Accept-Encoding": "identity",
        "Referer": targetBase,
      },
      redirect: "follow",
    });

    const contentType = proxyRes.headers.get("content-type") || "";
    const body = await proxyRes.arrayBuffer();

    if (contentType.includes("text/html")) {
      let html = new TextDecoder().decode(body);
      html = html.replaceAll(origin, "");
      return new NextResponse(html, {
        status: proxyRes.status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    const cacheControl = proxyRes.headers.get("cache-control");
    if (cacheControl) headers.set("cache-control", cacheControl);

    return new NextResponse(body, { status: proxyRes.status, headers });
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!panel).*)"],
};
