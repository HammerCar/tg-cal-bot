import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";
import "dotenv/config";
import { and, eq, gt, like, or } from "drizzle-orm";
import TelegramBot from "node-telegram-bot-api";
import db from "./db";
import { eventAnwsers, events, users } from "./db/schema";
import { cancelCalendarInvite, sendCalendarInvite } from "./email";

const token = process.env.TG_TOKEN || "";

const bot = new TelegramBot(token);

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

const listeners: {
  regex: RegExp;
  fn: (msg: TelegramBot.Message) => Promise<any>;
}[] = [];
const addTextListener = (
  regex: RegExp,
  fn: (msg: TelegramBot.Message) => Promise<any>
) => {
  listeners.push({ regex, fn });
};
const callListener = async (msg: TelegramBot.Message) => {
  for (const listener of listeners) {
    if (msg.text && listener.regex.test(msg.text)) {
      await listener.fn(msg);
    }
  }
};

addTextListener(/\/start/, async (msg) => {
  console.log("Starting chat", msg);

  if (!msg.from) {
    console.warn("Message has no sender");
    return;
  }

  const userId = msg.from.id.toString();
  const name = `${msg.from.first_name} ${msg.from.last_name}`;

  console.log("Adding user", userId, name);

  try {
    await db.insert(users).values({ id: userId, name }).onConflictDoNothing();
  } catch (error) {
    console.error("Failed to add user", error);
    throw error;
  }

  console.log("Sending welcome message");

  await bot.sendMessage(
    msg.chat.id,
    "Thanks for using CalBot. Send /setemail to set your email address."
  );

  console.log("Done");
});

addTextListener(/\/setemail/, async (msg) => {
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

addTextListener(/\/createevent/, async (msg) => {
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

addTextListener(/\/test/, async (msg) => {
  if (!msg.from) {
    console.warn("Message has no sender");
    return;
  }

  bot.sendMessage(msg.chat.id, "test", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "WebApp",
            web_app: {
              url: process.env.WEBAPP_URL!,
            },
          },
        ],
      ],
    },
  });
});

addTextListener(/^[^/]/, async (msg) => {
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

const onPollAnwser = async (msg: TelegramBot.PollAnswer) => {
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
      .insert(eventAnwsers)
      .values({
        eventId: event.id,
        userId: user.id.toString(),
        joining: option_ids.includes(0),
      })
      .onConflictDoUpdate({
        target: [eventAnwsers.eventId, eventAnwsers.userId],
        set: { joining: option_ids.includes(0) },
      });

    console.log("event", event);
    if (email) {
      sendCalendarInvite(event.id, event.name, event.start, event.end, email);
    }
  } else {
    await db
      .delete(eventAnwsers)
      .where(
        and(
          eq(eventAnwsers.eventId, event.id),
          eq(eventAnwsers.userId, user.id.toString())
        )
      );

    if (email) {
      cancelCalendarInvite(event.id, event.name, event.start, event.end, email);
    }
  }
};

const onInlineQuery = async (msg: TelegramBot.InlineQuery) => {
  const userId = msg.from.id.toString();
  const query = msg.query;

  const userEvents = await db
    .select({
      id: events.id,
      name: events.name,
      start: events.start,
      end: events.end,
    })
    .from(events)
    .where(
      and(
        eq(events.ownerId, userId),
        gt(events.start, new Date()),
        or(like(events.name, `%${query}%`), eq(events.id, query))
      )
    );

  const hash = crypto
    .createHmac("sha256", token)
    .update(userId)
    .digest("base64");

  try {
    await bot.answerInlineQuery(
      msg.id,
      userEvents.map((event) => ({
        type: "article",
        id: event.id,
        title: event.name,
        input_message_content: {
          message_text: `Event ${
            event.name
          } starting ${event.start?.toLocaleString(
            "fi-FI"
          )} and ending ${event.end?.toLocaleString("fi-FI")}`,
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Add to calendar",
                //url: `${process.env.WEBAPP_URL}events/${event.id}`,
                login_url: {
                  url: `${process.env.WEBAPP_URL}events/${event.id}`,
                  request_write_access: true,
                },
              },
            ],
          ],
        },
      })),
      {
        button: JSON.stringify({
          text: "Create event",
          web_app: {
            url: `${
              process.env.WEBAPP_URL
            }/events/create?userId=${encodeURIComponent(
              userId
            )}&hash=${encodeURIComponent(hash)}`,
          },
        }),
      } as any
    );
  } catch (error) {
    console.log("Failed to answer inline query");
  }
};

export const processUpdate = async (update: TelegramBot.Update) => {
  console.log("Processing update", update);

  if (update.message) {
    await callListener(update.message);
  }
  if (update.poll_answer) {
    await onPollAnwser(update.poll_answer);
  }
  if (update.inline_query) {
    await onInlineQuery(update.inline_query);
  }
};

export default bot;
