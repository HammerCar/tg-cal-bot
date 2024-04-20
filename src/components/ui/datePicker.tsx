"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  date?: Date;
  setDate?: (date: Date | undefined) => void;
  required?: boolean;
}

export function DatePicker(props: DatePickerProps) {
  const { date, setDate, required } = props;

  return (
    <div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            required={required}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DatePickerInputProps {
  name?: string;
  required?: boolean;
  defaultValue?: Date;
}

export function DatePickerInput(props: DatePickerInputProps) {
  const { name, required, defaultValue } = props;

  const inputRef = React.useRef<HTMLInputElement>(null);

  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = value
        ? `${value.getFullYear()}-${(value.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${value.getDate().toString().padStart(2, "0")}`
        : "";
    }
  }, [value]);

  return (
    <>
      <input type="text" name={name} ref={inputRef} hidden />
      <DatePicker date={value} setDate={setValue} required={required} />
    </>
  );
}
