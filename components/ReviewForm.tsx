"use client";

import { useActionState, useState } from "react";
import { reviewAction } from "@/actions/customer.actions";
import { initialActionState } from "@/actions/types";
import { SubmitButton, FormAlert } from "@/components/forms";

function StarInput({ name, label, value, onChange }: { name: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="row-between">
      <span className="small">{label}</span>
      <span className="row" style={{ gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star} type="button" onClick={() => onChange(star)}
            aria-label={`${label}: ${star} of 5`}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: star <= value ? "#d97706" : "#d3d7e3", padding: 1 }}
          >
            ★
          </button>
        ))}
      </span>
      <input type="hidden" name={name} value={value || ""} />
    </div>
  );
}

export default function ReviewForm({ bookingId }: { bookingId: string }) {
  const [state, formAction] = useActionState(reviewAction, initialActionState);
  const [rating, setRating] = useState(5);
  const [quality, setQuality] = useState(5);
  const [professionalism, setProfessionalism] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [value, setValue] = useState(5);

  if (state.ok) return <div className="alert alert-success">Thanks for the review — it helps other customers choose.</div>;

  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <StarInput name="rating" label="Overall rating" value={rating} onChange={setRating} />
      <StarInput name="qualityRating" label="Quality of work" value={quality} onChange={setQuality} />
      <StarInput name="professionalismRating" label="Professionalism" value={professionalism} onChange={setProfessionalism} />
      <StarInput name="punctualityRating" label="Punctuality" value={punctuality} onChange={setPunctuality} />
      <StarInput name="valueRating" label="Value for money" value={value} onChange={setValue} />
      <div className="field">
        <label className="label" htmlFor="comment">Comment (optional)</label>
        <textarea id="comment" name="comment" className="textarea" style={{ minHeight: 80 }} placeholder="What went well? Anything the provider could improve?" />
      </div>
      <SubmitButton className="btn-block" pendingText="Submitting…">Submit review</SubmitButton>
    </form>
  );
}
