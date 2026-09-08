"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { selectProviderAction } from "@/actions/customer.actions";
import { initialActionState } from "@/actions/types";
import { SubmitButton, FormAlert } from "@/components/forms";

export interface MatchView {
  providerId: string;
  businessName: string;
  providerName: string;
  area: string | null;
  rank: number;
  matchScore: number;
  distanceKm: number;
  eta: number;
  price: number;
  rating: number;
  ratingCount: number;
  completedJobs: number;
  experienceYears: number;
  expertiseLevel: string;
  verified: boolean;
  exactSlotFree: boolean;
  suggestedStartTime: string;
  reasons: string[];
  breakdown: { availability: number; distance: number; rating: number; price: number; expertise: number; workload: number };
  weights: Record<string, number>;
}

const LABELS: Record<string, string> = {
  availability: "Availability", distance: "Distance", rating: "Rating",
  price: "Price", expertise: "Expertise", workload: "Workload",
};

function scoreWord(value: number) {
  if (value >= 0.9) return "Excellent";
  if (value >= 0.75) return "Very good";
  if (value >= 0.55) return "Good";
  if (value >= 0.35) return "Fair";
  return "Low";
}

export default function MatchResults({ requestId, matches, requestedTime }: { requestId: string; matches: MatchView[]; requestedTime: string }) {
  const [searching, setSearching] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(matches[0]?.providerId ?? null);
  const [compare, setCompare] = useState<string[]>([]);
  const [state, formAction] = useActionState(selectProviderAction, initialActionState);

  useEffect(() => {
    const timer = setTimeout(() => setSearching(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (searching) {
    return (
      <div className="card searching">
        <div className="pulse-ring" aria-hidden="true">🎯</div>
        <h2>Finding the best providers for you…</h2>
        <p className="muted small" style={{ marginTop: 6 }}>
          Checking availability, distance, ratings, price, expertise and workload.
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="card empty">
        <div className="empty-icon" aria-hidden="true">🔍</div>
        <h3>No providers are available for this time.</h3>
        <p className="small">Try a different day or time, or widen the urgency so more providers qualify.</p>
        <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 16 }}>
          <Link href="/book" className="btn">Change the request</Link>
          <Link href={`/requests/${requestId}`} className="btn btn-secondary">View request</Link>
        </div>
      </div>
    );
  }

  const compared = matches.filter((m) => compare.includes(m.providerId));

  return (
    <div className="stack fade-in">
      <FormAlert error={state.error} />

      {compared.length >= 2 ? (
        <div className="card">
          <h2>Comparing {compared.length} providers</h2>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Signal</th>
                  {compared.map((m) => <th key={m.providerId}>{m.businessName}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr><td className="strong">Match score</td>{compared.map((m) => <td key={m.providerId} className="strong mono">{m.matchScore}%</td>)}</tr>
                <tr><td>Price</td>{compared.map((m) => <td key={m.providerId} className="mono">৳{m.price.toLocaleString("en-US")}</td>)}</tr>
                <tr><td>Distance</td>{compared.map((m) => <td key={m.providerId} className="mono">{m.distanceKm} km</td>)}</tr>
                <tr><td>Arrival</td>{compared.map((m) => <td key={m.providerId} className="mono">{m.eta} min</td>)}</tr>
                <tr><td>Rating</td>{compared.map((m) => <td key={m.providerId} className="mono">{m.rating > 0 ? `${m.rating.toFixed(1)}★` : "New"}</td>)}</tr>
                <tr><td>Completed jobs</td>{compared.map((m) => <td key={m.providerId} className="mono">{m.completedJobs}</td>)}</tr>
                <tr><td>Expertise</td>{compared.map((m) => <td key={m.providerId}>{m.expertiseLevel.toLowerCase()}</td>)}</tr>
                <tr><td>Requested slot</td>{compared.map((m) => <td key={m.providerId}>{m.exactSlotFree ? "Available" : `Nearest ${m.suggestedStartTime}`}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setCompare([])}>Clear comparison</button>
        </div>
      ) : null}

      {matches.map((match) => (
        <div key={match.providerId} className="card" style={{ position: "relative" }}>
          {match.rank === 1 ? <span className="match-rank">BEST MATCH</span> : null}
          <div className="row-between" style={{ alignItems: "flex-start" }}>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              <span className="avatar avatar-lg" aria-hidden="true">{match.businessName.slice(0, 2).toUpperCase()}</span>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <h2>{match.businessName}</h2>
                  {match.verified ? <span className="badge badge-success">✓ Verified</span> : null}
                </div>
                <p className="small muted">{match.providerName} · {match.area ?? "Dhaka"} · {match.experienceYears} yrs experience</p>
                <div className="row" style={{ gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                  <span className="small"><span className="stars">★</span> {match.rating > 0 ? `${match.rating.toFixed(1)} (${match.ratingCount})` : "New provider"}</span>
                  <span className="small muted">{match.distanceKm} km away</span>
                  <span className="small muted">ETA {match.eta} min</span>
                  <span className="small muted">{match.completedJobs} jobs done</span>
                </div>
              </div>
            </div>
            <div className="match-score">
              <span className="value">{Math.round(match.matchScore)}%</span>
              <span className="label">Match</span>
            </div>
          </div>

          <div className="row-between" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div>
              <div className="tiny muted">Estimated price</div>
              <div className="strong mono" style={{ fontSize: "1.1rem" }}>৳{match.price.toLocaleString("en-US")}</div>
            </div>
            <div>
              <div className="tiny muted">Requested slot</div>
              <div className="small strong">
                {match.exactSlotFree ? `Available at ${requestedTime}` : `Nearest free ${match.suggestedStartTime}`}
              </div>
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button
              type="button" className="btn btn-secondary btn-sm"
              onClick={() => setExpanded(expanded === match.providerId ? null : match.providerId)}
              aria-expanded={expanded === match.providerId}
            >
              {expanded === match.providerId ? "Hide details" : "Why this provider?"}
            </button>
            <Link href={`/providers/${match.providerId}`} className="btn btn-secondary btn-sm">View profile</Link>
            <button
              type="button"
              className={`btn btn-sm ${compare.includes(match.providerId) ? "" : "btn-secondary"}`}
              onClick={() =>
                setCompare((current) =>
                  current.includes(match.providerId)
                    ? current.filter((id) => id !== match.providerId)
                    : current.length >= 3 ? current : [...current, match.providerId],
                )
              }
            >
              {compare.includes(match.providerId) ? "Comparing" : "Compare"}
            </button>
            <span className="spacer" />
            <form action={formAction}>
              <input type="hidden" name="requestId" value={requestId} />
              <input type="hidden" name="providerId" value={match.providerId} />
              <input type="hidden" name="startTime" value={match.suggestedStartTime} />
              <SubmitButton className="btn-sm" pendingText="Booking…">Select provider</SubmitButton>
            </form>
          </div>

          {expanded === match.providerId ? (
            <div className="fade-in" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div className="breakdown">
                {(Object.keys(LABELS) as Array<keyof typeof match.breakdown>).map((key) => (
                  <div className="breakdown-item" key={key}>
                    <div className="k">{LABELS[key]} · {Math.round(match.weights[key] ?? 0)}%</div>
                    <div className="v">{scoreWord(match.breakdown[key])}</div>
                    <div className="meter"><span style={{ width: `${Math.round(match.breakdown[key] * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
              <ul className="reason-list" style={{ marginTop: 14 }}>
                {match.reasons.map((reason) => (
                  <li key={reason}><span className="tick">✓</span> {reason}</li>
                ))}
              </ul>
              <p className="tiny muted" style={{ marginTop: 10 }}>
                Score = availability × {Math.round(match.weights.availability)}% + distance × {Math.round(match.weights.distance)}%
                + rating × {Math.round(match.weights.rating)}% + price × {Math.round(match.weights.price)}%
                + expertise × {Math.round(match.weights.expertise)}% + workload × {Math.round(match.weights.workload)}%
              </p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
