import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_KEY);

export const sendCalendarInvite = async (
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

export const cancelCalendarInvite = async (
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
