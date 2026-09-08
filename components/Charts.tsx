interface Point { label: string; value: number }

export function LineChart({ data, height = 190, color = "#2563eb" }: { data: Point[]; height?: number; color?: string }) {
  if (data.length === 0) return <p className="muted small">Nothing to chart yet.</p>;
  const width = 640;
  const pad = 26;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => [pad + i * step, height - pad - (d.value / max) * (height - pad * 2)] as const);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${points.at(-1)![0].toFixed(1)},${height - pad} L${points[0]![0].toFixed(1)},${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Trend chart">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e7e5df" />
      <path d={area} fill={color} opacity="0.08" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (i % Math.ceil(data.length / 12 || 1) === 0 ? <circle key={i} cx={p[0]} cy={p[1]} r="2.8" fill={color} /> : null))}
      {data.map((d, i) =>
        i % Math.ceil(data.length / 6 || 1) === 0 ? (
          <text key={d.label} x={pad + i * step} y={height - 8} fontSize="10" fill="#6d7280" textAnchor="middle">{d.label}</text>
        ) : null,
      )}
      <text x={pad} y={16} fontSize="10" fill="#6d7280">max {max.toLocaleString("en-US")}</text>
    </svg>
  );
}

export function BarChart({ data, height = 200, color = "#1e40af" }: { data: Point[]; height?: number; color?: string }) {
  if (data.length === 0) return <p className="muted small">Nothing to chart yet.</p>;
  const width = 640;
  const pad = 30;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (width - pad * 2) / data.length;
  const barWidth = Math.min(46, slot * 0.62);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Bar chart">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e7e5df" />
      {data.map((d, i) => {
        const h = (d.value / max) * (height - pad * 2);
        const x = pad + i * slot + (slot - barWidth) / 2;
        return (
          <g key={d.label}>
            <rect x={x} y={height - pad - h} width={barWidth} height={Math.max(2, h)} rx="5" fill={color} opacity={0.85} />
            <text x={x + barWidth / 2} y={height - pad - h - 5} fontSize="10" fill="#1b1e24" textAnchor="middle">{d.value}</text>
            <text x={x + barWidth / 2} y={height - 9} fontSize="9.5" fill="#6d7280" textAnchor="middle">
              {d.label.length > 11 ? `${d.label.slice(0, 10)}…` : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const DONUT_COLORS = ["#1e40af", "#2563eb", "#60a5fa", "#93c5fd", "#17794a", "#d97706", "#b3261e", "#0ea5e9"];

export function DonutChart({ data, size = 180 }: { data: Point[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <p className="muted small">Nothing to chart yet.</p>;
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="row" style={{ gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution chart">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={d.label} cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="18"
                strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="18" fontWeight="700" fill="#14161a">{total}</text>
      </svg>
      <ul className="stack-sm">
        {data.map((d, i) => (
          <li key={d.label} className="row small" style={{ gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="muted">{d.label.replaceAll("_", " ").toLowerCase()}</span>
            <span className="strong mono">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
