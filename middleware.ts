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

async function proxyFetch(url: string, req: NextRequest, referer: string): Promise<NextResponse> {
  const proxyRes = await fetch(url, {
    headers: {
      "User-Agent": req.headers.get("user-agent") || "",
      "Accept": req.headers.get("accept") || "*/*",
      "Accept-Language": req.headers.get("accept-language") || "en",
      "Accept-Encoding": "identity",
      "Referer": referer,
    },
    redirect: "follow",
  });

  const contentType = proxyRes.headers.get("content-type") || "";
  const body = await proxyRes.arrayBuffer();

  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  const cacheControl = proxyRes.headers.get("cache-control");
  if (cacheControl) headers.set("cache-control", cacheControl);
  // السماح بتحميل الخطوط من أي مكان
  headers.set("access-control-allow-origin", "*");

  return new NextResponse(body, { status: proxyRes.status, headers });
}

async function proxyToTarget(req: NextRequest, targetBase: string): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const targetOrigin = new URL(targetBase).origin;

  const target = new URL(pathname, targetBase);
  req.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  // طلبات _next/ (JS, CSS, fonts) → نجيبها من الموقع الهدف مباشرة
  if (pathname.startsWith("/_next/")) {
    return proxyFetch(target.toString(), req, targetBase);
  }

  // طلبات HTML → نعمل proxy ونحول روابط التنقل
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
    // نحول روابط التنقل بس عشان تفضل على موقعنا
    html = html.replaceAll(`href="${targetOrigin}/`, `href="/`);
    html = html.replaceAll(`href='${targetOrigin}/`, `href='/`);
    // نخلي ملفات _next/ تشير للموقع الهدف مباشرة عشان المتصفح يجيبها من هناك
    html = html.replaceAll(`"/_next/`, `"${targetOrigin}/_next/`);
    html = html.replaceAll(`'/_next/`, `'${targetOrigin}/_next/`);
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
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // لوحة التحكم + ملفات موقعنا الستاتيك
  if (pathname.startsWith("/panel")) {
    return NextResponse.next();
  }

  try {
    const targetBase = await getTargetUrl(req.nextUrl.origin);
    return await proxyToTarget(req, targetBase);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  // نمسك كل الطلبات ما عدا لوحة التحكم و favicon
  matcher: ["/((?!panel|favicon.ico).*)"],
};
