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
  return detail && detail.length < 240
