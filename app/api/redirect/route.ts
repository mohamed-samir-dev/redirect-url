import { NextResponse } from "next/server";
import config from "@/data/config.json";

export async function GET() {
  return NextResponse.json(config);
}
