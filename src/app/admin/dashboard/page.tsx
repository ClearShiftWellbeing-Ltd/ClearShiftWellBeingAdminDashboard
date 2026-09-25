"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

type ThemeItem = { topic: string; count: number; };
type SummaryBucket = { total: number; red: number; amber: number; green: number; themes: ThemeItem[]; start: string; end: string; label: string; };
type DashboardSummaryResponse = { ok: boolean; domain: string; currentWeek: SummaryBucket; recentWeeks: SummaryBucket[]; message?: string; };
const emptyWeek: SummaryBucket = { total: 0, red: 0, amber: 0, green: 0, themes: [], start: "", end: "", label: "" };

function downloadWeeklyPdf(week: SummaryBucket, domain: string) {
  const doc = new jsPDF();
  const label = week.label || `${week.start} - ${week.end}` || "Weekly Report";
  doc.setFontSize(16); doc.text("ClearShift Wellbeing", 14, 18);
  doc.setFontSize(12); doc.text("Organisation Reporting Overview", 14, 26);
  doc.setFontSize(10); doc.text(`Domain: ${domain}`, 14, 34); doc.text(`Week: ${label}`, 14, 40);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, 14, 46);
  doc.setFontSize(11); doc.text(`Total check-ins: ${week.total}`, 14, 56);
  doc.text(`Red: ${week.red} | Amber: ${week.amber} | Green: ${week.green}`, 14, 64);
  doc.text(`Breakdown: Red ${week.total?Math.round((week.red/week.total)*100):0}% | Amber ${week.total?Math.round((week.amber/week.total)*100):0}% | Green ${week.total?Math.round((week.green/week.total)*100):0}%`, 14, 72);
  doc.text("Top Themes:", 14, 84);
  if (week.themes && week.themes.length > 0) { week.themes.slice(0,5).forEach((t,i)=>{ doc.text(`- ${t.topic} (${t.count})`, 16, 92+i*7); }); } else { doc.text("- No repeated theme yet", 16, 92); }
  doc.setFontSize(9); doc.text("Anonymised - No names included.", 14, 130);
  doc.save(`ClearShift-${label.replace(/\s/g,"-")}.pdf`);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [currentWeek, setCurrentWeek] = useState<SummaryBucket>(emptyWeek);
  const [recentWeeks, setRecentWeeks] = useState<SummaryBucket[]>([]);
  useEffect(()=>{(async()=>{
    const res=await fetch("/api/admin/dashboard-summary",{cache:"no-store"}); const data: DashboardSummaryResponse=await res.json();
    if(data?.ok){ setDomain(String(data.domain||"")); setCurrentWeek(data.currentWeek||emptyWeek); setRecentWeeks(Array.isArray(data.recentWeeks)?data.recentWeeks.slice(1):[]); }
  })()},[]);
  const percentages=useMemo(()=>{ if(!currentWeek.total) return{red:0,amber:0,green:0}; return{red:Math.round((currentWeek.red/currentWeek.total)*100),amber:Math.round((currentWeek.amber/currentWeek.total)*100),green:Math.round((currentWeek.green/currentWeek.total)*100)}; },[currentWeek]);
  const reportWeeks=useMemo(()=>[currentWeek,...recentWeeks].filter((w)=>Boolean(w.label)||w.total>0||w.themes.length>0),[currentWeek,recentWeeks]);
  return (<div className="space-y-6 bg-white p-4">
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-2"><div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Employer reporting dashboard</div><h1 className="text-2xl font-semibold text-gray-900">Organisation Reporting Overview</h1><p className="max-w-3xl text-sm text-gray-600">This dashboard shows anonymised employer reporting using real check-in submissions.</p><p className="text-sm text-gray-500">Domain: <span className="font-mono">{domain||"clearshiftwellbeing.co.uk"}</span></p></div>
      <div className="mt-4 flex flex-wrap gap-3"><button onClick={()=>router.push("/admin/checkin-responses")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Review Anonymous Responses</button><button onClick={()=>router.push("/admin/support-requests")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">View Support Requests</button></div>
    </section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5"><p className="text-sm font-medium text-gray-600">Total check-ins this week</p><p className="mt-2 text-3xl font-semibold text-slate-700">{currentWeek.total}</p><p className="mt-1 text-xs text-gray-500">{currentWeek.label||"Current week"}</p></div>
      <div className="rounded-2xl border border-gray-200 bg-red-50 p-5"><p className="text-sm font-medium text-gray-600">Red</p><p className="mt-2 text-3xl font-semibold text-red-700">{currentWeek.red}</p><p className="mt-1 text-xs text-gray-500">{percentages.red}%</p></div>
      <div className="rounded-2xl border border-gray-200 bg-amber-50 p-5"><p className="text-sm font-medium text-gray-600">Amber</p><p className="mt-2 text-3xl font-semibold text-amber-700">{currentWeek.amber}</p><p className="mt-1 text-xs text-gray-500">{percentages.amber}%</p></div>
      <div className="rounded-2xl border border-gray-200 bg-emerald-50 p-5"><p className="text-sm font-medium text-gray-600">Green</p><p className="mt-2 text-3xl font-semibold text-emerald-700">{currentWeek.green}</p><p className="mt-1 text-xs text-gray-500">{percentages.green}%</p></div>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reportWeeks.map((week,idx)=>{ const topTheme=week.themes&&week.themes.length>0?`${week.themes[0].topic} (${week.themes[0].count})`:"No repeated theme yet"; return (<div key={`${week.label}-${idx}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-gray-900">{week.label||`Week ${idx+1}`}</p><span className={`rounded-full px-3 py-1 text-xs font-semibold ${idx===0?"bg-indigo-100 text-indigo-700":"bg-white text-gray-600"}`}>{idx===0?"Current":"Snapshot"}</span></div><div className="mt-4 grid grid-cols-4 gap-2 text-center"><div className="rounded-xl bg-white px-2 py-3"><p className="text-xs text-gray-500">Total</p><p className="mt-1 text-lg font-semibold text-gray-900">{week.total}</p></div><div className="rounded-xl bg-white px-2 py-3"><p className="text-xs text-gray-500">Red</p><p className="mt-1 text-lg font-semibold text-gray-900">{week.red}</p></div><div className="rounded-xl bg-white px-2 py-3"><p className="text-xs text-gray-500">Amber</p><p className="mt-1 text-lg font-semibold text-gray-900">{week.amber}</p></div><div className="rounded-xl bg-white px-2 py-3"><p className="text-xs text-gray-500">Green</p><p className="mt-1 text-lg font-semibold text-gray-900">{week.green}</p></div></div><div className="mt-4 rounded-xl bg-white px-3 py-2"><p className="text-xs uppercase tracking-wide text-gray-400">Top theme</p><p className="mt-1 text-sm font-medium text-gray-800">{topTheme}</p></div><button onClick={()=>downloadWeeklyPdf(week,domain)} className="mt-4 w-full rounded-full bg-black px-4 py-2.5 text-xs font-semibold text-white">Download 1 Week PDF</button></div>); })}</div></section>
  </div>);
}
