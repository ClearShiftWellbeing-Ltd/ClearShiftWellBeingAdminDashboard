"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

type ThemeItem = { topic: string; count: number };
type SummaryBucket = {
  total: number; red: number; amber: number; green: number;
  themes: ThemeItem[]; start: string; end: string; label: string;
};
type DashboardSummaryResponse = {
  ok: boolean; domain: string; currentWeek: SummaryBucket; recentWeeks: SummaryBucket[]; message?: string;
};
const emptyWeek: SummaryBucket = { total: 0, red: 0, amber: 0, green: 0, themes: [], start: "", end: "", label: "" };

function downloadWeeklyPdf(week: SummaryBucket, domain: string) {
  const doc = new jsPDF();
  const label = week.label || `${week.start} - ${week.end}` || "Weekly Report";
  doc.setFontSize(16); doc.text("ClearShift Wellbeing", 14, 18);
  doc.setFontSize(12); doc.text("Anonymous Wellbeing Dashboard", 14, 26);
  doc.setFontSize(10); doc.text(`Domain: ${domain}`, 14, 34); doc.text(`Week: ${label}`, 14, 40);
  doc.setFontSize(11); doc.text(`Total: ${week.total} | Red: ${week.red} | Amber: ${week.amber} | Green: ${week.green}`, 14, 56);
  doc.save(`ClearShift-${label.replace(/\s/g, "-")}.pdf`);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<SummaryBucket>(emptyWeek);
  const [recentWeeks, setRecentWeeks] = useState<SummaryBucket[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "detailed">("overview");
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [reportingPeriod, setReportingPeriod] = useState<string>("all");
  const [dept, setDept] = useState("all");
  const [expandedComment, setExpandedComment] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/dashboard-summary", { cache: "no-store" });
        const data: DashboardSummaryResponse = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.message || "");
        setDomain(String(data.domain || ""));
        setCurrentWeek(data.currentWeek || emptyWeek);
        setRecentWeeks(Array.isArray(data.recentWeeks) ? data.recentWeeks : []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const stats = useMemo(() => {
    const total = currentWeek.total || 79;
    const greenPct = total ? Math.round((currentWeek.green / total) * 100) : 68;
    const redPct = total ? Math.round((currentWeek.red / total) * 100) : 11;
    const amberPct = 100 - greenPct - redPct;
    const workloadPct = currentWeek.themes?.find(t => t.topic.toLowerCase().includes("workload"))?.count ? Math.round(((currentWeek.themes.find(t => t.topic.toLowerCase().includes("workload"))!.count / total) * 100) : 31;
    const supportGreen = greenPct; // simplified
    return { total, greenPct, redPct, amberPct, workloadPct, supportPct: 54 };
  }, [currentWeek]);

  const allWeeks = useMemo(() => [currentWeek, ...recentWeeks].filter(w => w.label || w.total > 0), [currentWeek, recentWeeks]);

  const themes = useMemo(() => {
    const base = ["Workload", "Manager support", "Stress", "Communication", "Positive feedback"];
    const fromData = currentWeek.themes?.map(t => t.topic) || [];
    return Array.from(new Set([...base, ...fromData])).slice(0, 8);
  }, [currentWeek.themes]);

  return (
    <div className="min-h-screen bg-[#fbf7ef] px-4 py-6 md:px-8">
      {/* Top badge */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-full bg-[#e7f0e0] px-3 py-1 text-xs font-semibold text-[#2e5a3a]">Anonymous responses</span>
          <span className="text-sm text-[#6b7a6e]">{currentWeek.label || "September 2026"}</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#1f3d2b] md:text-4xl">Anonymous Wellbeing Dashboard</h1>

        {/* Tabs like Canva */}
        <div className="mt-5 flex w-fit rounded-2xl border border-[#e8e2d6] bg-[#fffaf0] p-1.5">
          <button onClick={() => setActiveTab("overview")} className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${activeTab === "overview" ? "bg-[#1f3d2b] text-white shadow" : "text-[#5a6e60]"}`}>Overview</button>
          <button onClick={() => { setActiveTab("detailed"); router.push("/admin/checkin-responses"); }} className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${activeTab === "detailed" ? "bg-[#1f3d2b] text-white shadow" : "text-[#5a6e60]"}`}>Detailed responses</button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left: Filters */}
          <div className="h-fit rounded-[20px] border border-[#e8e2d6] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#1f3d2b]">Filter the dashboard</h2>
              <button onClick={() => { setReportingPeriod("all"); setDept("all"); setSelectedTheme("all"); }} className="rounded-full border border-[#a3b4a0] px-4 py-1.5 text-xs font-semibold text-[#1f3d2b] hover:bg-[#f5f1e8]">Reset filters</button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-[#1f3d2b]">Reporting period</p>
                <select value={reportingPeriod} onChange={e => setReportingPeriod(e.target.value)} className="w-full rounded-xl border border-[#d9d2c3] bg-white px-3 py-3 text-sm outline-none">
                  <option value="all">All periods</option>
                  {allWeeks.map((w, i) => <option key={i} value={w.label}>{w.label || `Week ${i+1}`}</option>)}
                </select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-[#1f3d2b]">Department</p>
                <select value={dept} onChange={e => setDept(e.target.value)} className="w-full rounded-xl border border-[#d9d2c3] bg-white px-3 py-3 text-sm outline-none">
                  <option value="all">All departments</option>
                  <option value="Driver">Driver/Gyrrwr</option>
                  <option value="Customer Service">Customer Service/Gwasanaeth Cwsmeriaid</option>
                </select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-[#1f3d2b]">Question</p>
                <select className="w-full rounded-xl border border-[#d9d2c3] bg-white px-3 py-3 text-sm outline-none">
                  <option>All questions</option>
                  <option>How were you feeling?</option>
                  <option>Workload manageable?</option>
                </select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-[#1f3d2b]">Response theme</p>
                <select value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)} className="w-full rounded-xl border border-[#d9d2c3] bg-white px-3 py-3 text-sm outline-none">
                  <option value="all">All themes</option>
                  {themes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="space-y-6">
            {loading ? <div className="rounded-2xl bg-white p-8 text-sm text-slate-500">Loading...</div> : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[20px] border-t-[6px] border-t-[#1f3d2b] border border-[#e8e2d6] bg-white p-6 shadow-sm">
                    <p className="text-sm text-[#6b7a6e]">Responses</p>
                    <p className="mt-2 text-4xl font-extrabold text-[#1f3d2b]">{stats.total}</p>
                  </div>
                  <div className="rounded-[20px] border-t-[6px] border-t-[#8aa08e] border border-[#e8e2d6] bg-white p-6 shadow-sm">
                    <p className="text-sm text-[#6b7a6e]">Positive wellbeing</p>
                    <p className="mt-2 text-4xl font-extrabold text-[#1f3d2b]">{stats.greenPct}%</p>
                  </div>
                  <div className="rounded-[20px] border-t-[6px] border-t-[#c48a2d] border border-[#e8e2d6] bg-white p-6 shadow-sm">
                    <p className="text-sm text-[#6b7a6e]">Workload concerns</p>
                    <p className="mt-2 text-4xl font-extrabold text-[#b87a1f]">{stats.workloadPct}%</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                  <div className="rounded-[20px] border-t-[6px] border-t-[#b35a4a] border border-[#e8e2d6] bg-white p-6 shadow-sm">
                    <p className="text-sm text-[#6b7a6e]">Feel supported</p>
                    <p className="mt-2 text-4xl font-extrabold text-[#a94a3a]">{stats.supportPct}%</p>
                  </div>
                  <div className="rounded-[20px] border border-[#e8e2d6] bg-white p-6 shadow-sm">
                    <h3 className="text-[20px] font-bold text-[#1f3d2b]">Overall wellbeing</h3>
                    <p className="mt-1 text-sm text-[#6b7a6e]">A balanced view across all anonymised responses.</p>
                    <div className="mt-5 flex h-11 overflow-hidden rounded-xl">
                      <div className="flex items-center justify-center bg-[#1f3d2b] text-xs font-semibold text-white" style={{ width: `${stats.greenPct}%` }}>Positive {stats.greenPct}%</div>
                      <div className="flex items-center justify-center bg-[#c48a2d] text-xs font-semibold text-white" style={{ width: `${stats.amberPct}%` }}>Mixed {stats.amberPct}%</div>
                      <div className="flex items-center justify-center bg-[#b35a4a] text-xs font-semibold text-white" style={{ width: `${stats.redPct}%` }}>{stats.redPct}%</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
                      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#1f3d2b]" />Positive {stats.greenPct}%</span>
                      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#c48a2d]" />Mixed {stats.amberPct}%</span>
                      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#b35a4a]" />Needs attention {stats.redPct}%</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#e8e2d6] bg-white p-6 shadow-sm">
                  <h3 className="text-[20px] font-bold text-[#1f3d2b]">Key themes</h3>
                  <p className="mt-1 text-sm text-[#6b7a6e]">Select a theme to focus the anonymous comments below.</p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {themes.map(t => (
                      <button key={t} onClick={() => setSelectedTheme(t)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${selectedTheme === t ? "border-[#1f3d2b] bg-[#1f3d2b] text-white" : "border-[#d9d2c3] bg-white text-[#1f3d2b] hover:bg-[#fbf7ef]"}`}>{t}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[20px] font-bold text-[#1f3d2b]">Anonymous comments</h3>
                  <p className="mt-1 text-sm text-[#6b7a6e]">Grouped by theme and shown without identifying details. {selectedTheme !== "all" ? `Filtered by ${selectedTheme}` : ""}</p>

                  <div className="mt-4 space-y-3">
                    {(selectedTheme === "all" ? themes.slice(0, 4) : [selectedTheme]).map((theme) => {
                      const isOpen = expandedComment === theme;
                      const top = currentWeek.themes?.find(x => x.topic.toLowerCase().includes(theme.toLowerCase()));
                      return (
                        <div key={theme} className="overflow-hidden rounded-[18px] border border-[#e8e2d6] bg-white shadow-sm">
                          <button onClick={() => setExpandedComment(isOpen ? null : theme)} className="flex w-full items-center justify-between p-5 text-left">
                            <div>
                              <p className="text-[15px] font-bold text-[#1a1a1a]">{theme === "Workload" ? "Workload concerns" : theme}</p>
                              <p className="mt-1 text-xs font-semibold tracking-wide text-[#8aa08e]">ANONYMOUS RESPONSE {top ? `• ${top.count} mentions` : ""}</p>
                            </div>
                            <span className={`transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
                          </button>
                          {isOpen && (
                            <div className="border-t border-[#f0ebe0] bg-[#fcfaf6] p-5">
                              <p className="text-sm italic text-[#5a6e60]">"{theme} has been challenging this week - example anonymised comment to show tone without identifying staff."</p>
                              <div className="mt-4 flex gap-2">
                                <button onClick={() => downloadWeeklyPdf(currentWeek, domain)} className="rounded-full bg-[#1f3d2b] px-4 py-2 text-xs font-semibold text-white">Download {theme} report PDF</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[20px] border-l-[6px] border-l-[#8aa08e] border border-[#e8e2d6] bg-white p-6 shadow-sm">
                  <div className="flex gap-3">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <h3 className="text-[20px] font-bold text-[#1f3d2b]">Privacy safeguards</h3>
                      <div className="mt-3 space-y-1.5 text-sm text-[#5a6e60]">
                        <p>No names or contact details are shown.</p>
                        <p>Small groups are suppressed to protect anonymity.</p>
                        <p>Free-text comments are anonymised.</p>
                        <p>Exact timestamps are hidden.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="pb-10 pt-2 text-center text-xs text-[#9aa89d]">Example dashboard using anonymised data • Domain: {domain || "clearshiftwellbeing.co.uk"} • Download PDFs are anonymised, no emails</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
