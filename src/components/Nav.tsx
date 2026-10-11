"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIVE = [
  { href: "/", label: "Overview" },
  { href: "/people/new", label: "Add birth details" },
  { href: "/yoga", label: "Raj & Dhana Yoga" },
  { href: "/timeline", label: "Dasha & Transits" },
  { href: "/business", label: "Business & Wealth" },
  { href: "/numerology", label: "Numerology" },
  { href: "/lal-kitab", label: "Lal Kitab" },
  { href: "/remedies", label: "Remedies & Rituals" },
  { href: "/partner", label: "Partner Vibes" },
  { href: "/assistant", label: "AI Assistant" },
  { href: "/library", label: "Research Library" },
];

const SOON: string[] = [];

export function Nav({ people }: { people: { id: string; name: string }[] }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav aria-label="Main" className="text-sm">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {LIVE.map((l) => (
          <li key={l.href} className="shrink-0">
            <Link
              href={l.href}
              className={`block rounded-lg px-3 py-2 font-medium transition ${isActive(l.href) ? "bg-white/10 text-[#f0d590]" : "text-[#d8d2c2] hover:bg-white/5"}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      {people.length > 0 && (
        <>
          <p className="mt-6 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f8670] lg:block">People</p>
          <ul className="mt-2 hidden space-y-0.5 lg:block">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/people/${p.id}`}
                  className={`block truncate rounded-lg px-3 py-1.5 transition ${path.startsWith(`/people/${p.id}`) ? "bg-white/10 text-[#f0d590]" : "text-[#c9c2b0] hover:bg-white/5"}`}
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {SOON.length > 0 && (
        <>
          <p className="mt-6 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f8670] lg:block">Coming next</p>
          <ul className="mt-2 hidden space-y-0.5 lg:block">
            {SOON.map((s) => (
              <li key={s} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[#7f7a6c]">
                {s}
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
