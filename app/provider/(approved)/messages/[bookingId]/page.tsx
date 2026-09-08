import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getThread } from "@/services/message.service";
import { getBookingForUser } from "@/services/booking.service";
import { formatDate, formatTime } from "@/lib/format";
import { BOOKING_LABEL } from "@/lib/constants";
import { Card, StatusBadge, Avatar } from "@/components/ui";
import BackButton from "@/components/BackButton";
import Chat from "@/components/Chat";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function ProviderThreadPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const user = await requireRole("PROVIDER");
  const [thread, booking] = await Promise.all([
    getThread(bookingId, user.id, user.role),
    getBookingForUser(bookingId, user.id, "PROVIDER"),
  ]);

  return (
    <>
      <BackButton fallback="/provider/messages" label="All messages" />

      <div className="page-head row-between" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 12 }}>
          <Avatar name={thread.counterpart} src={booking.customer.avatar} size="lg" />
          <div>
            <h1>{thread.counterpart}</h1>
            <p className="muted small">
              {thread.serviceName} · {formatDate(booking.scheduledDate)} at {formatTime(booking.startTime)} · {booking.request.area}
            </p>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} />
          <Link href={`/provider/requests/${booking.id}`} className="btn btn-secondary btn-sm">Job details</Link>
        </div>
      </div>

      <Card>
        <Chat
          bookingId={bookingId}
          initialMessages={thread.messages}
          counterpart={thread.counterpart}
          closed={thread.closed}
          height={420}
        />
      </Card>
    </>
  );
}
