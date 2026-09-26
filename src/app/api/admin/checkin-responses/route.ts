export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminTokenNode } from "@/lib/adminAuthNode";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://clearshiftwellbeingapis-production.up.railway.app";
const MIN_GROUP = 5;

type Answer = {
  questionId?: string;
  question?: string;
  option?: string;
  description?: string;
};
type BackendResponse = {
  domain?: string;
  answers?: Answer[];
};
type Group = {
  question: string;
  total: number;
  options: Map<string, number>;
};

// An answer can contain a custom entry. Never show contact details in a label.
function safeOption(option: string): string | null {
  const label = option.replace(/\s+/g, " ").trim();
  if (!label || label.length > 80) return null;
  if (/@|https?:\/\/|www\.|\b\d[\d\s()+-]{6,}\d\b/i.test(label)) return null;
  return label;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const { ok, payload } = verifyAdminTokenNode(token);
  if (!ok || !payload?.dom) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const domain = String(payload.dom);
  const params = new URLSearchParams({ domain });

  try {
    const response = await fetch(`${API_BASE}/checkin-responses?${params}`, { cache: "no-store" });
    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json(
        { ok: false, message: message || "Failed to load responses." },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    // The backend has returned both a plain array and wrapped lists. Do not
    // mistake a wrapped response for zero submissions.
    const body = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const list = Array.isArray(data) ? data
      : Array.isArray(body.items) ? body.items
      : Array.isArray(body.submissions) ? body.submissions
      : Array.isArray(body.responses) ? body.responses
      : [];
    const raw = list as BackendResponse[];
    // Check the domain again; never rely only on a backend query parameter.
    const mine = raw.filter((item) =>
      String(item?.domain || "").toLowerCase() === domain.toLowerCase()
    );

    if (mine.length < MIN_GROUP) {
      return NextResponse.json(
        { ok: true, minimumGroup: MIN_GROUP, enoughResponses: false, questions: [] },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const groups = new Map<string, Group>();
    for (const submission of mine) {
      const seen = new Set<string>();
      for (const answer of Array.isArray(submission.answers) ? submission.answers : []) {
        const question = String(answer.question || "").replace(/\s+/g, " ").trim();
        if (!question || question.length > 200) continue;
        // Department combined with an answer can identify someone in a small team.
        if (/\bdepartment\b|\bwhich team\b|\bwhat team\b|\bjob\s*role\b/i.test(question)) continue;
        const key = String(answer.questionId || question);
        if (seen.has(key)) continue;
        seen.add(key);

        let group = groups.get(key);
        if (!group) {
          group = { question, total: 0, options: new Map() };
          groups.set(key, group);
        }
        group.total += 1;
        const option = safeOption(String(answer.option || ""));
        if (option) group.options.set(option, (group.options.get(option) || 0) + 1);
      }
    }

    const questions = [...groups.values()]
      .filter((group) => group.total >= MIN_GROUP)
      .map((group) => {
        const counts = [...group.options.entries()];
        // Suppress the entire breakdown if any category is small, missing,
        // or contains an unsafe custom entry. This also hides residual counts.
        const showBreakdown = counts.length > 0 &&
          counts.reduce((sum, [, count]) => sum + count, 0) === group.total &&
          counts.every(([, count]) => count >= MIN_GROUP);
        return {
          question: group.question,
          total: group.total,
          options: showBreakdown
            ? counts.sort((a, b) => b[1] - a[1]).map(([answer, count]) => ({ answer, count }))
            : [],
        };
      });

    return NextResponse.json(
      { ok: true, minimumGroup: MIN_GROUP, enoughResponses: true, questions },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load responses." },
      { status: 500 }
    );
  }
}
