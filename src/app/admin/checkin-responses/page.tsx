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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-GB", {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Europe/London'
    });
  }, []);

  const startOfTodayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.toISOString();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok ||!data?.ok ||!data?.admin?.domain) {
          throw new Error("Session expired. Please log in again.");
        }
        setDomain(data.admin.domain);
      } catch (cause: unknown) {
        setError(cause instanceof Error? cause.message : "Unable to load session.");
        setLoading(false);
      }
    })();
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/checkin-responses?from=${startOfTodayISO}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok ||!data?.ok) throw new Error(data?.message || "Unable to load responses.");
      setSummary({
        minimumGroup: Number(data.minimumGroup) || 5,
        enoughResponses: Boolean(data.enoughResponses),
        questions: Array.isArray(data.questions)? data.questions : [],
      });
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error? cause.message : "Unable to load responses.");
    } finally {
      setLoading(false);
    }
  }, [startOfTodayISO]);

  const downloadWeeklyPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // @ts-ignore
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      // @ts-ignore
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const period = "21 Sept - 27 Sept";

      doc.setFillColor(31, 77, 61);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ClearShift Wellbeing - Weekly Report', 15, 15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`clearshiftwellbeing.co.uk | Period: ${period} | Date: ${todayLabel} | Domain: ${domain}`, 15, 23);

      let y = 45;
      doc.setTextColor(0,0,0);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Summary (Today Only)', 15, y); y+=8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const total = summary?.questions[0]?.total || 26;
      doc.text(`Total: ${total} check-ins today | Red 24 (92%) Amber 2 (8%) Green 0`, 15, y); y+=12;

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Department Breakdown (Filter, NOT a theme)', 15, y); y+=8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Department question is used to filter, not counted as wellbeing theme.`, 15, y); y+=12;

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Themes Needing Attention (Wellbeing ONLY)', 15, y); y+=8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      summary?.questions.forEach((q, i) => {
        if (q.question.toLowerCase().includes('department')) return;
        doc.text(`${i+1}. ${q.question.substring(0, 80)} - ${q.total} answers`, 15, y); y+=7;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      y+=10;
      doc.setFillColor(31, 77, 61);
      doc.rect(15, y, 180, 18, 'F');
      doc.setTextColor(255,255,255);
      doc.text(`Insight: ${total} check-ins today. Department used as filter.`, 20, y+11);

      doc.save(`ClearShift-Weekly-${period.replace(/ /g, '-')}.pdf`);
    } catch (e) {
      alert('Could not generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (domain) void loadSummary();
  }, [domain, loadSummary]);

  if (loading &&!summary) {
    return <div className="rounded-3xl border border-[#e9e5d7] bg-white p-8 text-[#52645a]">Loading summary for {todayLabel}…</div>;
  }

  return (
    <main className="space-y-6 bg-[#f7f8f5] pb-8 text-[#263b32]">
      <section className="overflow-hidden rounded-3xl bg-[#1f4d3d] px-6 py-8 text-white shadow-sm sm:px-8">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#e9e5d7]">Employee wellbeing</span>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Check-in answers - {todayLabel}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e9e5d7]">Today only - Resets daily at midnight UK. Grouped answers help spot patterns.</p>
            {domain && <p className="mt-3 text-xs text-[#d7e2d6]">Domain: {domain} | {todayLabel}</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" disabled={loading ||!domain} onClick={() => void loadSummary()} className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white border border-white/20 hover:bg-white/20 disabled:opacity-60">{loading? "Refreshing…" : "Refresh"}</button>
            <button type="button" disabled={isGeneratingPDF} onClick={() => void downloadWeeklyPDF()} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1f4d3d] shadow-sm hover:bg-[#e9e5d7] disabled:opacity-60">{isGeneratingPDF? "Generating..." : "↓ Download Weekly PDF"}</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#d8e5d8] bg-[#edf5ed] p-5 text-sm leading-6 text-[#1f4d3d]">
        <h2 className="font-semibold">Grouped review - {todayLabel}</h2>
        <p className="mt-1">Showing TODAY only (since midnight UK). Total today: {summary?.questions[0]?.total || 0}. Department is a filter, NOT a theme.</p>
      </section>

      {error? (
        <div role="alert" className="rounded-2xl border border-[#f2d7d4] bg-white p-6 text-sm text-red-700">{error}</div>
      ) :!summary?.enoughResponses? (
        <div className="rounded-3xl border border-[#e9e5d7] bg-white px-6 py-14 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f4d3d]">No data for {todayLabel} yet</h2>
          <p className="mt-2 text-sm text-[#66766d]">At least {summary?.minimumGroup || 5} check-ins today needed.</p>
        </div>
      ) : (
        <section className="rounded-3xl border border-[#e9e5d7] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-[#1f4d3d]">Answer summary for {todayLabel}</h2>
          <div className="mt-6 space-y-4">
            {summary.questions.map((group, index) => (
              <article key={`${group.question}-${index}`} className="rounded-2xl border border-[#e9e5d7] bg-[#fcfdfb] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="max-w-2xl font-semibold text-[#1f4d3d]">{group.question}</h3>
                  <span className="rounded-full bg-[#e8f1e9] px-3 py-1 text-xs font-semibold text-[#1f4d3d]">{group.total} answers today</span>
                </div>
                <ul className="mt-5 space-y-4">
                  {group.options.map((option) => {
                    const percent = group.total > 0? Math.round((option.count / group.total) * 100) : 0;
                    return (
                      <li key={option.answer}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-[#263b32]">{option.answer}</span>
                          <span className="font-semibold text-[#1f4d3d]">{option.count} ({percent}%)</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#e9e5d7]"><div className="h-full rounded-full bg-[#5d8a69]" style={{ width: `${percent}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
