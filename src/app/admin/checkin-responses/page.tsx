"use client";
import { useCallback, useEffect, useState, useMemo } from "react";

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

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/London",
    });
  }, []);

  const startOfTodayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok ||!data?.ok ||!data?.admin?.domain) {
          throw new Error("Session expired.");
        }
        setDomain(data.admin.domain);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    })();
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/checkin-responses?from=${startOfTodayISO}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok ||!data?.ok) throw new Error(data?.message || "Failed");
      setSummary({
        minimumGroup: Number(data.minimumGroup) || 5,
        enoughResponses: Boolean(data.enoughResponses),
        questions: Array.isArray(data.questions)? data.questions : [],
      });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startOfTodayISO]);

  useEffect(() => {
    if (domain) loadSummary();
  }, [domain, loadSummary]);

  if (loading &&!summary) {
    return <div className="p-8">Loading for {todayLabel}...</div>;
  }

  return (
    <main className="space-y-6 bg-[#f7f8f5] pb-8 text-[#263b32]">
      <section className="rounded-3xl bg-[#1f4d3d] px-6 py-8 text-white">
        <h1 className="text-2xl font-semibold">Check-in answers - {todayLabel}</h1>
        <p className="mt-2 text-sm text-[#e9e5d7]">Today only - Resets daily at midnight UK</p>
        {domain && <p className="mt-2 text-xs">Domain: {domain} | {todayLabel}</p>}
        <button onClick={() => loadSummary()} className="mt-4 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1f4d3d]">Refresh</button>
      </section>
      {error? <div className="p-4 bg-white text-red-600">{error}</div> : null}
      {summary && (
        <section className="rounded-3xl border bg-white p-5">
          <h2 className="font-semibold">Summary for {todayLabel} - {summary.questions[0]?.total || 0} today</h2>
          <div className="mt-4 space-y-4">
            {summary.questions.map((g, i) => (
              <div key={i} className="border p-4 rounded-2xl">
                <h3 className="font-semibold">{g.question}</h3>
                <p className="text-xs">{g.total} answers today</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
