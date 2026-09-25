"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Rag = "red" | "amber" | "green";
type Theme = { topic: string; count: number };
type Week = {
  total: number;
  red: number;
  amber: number;
  green: number;
  themes: Theme[];
  start: string;
  end: string;
  label: string;
};
type Summary = {
  ok: boolean;
  domain: string;
  currentWeek: Week;
  recentWeeks: Week[];
  message?: string;
};

const MINIMUM_GROUP_SIZE = 5;

const ragStyle: Record<Rag, { label: string; hex: string; text: string; soft: string }> = {
  red: { label: "Red", hex: "#e11d48", text: "text-rose-700", soft: "bg-rose-50" },
  amber: { label: "Amber", hex: "#f59e0b", text: "text-amber-700", soft: "bg-amber-50" },
  green: { label: "Green", hex: "#10b981", text: "text-emerald-700", soft: "bg-emerald-50" },
};

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </section>
  );
}

function Metric({ label, value, note, tone = "slate" }: { label: string; value: string | number; note: string; tone?: Rag | "slate" }) {
  const toneClass = tone === "slate" ? "bg-slate-50 text-slate-900" : `${ragStyle[tone].soft} ${ragStyle[tone].text}`;
  return (
    <div className={`rounded-2xl p-5 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium opacity-70">{note}</p>
    </div>
  );
}

function RagDonut({ week }: { week: Week }) {
  const red = percentage(week.red, week.total);
  const amber = percentage(week.amber, week.total);
  const green = Math.max(0, 100 - red - amber);
  const background = `conic-gradient(${ragStyle.red.hex} 0 ${red}%, ${ragStyle.amber.hex} ${red}% ${red + amber}%, ${ragStyle.green.hex} ${red + amber}% 100%)`;

  return (
    <div className="grid items-center gap-8 sm:grid-cols-[190px_1fr]">
      <div className="relative mx-auto h-44 w-44 rounded-full" style={{ background }} role="img" aria-label={`${red}% red, ${amber}% amber and ${green}% green`}>
        <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">{week.total}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">check-ins</span>
        </div>
      </div>
      <div className="space-y-4">
        {(["red", "amber", "green"] as Rag[]).map((rag) => {
          const value = week[rag];
          return (
            <div key={rag}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ragStyle[rag].hex }} />
                  {ragStyle[rag].label}
                </span>
                <span className="font-bold text-slate-900 tabular-nums">{value} <span className="font-medium text-slate-400">({percentage(value, week.total)}%)</span></span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${percentage(value, week.total)}%`, background: ragStyle[rag].hex }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyTrend({ weeks }: { weeks: Week[] }) {
  return (
    <div className="mt-6 space-y-5">
      {weeks.map((week) => (
        <div key={week.start}>
          <div className="mb-2 flex items-end justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">{week.label}</span>
            <span className="text-xs font-semibold text-slate-500">{week.total} check-ins</span>
          </div>
          <div className="flex h-7 overflow-hidden rounded-lg bg-slate-100" role="img" aria-label={`${week.label}: ${week.red} red, ${week.amber} amber and ${week.green} green`}>
            {(["red", "amber", "green"] as Rag[]).map((rag) => (
              <div
                key={rag}
                title={`${ragStyle[rag].label}: ${week[rag]}`}
                style={{ width: `${percentage(week[rag], week.total)}%`, background: ragStyle[rag].hex }}
                className="flex min-w-0 items-center justify-center text-[11px] font-bold text-white"
              >
                {percentage(week[rag], week.total) >= 12 ? week[rag] : ""}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/dashboard-summary", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/admin/login");
        return;
      }
      const data: Summary = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "The dashboard could not be loaded.");
      setSummary(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const weeks = useMemo(() => [...(summary?.recentWeeks ?? [])].reverse(), [summary]);
  const week = summary?.currentWeek;
  const showResults = Boolean(week && week.total >= MINIMUM_GROUP_SIZE);
  const mainRag: Rag = !week ? "green" : week.red > week.amber && week.red > week.green ? "red" : week.amber > week.green ? "amber" : "green";

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-[#1f4d3d] text-white shadow-[0_18px_50px_rgba(31,77,61,0.18)]">
          <div className="relative px-6 py-7 sm:px-8 sm:py-9">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[42px] border-white/5" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9e5d7] text-xl text-[#1f4d3d]">✦</div>
                  <div>
                    <p className="text-sm font-bold tracking-wide">ClearShiftWellbeing</p>
                    <p className="text-xs text-emerald-100/75">Organisation dashboard</p>
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Employee wellbeing overview</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                  Anonymous, aggregated Red, Amber and Green (RAG) patterns from employee check-ins.
                </p>
              </div>
              <button type="button" onClick={() => void load()} disabled={loading}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50">
                {loading ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="font-bold underline">Try again</button>
          </div>
        )}

        {loading && !summary && (
          <Card className="p-8"><p role="status" className="animate-pulse text-sm font-medium text-slate-500">Loading the latest check-in summary…</p></Card>
        )}

        {week && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2 px-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#38745f]">Current reporting period</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">{week.label}</h2>
              </div>
              <p className="text-sm font-medium text-slate-500">{summary?.domain}</p>
            </div>

            {!showResults ? (
              <Card className="p-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-xl">🔒</div>
                <h2 className="mt-4 text-xl font-bold">Results are protected</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  At least {MINIMUM_GROUP_SIZE} check-ins are needed before a RAG breakdown is displayed. This helps protect employee anonymity.
                </p>
              </Card>
            ) : (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="This week's summary">
                  <Metric label="Total check-ins" value={week.total} note="Anonymous submissions" />
                  <Metric label="Red responses" value={week.red} note={`${percentage(week.red, week.total)}% of check-ins`} tone="red" />
                  <Metric label="Amber responses" value={week.amber} note={`${percentage(week.amber, week.total)}% of check-ins`} tone="amber" />
                  <Metric label="Green responses" value={week.green} note={`${percentage(week.green, week.total)}% of check-ins`} tone="green" />
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
                  <Card className="p-6 sm:p-7">
                    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Overall RAG picture</p>
                        <h2 className="mt-1 text-xl font-bold">This week at a glance</h2>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${ragStyle[mainRag].soft} ${ragStyle[mainRag].text}`}>
                        Highest group: {ragStyle[mainRag].label}
                      </span>
                    </div>
                    <RagDonut week={week} />
                  </Card>

                  <Card className="p-6 sm:p-7">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Areas to review</p>
                    <h2 className="mt-1 text-xl font-bold">Themes needing attention</h2>
                    <p className="mt-2 text-sm text-slate-500">Topics connected with red or amber answers.</p>
                    {week.themes.length ? (
                      <ol className="mt-6 space-y-3">
                        {week.themes.slice(0, 6).map((theme, index) => (
                          <li key={theme.topic} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-bold text-[#38745f] shadow-sm">{index + 1}</span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{theme.topic}</span>
                            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm tabular-nums">{theme.count}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-sm font-medium text-emerald-800">No red or amber themes to display for this period.</div>
                    )}
                  </Card>
                </div>

                <Card className="p-6 sm:p-7">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">RAG trend</p>
                      <h2 className="mt-1 text-xl font-bold">Weekly movement</h2>
                    </div>
                    <div className="flex gap-3 text-xs font-semibold text-slate-500">
                      {(["red", "amber", "green"] as Rag[]).map((rag) => (
                        <span key={rag} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ragStyle[rag].hex }} />{ragStyle[rag].label}</span>
                      ))}
                    </div>
                  </div>
                  {weeks.length ? <WeeklyTrend weeks={weeks} /> : <p className="mt-6 text-sm text-slate-500">No earlier weeks are available yet.</p>}
                </Card>
              </>
            )}

            <aside className="flex gap-3 rounded-2xl border border-[#d8e5df] bg-[#eef5f1] p-4 text-sm leading-6 text-[#285444]">
              <span aria-hidden="true" className="text-lg">●</span>
              <p><strong>Privacy:</strong> This page shows grouped results only. It does not display employee names, email addresses, exact submission times or individual answers.</p>
            </aside>

            <p className="px-1 text-xs leading-5 text-slate-400">
              RAG colours are produced by the current dashboard summary service and should be reviewed alongside organisational context. They are not a clinical assessment.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
