"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://clearshiftwellbeingapis-production.up.railway.app";

type PrivacyPolicy = {
  _id: string;
  title: string;
  content: string;
  isActive: boolean;
  domain?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PolicyModal = {
  isOpen: boolean;
  mode: "create" | "edit";
  selectedId?: string;
  title: string;
  content: string;
};

const emptyModal: PolicyModal = {
  isOpen: false,
  mode: "create",
  title: "",
  content: "",
};

// Policy content is saved as rich text. Display a short, safe plain-text preview.
// A second pass handles older records containing encoded HTML such as &lt;p&gt;.
function previewText(content: string): string {
  if (typeof DOMParser === "undefined") return "";

  let value = content;
  for (let pass = 0; pass < 2; pass += 1) {
    const spaced = value.replace(/<(?:br\b[^>]*|\/(?:p|div|li|h[1-6])\s*)>/gi, " ");
    value = new DOMParser().parseFromString(spaced, "text/html").body.textContent || "";
  }
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function updatedDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export default function AdminPrivacyPoliciesPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PrivacyPolicy[]>([]);
  const [modal, setModal] = useState<PolicyModal>(emptyModal);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data?.ok || !data?.admin?.domain) {
          throw new Error("Session expired. Please log in again.");
        }
        setDomain(data.admin.domain);
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : "Unable to load session.");
        setLoading(false);
      }
    })();
  }, []);

  const fetchPrivacyPolicies = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/content/privacy-policies?domain=${encodeURIComponent(domain)}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.items)
          ? data.data.items
          : [];
      setItems(
        list.filter(
          (policy: PrivacyPolicy) =>
            String(policy?.domain || "").toLowerCase() === domain.toLowerCase()
        )
      );
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Failed to load privacy policies.");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    if (domain) void fetchPrivacyPolicies();
  }, [domain, fetchPrivacyPolicies]);

  async function savePrivacyPolicy() {
    if (!modal.title.trim() || !previewText(modal.content)) {
      alert("Title and content are required.");
      return;
    }

    setSaving(true);
    try {
      const isEditing = modal.mode === "edit";
      const existing = items.find((policy) => policy._id === modal.selectedId);
      const response = await fetch(
        isEditing
          ? `${API_BASE}/content/privacy-policy/${modal.selectedId}`
          : `${API_BASE}/content/privacy-policy`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: modal.title.trim(),
            content: modal.content.trim(),
            domain,
            isActive: isEditing ? (existing?.isActive ?? true) : true,
          }),
        }
      );
      if (!response.ok) throw new Error(await response.text());
      setModal(emptyModal);
      await fetchPrivacyPolicies();
    } catch (cause: unknown) {
      alert(cause instanceof Error ? cause.message : "Unable to save privacy policy.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePrivacyPolicy(id: string) {
    if (!confirm("Delete this privacy policy? This cannot be undone.")) return;
    try {
      const response = await fetch(`${API_BASE}/content/privacy-policy/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!response.ok) throw new Error(await response.text());
      await fetchPrivacyPolicies();
    } catch (cause: unknown) {
      alert(cause instanceof Error ? cause.message : "Unable to delete privacy policy.");
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-[#e9e5d7] bg-white p-8 text-[#52645a]">Loading privacy policies…</div>;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-[#e9e5d7] bg-white p-8">
        <h1 className="text-xl font-semibold text-[#1f4d3d]">Privacy policies</h1>
        <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>
        {domain && <button type="button" onClick={() => void fetchPrivacyPolicies()} className="mt-5 rounded-xl bg-[#1f4d3d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173e30]">Try again</button>}
      </div>
    );
  }

  const activeCount = items.filter((policy) => policy.isActive).length;

  return (
    <main className="space-y-6 bg-[#f7f8f5] pb-8 text-[#263b32]">
      <section className="overflow-hidden rounded-3xl bg-[#1f4d3d] px-6 py-8 text-white shadow-sm sm:px-8">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#e9e5d7]">Policies and privacy</span>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Privacy Policy Management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e9e5d7]">Review and manage the policy text available for your organisation.</p>
            <p className="mt-3 text-xs text-[#d7e2d6]">Domain: {domain}</p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ isOpen: true, mode: "create", title: "", content: "" })}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1f4d3d] shadow-sm transition hover:bg-[#e9e5d7]"
          >
            + Create policy
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total policies", value: items.length },
          { label: "Active", value: activeCount },
          { label: "Inactive", value: items.length - activeCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#e9e5d7] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-[#66766d]">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[#1f4d3d]">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-[#e9e5d7] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#1f4d3d]">Your policies</h2>
            <p className="mt-1 text-sm text-[#66766d]">Content previews are shown as readable text.</p>
          </div>
          <span className="rounded-full bg-[#f0f4ef] px-3 py-1 text-xs font-medium text-[#1f4d3d]">{items.length} {items.length === 1 ? "policy" : "policies"}</span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8dfd5] bg-[#f8faf7] px-6 py-12 text-center">
            <p className="font-semibold text-[#1f4d3d]">No privacy policies yet</p>
            <p className="mt-2 text-sm text-[#66766d]">Create a policy to add it to this list.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((policy) => {
              const date = updatedDate(policy.updatedAt);
              return (
                <article key={policy._id} className="rounded-2xl border border-[#e9e5d7] bg-[#fcfdfb] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[#1f4d3d]">{policy.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${policy.isActive ? "bg-[#e4f2e5] text-[#236044]" : "bg-[#f0eee8] text-[#66766d]"}`}>
                          {policy.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-[#52645a]">{previewText(policy.content) || "No preview available."}</p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#748077]">
                        <span>Domain: {policy.domain || domain}</span>
                        {date && <span>Updated: {date}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ isOpen: true, mode: "edit", selectedId: policy._id, title: policy.title, content: policy.content })}
                        className="rounded-xl border border-[#cbd9cd] bg-white px-4 py-2 text-sm font-medium text-[#1f4d3d] hover:bg-[#eef4ee]"
                      >Edit</button>
                      <button
                        type="button"
                        onClick={() => void deletePrivacyPolicy(policy._id)}
                        className="rounded-xl border border-[#f2d7d4] bg-white px-4 py-2 text-sm font-medium text-[#a34039] hover:bg-[#fff3f1]"
                      >Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142f25]/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(emptyModal); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="policy-dialog-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#e9e5d7] bg-[#f7f8f5] px-5 py-5 sm:px-7">
              <div>
                <h2 id="policy-dialog-title" className="text-xl font-semibold text-[#1f4d3d]">{modal.mode === "create" ? "Create privacy policy" : "Edit privacy policy"}</h2>
                <p className="mt-1 text-sm text-[#66766d]">{domain}</p>
              </div>
              <button type="button" aria-label="Close dialog" disabled={saving} onClick={() => setModal(emptyModal)} className="rounded-lg px-2 text-2xl text-[#66766d] hover:bg-[#e9e5d7]">×</button>
            </div>

            <div className="space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
              <div>
                <label htmlFor="policy-title" className="mb-2 block text-sm font-semibold text-[#263b32]">Policy title</label>
                <input
                  id="policy-title"
                  type="text"
                  value={modal.title}
                  onChange={(event) => setModal((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. Privacy Policy"
                  className="w-full rounded-xl border border-[#d8dfd5] bg-white px-4 py-3 text-sm text-[#263b32] outline-none focus:border-[#1f4d3d]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#263b32]">Content</label>
                <div className="overflow-hidden rounded-xl border border-[#d8dfd5] bg-white text-[#263b32] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-[#d8dfd5] [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[260px]">
                  <ReactQuill
                    value={modal.content}
                    onChange={(content) => setModal((current) => ({ ...current, content }))}
                    modules={{ toolbar: [
                      [{ header: [1, 2, 3, 4, 5, 6, false] }],
                      ["bold", "italic", "underline", "strike"],
                      [{ color: [] }, { background: [] }],
                      [{ align: [] }],
                      ["blockquote", "code-block"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      [{ indent: "-1" }, { indent: "+1" }],
                      ["link", "image"],
                      ["clean"],
                    ] }}
                    formats={["header", "bold", "italic", "underline", "strike", "color", "background", "align", "blockquote", "code-block", "list", "indent", "link", "image"]}
                    placeholder="Enter the policy content…"
                    theme="snow"
                  />
                </div>
                <p className="mt-2 text-xs text-[#66766d]">Review the full wording before saving any changes.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#e9e5d7] bg-[#f7f8f5] px-5 py-4 sm:px-7">
              <button type="button" disabled={saving} onClick={() => setModal(emptyModal)} className="rounded-xl border border-[#d8dfd5] bg-white px-5 py-2.5 text-sm font-semibold text-[#1f4d3d] hover:bg-[#eef4ee]">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void savePrivacyPolicy()} className="rounded-xl bg-[#1f4d3d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173e30] disabled:opacity-60">
                {saving ? "Saving…" : modal.mode === "create" ? "Create policy" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
