import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getMatchingConfig } from "@/services/config.service";
import { resetMatchingConfigAction } from "@/actions/admin.actions";
import { PageHeader, Card, SectionHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { MatchingConfigForm } from "@/components/AdminForms";
import { DonutChart } from "@/components/Charts";

export const metadata: Metadata = { title: "Matching configuration" };
export const dynamic = "force-dynamic";

export default async function AdminMatchingPage() {
  await requireRole("ADMIN");
  const config = await getMatchingConfig();

  const weights = [
    { label: "Availability", value: config.availabilityWeight },
    { label: "Distance", value: config.distanceWeight },
    { label: "Rating", value: config.ratingWeight },
    { label: "Price", value: config.priceWeight },
    { label: "Expertise", value: config.expertiseWeight },
    { label: "Workload", value: config.workloadWeight },
  ];

  return (
    <>
      <PageHeader
        title="Matching configuration"
        subtitle="These weights decide which provider wins every request"
        action={
          <ConfirmButton action={resetMatchingConfigAction} className="btn-secondary" confirmText="Restore the recommended weights?">
            Reset to recommended
          </ConfirmButton>
        }
      />

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="Scoring weights" subtitle="Must total exactly 100%" />
          <MatchingConfigForm config={config as unknown as Record<string, number>} />
        </Card>

        <div className="stack">
          <Card>
            <SectionHeader title="Current mix" />
            <DonutChart data={weights} />
          </Card>
          <Card>
            <SectionHeader title="How scoring works" />
            <ol className="stack-sm small muted" style={{ paddingLeft: 18 }}>
              <li>Hard filters first: the provider must offer the service, be approved and active, be within their service radius, be free in the requested slot and not on time off.</li>
              <li>Each surviving provider is scored 0–1 on six signals, then combined using the weights on the left.</li>
              <li>For urgent requests, distance and availability are multiplied by the urgency multipliers and the weights are renormalised to 100%.</li>
              <li>The customer sees the ranked list with a plain-English reason for every score.</li>
            </ol>
          </Card>
          <Card>
            <SectionHeader title="Pricing rules" />
            <ul className="stack-sm small">
              <li className="row-between"><span className="muted">Service fee</span><span className="mono strong">{config.serviceFeePercent}%</span></li>
              <li className="row-between"><span className="muted">Urgency fee</span><span className="mono strong">{config.urgencyFeePercent}%</span></li>
              <li className="row-between"><span className="muted">Distance fee</span><span className="mono strong">৳{config.distanceFeePerKm}/km</span></li>
            </ul>
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Changes apply to new matches immediately — existing bookings keep their agreed price.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
