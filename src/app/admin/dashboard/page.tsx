"use client";

import { useEffect, useMemo, useState } from "react";

type RagStatus = "red" | "amber" | "green" | "unknown";

type AppAnswer = {
  checkInId?: string;
  questionId?: string;
  questionText?: string;
  response?: string;
  answer?: string;
  value?: string;
  status?: string;
  rag?: string;
  ragStatus?: string;
  submittedAt?: string;
  submitted_at?: string;
  date?: string;
  department?: string;
};

type NormalisedAnswer = {
  checkInId: string;
  questionId: string;
  questionText: string;
  response: string;
  submittedAt: string;
  department?: string;
  status: RagStatus;
};

type DashboardCounts = {
  totalCheckIns: number;
  totalAnswers: number;
  red: number;
  amber: number;
  green: number;
  unknown: number;
  excludedDepartmentAnswers: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_APP_API_URL || "http://localhost:3000";

const CHECK_INS_ENDPOINT = "/api/check-ins";

/*
  These are the only default RAG rules.

  Department is context only and must never affect RAG scoring.
  Unknown and Other responses are not counted as Red.
*/
const QUESTION_RULES = {
  feeling: {
    questionText: "How were you feeling in work today?",
    responses: {
      ok: "green",
      "struggled a little": "amber",
      "i was not coping": "red",
    },
  },

  outsideWork: {
    questionText: "Did anything outside of work affect you today?",
    responses: {
      yes: "amber",
      no: "green",
    },
  },

  restBreaks: {
    questionText: "Did you have enough rest breaks during your shift?",
    responses: {
      yes: "green",
      no: "red",
    },
  },
} as const;

const normalise = (value?: unknown): string => {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const validRagStatus = (value?: unknown): RagStatus | null => {
  const status = normalise(value);

  if (status === "red") return "red";
  if (status === "amber") return "amber";
  if (status === "green") return "green";
  if (status === "unknown") return "unknown";

  return null;
};

const isDepartmentQuestion = (answer: AppAnswer): boolean => {
  const text = normalise(answer.questionText);

  return (
    text === "what department are you in?" ||
    text.includes("department")
  );
};

const getQuestionType = (
  questionText: string
): "feeling" | "outsideWork" | "restBreaks" | "unknown" => {
  const text = normalise(questionText);

  if (text === normalise(QUESTION_RULES.feeling.questionText)) {
    return "feeling";
  }

  if (text === normalise(QUESTION_RULES.outsideWork.questionText)) {
    return "outsideWork";
  }

  if (text === normalise(QUESTION_RULES.restBreaks.questionText)) {
    return "restBreaks";
  }

  return "unknown";
};

const calculateRagStatus = (answer: AppAnswer): RagStatus => {
  // Use the app's official status if it is valid.
  const officialStatus = validRagStatus(
    answer.status ?? answer.ragStatus ?? answer.rag
  );

  if (officialStatus) {
    return officialStatus;
  }

  const response = normalise(
    answer.response ?? answer.answer ?? answer.value
  );

  // Never score department or demographic questions.
  if (isDepartmentQuestion(answer)) {
    return "unknown";
  }

  // Other and blank responses are unknown.
  if (!response || response === "other") {
    return "unknown";
  }

  const questionType = getQuestionType(answer.questionText ?? "");

  if (questionType === "feeling") {
    return (
      QUESTION_RULES.feeling.responses[
        response as keyof typeof QUESTION_RULES.feeling.responses
      ] ?? "unknown"
    );
  }

  if (questionType === "outsideWork") {
    return (
      QUESTION_RULES.outsideWork.responses[
        response as keyof typeof QUESTION_RULES.outsideWork.responses
      ] ?? "unknown"
    );
  }

  if (questionType === "restBreaks") {
    return (
      QUESTION_RULES.restBreaks.responses[
        response as keyof typeof QUESTION_RULES.restBreaks.responses
      ] ?? "unknown"
    );
  }

  return "unknown";
};

const mapAnswer = (answer: AppAnswer): NormalisedAnswer => {
  return {
    checkInId: String(answer.checkInId ?? ""),
    questionId: String(answer.questionId ?? ""),
    questionText: String(answer.questionText ?? ""),
    response: String(
      answer.response ?? answer.answer ?? answer.value ?? ""
    ),
    submittedAt: String(
      answer.submittedAt ?? answer.submitted_at ?? answer.date ?? ""
    ),
    department: answer.department,
    status: calculateRagStatus(answer),
  };
};

const getDashboardCounts = (
  answers: NormalisedAnswer[]
): DashboardCounts => {
  const counts: DashboardCounts = {
    totalCheckIns: new Set(
      answers
        .map((answer) => answer.checkInId)
        .filter(Boolean)
    ).size,
    totalAnswers: answers.length,
    red: 0,
    amber: 0,
    green: 0,
    unknown: 0,
    excludedDepartmentAnswers: 0,
  };

  answers.forEach((answer) => {
    if (
      normalise(answer.questionText).includes("department") ||
      normalise(answer.questionText) ===
        "what department are you in?"
    ) {
      counts.excludedDepartmentAnswers += 1;
      return;
    }

    counts[answer.status] += 1;
  });

  return counts;
};

const ragLabel = (status: RagStatus): string => {
  if (status === "red") return "Red";
  if (status === "amber") return "Amber";
  if (status === "green") return "Green";
  return "Unknown";
};

const ragClasses = (status: RagStatus): string => {
  if (status === "red") {
    return "bg-red-100 text-red-800";
  }

  if (status === "amber") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "green") {
    return "bg-green-100 text-green-800";
  }

  return "bg-slate-100 text-slate-700";
};

export default function DashboardOverview() {
  const [answers, setAnswers] = useState<NormalisedAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}${CHECK_INS_ENDPOINT}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `The check-in service returned status ${response.status}.`
        );
      }

      const data = await response.json();

      const rawAnswers: AppAnswer[] = Array.isArray(data)
        ? data
        : Array.isArray(data.answers)
          ? data.answers
          : Array.isArray(data.checkIns)
            ? data.checkIns
            : [];

      const mappedAnswers = rawAnswers
        .map(mapAnswer)
        .filter((answer) => answer.questionText);

      setAnswers(mappedAnswers);
      setLastUpdated(new Date().toLocaleString("en-GB"));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The dashboard could not connect to the check-in service."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const counts = useMemo(
    () => getDashboardCounts(answers),
    [answers]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-slate-700">
            Loading wellbeing dashboard…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-semibold text-red-900">
            Dashboard connection problem
          </h1>

          <p className="mt-2 text-red-800">{error}</p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-5 rounded-full bg-[#718044
] px-5 py-3 text-sm font-medium text-white"
          >
            Retry connection
          </button>
        </div>
      </main>
    );
  }

  if (answers.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            Employee wellbeing overview
          </h1>

          <p className="mt-3 text-slate-600">
            No usable check-in responses were returned by the app.
            Check the API connection and response field mapping.
          </p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-5 rounded-full bg-[#718044
] px-5 py-3 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 p-4 md:p-8">
      <section className="rounded-2xl bg-[#38452e
] p-6 text-white shadow-sm">
        <p className="text-sm uppercase tracking-wide text-stone-200">
          ClearShift Wellbeing
        </p>

        <h1 className="mt-2 text-2xl font-semibold">
          Employee wellbeing overview
        </h1>

        <p className="mt-2 text-sm text-stone-200">
          Aggregated check-in results. Individual employee information is
          not displayed.
        </p>
      </section>

      {counts.unknown > 0 && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Some answers could not be mapped to a RAG status and are shown as
          Unknown. Check the question mapping before relying on these totals.
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <SummaryCard
          label="Check-ins"
          value={counts.totalCheckIns}
        />

        <SummaryCard
          label="Usable answers"
          value={counts.totalAnswers}
        />

        <SummaryCard
          label="Red"
          value={counts.red}
          status="red"
        />

        <SummaryCard
          label="Amber"
          value={counts.amber}
          status="amber"
        />

        <SummaryCard
          label="Green"
          value={counts.green}
          status="green"
        />

        <SummaryCard
          label="Unknown"
          value={counts.unknown}
          status="unknown"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Overall RAG picture
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Department answers are excluded from wellbeing scoring.
          </p>

          <div className="mt-6 space-y-3">
            <RagRow status="red" value={counts.red} total={counts.totalAnswers} />
            <RagRow status="amber" value={counts.amber} total={counts.totalAnswers} />
            <RagRow status="green" value={counts.green} total={counts.totalAnswers} />
            <RagRow status="unknown" value={counts.unknown} total={counts.totalAnswers} />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Data connection
          </h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Records received</dt>
              <dd className="font-medium text-slate-900">
                {answers.length}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Department answers excluded
              </dt>
              <dd className="font-medium text-slate-900">
                {counts.excludedDepartmentAnswers}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Last updated</dt>
              <dd className="font-medium text-slate-900">
                {lastUpdated || "Not available"}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status?: RagStatus;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>

      <div className="mt-3 flex items-center gap-2">
        {status && (
          <span
            className={`h-3 w-3 rounded-full ${
              status === "red"
                ? "bg-red-600"
                : status === "amber"
                  ? "bg-amber-500"
                  : status === "green"
                    ? "bg-green-600"
                    : "bg-slate-500"
            }`}
            aria-hidden="true"
          />
        )}

        <p className="text-3xl font-semibold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function RagRow({
  status,
  value,
  total,
}: {
  status: RagStatus;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-slate-800">
          {ragLabel(status)}
        </span>

        <span className="text-slate-500">
          {value} · {percentage}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${
            status === "red"
              ? "bg-red-600"
              : status === "amber"
                ? "bg-amber-500"
                : status === "green"
                  ? "bg-green-600"
                  : "bg-slate-500"
          }`}
          style={{ width: `${percentage}%` }}
          aria-label={`${ragLabel(status)}: ${percentage}%`}
        />
      </div>
    </div>
  );
}
