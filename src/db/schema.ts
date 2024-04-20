import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("telegram_id").primaryKey(),
  name: text("name").notNull(),
  chatState: text("chat_state"),
  email: text("email"),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  start: integer("start", { mode: "timestamp_ms" }),
  end: integer("end", { mode: "timestamp_ms" }),
  ownerId: text("owner_id").notNull(),
  pollId: text("poll_id"),
});

export const eventAnwsers = sqliteTable(
  "event_answers",
  {
    eventId: text("event_id").notNull(),
    userId: text("user_id").notNull(),
    joining: integer("id", { mode: "boolean" }),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.eventId, table.userId] }),
    };
  }
);
