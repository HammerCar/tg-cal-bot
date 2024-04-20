import db from "@/db";
import { events, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FaCheckCircle } from "react-icons/fa";
import EmailForm, { ClosePageButton } from "./EmailForm";
import { sendEventInvite, verifyTgAuthData } from "./actions";
import tgAuthData from "./tgAuthData";

export default async function Event({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const eventId = params.id;
  const authData = tgAuthData.parse(searchParams);

  if (!verifyTgAuthData(authData)) {
    return <>Unauthorized</>;
  }

  const userId = authData.id;

  const userData = await db
    .select({
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (userData.length === 0) {
    db.insert(users).values({
      id: userId,
      name: `${authData.first_name} ${authData.last_name}`,
    });
  }

  const eventData = await db
    .select({
      name: events.name,
      start: events.start,
      end: events.end,
    })
    .from(events)
    .where(eq(events.id, eventId));

  if (eventData.length === 0) {
    return <>Not found</>;
  }

  const email = userData[0]?.email;
  const event = eventData[0];

  if (email) {
    await sendEventInvite(
      userId,
      email,
      eventId,
      event.name,
      event.start!,
      event.end!
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex flex-col gap-8 mb-10">
        <div className="flex flex-col gap-2">
          <h1 className="font-bold text-3xl">Add event to calendar</h1>
          <p>{event.name}</p>
          <p>
            {event.start?.toLocaleString()} - {event.end?.toLocaleString()}
          </p>
        </div>
        {email && (
          <>
            <div className="flex flex-col items-center gap-2">
              <span className="font-semibold text-lg">
                Invite sent to {email}
              </span>
              <FaCheckCircle className="text-2xl text-green-600" />
            </div>
            <ClosePageButton />
          </>
        )}
        {!email && <EmailForm eventId={eventId} />}
      </div>
    </div>
  );
}
