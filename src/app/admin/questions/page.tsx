"use client";

import { useCallback, useEffect, useState } from "react";
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

  const handleAddQuestion = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setQuestion("");
      setIsSupport(false);
      setNotice("Question added successfully!");
    } catch (error) {
      console.error(error);
    }
  };


type EditableOption = QuestionOption & { id: string };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function responseError(response: Response, fallback: string) {
  const detail = await response.text().catch(() => "");
  return detail && detail.length < 240 ? detail : fallback;
}

function suggestRag(label: string): Rag {
  const l = label.toLowerCase().trim();
  if (["manageable", "yes", "ok", "i felt ok", "safe", "supported"].includes(l))
    return "green";
  if (["heavy", "struggled a little", "struggled", "a little"].includes(l))
    return "amber";
  if (
    [
      "unmanageable",
      "no",
      "i was not coping",
      "not coping",
      "unsafe",
      "unsupported",
    ].includes(l)
  )
    return "red";
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

    const handleAddQuestion = async (e: FormEvent) => {
      e.preventDefault();
      try {

        setQuestion("");
        setIsSupport(false);
        setNotice("Question added successfully!");
      } catch (error) {
        console.error(error);
      }
    };

