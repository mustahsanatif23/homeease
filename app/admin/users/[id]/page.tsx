import Link from "next/link";
import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getUserDetail } from "@/services/user.service";
import { formatDate, formatTime, taka, timeAgo } from "@/lib/format";
import { BOOKING_LABEL, REQUEST_LABEL } from "@/lib/constants";
import { Card, SectionHeader, StatCard, StatusBadge, Avatar, Stars, EmptyState } from "@/components/ui";
import { AccountStatusForm, RoleForm, VerificationForm } from "@/components/AdminForms";

export const metadata: Metadata = { title: "User detail" };
export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("ADMIN");
  const { user, providerBookings } = await getUserDetail(id);
  const profile = user.providerProfile;

  // Normalised so one list renders for either role.
  const jobs = (profile ? providerBookings : user.customerBookings).map((booking) => ({
    id: booking.id,
    service: booking.request.service.name,
    scheduledDate: booking.scheduledDate,
    startTime: booking.startTime,
    status: booking.status,
  }));

  return (
    <>
      <div style={{ marginBottom: 14 }}><BackButton fallback="/admin/users" label="All users" /></div>

      <Card style={{ marginBottom: 16 }}>
        <div className="row-between">
          <div className="row" style={{ gap: 14 }}>
            <Avatar name={user.name} src={user.avatar} size="lg" />
            <div>
              <div className="row" style={{ gap: 8 }}>
                <h1>{user.name}</h1>
                <span className="badge badge-brand">{user.role.toLowerCase()}</span>
                <StatusBadge status={user.accountStatus} />
              </div>
              <p className="small muted">{user.email} · {user.phone}</p>
              <p className="tiny muted">{user.address}, {user.area} · joined {formatDate(user.createdAt)}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          {profile ? (
            <Card>
              <SectionHeader title="Provider profile" subtitle={profile.businessName} />
              <div className="grid grid-3" style={{ marginBottom: 12 }}>
                <StatCard label="Rating" value={profile.rating > 0 ? `${profile.rating.toFixed(1)}★` : "New"} hint={`${profile.ratingCount} reviews`} />
                <StatCard label="Completed" value={profile.completedJobs} />
                <StatCard label="Earnings" value={taka(profile.totalEarnings)} />
              </div>
              <div className="row-between small" style={{ marginBottom: 10 }}>
                <span className="muted">Verification</span>
                <StatusBadge status={profile.verificationStatus} />
              </div>
              {profile.verificationStatus !== "APPROVED" ? <VerificationForm providerId={profile.id} /> : null}
              <div style={{ marginTop: 14 }}>
                <div className="stat-label">Services offered</div>
                <ul className="stack-sm small" style={{ marginTop: 8 }}>
                  {profile.services.map((offer) => (
                    <li key={offer.id} className="row-between">
                      <span>{offer.service.name} <span className="muted">· {offer.expertiseLevel.toLowerCase()}</span></span>
                      <span className="mono">{taka(offer.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ) : null}

          <Card>
            <SectionHeader title={profile ? "Recent jobs" : "Recent bookings"} />
            {jobs.length === 0 ? (
              <EmptyState icon="📅" title="Nothing yet" />
            ) : (
              <ul className="stack-sm small">
                {jobs.map((booking) => (
                  <li key={booking.id} className="row-between">
                    <span>{booking.service}</span>
                    <span className="row" style={{ gap: 10 }}>
                      <span className="muted mono tiny">{formatDate(booking.scheduledDate)} {formatTime(booking.startTime)}</span>
                      <StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card>
            <SectionHeader title="Account status" subtitle="Suspending signs the user out everywhere" />
            <AccountStatusForm userId={user.id} current={user.accountStatus} />
          </Card>

          <Card>
            <SectionHeader title="Role" subtitle="Admins get full platform access" />
            <RoleForm userId={user.id} current={user.role} />
          </Card>

          {user.customerRequests.length > 0 ? (
            <Card>
              <SectionHeader title="Recent requests" />
              <ul className="stack-sm small">
                {user.customerRequests.map((request) => (
                  <li key={request.id} className="row-between">
                    <span>{request.service.name}</span>
                    <StatusBadge status={request.status} label={REQUEST_LABEL[request.status]} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <SectionHeader title="Recent activity" />
            {user.auditLogs.length === 0 ? (
              <EmptyState icon="🧭" title="No audit entries" />
            ) : (
              <ul className="stack-sm">
                {user.auditLogs.map((log) => (
                  <li key={log.id} className="row-between">
                    <span className="small">{log.action.replaceAll("_", " ").toLowerCase()}</span>
                    <span className="tiny muted">{timeAgo(log.createdAt)}</span>
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
