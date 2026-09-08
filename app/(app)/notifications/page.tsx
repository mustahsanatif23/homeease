import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { listNotifications, unreadCount } from "@/services/notification.service";
import { markAllNotificationsAction, markNotificationAction } from "@/actions/customer.actions";
import { timeAgo } from "@/lib/format";
import { PageHeader, EmptyState, Card } from "@/components/ui";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireAuth();
  const [notifications, unread] = await Promise.all([listNotifications(user.id), unreadCount(user.id)]);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        action={
          unread > 0 ? (
            <form action={markAllNotificationsAction}><SubmitButton className="btn-secondary btn-sm">Mark all read</SubmitButton></form>
          ) : undefined
        }
      />
      {notifications.length === 0 ? (
        <Card><EmptyState icon="🔔" title="No notifications." message="You're all caught up." /></Card>
      ) : (
        <div className="stack-sm">
          {notifications.map((notification) => (
            <div key={notification.id} className="card card-tight" style={{ borderLeft: notification.read ? undefined : "3px solid var(--brand-600)" }}>
              <div className="row-between">
                <div>
                  <div className="strong small">{notification.title}</div>
                  <div className="small muted">{notification.message}</div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{timeAgo(notification.createdAt)}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {notification.relatedRequestId && user.role === "CUSTOMER" ? (
                    <Link href={`/requests/${notification.relatedRequestId}`} className="btn btn-secondary btn-sm">View</Link>
                  ) : null}
                  {!notification.read ? (
                    <form action={markNotificationAction.bind(null, notification.id)}>
                      <SubmitButton className="btn-ghost btn-sm">Mark read</SubmitButton>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
