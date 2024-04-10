import { processUpdate } from "@/bot";
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log(request.headers.get("content-type"));

  const path = request.nextUrl.pathname.substring(4).split("?")[0];
  if (path !== process.env.TG_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  processUpdate(body);

  return new Response("Success");
}
