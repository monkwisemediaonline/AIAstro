"use client";

import { useState } from "react";
import { bhagyank, mulank, NUMBER_PLANET, type ReductionStep } from "@/numerology/indian";
import {
  LO_SHU_LAYOUT,
  analyseNumber,
  chaldeanName,
  harmony,
  lifePath,
  loShu,
  personalYear,
  pythagoreanName,
  type Harmony,
  type NameNumber,
} from "@/numerology/systems";

type PersonLite = { id: string; name: string; birthDate: string | null };
type Tab = "name" | "birth" | "numbers" | "lab";

const TABS: { key: Tab; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "birth", label: "Birth date" },
  { key: "numbers", label: "Phone & numbers" },
  { key: "lab", label: "Name-change lab" },
];

const HARMONY: Record<Harmony, { label: string; cls: string }> = {
  friendly: { label: "Friendly", cls: "bg-ok-soft text-ok" },
  same: { label: "Same number", cls: "bg-ok-soft text-ok" },
  neutral: { label: "Neutral", cls: "bg-surface-2 text-ink-soft" },
  challenging: { label: "Challenging", cls: "bg-bad-soft text-bad" },
};

export function NumerologyLab({ people, currentYear }: { people: PersonLite[]; currentYear: number }) {
  const first = people[0] ?? null;
  const [tab, setTab] = useState<Tab>("name");
  const [personId, setPersonId] = useState(first?.id ?? "");
  const [name, setName] = useState(first?.name ?? "");
  const [dob, setDob] = useState(first?.birthDate ?? "");
  const [yAsVowel, setYAsVowel] = useState(false);
  const [number, setNumber] = useState("");
  const [numberLabel, setNumberLabel] = useState("Mobile");
  const [variants, setVariants] = useState("");

  const validDob = /^\d{4}-\d{2}-\d{2}$/.test(dob);
  const mul = validDob ? mulank(dob) : null;
  const bha = validDob ? bhagyank(dob) : null;

  return (
    <div className="space-y-6">
      <section className="card grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="num-person">Person</label>
          <select
            id="num-person"
            className="field"
            value={personId}
            onChange={(e) => {
              const p = people.find((x) => x.id === e.target.value);
              setPersonId(e.target.value);
              if (p) {
                setName(p.name);
                setDob(p.birthDate ?? "");
              }
            }}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="">Someone else / a business</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="num-name">Name to analyse</label>
          <input id="num-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Person or business name" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="num-dob">Date of birth</label>
          <input id="num-dob" type="date" className="field tabular" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
      </section>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t.key ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "name" && <NameTab name={name} yAsVowel={yAsVowel} setYAsVowel={setYAsVowel} mul={mul?.number ?? null} bha={bha?.number ?? null} />}
      {tab === "birth" && <BirthTab dob={validDob ? dob : null} year={currentYear} />}
      {tab === "numbers" && (
        <NumbersTab number={number} setNumber={setNumber} label={numberLabel} setLabel={setNumberLabel} mul={mul?.number ?? null} bha={bha?.number ?? null} />
      )}
      {tab === "lab" && <LabTab base={name} variants={variants} setVariants={setVariants} mul={mul?.number ?? null} bha={bha?.number ?? null} />}

      <p className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">
        Systems are kept separate: Chaldean (chaldean@1.0.0), Pythagorean (pythagorean@1.0.0), Indian Mulank/Bhagyank (indian@1.0.0). The Friendly / Neutral /
        Challenging labels compare the planets of two numbers using the classical planet-friendship table — a product heuristic, since numerology schools publish
        different tables. Nothing here is a reason to change a legal name, registration or number on its own.
      </p>
    </div>
  );
}

function Steps({ steps }: { steps: ReductionStep[] }) {
  if (!steps.length) return null;
  return <span className="tabular text-xs text-muted">{steps.map((s) => `${s.expression} = ${s.result}`).join("  →  ")}</span>;
}

