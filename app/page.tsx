import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export default function Home() {
  const configPath = path.join(process.cwd(), "data", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  redirect(config.redirectUrl);
}
