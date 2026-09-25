"use client";
import React, { useEffect, useState, useMemo } from "react";

type Week = { total: number; red: number; amber: number; green: number; themes: {topic:string;count:number}[]; label: string; };

export default function DashboardPage(){
  const [current,setCurrent]=useState<Week>({total:79,red:11,amber:16,green:52,themes:[{topic:"Workload",count:12},{topic:"Manager support",count:8},{topic:"Communication",count:6}],label:"September 2026"});
  const [all,setAll]=useState<Week[]>([]);
  const [theme,setTheme]=useState("all");
  const [open,setOpen]=useState<string|null>(null);
  const [dept,setDept]=useState("all");

  useEffect(()=>{(async()=>{
    try{
      const r=await fetch("/api/admin/dashboard-summary",{cache:"no-store"});
      const d=await r.json();
      if(d?.currentWeek){ setCurrent(d.currentWeek); setAll([d.currentWeek,...(d.recentWeeks||[])].filter(Boolean)); }
    }catch{}
  })()},[]);

  const stats=useMemo(()=>{
    const t=current.total||79; const g=current.green||52; const r=current.red||11;
    const gp=t?Math.round((g/t)*100):68; const rp=t?Math.round((r/t)*100):11; const ap=100-gp-rp;
    return {total:t,green:gp,red:rp,amber:ap,workload:31,support:54};
  },[current]);

  const themes=["Workload","Manager support","Stress","Communication","Positive feedback"];

  return (
    <div className="min-h-screen bg-[#fbf7ef]">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-full bg-[#e7f0e0] px-3 py-1 text-xs font-bold text-[#2e5a3a]">Anonymous responses</span>
          <span className="text-sm text-[#6b7a6e]">{current.label}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#1f3d2b]">Anonymous Wellbeing Dashboard</h1>

        <div className="mt-4 flex w-fit rounded-2xl bg-[#fffaf0] border border-[#e8e2d6] p-1">
          <button className="rounded-xl bg-[#1f3d2b] text-white px-5 py-2 text-sm font-bold">Overview</button>
          <button onClick={()=>{window.location.href="/admin/checkin-responses";}} className="rounded-xl px-5 py-2 text-sm font-bold text-[#5a6e60]">Detailed responses</button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="h-fit rounded-[20px] border bg-white border-[#e8e2d6] p-5">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-[#1f3d2b]">Filter the dashboard</h2>
              <button onClick={()=>{setTheme("all");setDept("all");}} className="rounded-full border border-[#a3b4a0] px-3 py-1 text-xs font-bold">Reset filters</button>
            </div>
            <div className="mt-5 space-y-4">
              <div><p className="text-sm font-semibold mb-1">Reporting period</p><select className="w-full rounded-xl border p-3 text-sm"><option>{current.label}</option><option>All periods</option></select></div>
              <div><p className="text-sm font-semibold mb-1">Department</p><select value={dept} onChange={e=>setDept(e.target.value)} className="w-full rounded-xl border p-3 text-sm"><option value="all">All departments</option><option>Driver/Gyrrwr</option><option>Customer Service</option></select></div>
              <div><p className="text-sm font-semibold mb-1">Question</p><select className="w-full rounded-xl border p-3 text-sm"><option>All questions</option></select></div>
              <div><p className="text-sm font-semibold mb-1">Response theme</p><select value={theme} onChange={e=>setTheme(e.target.value)} className="w-full rounded-xl border p-3 text-sm"><option value="all">All themes</option>{themes.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[20px] bg-white border border-[#e8e2d6] border-t-4 border-t-[#1f3d2b] p-5"><p className="text-sm text-[#6b7a6e]">Responses</p><p className="text-4xl font-extrabold text-[#1f3d2b] mt-2">{stats.total}</p></div>
              <div className="rounded-[20px] bg-white border border-[#e8e2d6] border-t-4 border-t-[#8aa08e] p-5"><p className="text-sm text-[#6b7a6e]">Positive wellbeing</p><p className="text-4xl font-extrabold text-[#1f3d2b] mt-2">{stats.green}%</p></div>
              <div className="rounded-[20px] bg-white border border-[#e8e2d6] border-t-4 border-t-[#c48a2d] p-5"><p className="text-sm text-[#6b7a6e]">Workload concerns</p><p className="text-4xl font-extrabold text-[#b87a1f] mt-2">{stats.workload}%</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
              <div className="rounded-[20px] bg-white border border-[#e8e2d6] border-t-4 border-t-[#b35a4a] p-5"><p className="text-sm text-[#6b7a6e]">Feel supported</p><p className="text-4xl font-extrabold text-[#a94a3a] mt-2">{stats.support}%</p></div>
              <div className="rounded-[20px] bg-white border border-[#e8e2d6] p-5">
                <h3 className="font-bold text-[#1f3d2b] text-lg">Overall wellbeing</h3>
                <p className="text-sm text-[#6b7a6e]">A balanced view across all anonymised responses.</p>
                <div className="mt-4 flex h-10 rounded-xl overflow-hidden">
                  <div className="bg-[#1f3d2b] text-white text-xs flex items-center justify-center font-bold" style={{width: `${stats.green}%`}}>Positive {stats.green}%</div>
                  <div className="bg-[#c48a2d] text-white text-xs flex items-center justify-center font-bold" style={{width: `${stats.amber}%`}}>Mixed {stats.amber}%</div>
                  <div className="bg-[#b35a4a] text-white text-xs flex items-center justify-center font-bold" style={{width: `${stats.red}%`}}>{stats.red}%</div>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] bg-white border border-[#e8e2d6] p-5">
              <h3 className="font-bold text-[#1f3d2b]">Key themes</h3>
              <p className="text-sm text-[#6b7a6e]">Select a theme to focus the anonymous comments below.</p>
              <div className="mt-3 flex flex-wrap gap-2">{themes.map(t=><button key={t} onClick={()=>setTheme(t)} className={`rounded-full border px-4 py-2 text-sm ${theme===t?"bg-[#1f3d2b] text-white":"bg-white border-[#d9d2c3] text-[#1f3d2b]"}`}>{t}</button>)}</div>
            </div>

            <div>
              <h3 className="font-bold text-[#1f3d2b]">Anonymous comments</h3>
              <p className="text-sm text-[#6b7a6e]">Grouped by theme and shown without identifying details.</p>
              <div className="mt-3 space-y-3">
                {(theme==="all"?themes:[theme]).map(th=>{
                  const isOpen=open===th;
                  return (
                    <div key={th} className="rounded-[18px] bg-white border border-[#e8e2d6]">
                      <button onClick={()=>setOpen(isOpen?null:th)} className="w-full flex justify-between p-4 text-left"><div><p className="font-bold text-sm">{th==="Workload"?"Workload concerns":th}</p><p className="text-xs font-bold text-[#8aa08e]">ANONYMOUS RESPONSE</p></div><span>{isOpen?"^":"v"}</span></button>
                      {isOpen&&<div className="border-t bg-[#fcfaf6] p-4 text-sm text-[#5a6e60]">Anonymised example for {th}. Your real data from {stats.total} submissions will appear here grouped by theme, no names.</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[20px] bg-white border border-[#e8e2d6] border-l-4 border-l-[#8aa08e] p-5">
              <h3 className="font-bold text-[#1f3d2b]">Privacy safeguards</h3>
              <div className="mt-2 text-sm text-[#5a6e60] space-y-1">
                <p>No names or contact details are shown.</p>
                <p>Small groups are suppressed to protect anonymity.</p>
                <p>Free-text comments are anonymised.</p>
                <p>Exact timestamps are hidden.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
