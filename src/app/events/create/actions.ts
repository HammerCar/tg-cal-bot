"use server";

import db from "@/db";
import { events } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";

interface FormData {
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export async function createEvent(
  userId: string,
  hash: string,
  data: FormData
) {
  const compHash = crypto
    .createHmac("sha256", process.env.TG_TOKEN || "")
    .update(userId)
    .digest("base64");

  if (compHash !== hash) {
    throw new Error("Invalid hash");
  }

  const eventId = createId();
  await db.insert(events).values({
    id: eventId,
    name: data.name,
    start: new Date(`${data.startDate}T${data.startTime}`),
    end: new Date(`${data.endDate}T${data.endTime}`),
    ownerId: userId,
  });

  return eventId;
}
