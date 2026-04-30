import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "data", "config.json");

function readConfig() {
  const data = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(data);
}

function writeConfig(config: { redirectUrl: string; label: string }) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET() {
  const config = readConfig();
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const body = await req.json();
  const config = { redirectUrl: body.redirectUrl, label: body.label || "" };
  writeConfig(config);
  return NextResponse.json({ success: true, ...config });
}
