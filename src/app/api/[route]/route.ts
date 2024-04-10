import { processUpdate } from "@/bot";
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.substring(8).split("?")[0];
  if (path !== process.env.TG_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  processUpdate(body);

  return new Response("Success");
}
