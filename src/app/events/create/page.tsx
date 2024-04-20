import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/datePicker";
import { Input } from "@/components/ui/input";
import Form from "./Form";

export default function CreateEvent() {
  return (
    <main className="p-2 flex flex-col items-stretch gap-3">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center">
        Create event
      </h1>
      <Form className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label>
            Event name
            <Input name="name" type="text" placeholder="Event name" required />
          </label>
          <label>
            Start date and time:
            <div className="flex flex-col gap-2">
              <DatePickerInput name="startDate" required />
              <input name="startTime" type="time" required />
            </div>
          </label>
          <label>
            End date and time:
            <div className="flex flex-col gap-2">
              <DatePickerInput name="endDate" required />
              <input name="endTime" type="time" required />
            </div>
          </label>
        </div>
        <Button type="submit">Create</Button>
      </Form>
    </main>
  );
}
