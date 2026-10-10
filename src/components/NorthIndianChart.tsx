import type { Planet } from "@/engine/constants";

const ABBR: Record<Planet, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

// House polygons for a 400×400 North Indian chart. House 1 is the top diamond; houses run counter-clockwise.
const HOUSES: { pts: [number, number][]; label: [number, number]; sign: [number, number] }[] = [
  { pts: [[200, 0], [300, 100], [200, 200], [100, 100]], label: [200, 92], sign: [200, 175] },
  { pts: [[0, 0], [200, 0], [100, 100]], label: [100, 38], sign: [100, 85] },
  { pts: [[0, 0], [100, 100], [0, 200]], label: [36, 100], sign: [80, 100] },
  { pts: [[0, 200], [100, 100], [200, 200], [100, 300]], label: [100, 192], sign: [175, 200] },
  { pts: [[0, 200], [100, 300], [0, 400]], label: [36, 300], sign: [80, 300] },
  { pts: [[0, 400], [100, 300], [200, 400]], label: [100, 362], sign: [100, 318] },
  { pts: [[200, 400], [100, 300], [200, 200], [300, 300]], label: [200, 292], sign: [200, 228] },
  { pts: [[200, 400], [300, 300], [400, 400]], label: [300, 362], sign: [300, 318] },
  { pts: [[400, 400], [300, 300], [400, 200]], label: [364, 300], sign: [320, 300] },
  { pts: [[400, 200], [300, 300], [200, 200], [300, 100]], label: [300, 192], sign: [225, 200] },
  { pts: [[400, 200], [300, 100], [400, 0]], label: [364, 100], sign: [320, 100] },
  { pts: [[400, 0], [300, 100], [200, 0]], label: [300, 38], sign: [300, 85] },
];

export type ChartPlacement = { planet: Planet; sign: number; retrograde?: boolean };

/**
 * North Indian (diamond) chart. `firstSign` is the sign in house 1 (Lagna, or Moon sign for a Chandra chart).
 */
export function NorthIndianChart({ firstSign, placements, title }: { firstSign: number; placements: ChartPlacement[]; title: string }) {
  return (
    <figure className="mx-auto w-full max-w-[420px]">
      <svg viewBox="-4 -4 408 408" role="img" aria-label={title} className="h-auto w-full">
        <rect x="0" y="0" width="400" height="400" fill="var(--surface)" stroke="var(--gold)" strokeWidth="2" />
        {HOUSES.map((h, i) => (
          <polygon key={i} points={h.pts.map((p) => p.join(",")).join(" ")} fill={i === 0 ? "var(--gold-soft)" : "transparent"} stroke="var(--gold)" strokeWidth="1.2" />
        ))}
        {HOUSES.map((h, i) => {
          const sign = ((firstSign + i) % 12) + 1;
          const here = placements.filter((p) => p.sign === (firstSign + i) % 12);
          const lines: string[] = [];
          for (let k = 0; k < here.length; k += 3) lines.push(here.slice(k, k + 3).map((p) => ABBR[p.planet] + (p.retrograde && p.planet !== "Rahu" && p.planet !== "Ketu" ? "ᴿ" : "")).join(" "));
          return (
            <g key={i}>
              <text x={h.sign[0]} y={h.sign[1]} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="var(--muted)" className="tabular">
                {sign}
              </text>
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={h.label[0]}
                  y={h.label[1] + (li - (lines.length - 1) / 2) * 16}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="14"
                  fontWeight="600"
                  fill="var(--ink)"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-center text-xs text-muted">{title}</figcaption>
    </figure>
  );
}
