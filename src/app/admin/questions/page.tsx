import React from "react";

export default function SidebarWidget() {
  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]`}
    >
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        #1 Tailwind CSS Dashboard
      </h3>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
        Leading Tailwind CSS Admin Template with 400+ UI Component and Pages.
      </p>
      <a
        href="https://tailadmin.com/pricing"
        target="_blank"
        rel="nofollow"
        className="flex items-center justify-center p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600"
      >
        Upgrade To Pro
      </a>
    </div>
  );
}
   // fix 16:05
…
Worked for 8s
That code is only the TailAdmin “Upgrade to Pro” advert. Don’t delete the file because another part of the sidebar may import it.

Replace the entire file with:

import React from "react";

export default function SidebarWidget() {
  return null;
}

This safely removes the advert without breaking the sidebar. Then click Commit changes.


Pasted text(10).txt
Document
Received and saved. This is the original AdminSidebar code.

I can also see why the collapsed sidebar looks wrong: it displays the full “ClearShiftWellbeing” name in both the expanded and collapsed versions. Keep this as the backup copy.

User attachment
This I say at least 5 check-ins are needed I’ve submitted more than five in last 24 hrs and nothing is displaying?
You have submitted enough. The problem is most likely that the new summary page is installed, but the old API (data connection) route is still being used.

The old route returns:

{ ok: true, items: sanitized }
But the new page expects:

{ ok: true, enoughResponses: true, questions: [...] }
Because enoughResponses is missing, the page treats it as false and keeps showing “Results are protected.”

Fix
In GitHub, find:

src/app/api/admin/checkin-responses/route.ts
It might instead begin with:

app/api/admin/checkin-responses/route.ts
Replace that whole file with the saved code called:

ClearShift-checkin-responses-summary-route.ts

Do not redo the visible Check-in Answers page. Only replace the route.ts file, commit the change, wait for Vercel to deploy, then refresh.

The 24-hour period is not the issue—the code counts all returned check-ins, not only today’s.

<span className="block text-xl font-bold tracking-tight text-[#1f4d3d]">ClearShift<span className="text-[#5d8a69]">Wellbeing</span></span>
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminTokenNode } from "@/lib/adminAuthNode";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://clearshiftwellbeingapis-production.up.railway.app";

type BackendCheckInResponse = {
  _id: string;
  employeeId?: string;
  domain: string;
  answers?: {
    questionId: string;
    question: string;
    option: string;
    description: string;
    isPositive?: boolean;
  }[];
  submittedAt: string;
};

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const { ok, payload } = verifyAdminTokenNode(token);
  if (!ok || !payload?.dom) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const params = new URLSearchParams({ domain: payload.dom });

  try {
    const res = await fetch(${API_BASE}/checkin-responses?${params.toString()}, {
      cache: "no-store",
    });

    if (!res.ok) {
      const message = await res.text();
      return NextResponse.json(
        { ok: false, message: message || "Failed to load responses." },
        { status: res.status },
      );
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : [];
    const sanitized = items.map((item: BackendCheckInResponse) => ({
      _id: item._id,
      domain: item.domain,
      answers: Array.isArray(item.answers) ? item.answers : [],
      submittedAt: item.submittedAt,
    }));

    return NextResponse.json({ ok: true, items: sanitized });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to load responses.",
      },
      { status: 500 },
    );
  }
}
…
Yes—this confirms the problem. This is the old data route. It returns items, but the new dashboard expects enoughResponses and questions, so nothing displays.

In GitHub:

Open app/api/admin/checkin-responses/route.ts (possibly under src/app/...).
Delete all the code you pasted above.
Replace it with the saved file ClearShift-checkin-responses-API-code.txt.
Commit the change and wait for Vercel to deploy.
Refresh the dashboard.
Do not paste it into the dashboard page.tsx; it belongs only in api/admin/checkin-responses/route.ts.


You’re out of Work usage for now
Upgrade or add credits to keep using Work now, or wait for your usage to reset at 9:17 PM


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://clearshiftwellbeingapis-production.up.railway.app";

type Question = {
  _id: string;
  domain: string;
  question: string;
  options: string[];
  isPositive?: boolean;
  isSupport?: boolean;
  isActive?: boolean;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function responseError(response: Response, fallback: string) {
  const detail = await response.text().catch(() => "");
  return detail && detail.length < 240 ? detail : fallback;
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
  const [optionInput, setOptionInput] = useState("Yes,No,Prefer not to say,Other");
  const [isPositive, setIsPositive] = useState(false);
  const [isSupport, setIsSupport] = useState(false);

  const options = useMemo(
    () => optionInput.split(",").map((item) => item.trim()).filter(Boolean),
    [optionInput]
  );

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
    setItems(Array.isArray(records) ? (records as Question[]) : []);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialise() {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data?.ok || !data?.admin?.domain) {
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
    return () => { active = false; };
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
    if (!domain || !question.trim() || options.length < 2 || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${API_BASE}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          question: question.trim(),
          options,
          isActive: true,
          isPositive,
          isSupport,
        }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Could not add the question."));
      }
      setQuestion("");
      setIsPositive(false);
      setIsSupport(false);
      setNotice("Question added.");
      await loadQuestions(domain);
    } catch (cause) {
      setError(errorMessage(cause, "Could not add the question."));
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(id: string) {
    if (!domain || deletingId || !window.confirm("Delete this question?")) return;
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
                    <p className="text-xs text-emerald-100/75">Question management</p>
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Check-in questions</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                  Manage the questions employees see during their wellbeing check-in.
                </p>
              </div>
              <span className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/90">
                {items.length} {items.length === 1 ? "question" : "questions"}
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
            {loading ? "Refreshing…" : "Refresh questions"}
          </button>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38745f]">Create</p>
            <h2 className="mt-1 text-xl font-bold">Add a question</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Write the question and separate each answer option with a comma.</p>

            <form onSubmit={addQuestion} className="mt-6 space-y-5">
              <div>
                <label htmlFor="question-text" className="block text-sm font-semibold text-slate-700">Question</label>
                <textarea id="question-text" value={question} onChange={(event) => setQuestion(event.target.value)}
                  placeholder="e.g. Did you feel supported at work today?" rows={3} required
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-[#fbfcfa] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#38745f] focus:ring-2 focus:ring-[#38745f]/15" />
              </div>
              <div>
                <label htmlFor="answer-options" className="block text-sm font-semibold text-slate-700">Answer options</label>
                <input id="answer-options" value={optionInput} onChange={(event) => setOptionInput(event.target.value)} required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-[#fbfcfa] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#38745f] focus:ring-2 focus:ring-[#38745f]/15" />
                <p className="mt-2 text-xs text-slate-500">At least two options. Current preview: {options.join(" · ") || "None"}</p>
              </div>
              <div className="space-y-3 rounded-2xl border border-[#e0e9e3] bg-[#f8faf7] p-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isPositive} onChange={(event) => setIsPositive(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#1f4d3d]" />
                  <span><strong className="block font-semibold">Positive question</strong><span className="text-xs text-slate-500">Use the existing positive-question setting for this question.</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isSupport} onChange={(event) => setIsSupport(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#1f4d3d]" />
                  <span><strong className="block font-semibold">Support question</strong><span className="text-xs text-slate-500">Mark a question used to ask whether an employee wants support.</span></span>
                </label>
              </div>
              <button type="submit" disabled={!domain || !question.trim() || options.length < 2 || saving}
                className="w-full rounded-xl bg-[#1f4d3d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173c30] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {saving ? "Adding…" : "Add question"}
              </button>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38745f]">Current check-in</p>
              <h2 className="mt-1 text-xl font-bold">Your questions</h2>
              <p className="mt-2 text-sm text-slate-500">These questions are loaded for this organisation.</p>
            </div>
            {loading ? (
              <p role="status" className="p-7 text-sm text-slate-500">Loading questions…</p>
            ) : items.length === 0 ? (
              <p className="p-7 text-sm text-slate-500">No questions are available yet.</p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <li key={item._id} className="flex items-start gap-4 p-5 sm:p-6">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef5f1] text-sm font-bold text-[#285444]">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold leading-6 text-slate-900">{item.question}</h3>
                        {item.isSupport && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Support</span>}
                        {item.isActive === false && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Inactive</span>}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">Options: {Array.isArray(item.options) ? item.options.join(" · ") : "None"}</p>
                    </div>
                    <button type="button" onClick={() => void removeQuestion(item._id)} disabled={Boolean(deletingId)}
                      aria-label={`Delete question ${index + 1}`}
                      className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">
                      {deletingId === item._id ? "Deleting…" : "Delete"}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
