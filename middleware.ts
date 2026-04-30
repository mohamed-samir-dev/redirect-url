import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // لوحة التحكم والـ API يشتغلوا عادي
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // جيب الرابط الهدف من الـ API
  try {
    const apiUrl = new URL("/api/redirect", req.url);
    const res = await fetch(apiUrl.toString());
    const data = await res.json();
    const targetBase = data.redirectUrl || "https://example.com";

    // ابني الرابط الكامل للموقع الهدف
    const target = new URL(pathname + req.nextUrl.search, targetBase);

    // جيب المحتوى من الموقع الهدف
    const proxyRes = await fetch(target.toString(), {
      headers: {
        "User-Agent": req.headers.get("user-agent") || "",
        "Accept": req.headers.get("accept") || "*/*",
        "Accept-Language": req.headers.get("accept-language") || "en",
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
    });

    const contentType = proxyRes.headers.get("content-type") || "";
    const body = await proxyRes.arrayBuffer();

    // لو HTML نعدل الروابط المطلقة بس
    if (contentType.includes("text/html")) {
      let html = new TextDecoder().decode(body);

      const origin = new URL(targetBase).origin;

      // نحول الروابط المطلقة للموقع الهدف لروابط نسبية عشان تفضل على موقعنا
      html = html.replaceAll(origin, "");

      return new NextResponse(html, {
        status: proxyRes.status,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    }

    // أي حاجة تانية (CSS, JS, صور, خطوط) نرجعها زي ما هي
    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    const cacheControl = proxyRes.headers.get("cache-control");
    if (cacheControl) headers.set("cache-control", cacheControl);

    return new NextResponse(body, {
      status: proxyRes.status,
      headers,
    });
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
