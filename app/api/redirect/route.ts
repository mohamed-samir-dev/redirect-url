import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

async function getConfig() {
  const db = await getDb();
  const config = await db.collection("config").findOne({ _id: "redirect" as never });
  return config || { redirectUrl: "https://example.com", label: "" };
}

export async function GET() {
  const config = await getConfig();
  return NextResponse.json({ redirectUrl: config.redirectUrl, label: config.label });
}

export async function POST(req: Request) {
  const body = await req.json();
  const db = await getDb();
  await db.collection("config").updateOne(
    { _id: "redirect" as never },
    { $set: { redirectUrl: body.redirectUrl, label: body.label || "" } },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}
