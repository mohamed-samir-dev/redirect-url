import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "data", "config.json");

function getTargetUrl(): string {
  const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return data.redirectUrl;
}

export async function GET(req: NextRequest) {
  const targetBase = getTargetUrl();
  const { searchParams } = new URL(req.url);
  const proxyPath = searchParams.get("path") || "/";

  const targetUrl = new URL(proxyPath, targetBase);
  // نقل الـ query params الأصلية
  searchParams.forEach((value, key) => {
    if (key !== "path") targetUrl.searchParams.set(key, value);
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": req.headers.get("user-agent") || "",
        "Accept": req.headers.get("accept") || "*/*",
        "Accept-Language": req.headers.get("accept-language") || "en",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";

    // لو مش HTML، رجعه زي ما هو (CSS, JS, images, fonts...)
    if (!contentType.includes("text/html")) {
      const body = await response.arrayBuffer();
      const headers = new Headers();
      headers.set("content-type", contentType);
      headers.set("access-control-allow-origin", "*");
      // لو CSS نعدل الروابط جواه
      if (contentType.includes("text/css")) {
        let css = new TextDecoder().decode(body);
        css = rewriteUrls(css, targetBase);
        return new NextResponse(css, { headers });
      }
      return new NextResponse(body, { headers });
    }

    // لو HTML، نعدل الروابط
    let html = await response.text();
    html = rewriteHtml(html, targetBase);

    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "access-control-allow-origin": "*",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function rewriteHtml(html: string, targetBase: string): string {
  const base = new URL(targetBase);
  const origin = base.origin;

  // نعدل الروابط المطلقة للموقع الهدف → تمر عبر البروكسي
  html = html.replace(
    new RegExp(`(href|src|action)=["'](${escapeRegex(origin)})(/[^"']*)["']`, "gi"),
    (_, attr, _origin, path) => `${attr}="/api/proxy?path=${encodeURIComponent(path)}"`
  );

  // نعدل الروابط النسبية اللي بتبدأ بـ /
  html = html.replace(
    /(href|src|action)=["']\/(?!api\/proxy)([^"']*)["']/gi,
    (_, attr, path) => `${attr}="/api/proxy?path=${encodeURIComponent("/" + path)}"`
  );

  // نضيف base tag عشان الروابط النسبية التانية
  html = html.replace(
    /<head([^>]*)>/i,
    `<head$1><base href="${origin}/">`
  );

  return html;
}

function rewriteUrls(content: string, targetBase: string): string {
  const base = new URL(targetBase);
  const origin = base.origin;
  content = content.replace(
    new RegExp(`url\\(["']?(${escapeRegex(origin)})(/[^"')]+)["']?\\)`, "gi"),
    (_, _origin, path) => `url("/api/proxy?path=${encodeURIComponent(path)}")`
  );
  return content;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
