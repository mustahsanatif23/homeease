import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { listCategories, popularServices } from "@/services/catalog.service";
import { taka } from "@/lib/format";
import { Logo, Mark } from "@/components/Brand";
import { Avatar, Stars } from "@/components/ui";

export const metadata: Metadata = {
  title: "HomeEase — Smart Service. Better Living.",
  description:
    "Reliable home services, right at your doorstep. Book verified professionals for AC repair, plumbing, electrical work, cleaning and more — matched to you automatically.",
};
export const dynamic = "force-dynamic";

const REASONS = [
  "Verified and skilled professionals",
  "Transparent pricing, no hidden costs",
  "On-time service guarantee",
  "Support whenever you need it",
];

const FAQS = [
  { q: "How does HomeEase choose my provider?", a: "Every available professional is scored on availability, distance, rating, price, expertise and current workload. You see the ranking, the score and the reason behind it — and you always make the final call." },
  { q: "What if I need someone urgently?", a: "Mark the request urgent and the algorithm re-weights itself towards whoever can reach you fastest, then shows their arrival estimate." },
  { q: "How is the price decided?", a: "The provider's price for that service, plus a service fee, a distance fee and an urgency fee if it applies. You see the estimate before booking and the exact total on the invoice." },
  { q: "Can I book the same professional again?", a: "Yes — save them to your favourites from their profile and book them straight from your dashboard." },
];

