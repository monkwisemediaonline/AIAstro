/**
 * Single-series monthly bar chart (server-rendered SVG).
 * One measure per chart, thin bars with rounded tops anchored to the baseline, recessive grid,
 * a native hover tooltip per bar, and a direct label on the latest bar only. The same numbers
 * are always available in the table next to it.
 */
export function MonthBars({ title, points, format }: { title: string; points: { month: string; value: number | null }[]; format: (n: number) => string }) {
  const data = points.filter((p): p is { month: string; value: number } => p.value !== null);
  if (data.length === 0) {
    return (
      <figure className="rounded-xl border border-dashed border-line p-4">
        <figcaption className="text-sm font-semibold">{title}</figcaption>
        <p className="mt-2 text-sm text-muted">No data yet.</p>
      </figure>
    );
  }
  const W = 520;
  const H = 190;
  const pad = { l: 8, r: 8, t: 22, b: 24 };
  const max = Math.max(...data.map((d) => d.value), 0);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const slot = innerW / data.length;
  const bw = Math.min(28, Math.max(6, slot - 6));
  const y = (v: number) => pad.t + ((max - v) / span) * innerH;
  const zero = y(0);
  const label = (m: string) => new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${m}T00:00:00Z`));
  const every = Math.ceil(data.length / 6);
  const last = data.at(-1)!;

  return (
    <figure className="rounded-xl border border-line p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="tabular text-sm text-ink-soft">
          {label(last.month)}: <b className="text-ink">{format(last.value)}</b>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label={`${title} by month. Latest ${label(last.month)}: ${format(last.value)}.`}>
        {[0.5, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={zero} y2={zero} stroke="var(--muted)" strokeWidth="1" />
        {data.map((d, i) => {
          const x = pad.l + i * slot + (slot - bw) / 2;
          const top = Math.min(y(d.value), zero);
          const h = Math.max(1, Math.abs(y(d.value) - zero));
          const r = Math.min(4, bw / 2, h);
          const up = d.value >= 0;
          // Rounded only at the data end; the baseline end stays square.
          const path = up
            ? `M${x},${zero} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${zero} Z`
            : `M${x},${zero} V${top + h - r} Q${x},${top + h} ${x + r},${top + h} H${x + bw - r} Q${x + bw},${top + h} ${x + bw},${top + h - r} V${zero} Z`;
          return (
            <g key={d.month}>
              <path d={path} fill="var(--gold)" opacity={i === data.length - 1 ? 1 : 0.6}>
                <title>{`${label(d.month)}: ${format(d.value)}`}</title>
              </path>
              {/* wider invisible hit target for hover */}
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={innerH} fill="transparent">
                <title>{`${label(d.month)}: ${format(d.value)}`}</title>
              </rect>
              {(i % every === 0 || i === data.length - 1) && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
                  {label(d.month)}
                </text>
              )}
            </g>
          );
        })}
        <text x={pad.l} y={12} fontSize="10" fill="var(--muted)">
          max {format(max)}
        </text>
      </svg>
    </figure>
  );
}
