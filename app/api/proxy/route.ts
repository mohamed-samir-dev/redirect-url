import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

async function getTargetUrl(): Promise<string> {
  const db = await getDb();
  const config = await db.collection("config").findOne({ _id: "redirect" as never });
  return config?.redirectUrl || "https://example.com";
}

export async function GET(req: NextRequest) {
  const targetBase = await getTargetUrl();
  const { searchParams } = new URL(req.url);
  const proxyPath = searchParams.get("path") || "/";

  const targetUrl = new URL(proxyPath, targetBase);
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

    if (!contentType.includes("text/html")) {
      const body = await response.arrayBuffer();
      const headers = new Headers();
      headers.set("content-type", contentType);
      headers.set("access-control-allow-origin", "*");
      if (contentType.includes("text/css")) {
        let css = new TextDecoder().decode(body);
        css = rewriteUrls(css, targetBase);
        return new NextResponse(css, { headers });
      }
      return new NextResponse(body, { headers });
    }

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

  html = html.replace(
    new RegExp(`(href|src|action)=["'](${escapeRegex(origin)})(/[^"']*)["']`, "gi"),
    (_, attr, _origin, path) => `${attr}="/api/proxy?path=${encodeURIComponent(path)}"`
  );

  html = html.replace(
    /(href|src|action)=["']\/(?!api\/proxy)([^"']*)["']/gi,
    (_, attr, path) => `${attr}="/api/proxy?path=${encodeURIComponent("/" + path)}"`
  );

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
