import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeTimeOffAction } from "@/actions/provider.actions";
import { formatDate, formatTime } from "@/lib/format";
import { DAY_NAMES } from "@/lib/constants";
import { PageHeader, Card, SectionHeader, EmptyState, StatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { AvailabilityForm, TimeOffForm } from "@/components/ProviderForms";

export const metadata: Metadata = { title: "Availability" };
export const dynamic = "force-dynamic";

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export default async function ProviderCalendarPage() {
  const user = await requireRole("PROVIDER");
  const providerId = user.providerId!;
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [availability, timeOff, bookings] = await Promise.all([
    prisma.providerAvailability.findMany({ where: { providerId }, orderBy: { dayOfWeek: "asc" } }),
    prisma.providerTimeOff.findMany({ where: { providerId, date: { gte: weekStart } }, orderBy: { date: "asc" } }),
    prisma.booking.findMany({
      where: { providerId, scheduledDate: { gte: weekStart, lt: weekEnd }, status: { notIn: ["CANCELLED", "REJECTED"] } },
      include: { request: { include: { service: true } }, customer: { select: { name: true } } },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return { date, jobs: bookings.filter((b) => b.scheduledDate.toDateString() === date.toDateString()) };
  });

  return (
    <>
      <PageHeader title="Availability & calendar" subtitle="Your working hours drive the matching engine — keep them accurate" />

      <Card style={{ marginBottom: 20 }}>
        <SectionHeader title="This week" subtitle="Jobs already on your calendar" />
        <div className="week-grid">
          {week.map(({ date, jobs }) => (
            <div key={date.toISOString()} className="week-day">
              <div className="tiny muted">{DAY_NAMES[date.getDay()].slice(0, 3)}</div>
              <div className="strong small">{date.getDate()}</div>
              <div className="stack-sm" style={{ marginTop: 8 }}>
                {jobs.length === 0 ? <span className="tiny muted">Free</span> : null}
                {jobs.map((job) => (
                  <div key={job.id} className="week-chip">
                    <div className="tiny strong">{formatTime(job.startTime)}</div>
                    <div className="tiny">{job.request.service.name}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="Working hours" subtitle="Providers are only matched inside these hours" />
          <AvailabilityForm days={availability} />
        </Card>

        <div className="stack">
          <Card>
            <SectionHeader title="Block time off" subtitle="Holidays, appointments, anything" />
            <TimeOffForm />
          </Card>
          <Card>
            <SectionHeader title="Upcoming time off" />
            {timeOff.length === 0 ? (
              <EmptyState icon="🌴" title="No time off booked" />
            ) : (
              <ul className="stack-sm">
                {timeOff.map((entry) => (
                  <li key={entry.id} className="row-between">
                    <div>
                      <div className="small strong">{formatDate(entry.date)}</div>
                      <div className="tiny muted">{formatTime(entry.startTime)}–{formatTime(entry.endTime)}{entry.reason ? ` · ${entry.reason}` : ""}</div>
                    </div>
                    <ConfirmButton action={removeTimeOffAction.bind(null, entry.id)} className="btn-ghost btn-sm" confirmText="Remove this time off?">
                      Remove
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
