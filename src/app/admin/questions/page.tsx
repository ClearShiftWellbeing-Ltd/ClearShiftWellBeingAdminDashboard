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
  return error instanceof Error ? error.message : fallback;
}

async function responseError(response: Response, fallback: string) {
  const detail = await response.text().catch(() => "");
  return detail && detail.length < 240 ? detail : fallback;
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
    setItems(Array.isArray(records) ? (records as Question[]) : []);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialise() {
      try {
        const response = await fetch("/api/admin
