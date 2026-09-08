"use client";

import { useActionState } from "react";
import { saveAvailabilityAction, addTimeOffAction, saveProviderServiceAction } from "@/actions/provider.actions";
import { initialActionState } from "@/actions/types";
import { Field, SubmitButton, FormAlert } from "@/components/forms";
import { DAY_NAMES } from "@/lib/constants";

export interface DayRow { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }

export function AvailabilityForm({ days }: { days: DayRow[] }) {
  const [state, formAction] = useActionState(saveAvailabilityAction, initialActionState);
  const rows = Array.from({ length: 7 }, (_, day) =>
    days.find((d) => d.dayOfWeek === day) ?? { dayOfWeek: day, startTime: "09:00", endTime: "18:00", isAvailable: day !== 5 },
  );

  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      {rows.map((row) => (
        <div key={row.dayOfWeek} className="row-between" style={{ gap: 10, flexWrap: "wrap" }}>
          <label className="checkbox-row" style={{ minWidth: 150 }}>
            <input type="checkbox" name={`active-${row.dayOfWeek}`} defaultChecked={row.isAvailable} />
            <span className="small strong">{DAY_NAMES[row.dayOfWeek]}</span>
          </label>
          <div className="row" style={{ gap: 8 }}>
            <input type="time" className="input" name={`start-${row.dayOfWeek}`} defaultValue={row.startTime} style={{ width: 130 }} aria-label={`${DAY_NAMES[row.dayOfWeek]} start`} />
            <span className="muted">–</span>
            <input type="time" className="input" name={`end-${row.dayOfWeek}`} defaultValue={row.endTime} style={{ width: 130 }} aria-label={`${DAY_NAMES[row.dayOfWeek]} end`} />
          </div>
        </div>
      ))}
      <SubmitButton pendingText="Saving…">Save working hours</SubmitButton>
    </form>
  );
}

export function TimeOffForm() {
  const [state, formAction] = useActionState(addTimeOffAction, initialActionState);
  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      <Field label="Date" name="date" type="date" required error={state.fieldErrors?.date} />
      <div className="grid grid-2">
        <Field label="From" name="startTime" type="time" defaultValue="09:00" required error={state.fieldErrors?.startTime} />
        <Field label="To" name="endTime" type="time" defaultValue="18:00" required error={state.fieldErrors?.endTime} />
      </div>
      <Field label="Reason (optional)" name="reason" placeholder="Family event" error={state.fieldErrors?.reason} />
      <SubmitButton className="btn-secondary" pendingText="Adding…">Block this time</SubmitButton>
    </form>
  );
}

export function ProviderServiceForm({ services }: { services: { id: string; name: string; basePrice: number; category: string }[] }) {
  const [state, formAction] = useActionState(saveProviderServiceAction, initialActionState);
  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      <Field label="Service" name="serviceId" error={state.fieldErrors?.serviceId}>
        <select id="serviceId" name="serviceId" className="select" required>
          <option value="">Choose a service…</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.category} — {service.name} (base ৳{service.basePrice})</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-2">
        <Field label="Your price (৳)" name="price" type="number" min={50} max={200000} required error={state.fieldErrors?.price} hint="Numbers only." />
        <Field label="Years of experience" name="experienceYears" type="number" min={0} max={50} defaultValue="2" required error={state.fieldErrors?.experienceYears} />
      </div>
      <Field label="Expertise level" name="expertiseLevel" error={state.fieldErrors?.expertiseLevel}>
        <select id="expertiseLevel" name="expertiseLevel" className="select" defaultValue="INTERMEDIATE">
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="EXPERT">Expert</option>
        </select>
      </Field>
      <SubmitButton pendingText="Saving…">Add / update service</SubmitButton>
    </form>
  );
}
