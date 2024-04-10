import { createId } from "@paralleldrive/cuid2";
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { Resend } from "resend";
import db from "./db";
import { eventAnwesrs, events, users } from "./db/schema";

const resend = new Resend(process.env.RESEND_KEY);
const token = process.env.TG_TOKEN || "";

const createBot = () => {
  if (process.env.NODE_ENV === "production") {
    const bot = new TelegramBot(token);

    const app = express();

    app.use(express.json());

    // We are receiving updates at the route below!
    app.post(`/bot${token}`, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    // Start Express Server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Express server is listening on ${port}`);
    });

    module.exports = app;

    return bot;
  }

  return new TelegramBot(token, { polling: true });
};

const bot = createBot();

const parseDateTime = (text: string) => {
  const [date, time] = text.split(" ");
  const [year, month, day] = date.split("-");
  const [hours, minutes] = time.split(":");

  if (!year || !month || !day || !hours || !minutes) {
    return null;
  }

  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  );
};

bot.onText(/\/start/, async (msg, match) => {
  if (!msg.from) {
    console.warn("Message has no sender");
    return;
  }

  const userId = msg.from.id.toString();
  const name = `${msg.from.first_name} ${msg.from.last_name}`;
  const chatId = msg.chat.id.toString();

  await db
    .insert(users)
    .values({ id: userId, name, chatId })
    .onConflictDoNothing();

  bot.sendMessage(
    msg.chat.id,
    "Thanks for using CalBot. Send /setemail to set your email address."
  );
});

bot.onText(/\/setemail/, async (msg, match) => {
  if (!msg.from) {
    console.warn("Message has no sender");
    return;
  }

  const userId = msg.from.id.toString();

  await db
    .update(users)
    .set({ chatState: "set_email" })
    .where(eq(users.id, userId));

  bot.sendMessage(
    msg.chat.id,
    "Please enter your email address. This email address will show on calendar invites set to people who sign up to your events."
  );
});

bot.onText(/\/createevent/, async (msg, match) => {
  if (!msg.from) {
    console.warn("Message has no sender");
    return;
  }

  const userId = msg.from.id.toString();

  await db
    .update(users)
    .set({ chatState: "create_event_name" })
    .where(eq(users.id, userId));

  bot.sendMessage(msg.chat.id, "Give a name for the event");
});

