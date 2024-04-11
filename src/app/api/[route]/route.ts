import { processUpdate } from "@/bot";
import db from "@/db";
import { users } from "@/db/schema";
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.substring(8).split("?")[0];
  if (path !== process.env.TG_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  await processUpdate(body);

  return new Response("Success");
}

export async function GET(request: NextRequest) {
  const data = await db.select().from(users);

  return new Response("Success " + data.length);
}
