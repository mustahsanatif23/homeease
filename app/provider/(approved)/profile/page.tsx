import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AREAS } from "@/lib/constants";
import { PageHeader, Card, SectionHeader, StatCard, Avatar, Stars } from "@/components/ui";
import { ProfileForm, PasswordForm } from "@/components/ProfileForms";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = { title: "Provider profile" };
export const dynamic = "force-dynamic";

export default async function ProviderProfileSettingsPage() {
  const user = await requireRole("PROVIDER");
  const profile = await prisma.providerProfile.findUnique({ where: { id: user.providerId! } });

  return (
    <>
      <PageHeader title="Business profile" subtitle="How customers see you on HomeEase" />
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Rating" value={profile && profile.rating > 0 ? `${profile.rating.toFixed(1)}★` : "New"} hint={`${profile?.ratingCount ?? 0} reviews`} />
        <StatCard label="Completed jobs" value={profile?.completedJobs ?? 0} />
        <StatCard label="Service radius" value={`${profile?.serviceRadiusKm ?? 0} km`} />
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <Avatar name={profile?.businessName ?? user.name} src={user.avatar} size="lg" />
            <div>
              <h2>{profile?.businessName}</h2>
              <p className="small muted">{user.email}</p>
              <div style={{ marginTop: 6 }}><Stars rating={profile?.rating ?? 0} count={profile?.ratingCount ?? 0} /></div>
            </div>
          </div>
          {profile?.bio ? <p className="small muted" style={{ marginBottom: 16 }}>{profile.bio}</p> : null}
          <ProfileForm user={user} areas={AREAS.map((a) => a.name)} />
        </Card>

        <div className="stack">
          <Card>
            <SectionHeader title="Verification" />
            <div className="row-between">
              <span className="small muted">Status</span>
              <span className="badge badge-success">{profile?.verificationStatus?.toLowerCase()}</span>
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Verification is managed by HomeEase admins. Approved providers appear in customer matching.
            </p>
          </Card>
          <Card>
            <SectionHeader title="Change password" />
            <PasswordForm />
          </Card>
          <Card>
            <SectionHeader title="Session" />
            <LogoutButton className="btn-secondary" />
          </Card>
        </div>
      </div>
    </>
  );
}
