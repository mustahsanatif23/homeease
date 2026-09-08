import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listUsers } from "@/services/user.service";
import { AREAS, type Role, type AccountStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, StatusBadge, EmptyState, Avatar } from "@/components/ui";
import { CreateUserForm } from "@/components/AdminForms";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const result = await listUsers({
    query: params.q,
    role: params.role as Role | undefined,
    status: params.status as AccountStatus | undefined,
    page: Number(params.page ?? 1),
  });

  const query = (extra: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = { q: params.q, role: params.role, status: params.status, ...extra };
    for (const [key, value] of Object.entries(merged)) if (value) search.set(key, value);
    return `/admin/users?${search.toString()}`;
  };

  return (
    <>
      <PageHeader title="Users" subtitle={`${result.total} accounts`} />

      <Card style={{ marginBottom: 16 }}>
        <form className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input name="q" className="input" defaultValue={params.q} placeholder="Search name, email or phone" style={{ maxWidth: 280 }} aria-label="Search users" />
          <select name="role" className="select" defaultValue={params.role ?? ""} style={{ width: 150 }} aria-label="Filter by role">
            <option value="">All roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="PROVIDER">Providers</option>
            <option value="ADMIN">Admins</option>
          </select>
          <select name="status" className="select" defaultValue={params.status ?? ""} style={{ width: 160 }} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
          <button type="submit" className="btn btn-secondary">Filter</button>
          <Link href="/admin/users" className="btn btn-ghost">Reset</Link>
        </form>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: 16, alignItems: "start" }}>
        <Card>
          {result.items.length === 0 ? (
            <EmptyState icon="🔍" title="No users match those filters" />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
                  <tbody>
                    {result.items.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <Avatar name={user.name} src={user.avatar} size="sm" />
                            <div>
                              <div className="small strong">{user.name}</div>
                              <div className="tiny muted">{user.email}</div>
                              {user.providerProfile ? <div className="tiny muted">{user.providerProfile.businessName} · {user.providerProfile.verificationStatus.toLowerCase()}</div> : null}
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-brand">{user.role.toLowerCase()}</span></td>
                        <td><StatusBadge status={user.accountStatus} /></td>
                        <td className="tiny muted">{formatDate(user.createdAt)}</td>
                        <td><Link href={`/admin/users/${user.id}`} className="btn btn-secondary btn-sm">Manage</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.pages > 1 ? (
                <div className="row-between" style={{ marginTop: 14 }}>
                  <span className="tiny muted">Page {result.page} of {result.pages}</span>
                  <div className="row" style={{ gap: 8 }}>
                    {result.page > 1 ? <Link className="btn btn-secondary btn-sm" href={query({ page: String(result.page - 1) })}>Previous</Link> : null}
                    {result.page < result.pages ? <Link className="btn btn-secondary btn-sm" href={query({ page: String(result.page + 1) })}>Next</Link> : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <h2 style={{ marginBottom: 12 }}>Create an account</h2>
          <CreateUserForm areas={AREAS.map((a) => a.name)} />
        </Card>
      </div>
    </>
  );
}
