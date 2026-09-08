"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { createRequestAction, uploadImageAction } from "@/actions/customer.actions";
import { initialActionState } from "@/actions/types";
import { SubmitButton, FormAlert } from "@/components/forms";
import { checkField, sanitize } from "@/lib/validation";

export interface WizardCategory { id: string; name: string; icon: string; description: string }
export interface WizardService { id: string; categoryId: string; name: string; description: string; basePrice: number; estimatedDuration: number }
export interface WizardAddress { id: string; label: string; address: string; area: string }

const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const URGENCIES = [
  { value: "NORMAL", title: "Normal", sub: "Standard scheduling, no extra fee" },
  { value: "HIGH", title: "Priority", sub: "Prioritised matching · +10% of service price" },
  { value: "URGENT", title: "Urgent", sub: "Need help immediately · closest available provider · +20%" },
];

const STEP_TITLES = [
  "Category", "Service", "Problem details", "Photo", "Location",
  "Date", "Time", "Urgency", "Contact", "Review", "Find providers",
];

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function BookingWizard({
  categories, services, areas, addresses, defaultPhone, defaultAddress, defaultArea, preselectedServiceId,
}: {
  categories: WizardCategory[]; services: WizardService[]; areas: string[]; addresses: WizardAddress[];
  defaultPhone: string; defaultAddress: string; defaultArea: string; preselectedServiceId?: string;
}) {
  const preselected = services.find((s) => s.id === preselectedServiceId);
  const [step, setStep] = useState(preselected ? 2 : 0);
  const [categoryId, setCategoryId] = useState(preselected?.categoryId ?? "");
  const [serviceId, setServiceId] = useState(preselected?.id ?? "");
  const [title, setTitle] = useState(preselected ? `${preselected.name} needed` : "");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, startUpload] = useTransition();
  const [address, setAddress] = useState(defaultAddress);
  const [area, setArea] = useState(defaultArea || areas[0] || "Dhanmondi");
  const [date, setDate] = useState(todayISO(1));
  const [startTime, setStartTime] = useState("10:00");
  const [urgency, setUrgency] = useState("NORMAL");
  const [contactPhone, setContactPhone] = useState(defaultPhone);
  const [autoAssign, setAutoAssign] = useState(false);
  const [state, formAction] = useActionState(createRequestAction, initialActionState);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const categoryServices = useMemo(() => services.filter((s) => s.categoryId === categoryId), [services, categoryId]);

  const stepError = (() => {
    switch (step) {
      case 0: return categoryId ? "" : "Choose a category to continue.";
      case 1: return serviceId ? "" : "Choose a service to continue.";
      case 2:
        if (title.trim().length < 4) return "Add a short title (at least 4 characters).";
        if (description.trim().length < 10) return "Describe the problem in a little more detail.";
        return "";
      case 4: return address.trim().length >= 5 ? "" : "Enter the full service address.";
      case 5: return date ? "" : "Choose a date.";
      case 6: return startTime ? "" : "Choose a time.";
      case 8: return checkField("phone", contactPhone);
      default: return "";
    }
  })();

  const [touched, setTouched] = useState(false);
  const next = () => {
    if (stepError) { setTouched(true); return; }
    setTouched(false);
    setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1));
  };
  const back = () => { setTouched(false); setStep((s) => Math.max(0, s - 1)); };

  async function handleUpload(file: File) {
    setUploadError("");
    const data = new FormData();
    data.append("image", file);
    startUpload(async () => {
      const result = await uploadImageAction(initialActionState, data);
      if (result.error) setUploadError(result.error);
      else setImageUrl(String(result.data?.url ?? ""));
    });
  }

  return (
    <div className="stack">
      <div className="steps" role="progressbar" aria-valuemin={1} aria-valuemax={STEP_TITLES.length} aria-valuenow={step + 1}>
        {STEP_TITLES.map((label, index) => (
          <span key={label} className={`step-pill ${index < step ? "done" : index === step ? "current" : ""}`} title={label} />
        ))}
      </div>
      <p className="tiny muted">Step {step + 1} of {STEP_TITLES.length} · {STEP_TITLES[step]}</p>

      <div className="card fade-in" key={step}>
        {step === 0 ? (
          <>
            <h2>What do you need help with?</h2>
            <p className="muted small" style={{ marginBottom: 14 }}>Pick the category that fits your problem best.</p>
            <div className="choice-grid">
              {categories.map((category) => (
                <button
                  key={category.id} type="button"
                  className={`choice ${categoryId === category.id ? "selected" : ""}`}
                  onClick={() => { setCategoryId(category.id); setServiceId(""); }}
                  aria-pressed={categoryId === category.id}
                >
                  <div style={{ fontSize: "1.4rem" }} aria-hidden="true">{category.icon}</div>
                  <div className="title">{category.name}</div>
                  <div className="sub">{category.description}</div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2>Which service?</h2>
            <p className="muted small" style={{ marginBottom: 14 }}>Prices shown are the HomeEase base rate — providers may quote slightly differently.</p>
            <div className="choice-grid">
              {categoryServices.map((item) => (
                <button
                  key={item.id} type="button"
                  className={`choice ${serviceId === item.id ? "selected" : ""}`}
                  onClick={() => { setServiceId(item.id); if (!title) setTitle(`${item.name} needed`); }}
                  aria-pressed={serviceId === item.id}
                >
                  <div className="title">{item.name}</div>
                  <div className="sub">{item.description}</div>
                  <div className="row-between" style={{ marginTop: 8 }}>
                    <span className="strong small">৳{item.basePrice.toLocaleString("en-US")}</span>
                    <span className="tiny muted">~{Math.round(item.estimatedDuration / 60 * 10) / 10} h</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <div className="stack">
            <h2>Tell us about the problem</h2>
            <div className="field">
              <label className="label" htmlFor="wiz-title">Short title *</label>
              <input id="wiz-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AC not cooling in bedroom" />
            </div>
            <div className="field">
              <label className="label" htmlFor="wiz-desc">Description *</label>
              <textarea id="wiz-desc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's happening, when it started, and anything the provider should bring." />
              <span className="hint">The more detail you give, the better the match.</span>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="stack">
            <h2>Add a photo (optional)</h2>
            <p className="muted small">A picture of the problem helps providers prepare. JPG, PNG or WEBP up to 5 MB.</p>
            <input
              type="file" accept="image/jpeg,image/png,image/webp" className="input"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file); }}
            />
            {uploading ? <p className="small muted">Uploading…</p> : null}
            {uploadError ? <div className="alert alert-error">{uploadError}</div> : null}
            {imageUrl ? (
              <div className="row" style={{ gap: 12 }}>
                <img src={imageUrl} alt="Uploaded preview" style={{ width: 130, height: 100, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setImageUrl("")}>Remove</button>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="stack">
            <h2>Where is the service needed?</h2>
            {addresses.length > 0 ? (
              <div className="choice-grid">
                {addresses.map((saved) => (
                  <button
                    key={saved.id} type="button"
                    className={`choice ${address === saved.address ? "selected" : ""}`}
                    onClick={() => { setAddress(saved.address); setArea(saved.area); }}
                  >
                    <div className="title">{saved.label}</div>
                    <div className="sub">{saved.address}</div>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="field">
              <label className="label" htmlFor="wiz-address">Full address *</label>
              <input id="wiz-address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, road, block" />
            </div>
            <div className="field">
              <label className="label" htmlFor="wiz-area">Area *</label>
              <select id="wiz-area" className="select" value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <span className="hint">We use the area to calculate provider distance and arrival time.</span>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="stack">
            <h2>Which day works for you?</h2>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                const value = todayISO(offset);
                const d = new Date(value);
                return (
                  <button
                    key={value} type="button"
                    className={`choice ${date === value ? "selected" : ""}`}
                    style={{ minWidth: 92, textAlign: "center" }}
                    onClick={() => setDate(value)}
                  >
                    <div className="tiny muted">{offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : d.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                    <div className="title">{d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                  </button>
                );
              })}
            </div>
            <div className="field" style={{ maxWidth: 240 }}>
              <label className="label" htmlFor="wiz-date">Or pick a date</label>
              <input id="wiz-date" type="date" className="input" value={date} min={todayISO(0)} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="stack">
            <h2>Preferred start time</h2>
            <p className="muted small">
              {service ? `This job usually takes about ${Math.round(service.estimatedDuration / 60 * 10) / 10} hours.` : ""}
            </p>
            <div className="slot-grid">
              {TIME_SLOTS.map((slot) => (
                <button key={slot} type="button" className={`choice center ${startTime === slot ? "selected" : ""}`} onClick={() => setStartTime(slot)}>
                  <span className="title">{slot}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="stack">
            <h2>How urgent is it?</h2>
            <div className="stack-sm">
              {URGENCIES.map((option) => (
                <button key={option.value} type="button" className={`choice ${urgency === option.value ? "selected" : ""}`} onClick={() => setUrgency(option.value)}>
                  <div className="title">{option.title}</div>
                  <div className="sub">{option.sub}</div>
                </button>
              ))}
            </div>
            {urgency === "URGENT" ? <div className="alert alert-warning">Need help immediately? We&apos;ll prioritise the closest available provider and show the fastest arrival time.</div> : null}
          </div>
        ) : null}

        {step === 8 ? (
          <div className="stack">
            <h2>How should the provider reach you?</h2>
            <div className="field">
              <label className="label" htmlFor="wiz-phone">Contact phone *</label>
              <input
                id="wiz-phone" className="input" inputMode="numeric" maxLength={16}
                value={contactPhone}
                onChange={(e) => setContactPhone(sanitize("phone", e.target.value))}
                placeholder="01712345678"
              />
              <span className="hint">Digits only, 11–15 of them.</span>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} />
              <span>
                <strong>Assign automatically.</strong> Skip the shortlist and book the highest ranked provider for me.
              </span>
            </label>
          </div>
        ) : null}

        {step === 9 ? (
          <div className="stack">
            <h2>Review your request</h2>
            <ul className="stack-sm">
              {[
                ["Service", service?.name ?? "—"],
                ["Title", title],
                ["Description", description],
                ["Address", `${address}, ${area}`],
                ["When", `${date} at ${startTime}`],
                ["Urgency", URGENCIES.find((u) => u.value === urgency)?.title ?? urgency],
                ["Contact", contactPhone],
                ["Assignment", autoAssign ? "Automatic" : "I'll choose the provider"],
              ].map(([label, value]) => (
                <li key={label} className="row-between" style={{ borderBottom: "1px solid var(--border)", padding: "8px 0", gap: 20 }}>
                  <span className="small muted">{label}</span>
                  <span className="small strong" style={{ textAlign: "right", maxWidth: "62%" }}>{value}</span>
                </li>
              ))}
            </ul>
            {service ? (
              <div className="alert alert-info">
                Estimated from ৳{service.basePrice.toLocaleString("en-US")} — the final price depends on the provider,
                distance and urgency, and is confirmed on your invoice.
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 10 ? (
          <form action={formAction} className="stack">
            <h2>Ready to find your best match</h2>
            <p className="muted small">
              We&apos;ll score every eligible provider on availability, distance, rating, price, expertise and workload.
            </p>
            <FormAlert error={state.error} />
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="description" value={description} />
            <input type="hidden" name="address" value={address} />
            <input type="hidden" name="area" value={area} />
            <input type="hidden" name="preferredDate" value={date} />
            <input type="hidden" name="preferredStartTime" value={startTime} />
            <input type="hidden" name="urgency" value={urgency} />
            <input type="hidden" name="contactPhone" value={contactPhone} />
            {imageUrl ? <input type="hidden" name="imageUrl" value={imageUrl} /> : null}
            {autoAssign ? <input type="hidden" name="autoAssign" value="true" /> : null}
            <SubmitButton className="btn-lg btn-block" pendingText="Finding the best providers for you…">
              Find My Best Match
            </SubmitButton>
          </form>
        ) : null}

        {touched && stepError ? <p className="error-text" style={{ marginTop: 12 }} role="alert">{stepError}</p> : null}
      </div>

      <div className="row-between">
        <button type="button" className="btn btn-secondary" onClick={back} disabled={step === 0}>Back</button>
        {step < STEP_TITLES.length - 1 ? (
          <button type="button" className="btn" onClick={next}>Continue</button>
        ) : <span className="tiny muted">Almost there</span>}
      </div>
    </div>
  );
}