function Big({ label, value, sub, master }: { label: string; value: number | string; sub?: string; master?: number | null }) {
  return (
    <div className="rounded-xl bg-surface-2 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular font-display text-4xl font-semibold leading-none">
        {value}
        {master ? <span className="ml-2 align-middle font-sans text-sm font-semibold text-gold">master {master}</span> : null}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

function Letters({ n }: { n: NameNumber }) {
  return (
    <div className="space-y-2">
      {n.words.map((w, wi) => (
        <div key={`${w.word}-${wi}`} className="flex flex-wrap items-end gap-1">
          {w.letters.map((l, i) => (
            <span key={i} className="grid w-7 place-items-center rounded-md border border-line py-0.5">
              <span className="text-sm font-semibold">{l.letter}</span>
              <span className="tabular text-xs text-muted">{l.value}</span>
            </span>
          ))}
          <span className="tabular ml-2 text-sm text-ink-soft">= {w.total}</span>
        </div>
      ))}
    </div>
  );
}

function Match({ label, a, b }: { label: string; a: number; b: number | null }) {
  if (b === null || a < 1 || b < 1) return null;
  const h = harmony(a, b);
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span className={`chip ${HARMONY[h.verdict].cls}`}>{HARMONY[h.verdict].label}</span>
      <span>
        with {label} {b}
      </span>
      <span className="text-xs text-muted">{h.text}</span>
    </li>
  );
}

function NameTab({ name, yAsVowel, setYAsVowel, mul, bha }: { name: string; yAsVowel: boolean; setYAsVowel: (v: boolean) => void; mul: number | null; bha: number | null }) {
  if (!name.trim()) return <p className="text-sm text-muted">Enter a name above.</p>;
  const ch = chaldeanName(name);
  const py = pythagoreanName(name, { yAsVowel });
  if (!ch.words.length) return <p className="text-sm text-warn">No letters A–Z found. For names in another script, type the English spelling you actually use.</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">Chaldean</h2>
          <p className="text-xs text-muted">Cheiro tradition · used for the Indian name number · no letter is 9</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Big label="Compound number" value={ch.total} sub="Unreduced total" />
          <Big label="Name number" value={ch.reduced} sub={`Planet: ${ch.planet}`} />
        </div>
        <Steps steps={ch.steps} />
        <Letters n={ch} />
        {(mul || bha) && (
          <ul className="space-y-1.5 text-sm">
            <Match label="Mulank" a={ch.reduced} b={mul} />
            <Match label="Bhagyank" a={ch.reduced} b={bha} />
          </ul>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">Pythagorean</h2>
          <p className="text-xs text-muted">Western system · A=1 … I=9 repeating · master numbers 11, 22, 33 kept</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Big label="Expression" value={py.expression.reduced} master={py.expression.master} sub={`All letters · ${py.expression.total}`} />
          <Big label="Soul urge" value={py.soulUrge.reduced} master={py.soulUrge.master} sub={`Vowels · ${py.soulUrge.total}`} />
          <Big label="Personality" value={py.personality.reduced} master={py.personality.master} sub={`Consonants · ${py.personality.total}`} />
        </div>
        <Steps steps={py.expression.steps} />
        <Letters n={py.expression} />
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" className="size-4 accent-[var(--gold)]" checked={yAsVowel} onChange={(e) => setYAsVowel(e.target.checked)} />
          Count Y as a vowel when it stands between consonants
        </label>
      </section>
      {ch.ignored.length > 0 && <p className="text-xs text-warn lg:col-span-2">Ignored characters: {ch.ignored.join(" ")}</p>}
    </div>
  );
}

function BirthTab({ dob, year }: { dob: string | null; year: number }) {
  if (!dob) return <p className="text-sm text-muted">Enter a date of birth above.</p>;
  const mul = mulank(dob);
  const bha = bhagyank(dob);
  const lp = lifePath(dob);
  const grid = loShu(dob);
  const py = personalYear(dob, year);
  const h = harmony(mul.number, bha.number);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">Indian numerology</h2>
          <p className="text-xs text-muted">Mulank from the day · Bhagyank from the full date</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Big label="Mulank (root number)" value={mul.number} sub={`Planet: ${mul.planet}`} />
          <Big label="Bhagyank (destiny)" value={bha.number} sub={`Planet: ${bha.planet}`} />
        </div>
        <p className="text-sm"><b>Mulank:</b> <Steps steps={mul.steps} /></p>
        <p className="text-sm"><b>Bhagyank:</b> <Steps steps={bha.steps} /></p>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`chip ${HARMONY[h.verdict].cls}`}>{HARMONY[h.verdict].label}</span> Mulank and Bhagyank together
          <span className="text-xs text-muted">{h.text}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Big label={`Personal year ${year}`} value={py.number} sub={`Planet: ${NUMBER_PLANET[py.number]}`} />
          <Big label="Life Path (Pythagorean)" value={lp.number} master={lp.master} sub={lp.parts.map((p) => `${p.label} ${p.value}`).join(" + ")} />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">Lo Shu grid</h2>
          <p className="text-xs text-muted">Each digit of the date of birth placed in the 3×3 square; zeros are skipped</p>
        </div>
        <div className="mx-auto grid w-full max-w-[260px] grid-cols-3 gap-1.5">
          {LO_SHU_LAYOUT.flat().map((n) => (
            <div key={n} className={`grid aspect-square place-items-center rounded-xl border ${grid.counts[n] ? "border-gold bg-gold-soft" : "border-dashed border-line"}`}>
              <span className={`tabular font-display text-2xl font-semibold ${grid.counts[n] ? "" : "text-muted opacity-40"}`}>{grid.counts[n] ? String(n).repeat(grid.counts[n]) : n}</span>
            </div>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Missing numbers</dt>
            <dd className="tabular font-semibold">{grid.missing.join(", ") || "None"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Repeated numbers</dt>
            <dd className="tabular font-semibold">{grid.repeated.join(", ") || "None"}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted">Some practitioners also add Mulank, Bhagyank or a Kua number to the grid. Those variants are not applied here.</p>
      </section>
    </div>
  );
}

function NumbersTab({ number, setNumber, label, setLabel, mul, bha }: { number: string; setNumber: (v: string) => void; label: string; setLabel: (v: string) => void; mul: number | null; bha: number | null }) {
  const a = analyseNumber(number);
  return (
    <section className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div>
          <label className="label" htmlFor="num-kind">What is it?</label>
          <select id="num-kind" className="field" value={label} onChange={(e) => setLabel(e.target.value)}>
            {["Mobile", "Vehicle", "House / office", "Bank account", "Date", "Other"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="num-value">Number</label>
          <input id="num-value" className="field tabular" inputMode="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Digits; letters and symbols are ignored" autoComplete="off" />
        </div>
      </div>
      {!a ? (
        <p className="text-sm text-muted">Enter a number to see its total, reduced digit and how it sits with the Mulank and Bhagyank above.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Big label={`${label} total`} value={a.total} sub={`${a.digits.length} digits`} />
            <Big label="Reduced number" value={a.reduced} sub={`Planet: ${a.planet}`} />
            {a.last4 && <Big label="Last 4 digits (variant)" value={a.last4.reduced} sub={`${a.last4.digits} · total ${a.last4.total}`} />}
          </div>
          <Steps steps={a.steps} />
          {(mul || bha) && (
            <ul className="space-y-1.5 text-sm">
              <Match label="Mulank" a={a.reduced} b={mul} />
              <Match label="Bhagyank" a={a.reduced} b={bha} />
            </ul>
          )}
          {a.zeros > 0 && <p className="text-xs text-muted">Contains {a.zeros} zero{a.zeros > 1 ? "s" : ""}. Zeros add nothing to the total; some practitioners read them as amplifiers.</p>}
        </>
      )}
    </section>
  );
}

function LabTab({ base, variants, setVariants, mul, bha }: { base: string; variants: string; setVariants: (v: string) => void; mul: number | null; bha: number | null }) {
  const names = [base, ...variants.split("\n")].map((s) => s.trim()).filter(Boolean).slice(0, 11);
  const rows = names.map((n) => ({ name: n, ch: chaldeanName(n), py: pythagoreanName(n).expression })).filter((r) => r.ch.words.length);
  const tag = (a: number, b: number | null) => {
    if (b === null || a < 1) return <span className="text-muted">—</span>;
    const h = harmony(a, b);
    return <span className={`chip ${HARMONY[h.verdict].cls}`}>{HARMONY[h.verdict].label}</span>;
  };
  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">Compare spellings</h2>
        <p className="text-sm text-ink-soft">One spelling per line (up to 10) — personal name, brand name, company name or domain. The name above is included as the first row.</p>
      </div>
      <textarea className="field tabular" rows={5} value={variants} onChange={(e) => setVariants(e.target.value)} placeholder={"Alternative spelling 1\nAlternative spelling 2"} />
      {rows.length > 0 && (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Spelling</th>
                <th>Chaldean compound</th>
                <th>Chaldean</th>
                <th>Pythagorean</th>
                <th>vs Mulank {mul ?? ""}</th>
                <th>vs Bhagyank {bha ?? ""}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.name}-${i}`} className={i === 0 ? "font-semibold" : ""}>
                  <td className="whitespace-normal">{r.name}</td>
                  <td className="tabular">{r.ch.total}</td>
                  <td className="tabular">{r.ch.reduced} <span className="text-xs font-normal text-muted">{r.ch.planet}</span></td>
                  <td className="tabular">{r.py.reduced}{r.py.master ? <span className="text-xs font-normal text-gold"> ({r.py.master})</span> : null}</td>
                  <td>{tag(r.ch.reduced, mul)}</td>
                  <td>{tag(r.ch.reduced, bha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">The Mulank and Bhagyank columns use the Chaldean name number, the usual practice in Indian numerology.</p>
    </section>
  );
}
