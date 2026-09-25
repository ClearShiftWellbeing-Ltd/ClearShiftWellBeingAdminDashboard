"use client";

import { useCallback, useEffect, useState } from "react";

type QuestionSummary = {
  question: string;
  total: number;
  options: { answer: string; count: number }[];
};
type Summary = {
  minimumGroup: number;
  enoughResponses: boolean;
  questions: QuestionSummary[];
};

export default function CheckInResponsesPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data?.ok || !data?.admin?.domain) {
          throw new Error("Session expired. Please log in again.");
        }
        setDomain(data.admin.domain);
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : "Unable to load session.");
        setLoading(false);
      }
    })();
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/checkin-responses", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.message || "Unable to load responses.");
      setSummary({
        minimumGroup: Number(data.minimumGroup) || 5,
        enoughResponses: Boolean(data.enoughResponses),
        questions: Array.isArray(data.questions) ? data.questions : [],
      });
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to load responses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (domain) void loadSummary();
  }, [domain, loadSummary]);

  if (loading && !summary) {
    return <div className="rounded-3xl border border-[#e9e5d7] bg-white p-8 text-[#52645a]">Loading check-in summary…</div>;
  }

  return (
    <main className="space-y-6 bg-[#f7f8f5] pb-8 text-[#263b32]">
      <section className="overflow-hidden rounded-3xl bg-[#1f4d3d] px-6 py-8 text-white shadow-sm sm:px-8">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#e9e5d7]">Employee wellbeing</span>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Check-in answers</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e9e5d7]">Grouped answers help you spot patterns without opening individual check-ins.</p>
            {domain && <p className="mt-3 text-xs text-[#d7e2d6]">Domain: {domain}</p>}
          </div>
          <button type="button" disabled={loading || !domain} onClick={() => void loadSummary()} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1f4d3d] shadow-sm hover:bg-[#e9e5d7] disabled:opacity-60">{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#d8e5d8] bg-[#edf5ed] p-5 text-sm leading-6 text-[#1f4d3d]">
        <h2 className="font-semibold">Grouped review</h2>
        <p className="mt-1">This page does not show individual submissions, exact times, departments, or written notes. Answers are shown only when at least {summary?.minimumGroup || 5} check-ins are in each displayed answer group. Small groups are withheld.</p>
        <p className="mt-2">Employees who ask for help should be handled through Support Requests.</p>
      </section>

      {error ? (
        <div role="alert" className="rounded-2xl border border-[#f2d7d4] bg-white p-6 text-sm text-red-700">{error}</div>
      ) : !summary?.enoughResponses ? (
        <div className="rounded-3xl border border-[#e9e5d7] bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f1e9] text-xl text-[#1f4d3d]">◇</div>
          <h2 className="text-lg font-semibold text-[#1f4d3d]">Results are protected</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#66766d]">At least {summary?.minimumGroup || 5} check-ins are needed before grouped answers can be reviewed.</p>
        </div>
      ) : summary.questions.length === 0 ? (
        <div className="rounded-3xl border border-[#e9e5d7] bg-white px-6 py-14 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f4d3d]">No answer groups to show yet</h2>
          <p className="mt-2 text-sm text-[#66766d]">The available questions have too few answers for a safe summary.</p>
        </div>
      ) : (
        <section className="rounded-3xl border border-[#e9e5d7] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-[#1f4d3d]">Answer summary</h2>
          <p className="mt-1 text-sm text-[#66766d]">All available check-ins for this organisation. Each question is counted separately.</p>
          <div className="mt-6 space-y-4">
            {summary.questions.map((group, index) => (
              <article key={`${group.question}-${index}`} className="rounded-2xl border border-[#e9e5d7] bg-[#fcfdfb] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="max-w-2xl font-semibold text-[#1f4d3d]">{group.question}</h3>
                  <span className="rounded-full bg-[#e8f1e9] px-3 py-1 text-xs font-semibold text-[#1f4d3d]">{group.total} answers</span>
                </div>
                {group.options.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-[#f4f3ee] px-4 py-3 text-sm text-[#66766d]">Answer breakdown withheld because one or more groups are too small.</p>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {group.options.map((option) => {
                      const percent = group.total > 0 ? Math.round((option.count / group.total) * 100) : 0;
                      return (
                        <li key={option.answer}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="font-medium text-[#263b32]">{option.answer}</span>
                            <span className="font-semibold text-[#1f4d3d]">{option.count} ({percent}%)</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-[#e9e5d7]" aria-hidden="true">
                            <div className="h-full rounded-full bg-[#5d8a69]" style={{ width: `${percent}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
