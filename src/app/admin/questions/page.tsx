"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://clearshiftwellbeingapis-production.up.railway.app";

type Rag = "red" | "amber" | "green" | "black";

type QuestionOption = {
  label: string;
  rag: Rag;
  score: number;
};

type Question = {
  _id: string;
  domain: string;
  question: string;
  options: string[] | QuestionOption[];
  optionsRag?: QuestionOption[];
  ragMap?: Record<string, Rag>;
  isPositive?: boolean;
  isSupport?: boolean;
  isActive?: boolean;
};

type EditableOption = QuestionOption & { id: string };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error? error.message : fallback;
}

async function responseError(response: Response, fallback: string) {
  const detail = await response.text().catch(() => "");
  return detail && detail.length < 240? detail : fallback;
}

function suggestRag(label: string): Rag {
  const l = label.toLowerCase().trim();
  if (["manageable", "yes", "ok", "i felt ok", "safe", "supported"].includes(l)) return "green";
  if (["heavy", "struggled a little", "struggled", "a little"].includes(l)) return "amber";
  if (["unmanageable", "no", "i was not coping", "not coping", "unsafe", "unsupported"].includes(l)) return "red";
  return "black";
}

function ragScore(rag: Rag): number {
  if (rag === "green") return 2;
  if (rag === "amber") return 1;
  if (rag === "red") return 0;
  return 1;
}

