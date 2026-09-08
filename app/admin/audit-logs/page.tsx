import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { PageHeader, Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Audit logs" };
export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const [logs, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where: params.action ? { action: params.action } : {},
      include: { user: { select: { name: true, role: true, id: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { _count: { action: "desc" } }, take: 20 }),
  ]);

  return (
    <>
      <PageHeader title="Audit logs" subtitle="Every state change on the platform, newest first" />

      <Card style={{ marginBottom: 16 }}>
        <form className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <select name="action" className="select" defaultValue={params.action ?? ""} style={{ width: 260 }} aria-label="Filter by action">
            <option value="">All actions</option>
            {actions.map((entry) => (
              <option key={entry.action} value={entry.action}>
                {entry.action.replaceAll("_", " ").toLowerCase()} ({entry._count._all})
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary">Filter</button>
          <Link href="/admin/audit-logs" className="btn btn-ghost">Reset</Link>
        </form>
      </Card>

      {logs.length === 0 ? (
        <Card><EmptyState icon="🧭" title="No audit entries" /></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>Actor</th><th>Entity</th><th>Details</th><th>When</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="small strong">{log.action.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="small">
                    {log.user ? (
                      <Link href={`/admin/users/${log.user.id}`}>{log.user.name}</Link>
                    ) : <span className="muted">system</span>}
                  </td>
                  <td className="tiny muted">{log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</td>
                  <td className="tiny muted" style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }}>{log.metadata ?? "—"}</td>
                  <td className="tiny muted">{timeAgo(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
