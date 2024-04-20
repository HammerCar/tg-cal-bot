"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { saveAndSendEventInvite } from "./actions";

interface EmailFormProps {
  eventId: string;
}

export default function EmailForm(props: EmailFormProps) {
  const { eventId } = props;

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const params = useSearchParams();

  const handleSubmit = async () => {
    const auth = {
      id: params.get("id"),
      first_name: params.get("first_name"),
      last_name: params.get("last_name"),
      username: params.get("username"),
      photo_url: params.get("photo_url"),
      auth_date: params.get("auth_date"),
      hash: params.get("hash"),
    };

    await saveAndSendEventInvite(email, eventId, auth);
    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <>
        <div className="flex flex-col items-center gap-2">
          <span className="font-semibold text-lg">Invite sent to {email}</span>
          <FaCheckCircle className="text-2xl text-green-600" />
        </div>
        <ClosePageButton />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="email"
        placeholder="Email"
        className="p-2 border border-gray-300 rounded"
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className="p-2 bg-blue-500 text-white rounded"
        onClick={handleSubmit}
      >
        Send invite
      </button>
    </div>
  );
}

export function ClosePageButton() {
  return (
    <button
      className="p-2 border border-blue-500 text-blue-500 rounded"
      onClick={() => window.close()}
    >
      Close
    </button>
  );
}
