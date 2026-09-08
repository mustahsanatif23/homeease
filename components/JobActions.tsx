"use client";

import { useActionState } from "react";
import { updateJobStatusAction } from "@/actions/provider.actions";
import { initialActionState } from "@/actions/types";
import { SubmitButton, FormAlert } from "@/components/forms";

const NEXT_STEP: Record<string, { to: string; label: string; className: string }[]> = {
  REQUESTED: [
    { to: "ACCEPTED", label: "Accept job", className: "" },
    { to: "REJECTED", label: "Decline", className: "btn-secondary" },
  ],
  ACCEPTED: [
    { to: "ON_THE_WAY", label: "I'm on the way", className: "" },
    { to: "CANCELLED", label: "Cancel", className: "btn-secondary" },
  ],
  ON_THE_WAY: [{ to: "IN_PROGRESS", label: "Start work", className: "" }],
  IN_PROGRESS: [{ to: "COMPLETED", label: "Mark completed", className: "btn-success" }],
  RESCHEDULED: [{ to: "ACCEPTED", label: "Confirm new time", className: "" }],
};

export default function JobActions({ bookingId, status, size = "" }: { bookingId: string; status: string; size?: "sm" | "" }) {
  const [state, formAction] = useActionState(updateJobStatusAction, initialActionState);
  const options = NEXT_STEP[status] ?? [];
  if (options.length === 0) return null;

  return (
    <div className="stack-sm">
      <FormAlert error={state.error} />
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {options.map((option) => (
          <form key={option.to} action={formAction}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <input type="hidden" name="status" value={option.to} />
            <SubmitButton className={`${option.className} ${size === "sm" ? "btn-sm" : ""}`} pendingText="Updating…">
              {option.label}
            </SubmitButton>
          </form>
        ))}
      </div>
    </div>
  );
}
