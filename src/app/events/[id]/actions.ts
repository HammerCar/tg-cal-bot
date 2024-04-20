"use server";

import db from "@/db";
import { eventAnwsers, events, users } from "@/db/schema";
import { sendCalendarInvite } from "@/email";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { tgAuthData } from "./page";

type TgAuthData = z.infer<typeof tgAuthData>;

export async function verifyTgAuthData(auth: TgAuthData) {
  const data_check_string = Object.entries(auth)
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secret = crypto
    .createHash("sha256")
    .update(process.env.TG_TOKEN!)
    .digest();

  const hash = crypto
    .createHmac("sha256", secret)
    .update(data_check_string)
    .digest("hex");

  return hash === auth.hash;
}

export async function saveAndSendEventInvite(
  email: string,
  eventId: string,
  auth: unknown
) {
  const authData = tgAuthData.parse(auth);
  if (!verifyTgAuthData(authData)) {
    throw new Error("Invalid auth data");
  }

  await db
    .update(users)
    .set({
      email: email,
    })
    .where(eq(users.id, authData.id));

  const eventData = await db
    .select({
      name: events.name,
      start: events.start,
      end: events.end,
    })
    .from(events)
    .where(eq(events.id, eventId));

  if (eventData.length === 0) {
    throw new Error("Event not found");
  }

  const event = eventData[0];

  await sendEventInvite(
    authData.id,
    email,
    eventId,
    event.name,
    event.start!,
    event.end!
  );
}

export async function sendEventInvite(
  userId: string,
  email: string,
  eventId: string,
  name: string,
  start: Date,
  end: Date
) {
  const eventAnwsersData = await db
    .select({
      joining: eventAnwsers.joining,
    })
    .from(eventAnwsers)
    .where(eq(eventAnwsers.userId, userId));

  if (eventAnwsersData.length === 0) {
    await db.insert(eventAnwsers).values({
      userId: userId,
      eventId: eventId,
      joining: true,
    });
  }

  const eventAnwser = eventAnwsersData[0];
  if (eventAnwser.joining) {
    return;
  }

  await db
    .update(eventAnwsers)
    .set({ joining: true })
    .where(eq(eventAnwsers.userId, userId));

  await sendCalendarInvite(eventId, name, start!, end!, email);
}
