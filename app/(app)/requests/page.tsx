import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listCustomerRequests } from "@/services/request.service";
import { formatDate, formatTime, taka } from "@/lib/format";
import { REQUEST_LABEL, URGENCY_LABEL } from "@/lib/constants";
import { PageHeader, StatusBadge, EmptyState, Card } from "@/components/ui";

export const metadata: Metadata = { title: "My requests" };
export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await requireRole("CUSTOMER");
  const requests = await listCustomerRequests(user.id);

  return (
    <>
      <PageHeader title="My requests" subtitle="Everything you've asked HomeEase to handle" action={<Link href="/book" className="btn">Book a service</Link>} />
      {requests.length === 0 ? (
        <Card><EmptyState icon="📋" title="No service requests yet." message="Book your first service and we'll match you with a provider." action={<Link href="/book" className="btn">Book a service</Link>} /></Card>
      ) : (
        <div className="stack">
          {requests.map((request) => (
            <Link key={request.id} href={`/requests/${request.id}`} className="card card-hover">
              <div className="row-between">
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <h3>{request.service.name}</h3>
                    {request.urgency !== "NORMAL" ? <StatusBadge status={request.urgency} label={URGENCY_LABEL[request.urgency]} /> : null}
                  </div>
                  <p className="tiny muted">
                    {request.area} · {formatDate(request.preferredDate)} at {formatTime(request.preferredStartTime)}
                    {request.provider ? ` · ${request.provider.businessName}` : ""}
                  </p>
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <span className="strong mono small">{taka(request.finalPrice ?? request.estimatedPrice)}</span>
                  <StatusBadge status={request.status} label={REQUEST_LABEL[request.status]} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
