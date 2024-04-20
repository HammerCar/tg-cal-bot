import { processUpdate } from "@/bot";
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.substring(8).split("?")[0];
  if (path !== process.env.TG_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  try {
    await processUpdate(body);
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }

  return new Response("Success");
}

export async function GET(request: NextRequest) {
  return new Response("Hello, world!");
}
