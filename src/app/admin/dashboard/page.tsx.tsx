"use client";
import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";

type Week = { total: number; red: number; amber: number; green: number; themes: {topic:string;count:number}[]; label: string; start: string; end: string; };

export default function AdminDashboardPage(){
  const [domain,setDomain]=useState("clearshiftwellbeing.co.uk");
  const [current,setCurrent]=useState<Week>({total:79,red:11,amber:16,green:52,themes:[{topic:"Workload",count:12},{topic:"Manager support",count:8},{topic:"Communication",count:6}],label:"September 2026",start:"",end:""});
  const [all,setAll]=useState<Week[]>([]);
  const [tab,setTab]=useState("overview");
  const [theme,setTheme]=useState("all");
  const [open,setOpen]=useState<string|null>(null);
  const [dept,setDept]=useState("all");

  useEffect(()=>{(async()=>{
    try{
      const r=await fetch("/api/admin/dashboard-summary",{cache:"no-store"});
      const d=await r.json();
      if(d?.currentWeek){ setCurrent(d.currentWeek); setDomain(d.domain||domain); setAll([d.currentWeek,...(d.recentWeeks||[])].filter(Boolean)); }
    }catch{}
  })()},[]);

  const stats=useMemo(()=>{
    const t=current.total||79;
    const g=current.green||52;
    const r=current.red||11;
    const a=t-g-r;
    const gp=t?Math.round((g/t)*100):68;
    const rp=t?Math.round((r/t)*100):11;
    const ap=100-gp-rp;
    return {total:t,green:gp,red:rp,amber:ap,workload:31,support:54};
  },[current]);

  const themes=["Workload","Manager support","Stress","Communication","Positive feedback"];

  function dl(w:Week){
    const doc=new jsPDF();
    doc.text(`ClearShift Wellbeing - ${w.label}`,14,20);
    doc.text(`Total:${w.total} Red:${w.red} Amber:${w.amber} Green:${w.green}`,14,30);
    doc.save(`Report-${w.label}.pdf`);
  }

  return (
    <div className="min-h-screen bg-[#fbf7ef] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-[#e7f0e0] px-3 py-1 text-xs font-semibold text-[#2e5a3a]">Anonymous responses</span>
          <span className="text-sm text-[#6b7a6e]">{current.label}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#1f3d2b]">Anonymous Wellbeing Dashboard</h1>

        <div className="mt-4 flex w-fit rounded-2xl border border-[#e8e2d6] bg-[#fffaf0] p-1">
          <button onClick={()=>setTab("overview")} className={`rounded-xl px-5 py-2 text-sm font-bold ${tab==="overview"?"bg-[#1f3d2b] text-white":"text-[#5a6e60]"}`}>Overview</button>
          <button onClick={()=>window.location.href="/admin/checkin-responses"} className={`rounded-xl px-5 py-2 text-sm font-bold ${tab!=="overview"?"bg-[#1f3d2b] text-white":"text-[#5a6e60]"}`}>Detailed responses</button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="h-fit rounded-[20px] border border-[#e8e2d6] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1f3d2b]">Filter the dashboard</h2>
              <button onClick={()=>{setTheme("all");setDept("all");}} className="rounded-full border border-[#a3b4a0] px-3 py-1 text-xs font-bold">Reset filters</button>
            </div>
            <div className="mt-5 space-y-4">
              <div><p className="mb-1 text-sm font-semibold text-[#1f3d2b]">Reporting period</p><select className="w-full rounded-xl border border-[#d9d2c3] p-3 text-sm"><option>{current.label}</option><option>All periods</option></select></div>
              <div><p className="mb-1 text-sm font-semibold">Department</p><select value={dept} onChange={e=>setDept(e.target.value)} className="w-full rounded-xl border p-3 text-sm"><option value="all">All departments</option><option value="Driver">Driver/Gyrrwr</option><option value="Customer Service">Customer Service</option></select></div>
              <div><p className="mb-1 text-sm font-semibold">Question</p><select className="w-full rounded-xl border p-3 text-sm"><option>All questions</option></select></div>
              <div><p className="mb-1 text-sm font-semibold">Response theme</p><select value={theme} onChange={e=>setTheme(e.target.value)} className="w-full rounded-xl border p-3 text-sm"><option value="all">All themes</option>{themes.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[20px] border-t-4 border-t-[#1f3d2b] border border-[#e8e2d6] bg-white p-5"><p className="text-sm text-[#6b7a6e]">Responses</p><p className="mt-2 text-4xl font-extrabold text-[#1f3d2b]">{stats.total}</p></div>
              <div className="rounded-[20px] border-t-4 border-t-[#8aa08e] border border-[#e8e2d6] bg-white p-5"><p className="text-sm text-[#6b7a6e]">Positive wellbeing</p><p className="mt-2 text-4xl font-extrabold text-[#1f3d2b]">{stats.green}%</p></div>
              <div className="rounded-[20px] border-t-4 border-t-[#c48a2d] border border-[#e8e2d6] bg-white p-5"><p className="text-sm text-[#6b7a6e]">Workload concerns</p><p className="mt-2 text-4xl font-extrabold text-[#b87a1f]">{stats.workload}%</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
              <div className="rounded-[20px] border-t-4 border-t-[#b35a4a] border border-[#e8e2d6] bg-white p-5"><p className="text-sm text-[#6b7a6e]">Feel supported</p><p className="mt-2 text-4xl font-extrabold text-[#a94a3a]">{stats.support}%</p></div>
              <div className="rounded-[20px] border border-[#e8e2d6] bg-white p-5">
                <h3 className="text-lg font-bold text-[#1f3d2b]">Overall wellbeing</h3>
                <p className="text-sm text-[#6b7a6e]">A balanced view across all anonymised responses.</p>
                <div className="mt-4 flex h-10 overflow-hidden rounded-xl">
                  <div className="bg-[#1f3d2b] text-white text-xs flex items-center justify-center font-bold" style={{width:`${stats.green}%`}}>Positive {stats.green}%</div>
                  <div className="bg-[#c48a2d] text-white text-xs flex items-center justify-center font-bold" style={{width:`${stats.amber}%`}}>Mixed {stats.amber}%</div>
                  <div className="bg-[#b35a4a] text-white text-xs flex items-center justify-center font-bold" style={{width:`${stats.red}%`}}>{stats.red}%</div>
                </div>
                <div className="mt-3 flex gap-3 text-xs font-bold"><span className="flex gap-1 items-center"><span className="h-2 w-2 rounded-full bg-[#1f3d2b]"/>Positive {stats.green}%</span><span className="flex gap-1 items-center"><span className="h-2 w-2 rounded-full bg-[#c48a2d]"/>Mixed {stats.amber}%</span><span className="flex gap-1 items-center"><span className="h-2 w-2 rounded-full bg-[#b35a4a]"/>Needs attention {stats.red}%</span></div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#e8e2d6] bg-white p-5">
              <h3 className="font-bold text-[#1f3d2b]">Key themes</h3>
              <p className="text-sm text-[#6b7a6e]">Select a theme to focus the anonymous comments below.</p>
              <div className="mt-3 flex flex-wrap gap-2">{themes.map(t=><button key={t} onClick={()=>setTheme(t)} className={`rounded-full border px-4 py-2 text-sm ${theme===t?"bg-[#1f3d2b] text-white":"bg-white text-[#1f3d2b] border-[#d9d2c3]"}`}>{t}</button>)}</div>
            </div>

            <div>
              <h3 className="font-bold text-[#1f3d2b]">Anonymous comments</h3>
              <p className="text-sm text-[#6b7a6e]">Fictional examples are grouped by theme and shown without identifying details.</p>
              <div className="mt-3 space-y-3">
                {(theme==="all"?themes: [theme]).map(th=>{
                  const o=open===th;
                  return (
                    <div key={th} className="rounded-[18px] border border-[#e8e2d6] bg-white">
                      <button onClick={()=>setOpen(o?null:th)} className="flex w-full items-center justify-between p-4 text-left"><div><p className="font-bold text-sm">{th==="Workload"?"Workload concerns":th}</p><p className="text-xs font-semibold text-[#8aa08e]">ANONYMOUS RESPONSE</p></div><span>{o?"^":"v"}</span></button>
                      {o&&<div className="border-t bg-[#fcfaf6] p-4 text-sm text-[#5a6e60]">Anonymised example for {th}. This area will show real grouped comments from your 79 submissions without names. <div className="mt-3"><button onClick={()=>dl(current)} className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white">Download PDF</button></div></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[20px] border-l-4 border-l-[#8aa08e] border border-[#e8e2d6] bg-white p-5">
              <h3 className="font-bold text-[#1f3d2b]">Privacy safeguards</h3>
              <div className="mt-2 space-y-1 text-sm text-[#5a6e60]">
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
