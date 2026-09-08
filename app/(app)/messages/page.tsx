import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listThreads } from "@/services/message.service";
import { timeAgo } from "@/lib/format";
import { BOOKING_LABEL } from "@/lib/constants";
import { PageHeader, Card, EmptyState, Avatar, StatusBadge } from "@/components/ui";
import Poller from "@/components/Poller";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function CustomerMessagesPage() {
  const user = await requireRole("CUSTOMER");
  const threads = await listThreads(user.id);

  return (
    <>
      <Poller intervalMs={10000} />
      <PageHeader title="Messages" subtitle="Chat directly with the professional handling your job" />

      {threads.length === 0 ? (
        <Card>
          <EmptyState
            icon="💬"
            title="No conversations yet"
            message="Once a provider is booked you can message them from the job page."
            action={<Link href="/bookings" className="btn">View my bookings</Link>}
          />
        </Card>
      ) : (
        <div className="stack-sm">
          {threads.map((thread) => (
            <Link key={thread.bookingId} href={`/messages/${thread.bookingId}`} className="card card-hover card-tight">
              <div className="thread-row">
                <Avatar name={thread.counterpart} src={thread.avatar} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row-between">
                    <span className="small strong">{thread.counterpart}</span>
                    <span className="tiny muted">{timeAgo(thread.lastAt)}</span>
                  </div>
                  <div className="preview truncate">{thread.lastSender}: {thread.lastMessage}</div>
                  <div className="row" style={{ gap: 8, marginTop: 5 }}>
                    <span className="tiny muted">{thread.serviceName}</span>
                    <StatusBadge status={thread.status} label={BOOKING_LABEL[thread.status]} />
                  </div>
                </div>
                {thread.unread > 0 ? <span className="nav-count">{thread.unread}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