bot.onText(/^[^/]/, async (msg, match) => {
  if (!msg.from) {
    console.warn("Message has no sender");
    return;
  }

  const userId = msg.from.id.toString();

  const [data] = await db
    .select({
      chatState: users.chatState,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!data) {
    bot.sendMessage(msg.chat.id, "Send /start to begin.");

    return;
  }

  const chatStateParams = data.chatState?.split(":");
  if (!chatStateParams) {
    bot.sendMessage(msg.chat.id, "Send /help to see available commands.");
    return;
  }

  const chatState = chatStateParams.shift();
  console.log("chatState", chatState, chatStateParams);

  const message = msg.text;
  if (!message) {
    return;
  }

  if (chatState === "set_email") {
    if (
      !message.match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      )
    ) {
      bot.sendMessage(msg.chat.id, "Invalid email address. Try again.");
      return;
    }

    await db
      .update(users)
      .set({ email: message, chatState: null })
      .where(eq(users.id, userId));

    bot.sendMessage(msg.chat.id, "Email address saved.");
  }

  if (chatState === "create_event_name") {
    const id = createId();

    console.log("Creating event with id", id);

    await db.insert(events).values({
      id,
      name: message,
      ownerId: userId,
    });

    await db
      .update(users)
      .set({ chatState: `create_event_start:${id}` })
      .where(eq(users.id, userId));

    bot.sendMessage(
      msg.chat.id,
      "Give a start date and time for the event (YYYY-MM-DD HH:MM)"
    );
  }

  if (chatState === "create_event_start") {
    console.log("create_event_start");

    const eventId = chatStateParams.pop();
    if (!eventId) {
      return;
    }

    const start = parseDateTime(message);
    if (!start) {
      bot.sendMessage(
        msg.chat.id,
        "Invalid date. Try again. (YYYY-MM-DD HH:MM)"
      );
      return;
    }

    await db.update(events).set({ start }).where(eq(events.id, eventId));

    await db
      .update(users)
      .set({ chatState: `create_event_end:${eventId}` })
      .where(eq(users.id, userId));

    bot.sendMessage(
      msg.chat.id,
      "Give an end date and time for the event (YYYY-MM-DD HH:MM)"
    );
  }

  if (chatState === "create_event_end") {
    const eventId = chatStateParams.pop();
    if (!eventId) {
      return;
    }

    const end = parseDateTime(message);
    if (!end) {
      bot.sendMessage(
        msg.chat.id,
        "Invalid date. Try again. (YYYY-MM-DD HH:MM)"
      );
      return;
    }

    await db.update(events).set({ end }).where(eq(events.id, eventId));
    await db.update(users).set({ chatState: null }).where(eq(users.id, userId));

    const [{ name, start }] = await db
      .select({
        name: events.name,
        start: events.start,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    await bot.sendMessage(
      msg.chat.id,
      "Event created successfully. Forward the following poll to invite people to the event."
    );

    const poll = await bot.sendPoll(
      msg.chat.id,
      `Join event ${name} (${start?.toLocaleString(
        "fi-FI"
      )} - ${end.toLocaleString("fi-FI")})`,
      ["Yes", "No"],
      {
        is_anonymous: false,
        allows_multiple_answers: false,
      }
    );

    await db
      .update(events)
      .set({ pollId: poll.poll?.id })
      .where(eq(events.id, eventId));
  }
});

bot.on("poll_answer", async (msg) => {
  const { poll_id, user, option_ids } = msg;

  console.log(poll_id, user, option_ids);

  const [event] = await db
    .select({
      id: events.id,
      name: events.name,
      start: events.start,
      end: events.end,
    })
    .from(events)
    .where(eq(events.pollId, poll_id))
    .limit(1);

  const [userData] = await db
    .select({
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, user.id.toString()));

  if (!event || !event.start || !event.end || !userData) {
    return;
  }

  const email = userData.email;

  if (option_ids.length > 0) {
    await db
      .insert(eventAnwesrs)
      .values({
        eventId: event.id,
        userId: user.id.toString(),
        joining: option_ids.includes(0),
      })
      .onConflictDoUpdate({
        target: [eventAnwesrs.eventId, eventAnwesrs.userId],
        set: { joining: option_ids.includes(0) },
      });

    console.log("event", event);
    if (email) {
      sendCalendarInvite(event.id, event.name, event.start, event.end, email);
    }
  } else {
    await db
      .delete(eventAnwesrs)
      .where(
        and(
          eq(eventAnwesrs.eventId, event.id),
          eq(eventAnwesrs.userId, user.id.toString())
        )
      );

    if (email) {
      cancelCalendarInvite(event.id, event.name, event.start, event.end, email);
    }
  }
});

const sendCalendarInvite = async (
  eventId: string,
  eventName: string,
  eventStart: Date,
  eventEnd: Date,
  email: string
) => {
  console.log("Sending calendar invite to", email);
  await resend.emails.send({
    from: process.env.EMAIL_SEND_ADDRESS!,
    to: email,
    subject: `Invite for ${eventName}`,
    html: `<p>Calendar invite for event ${eventName} starting ${eventStart.toLocaleString(
      "fi-FI"
    )} and ending ${eventEnd.toLocaleString("fi-FI")}</p>`,
    attachments: [
      {
        filename: "invite.ics",
        content: `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${eventId}@${process.env.EMAIL_DOMAIN}
DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d\d\d/g, "")}Z
DTSTART:${eventStart
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d\d\d/g, "")}Z
DTEND:${eventEnd
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d\d\d/g, "")}Z
SUMMARY:${eventName}
ORGANIZER;CN="CalBot":MAILTO:calendar-invite@${process.env.EMAIL_DOMAIN}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${email};X-NUM-GUESTS=0:mailto:${email}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`,
      },
    ],
  });
};

const cancelCalendarInvite = async (
  eventId: string,
  eventName: string,
  eventStart: Date,
  eventEnd: Date,
  email: string
) => {
  console.log("Cancelling calendar invite for", email);
  await resend.emails.send({
    from: process.env.EMAIL_SEND_ADDRESS!,
    to: email,
    subject: `Cancel invite for ${eventName}`,
    html: `<p>Cancellation of calendar invite for event ${eventName}</p>`,
    attachments: [
      {
        filename: "invite.ics",
        content: `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:CANCEL
BEGIN:VEVENT
UID:${eventId}@${process.env.EMAIL_DOMAIN}
DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d\d\d/g, "")}Z
DTSTART:${eventStart
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d\d\d/g, "")}Z
DTEND:${eventEnd
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d\d\d/g, "")}Z
SUMMARY:${eventName}
ORGANIZER;CN="CalBot":MAILTO:calendar-invite@${process.env.EMAIL_DOMAIN}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${email};X-NUM-GUESTS=0:mailto:${email}
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`,
      },
    ],
  });
};