function ragColor(rag: Rag) {
  if (rag === "green") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (rag === "amber") return "bg-amber-100 text-amber-800 border-amber-200";
  if (rag === "red") return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function dotColor(rag: Rag) {
  if (rag === "green") return "#22c55e";
  if (rag === "amber") return "#f59e0b";
  if (rag === "red") return "#ef4444";
  return "#111827";
}

export default function AdminQuestionsPage() {
  const [domain, setDomain] = useState("");
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [isSupport, setIsSupport] = useState(false);

  const [options, setOptions] = useState<EditableOption[]>([
    { id: "1", label: "Yes", rag: "green", score: 2 },
    { id: "2", label: "No", rag: "red", score: 0 },
    { id: "3", label: "Other", rag: "black", score: 1 },
  ]);

  const loadQuestions = useCallback(async (adminDomain: string) => {
    const response = await fetch(
      `${API_BASE}/checkin?domain=${encodeURIComponent(adminDomain)}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(await responseError(response, "Could not load questions."));
    }
    const data: unknown = await response.json();
    const records = Array.isArray(data)
     ? data
      : data && typeof data === "object" && "items" in data
       ? (data as { items: unknown }).items
        : [];
    setItems(Array.isArray(records)? (records as Question[]) : []);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialise() {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok ||!data?.ok ||!data?.admin?.domain) {
          throw new Error("Session expired. Please log in again.");
        }
        if (!active) return;
        const adminDomain: string = data.admin.domain;
        setDomain(adminDomain);
        await loadQuestions(adminDomain);
        if (active) setError(null);
      } catch (cause) {
        if (active) setError(errorMessage(cause, "Could not load questions."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialise();
    return () => {
      active = false;
    };
  }, [loadQuestions]);

  async function refresh() {
    if (!domain) return;
    setLoading(true);
    setError(null);
    try {
      await loadQuestions(domain);
    } catch (cause) {
      setError(errorMessage(cause, "Could not load questions."));
    } finally {
      setLoading(false);
    }
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanOptions = options.map((o) => ({...o, label: o.label.trim() })).filter((o) => o.label);
    if (!domain ||!question.trim() || cleanOptions.length < 2 || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        domain,
        question: question.trim(),
        options: cleanOptions.map((o) => o.label),
        optionsRag: cleanOptions,
        ragMap: Object.fromEntries(cleanOptions.map((o) => [o.label, o.rag])),
        isActive: true,
        isPositive: cleanOptions.some((o) => o.rag === "green"),
        isSupport,
      };

      const response = await fetch(`${API_BASE}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Could not add the question."));
      }
      setQuestion("");
      setIsSupport(false);
      setNotice("Question added with RAG tags.");
      await loadQuestions(domain);
    } catch (cause) {
      setError(errorMessage(cause, "Could not add the question."));
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(id: string) {
    if (!domain || deletingId ||!window.confirm("Delete this question?")) return;
    setDeletingId(id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${API_BASE}/checkin/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Could not delete the question."));
      }
      setNotice("Question deleted.");
      await loadQuestions(domain);
    } catch (cause) {
      setError(errorMessage(cause, "Could not delete the question."));
    } finally {
      setDeletingId(null);
    }
  }

  const applyPreset = (preset: "workload" | "feeling" | "yesno") => {
    if (preset === "workload") {
      setQuestion("How manageable was your workload today?");
      setOptions([
        { id: "1", label: "Manageable", rag: "green", score: 2 },
        { id: "2", label: "Heavy", rag: "amber", score: 1 },
        { id: "3", label: "Unmanageable", rag: "red", score: 0 },
      ]);
    }
    if (preset === "feeling") {
      setQuestion("How did you feel at work today?");
      setOptions([
        { id: "1", label: "I felt ok", rag: "green", score: 2 },
        { id: "2", label: "Struggled a little", rag: "amber", score: 1 },
        { id: "3", label: "I was not coping", rag: "red", score: 0 },
        { id: "4", label: "Other", rag: "black", score: 1 },
      ]);
    }
    if (preset === "yesno") {
      setOptions([
        { id: "1", label: "Yes", rag: "green", score: 2 },
        { id: "2", label: "No", rag: "red", score: 0 },
        { id: "3", label: "Other", rag: "black", score: 1 },
      ]);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl bg-[#1f4d3d] text-white shadow-[0_18px_50px_rgba(31,77,61,0.18)]">
          <div className="relative px-6 py-7 sm:px-8 sm:py-9">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[42px] border-white/5" aria-hidden="true" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9e5d7] text-xl text-[#1f4d3d]" aria-hidden="true">✦</div>
                  <div>
                    <p className="text-sm font-bold tracking-wide">ClearShiftWellbeing</p>
                    <p className="text-xs text-emerald-100/75">Question management - RAG System</p>
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Check-in questions</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                  Each answer now has a RAG colour. Green=positive, Amber=watch, Red=concern, Black=other.
                </p>
              </div>
              <span className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/90">
                {items.length} {items.length === 1? "question" : "questions"}
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            {error} {domain && <button type="button" onClick={() => void refresh()} className="ml-2 font-bold underline">Try again</button>}
          </div>
        )}
        {notice && <div role="status" className="rounded-2xl border border-[#cfe1d6] bg-[#eef5f1] px-5 py-4 text-sm font-semibold text-[#285444]">{notice}</div>}

        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#38745f]">Organisation</p>
            <h2 className="mt-1 break-all text-xl font-bold tracking-tight">{domain || "Loading…"}</h2>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={!domain || loading}
            className="rounded-xl border border-[#d8e5df] bg-white px-4 py-2.5 text-sm font-semibold text-[#285444] transition hover:bg-[#eef5f1] disabled:opacity-50">
            {loading? "Refreshing…" : "Refresh questions"}
          </button>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38745f]">Create</p>
            <h2 className="mt-1 text-xl font-bold">Add a question with RAG</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => applyPreset("workload")} className="rounded-full border px-3 py-1 text-xs font-bold hover:bg-slate-50">Preset: Workload</button>
              <button type="button" onClick={() => applyPreset("feeling")} className="rounded-full border px-3 py-1 text-xs font-bold hover:bg-slate-50">Preset: Feeling</button>
              <button type="button" onClick={() => applyPreset("yesno")} className="rounded-full border px-3 py-1 text-xs font-bold hover:bg-slate-50">Preset: Yes/No/Other</button>
            </div>

            <form onSubmit={addQuestion} className="mt-6 space-y-5">
              <div>
                <label htmlFor="question-text" className="block text-sm font-semibold text-slate-700">Question</label>
                <textarea id="question-text" value={question} onChange={(event) => setQuestion(event.target.value)}
                  placeholder="e.g. Did you feel supported at work today?" rows={3} required
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-[#fbfcfa] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#38745f] focus:ring-2 focus:ring-[#38745f]/15" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Answer options + RAG tag</label>
                <div className="mt-2 space-y-2">
                  {options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: dotColor(opt.rag) }} />
                      <input value={opt.label} onChange={(e) => {
                        const v = e.target.value;
                        setOptions(prev => prev.map(p => p.id === opt.id? {...p, label: v, rag: suggestRag(v), score: ragScore(suggestRag(v)) } : p));
                      }}
                      className="flex-1 rounded-xl border border-slate-200 bg-[#fbfcfa] px-3 py-2.5 text-sm" placeholder={`Option ${idx+1}`} />
                      <select value={opt.rag} onChange={(e) => {
                        const r = e.target.value as Rag;
                        setOptions(prev => prev.map(p => p.id === opt.id? {...p, rag: r, score: ragScore(r) } : p));
                      }}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${ragColor(opt.rag)}`}>
                        <option value="green">GREEN</option>
                        <option value="amber">AMBER</option>
                        <option value="red">RED</option>
                        <option value="black">BLACK/Other</option>
                      </select>
                      <button type="button" onClick={() => setOptions(prev => prev.filter(p => p.id!== opt.id))} className="text-xs text-rose-600">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setOptions(prev => [...prev, { id: Date.now().toString(), label: "", rag: "black", score: 1 }])}
                  className="mt-3 rounded-xl border border-dashed px-3 py-2 text-xs font-bold">+ Add option</button>
                <p className="mt-2 text-xs text-slate-500">Preview: {options.map(o => `${o.label}(${o.rag.toUpperCase()})`).join(" · ")}</p>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#e0e9e3] bg-[#f8faf7] p-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isSupport} onChange={(event) => setIsSupport(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#1f4d3d]" />
                  <span><strong className="block font-semibold">Support question</strong><span className="text-xs text-slate-500">Mark if this asks whether an employee wants support.</span></span>
                </label>
              </div>
              <button type="submit" disabled={!domain ||!question.trim() || options.length < 2 || saving}
                className="w-full rounded-xl bg-[#1f4d3d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173c30] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {saving? "Adding…" : "Add question with RAG"}
              </button>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38745f]">Current check-in</p>
              <h2 className="mt-1 text-xl font-bold">Your questions</h2>
              <p className="mt-2 text-sm text-slate-500">Now showing RAG colours correctly.</p>
            </div>
            {loading? (
              <p role="status" className="p-7 text-sm text-slate-500">Loading questions…</p>
            ) : items.length === 0? (
              <p className="p-7 text-sm text-slate-500">No questions are available yet.</p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const opts = item.options as any[];
                  const isNewFormat = opts.length && typeof opts[0] === 'object';
                  return (
                    <li key={item._id} className="flex items-start gap-4 p-5 sm:p-6">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef5f1] text-sm font-bold text-[#285444]">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold leading-6 text-slate-900">{item.question}</h3>
                          {item.isSupport && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Support</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {isNewFormat? (opts as QuestionOption[]).map((o, i) => (
                            <span key={i} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${ragColor(o.rag)}`}>
                              <span className="h-2 w-2 rounded-full" style={{ background: dotColor(o.rag) }} />{o.label} • {o.rag.toUpperCase()}
                            </span>
                          )) : (opts as string[]).map((o, i) => (
                            <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{o}</span>
                          ))}
                        </div>
                        {item.ragMap && (
                          <p className="mt-1 text-xs text-slate-400">RAG: {Object.entries(item.ragMap).map(([k,v]) => `${k}=${v}`).join(", ")}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => void removeQuestion(item._id)} disabled={Boolean(deletingId)}
                        className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">
                        {deletingId === item._id? "Deleting…" : "Delete"}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
