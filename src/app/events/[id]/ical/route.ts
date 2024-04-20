import db from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const pathSegments = request.nextUrl.pathname.split("/");
  const eventId = pathSegments[pathSegments.length - 2];

  const eventData = await db
    .select({
      name: events.name,
      start: events.start,
      end: events.end,
    })
    .from(events)
    .where(eq(events.id, eventId));

  if (eventData.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const event = eventData[0];

  const eventIcs = `BEGIN:VCALENDAR
VERSION:2.0
METHOD:PUBLISH
CALSCALE:GREGORIAN
PRODID:-//Telegram Calendar Bot//EN
BEGIN:VEVENT
UID:${eventId}@${process.env.EMAIL_DOMAIN}
DTSTAMP:${new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d\d\d/g, "")}Z
DTSTART:${event.start
    ?.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d\d\d/g, "")}Z
DTEND:${event.end
    ?.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d\d\d/g, "")}Z
SUMMARY:${event.name}
END:VEVENT
END:VCALENDAR`;

  return new Response(eventIcs, {
    headers: {
      "Content-Type": "text/calendar",
    },
  });
}
