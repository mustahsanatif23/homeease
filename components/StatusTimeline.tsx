import { formatTime } from "@/lib/format";

const STEPS = [
  { key: "REQUESTED", title: "Requested", text: "We sent your request to the provider." },
  { key: "ACCEPTED", title: "Accepted", text: "The provider confirmed your booking." },
  { key: "ON_THE_WAY", title: "On the way", text: "Your technician is travelling to you." },
  { key: "IN_PROGRESS", title: "In progress", text: "Work has started." },
  { key: "COMPLETED", title: "Completed", text: "Job finished and invoice issued." },
];

export default function StatusTimeline({
  status, acceptedAt, startedAt, completedAt, createdAt, etaMinutes,
}: {
  status: string;
  acceptedAt?: Date | null; startedAt?: Date | null; completedAt?: Date | null; createdAt?: Date | null;
  etaMinutes?: number;
}) {
  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <div className="alert alert-error">
        {status === "CANCELLED" ? "This booking was cancelled." : "The provider couldn't take this job — we're finding a replacement."}
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const stamps: Record<string, Date | null | undefined> = {
    REQUESTED: createdAt, ACCEPTED: acceptedAt, IN_PROGRESS: startedAt, COMPLETED: completedAt,
  };

  return (
    <ol className="timeline">
      {STEPS.map((step, index) => {
        const done = currentIndex > index;
        const active = currentIndex === index;
        const stamp = stamps[step.key];
        return (
          <li key={step.key} className={`tl-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
            <div className="tl-title">{step.title}</div>
            <div className="small muted">{step.text}</div>
            {stamp ? <div className="tl-time">{new Date(stamp).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div> : null}
            {active && step.key === "ON_THE_WAY" && etaMinutes ? (
              <div className="tl-time strong">Arriving in about {etaMinutes} minutes</div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function SlotLine({ start, end }: { start: string; end: string }) {
  return <span className="small muted mono">{formatTime(start)} – {formatTime(end)}</span>;
}
