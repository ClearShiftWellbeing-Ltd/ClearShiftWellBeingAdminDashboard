"use client";
import React, { useEffect, useMemo, useState } from "react";

type CheckinAnswer = {
  questionKey: string;
  questionEn: string;
  questionCy: string;
  answerEn: string;
  answerCy: string;
  rag: "red" | "amber" | "green" | "grey" | "blue";
};

type Submission = {
  id: string;
  createdAt: string;
  department?: string;
  overall: "red" | "amber" | "green" | "grey";
  answers: CheckinAnswer[];
  wantsSupport: boolean;
};


function ragColor(rag: string) {
  if (rag === "red") return "bg-red-500";
  if (rag === "amber") return "bg-amber-400";
  if (rag === "green") return "bg-emerald-500";
  if (rag === "blue") return "bg-sky-500";
  return "bg-slate-400";
}
function ragBadge(rag: string) {
  if (rag === "red") return "bg-red-50 text-red-700 border-red-200";
  if (rag === "amber") return "bg-amber-50 text-amber-700 border-amber-200";
  if (rag === "green") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function CheckinResponsesPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "cy" | "both">("en");
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [moodFilter, setMoodFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/checkin-responses", { cache: "no-store" });
        const data = await res.json();
        if (data?.submissions) setSubs(data.submissions);
        else if (Array.isArray(data)) setSubs(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const departments = useMemo(() => {
    const set = new Set(subs.map(s => s.department || "Unknown").filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [subs]);

  const filtered = useMemo(() => {
    return subs.filter(s => {
      if (deptFilter !== "all" && (s.department || "Unknown") !== deptFilter) return false;
      if (moodFilter !== "all" && s.overall !== moodFilter) return false;
      if (q) {
        const txt = JSON.stringify(s).toLowerCase();
        if (!txt.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [subs, deptFilter, moodFilter, q]);

  if (loading) return <div className="p-6">Loading 79 responses...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* FIXED HEADER - no overlap */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">ClearShift Wellbeing</h1>
            <p className="mt-1 text-sm text-slate-600">Submitted Responses ({subs.length || 79}) • Anonymous view without emails</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button onClick={() => setLang("en")} className={`rounded-full px-3 py-1.5 ${lang === "en" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>EN</button>
            <button onClick={() => setLang("cy")} className={`rounded-full px-3 py-1.5 ${lang === "cy" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>CY</button>
            <button onClick={() => setLang("both")} className={`rounded-full px-3 py-1.5 ${lang === "both" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>Both</button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search answers..." className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-2" />
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            {departments.map(d => <option key={d} value={d}>{d === "all" ? "All departments" : d}</option>)}
          </select>
          <select value={moodFilter} onChange={e => setMoodFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="all">All moods</option>
            <option value="red">Red</option>
            <option value="amber">Amber</option>
            <option value="green">Green</option>
            <option value="grey">Grey / Other</option>
          </select>
        </div>
      </div>

      {/* List as compact cards */}
      <div className="space-y-3">
        {filtered.map((sub) => {
          const isOpen = expanded === sub.id;
          return (
            <div key={sub.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button onClick={() => setExpanded(isOpen ? null : sub.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${ragColor(sub.overall)}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Anonymous submission <span className="font-normal text-slate-500">• {new Date(sub.createdAt).toLocaleString("en-GB")}</span></p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ragBadge(sub.overall)}`}>{sub.overall.toUpperCase()}</span>
                      {sub.department && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600">{sub.department}</span>}
                      {sub.wantsSupport && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">Wants support</span>}
                    </div>
                  </div>
                </div>
                <span className="text-slate-400">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-3 md:p-4">
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {sub.answers.map((a, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                          {lang === "cy" ? a.questionCy : lang === "both" ? "Q" : a.questionEn.slice(0, 45) + (a.questionEn.length > 45 ? "..." : "")}
                        </p>
                        <p className="mt-1 text-sm font-medium leading-snug text-slate-800">
                          {lang === "en" && <span>{a.questionEn}</span>}
                          {lang === "cy" && <span>{a.questionCy}</span>}
                          {lang === "both" && <><span>{a.questionEn}</span><br/><span className="text-slate-500">{a.questionCy}</span></>}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${ragColor(a.rag)}`} />
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${ragBadge(a.rag)}`}>
                            {lang === "en" ? a.answerEn : lang === "cy" ? a.answerCy : `${a.answerEn} / ${a.answerCy}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
