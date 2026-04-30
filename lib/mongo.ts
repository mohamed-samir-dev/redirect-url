import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
let cached: { client: MongoClient; db: Db } | null = null;

export async function getDb(): Promise<Db> {
  if (cached) return cached.db;
  const client = await new MongoClient(uri).connect();
  const db = client.db("redirector");
  cached = { client, db };
  return db;
}
