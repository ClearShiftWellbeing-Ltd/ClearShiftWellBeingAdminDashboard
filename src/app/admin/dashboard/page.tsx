"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ThemeItem = { topic: string; count: number; };
type SummaryBucket = { total: number; red: number; amber: number; green: number; themes: ThemeItem[]; start: string; end: string; label: string; };
type DashboardSummaryResponse = { ok: boolean; domain: string; currentWeek: SummaryBucket; recentWeeks: SummaryBucket[]; };
const emptyWeek: SummaryBucket = { total: 0, red: 0, amber: 0, green: 0, themes: [], start: "", end: "", label: "" };

export default function AdminDashboardPage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [currentWeek, setCurrentWeek] = useState<SummaryBucket>(emptyWeek);
  const [recentWeeks, setRecentWeeks] = useState<SummaryBucket[]>([]);
  useEffect(()=>{(async()=>{
    try {
      const res=await fetch("/api/admin/dashboard-summary",{cache:"no-store"});
      const data: DashboardSummaryResponse=await res.json();
      if(data?.ok){ setDomain(String(data.domain||"")); setCurrentWeek(data.currentWeek||emptyWeek); setRecentWeeks(Array.isArray(data.recentWeeks)?data.recentWeeks.slice(1):[]); }
    } catch(e){}
  })()},[]);
  const percentages=useMemo(()=>{ if(!currentWeek.total) return{red:0,amber:0,green:0}; return{red:Math.round((currentWeek.red/currentWeek.total)*100),amber:Math.round((currentWeek.amber/currentWeek.total)*100),green:Math.round((currentWeek.green/currentWeek.total)*100)}; },[currentWeek]);
  const reportWeeks=useMemo(()=>[currentWeek,...recentWeeks].filter((w)=>Boolean(w.label)||w.total>0||w.themes.length>0),[currentWeek,recentWeeks]);

  return (
  <div className="space-y-6 bg-white p-4 min-h-screen">
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Organisation Reporting Overview</h1>
      <p className="mt-2 text-sm text-gray-600">Domain: {domain || "clearshiftwellbeing.co.uk"}</p>
      <div className="mt-4 flex gap-3">
        <button onClick={()=>router.push("/admin/checkin-responses")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">Review Responses</button>
        <button onClick={()=>router.push("/admin/support-requests")} className="rounded-lg border px-4 py-2 text-sm">Support Requests</button>
      </div>
    </section>
    <section className="grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border bg-slate-50 p-5"><p className="text-sm text-gray-600">Total this week</p><p className="text-3xl font-bold mt-2">{currentWeek.total}</p><p className="text-xs mt-1 text-gray-500">{currentWeek.label||"Current week"}</p></div>
      <div className="rounded-2xl border bg-red-50 p-5"><p className="text-sm text-gray-600">Red</p><p className="text-3xl font-bold mt-2 text-red-700">{currentWeek.red}</p><p className="text-xs mt-1">{percentages.red}%</p></div>
      <div className="rounded-2xl border bg-amber-50 p-5"><p className="text-sm text-gray-600">Amber</p><p className="text-3xl font-bold mt-2 text-amber-700">{currentWeek.amber}</p><p className="text-xs mt-1">{percentages.amber}%</p></div>
      <div className="rounded-2xl border bg-emerald-50 p-5"><p className="text-sm text-gray-600">Green</p><p className="text-3xl font-bold mt-2 text-emerald-700">{currentWeek.green}</p><p className="text-xs mt-1">{percentages.green}%</p></div>
    </section>
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="font-semibold mb-4">Weekly Snapshots</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {reportWeeks.map((week,idx)=>{
          const topTheme = week.themes?.[0] ? `${week.themes[0].topic} (${week.themes[0].count})` : "No repeated theme yet";
          return (
            <div key={idx} className="rounded-2xl border bg-gray-50 p-4">
              <p className="font-semibold text-sm">{week.label || `Week ${idx+1}`}</p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                <div className="bg-white rounded p-2"><p className="text-xs text-gray-500">Total</p><p className="font-bold">{week.total}</p></div>
                <div className="bg-white rounded p-2"><p className="text-xs text-gray-500">Red</p><p className="font-bold">{week.red}</p></div>
                <div className="bg-white rounded p-2"><p className="text-xs text-gray-500">Amber</p><p className="font-bold">{week.amber}</p></div>
                <div className="bg-white rounded p-2"><p className="text-xs text-gray-500">Green</p><p className="font-bold">{week.green}</p></div>
              </div>
              <div className="mt-3 bg-white rounded p-2"><p className="text-xs text-gray-400">Top theme</p><p className="text-sm font-medium">{topTheme}</p></div>
              <button onClick={()=>window.print()} className="mt-4 w-full rounded-full bg-black text-white py-2.5 text-xs font-semibold">Print / Save PDF</button>
            </div>
          );
        })}
      </div>
    </section>
  </div>
  );
}
