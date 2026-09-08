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

export default async function ProviderMessagesPage() {
  const user = await requireRole("PROVIDER");
  const threads = await listThreads(user.id, user.providerId!);

  return (
    <>
      <Poller intervalMs={10000} />
      <PageHeader title="Messages" subtitle="Answer customers quickly — response time shows in your rating" />

      {threads.length === 0 ? (
        <Card>
          <EmptyState
            icon="💬"
            title="No conversations yet"
            message="Customers can message you as soon as a job is booked."
            action={<Link href="/provider/bookings" className="btn">View my jobs</Link>}
          />
        </Card>
      ) : (
        <div className="stack-sm">
          {threads.map((thread) => (
            <Link key={thread.bookingId} href={`/provider/messages/${thread.bookingId}`} className="card card-hover card-tight">
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
