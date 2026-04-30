import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // لوحة التحكم والـ API و Next.js internal files يشتغلوا عادي
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  try {
    const apiUrl = new URL("/api/redirect", req.url);
    const res = await fetch(apiUrl.toString());
    const data = await res.json();
    const targetBase = data.redirectUrl || "https://example.com";
    const origin = new URL(targetBase).origin;

    // ابني الرابط الكامل للموقع الهدف
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

    // لو الموقع الهدف رجع 404، سيبها تعدي
    if (proxyRes.status === 404) {
      return NextResponse.next();
    }

    const contentType = proxyRes.headers.get("content-type") || "";
    const body = await proxyRes.arrayBuffer();

    if (contentType.includes("text/html")) {
      let html = new TextDecoder().decode(body);
      // حول الروابط المطلقة لنسبية
      html = html.replaceAll(origin, "");
      // حول روابط _next الخاصة بالموقع الهدف عشان تتحمل منه مباشرة
      html = html.replaceAll('href="/_next/', `href="${origin}/_next/`);
      html = html.replaceAll('src="/_next/', `src="${origin}/_next/`);
      // نفس الحاجة للـ CSS و JS اللي بتتحمل من CDN
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
  matcher: ["/((?!_next|api|admin|favicon.ico).*)"],
};
