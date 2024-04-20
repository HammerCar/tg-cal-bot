"use client";

import { useSearchParams } from "next/navigation";
import Script from "next/script";
import React from "react";
import z from "zod";
import { createEvent } from "./actions";

const FormDataValidation = z.object({
  name: z.string(),
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string(),
  endTime: z.string(),
});

interface FormProps extends React.PropsWithChildren<{}> {
  className?: string;
}

export default function Form(props: FormProps) {
  const { className, children } = props;

  const params = useSearchParams();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const dataUnsafe = {
      name: formData.get("name"),
      startDate: formData.get("startDate"),
      startTime: formData.get("startTime"),
      endDate: formData.get("endDate"),
      endTime: formData.get("endTime"),
    };
    const data = FormDataValidation.parse(dataUnsafe);

    const userId = params.get("userId");
    const hash = params.get("hash");
    if (!userId || !hash) {
      throw new Error("userId or hash not provided");
    }

    const eventId = await createEvent(userId, hash, data);
    (window as any).Telegram?.WebApp?.switchInlineQuery(eventId);
  };

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" />
      <form action="" onSubmit={handleSubmit} className={className}>
        {children}
      </form>
    </>
  );
}