export default async function LandingPage() {
  const [user, categories, popular, stats, reviews] = await Promise.all([
    getCurrentUser(),
    listCategories(),
    popularServices(6),
    Promise.all([
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.providerProfile.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
      prisma.service.count({ where: { active: true } }),
    ]),
    prisma.review.findMany({
      where: { comment: { not: null }, rating: { gte: 4 } },
      include: { customer: { select: { name: true, avatar: true } }, provider: { select: { businessName: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const [completedJobs, providerCount, ratingAgg, serviceCount] = stats;
  const rating = ratingAgg._avg.rating ?? 0;

  return (
    <>
      <header className="landing-nav">
        <div className="container inner">
          <Logo />
          <nav className="nav-links" aria-label="Sections">
            <a href="#services">Services</a>
            <a href="#why">Why HomeEase</a>
            <a href="#reviews">Reviews</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="row" style={{ gap: 8 }}>
            {user ? (
              <Link href={homeFor(user.role)} className="btn btn-sm">Go to my dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary btn-sm">Log in</Link>
                <Link href="/register" className="btn btn-sm">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ---------------- hero ---------------- */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <h1>Reliable home services, right at your doorstep</h1>
              <p className="lead">
                From quick repairs to expert maintenance — book trusted professionals in a few taps.
                HomeEase finds the right person for your job, your time and your area automatically.
              </p>

              <form action="/services" className="search-pill" style={{ marginTop: 26 }}>
                <span aria-hidden="true">🔍</span>
                <input name="q" placeholder="Search for a service — AC repair, plumbing, cleaning…" aria-label="Search for a service" />
                <button type="submit" className="btn btn-sm">Search</button>
              </form>

              <div className="hero-actions">
                <Link href={user ? "/book" : "/register"} className="btn btn-lg">Book a service</Link>
                <Link href="/services" className="btn btn-secondary btn-lg">Browse all services</Link>
              </div>

              <div className="row" style={{ gap: 12, marginTop: 22 }}>
                <div className="avatar-stack">
                  {reviews.map((review) => (
                    <Avatar key={review.id} name={review.customer.name} src={review.customer.avatar} size="sm" />
                  ))}
                  <span className="avatar avatar-sm">+</span>
                </div>
                <span className="small muted">
                  Rated <span className="strong">{rating > 0 ? rating.toFixed(1) : "4.9"}/5</span> by our customers
                </span>
              </div>
            </div>

            <div className="hero-visual">
              <span className="float-chip one">
                <Avatar name="Emily Johnson" size="sm" /> Emily Johnson <span className="stars">★</span> 4.9
              </span>
              <div className="plate">
                <Mark size={64} />
                <h2 style={{ marginTop: 12 }}>Smart Service.<br />Better Living.</h2>
                <p className="small muted" style={{ marginTop: 8 }}>
                  {serviceCount} services · {providerCount} verified professionals
                </p>
                <Link href={user ? "/book" : "/register"} className="btn btn-sm" style={{ marginTop: 14 }}>Find my best match</Link>
              </div>
              <span className="float-chip two">
                <Avatar name="Sophia Lee" size="sm" /> Sophia Lee <span className="stars">★</span> 5.0
              </span>
            </div>
          </div>
        </section>

        {/* ---------------- trust band ---------------- */}
        <section className="section" style={{ paddingTop: 24 }}>
          <div className="container">
            <div className="grid grid-2" style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: "1.9rem" }}>Trusted by thousands of homeowners.</h2>
              <p className="muted small">
                For years we&apos;ve helped families take care of their homes by providing reliable, professional
                services that make life easier and more convenient. Our mission is to simplify home maintenance —
                and to make every booking feel effortless.
              </p>
            </div>

            <div className="grid grid-4">
              <div className="tile tile-yellow">
                <div><div className="big">{completedJobs.toLocaleString("en-US")}+</div><div className="small strong">Jobs completed</div></div>
                <p className="tiny">Across Dhaka and nearby neighbourhoods</p>
              </div>
              <div className="tile tile-sky">
                <div><div className="big">95%</div><div className="small strong">On-time service</div></div>
                <p className="tiny">We value your time and deliver as promised</p>
              </div>
              <div className="tile tile-mint">
                <div><div className="big">{providerCount}+</div><div className="small strong">Certified professionals</div></div>
                <p className="tiny">Skilled, trained and background checked</p>
              </div>
              <div className="tile tile-lilac">
                <div><div className="big">{rating > 0 ? rating.toFixed(1) : "4.9"}/5</div><div className="small strong">Customer rating</div></div>
                <p className="tiny">Based on {ratingAgg._count._all} verified reviews</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- services ---------------- */}
        <section className="section" id="services" style={{ paddingTop: 10 }}>
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">What we do</p>
              <h2 style={{ fontSize: "1.9rem" }}>Everything your home needs, in one place</h2>
              <p className="muted small" style={{ marginTop: 8 }}>
                Pick a category and we&apos;ll rank the professionals who can actually take the job at your time.
              </p>
            </div>

            <div className="grid grid-3">
              {categories.slice(0, 6).map((category, index) => (
                <div className="service-card" key={category.id}>
                  <span className="icon" aria-hidden="true">{category.icon}</span>
                  <h3>{category.name}</h3>
                  <p className="small muted">{category.description}</p>
                  <div className="cta">
                    <Link
                      href={user ? "/book" : "/register"}
                      className={`btn btn-sm ${index === 1 ? "" : "btn-secondary"}`}
                    >
                      Get started
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {popular.length > 0 ? (
              <div className="grid grid-3" style={{ marginTop: 16 }}>
                {popular.slice(0, 3).map((service) => (
                  <Link key={service.id} href={`/services/${service.slug}`} className="card card-hover">
                    <div className="row-between">
                      <h3>{service.name}</h3>
                      <span className="badge badge-brand">popular</span>
                    </div>
                    <p className="small muted" style={{ margin: "8px 0 12px" }}>{service.description}</p>
                    <div className="row-between">
                      <span className="strong">{taka(service.basePrice)}</span>
                      <span className="tiny muted">~{Math.round((service.estimatedDuration / 60) * 10) / 10} h</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* ---------------- why ---------------- */}
        <section className="section" id="why" style={{ paddingTop: 0 }}>
          <div className="container reasons">
            <div className="panel tile-peach" style={{ display: "grid", placeItems: "center", minHeight: 300 }}>
              <div className="center">
                <Mark size={72} />
                <h3 style={{ marginTop: 14 }}>Matched in seconds</h3>
                <p className="small muted" style={{ marginTop: 6, maxWidth: 280 }}>
                  Six signals — availability, distance, rating, price, expertise and workload — scored for every
                  professional, then explained to you in plain language.
                </p>
              </div>
            </div>
            <div className="panel tile-mint">
              <h2 style={{ fontSize: "1.7rem" }}>The reasons people count on us</h2>
              <p className="small muted" style={{ margin: "10px 0 18px" }}>
                We&apos;re more than a booking form. HomeEase handles the matching, the scheduling, the invoice and
                the follow-up so you only have to describe the problem.
              </p>
              <ul className="check-list">
                {REASONS.map((reason) => (
                  <li key={reason}><span className="tick">✓</span> {reason}</li>
                ))}
              </ul>
              <Link href={user ? "/book" : "/register"} className="btn" style={{ marginTop: 18 }}>Get in touch</Link>
            </div>
          </div>
        </section>

        {/* ---------------- reviews ---------------- */}
        <section className="section" id="reviews" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <h2 style={{ fontSize: "1.9rem" }}>Loved by thousands of happy homeowners</h2>
            </div>
            <div className="grid grid-3">
              {reviews.map((review) => (
                <div className="quote-card" key={review.id}>
                  <Stars rating={review.rating} />
                  <p className="small" style={{ margin: "10px 0 14px" }}>{review.comment}</p>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={review.customer.name} src={review.customer.avatar} size="sm" />
                    <div>
                      <div className="small strong">{review.customer.name}</div>
                      <div className="tiny muted">{review.provider.businessName}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- faq ---------------- */}
        <section className="section faq" id="faq" style={{ paddingTop: 0 }}>
          <div className="container" style={{ maxWidth: 780 }}>
            <div className="section-head"><h2 style={{ fontSize: "1.6rem" }}>Questions, answered</h2></div>
            <div className="stack-sm">
              {FAQS.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band">
              <h2>Need help today? We&apos;re just a click away.</h2>
              <p className="muted small" style={{ margin: "10px auto 20px", maxWidth: 520 }}>
                Book now and experience home service the way it should be — fast, safe and simple.
              </p>
              <Link href={user ? "/book" : "/register"} className="btn btn-lg">Book a service now</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container row-between" style={{ flexWrap: "wrap", gap: 14 }}>
          <div className="row" style={{ gap: 12 }}>
            <Logo height={26} />
            <span className="tiny">Smart Service. Better Living.</span>
          </div>
          <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
            <Link href="/services" className="small">Services</Link>
            <span className="dot" />
            <Link href="/login" className="small">Log in</Link>
            <span className="dot" />
            <Link href="/register" className="small">Create an account</Link>
          </div>
          <span className="tiny">© {new Date().getFullYear()} HomeEase · BAUST CSE FEST 2026</span>
        </div>
      </footer>
    </>
  );
}
