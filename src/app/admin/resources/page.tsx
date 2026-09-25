"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://clearshiftwellbeingapis-production.up.railway.app";

type Resource = {
  _id: string;
  tips: string[];
  eap: string[];
  hr: string[];
  crisis: string[];
  version: number;
  isActive: boolean;
  domain?: string;
  updatedAt?: string;
};

type Field = "tips" | "eap" | "hr" | "crisis";
type ResourceModal = {
  isOpen: boolean;
  mode: "create" | "edit";
  selectedId?: string;
  tips: string[];
  eap: string[];
  hr: string[];
  crisis: string[];
};

const emptyModal: ResourceModal = {
  isOpen: false,
  mode: "create",
  tips: [],
  eap: [],
  hr: [],
  crisis: [],
};

const sections: { key: Field; title: string; description: string }[] = [
  { key: "tips", title: "Wellbeing tips", description: "Short, practical advice for employees." },
  { key: "eap", title: "Employee assistance (EAP)", description: "How employees can reach the assistance programme." },
  { key: "hr", title: "HR support", description: "The right contact or process for workplace support." },
  { key: "crisis", title: "Crisis support", description: "Urgent help details. Check these carefully before saving." },
];

function validDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export default function AdminResourcesPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Resource[]>([]);
  const [modal, setModal] = useState<ResourceModal>(emptyModal);
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

  const fetchResources = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/content/support-tools/all?domain=${encodeURIComponent(domain)}`,
        { cache: "no-store" }
      );
      if (response.status === 404) {
        setItems([]);
        setError(null);
        return;
      }
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.items)
          ? data.data.items
          : [];
      setItems(list.filter(
        (item: Resource) => String(item?.domain || "").toLowerCase() === domain.toLowerCase()
      ));
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    if (domain) void fetchResources();
  }, [domain, fetchResources]);

  function createResource() {
    setModal({ isOpen: true, mode: "create", tips: [""], eap: [""], hr: [""], crisis: [""] });
  }

  function editResource(item: Resource) {
    setModal({
      isOpen: true,
      mode: "edit",
      selectedId: item._id,
      tips: [...(item.tips || [])],
      eap: [...(item.eap || [])],
      hr: [...(item.hr || [])],
      crisis: [...(item.crisis || [])],
    });
  }

  async function saveResource() {
    setSaving(true);
    try {
      const isEditing = modal.mode === "edit";
      const existing = items.find((item) => item._id === modal.selectedId);
      const payload = {
        tips: modal.tips.map((s) => s.trim()).filter(Boolean),
        eap: modal.eap.map((s) => s.trim()).filter(Boolean),
        hr: modal.hr.map((s) => s.trim()).filter(Boolean),
        crisis: modal.crisis.map((s) => s.trim()).filter(Boolean),
        domain,
        isActive: isEditing ? (existing?.isActive ?? true) : true,
      };
      const response = await fetch(
        isEditing ? `${API_BASE}/content/support-tools/${modal.selectedId}` : `${API_BASE}/content/support-tools`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error(await response.text());
      setModal(emptyModal);
      await fetchResources();
    } catch (cause: unknown) {
      alert(cause instanceof Error ? cause.message : "Unable to save resources.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(id: string) {
    if (!confirm("Delete this resource version? This cannot be undone.")) return;
    try {
      const response = await fetch(`${API_BASE}/content/support-tools/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!response.ok) throw new Error(await response.text());
      await fetchResources();
    } catch (cause: unknown) {
      alert(cause instanceof Error ? cause.message : "Unable to delete resources.");
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-[#e9e5d7] bg-white p-8 text-[#52645a]">Loading resources…</div>;
  }
  if (error) {
    return (
      <div className="rounded-3xl border border-[#e9e5d7] bg-white p-8">
        <h1 className="text-xl font-semibold text-[#1f4d3d]">Resources</h1>
        <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>
        {domain && <button type="button" onClick={() => void fetchResources()} className="mt-5 rounded-xl bg-[#1f4d3d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173e30]">Try again</button>}
      </div>
    );
  }

  const activeCount = items.filter((item) => item.isActive).length;

  return (
    <main className="space-y-6 bg-[#f7f8f5] pb-8 text-[#263b32]">
      <section className="overflow-hidden rounded-3xl bg-[#1f4d3d] px-6 py-8 text-white shadow-sm sm:px-8">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#e9e5d7]">Employee support</span>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Resources Management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e9e5d7]">Manage the wellbeing tips and support contacts available to your organisation.</p>
            <p className="mt-3 text-xs text-[#d7e2d6]">Domain: {domain}</p>
          </div>
          <button type="button" onClick={createResource} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1f4d3d] shadow-sm hover:bg-[#e9e5d7]">+ Create resources</button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Resource versions", value: items.length },
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
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#1f4d3d]">Support tool contents</h2>
          <p className="mt-1 text-sm text-[#66766d]">Check the contacts and advice in each version before making changes.</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8dfd5] bg-[#f8faf7] px-6 py-12 text-center">
            <p className="font-semibold text-[#1f4d3d]">No resources yet</p>
            <p className="mt-2 text-sm text-[#66766d]">Create a resource set to add it to this list.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const date = validDate(item.updatedAt);
              return (
                <article key={item._id} className="rounded-2xl border border-[#e9e5d7] bg-[#fcfdfb] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[#1f4d3d]">Resource version {item.version}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? "bg-[#e4f2e5] text-[#236044]" : "bg-[#f0eee8] text-[#66766d]"}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#748077]">Domain: {item.domain || domain}{date ? ` · Updated: ${date}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => editResource(item)} className="rounded-xl border border-[#cbd9cd] bg-white px-4 py-2 text-sm font-medium text-[#1f4d3d] hover:bg-[#eef4ee]">Edit</button>
                      <button type="button" onClick={() => void deleteResource(item._id)} className="rounded-xl border border-[#f2d7d4] bg-white px-4 py-2 text-sm font-medium text-[#a34039] hover:bg-[#fff3f1]">Delete</button>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {sections.map((section) => (
                      <div key={section.key} className="rounded-xl border border-[#e9e5d7] bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#66766d]">{section.title}</p>
                        <p className="mt-2 text-lg font-semibold text-[#1f4d3d]">{item[section.key]?.length || 0} <span className="text-xs font-normal text-[#66766d]">items</span></p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142f25]/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(emptyModal); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="resources-dialog-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#e9e5d7] bg-[#f7f8f5] px-5 py-5 sm:px-7">
              <div>
                <h2 id="resources-dialog-title" className="text-xl font-semibold text-[#1f4d3d]">{modal.mode === "create" ? "Create resources" : "Edit resources"}</h2>
                <p className="mt-1 text-sm text-[#66766d]">{domain}</p>
              </div>
              <button type="button" aria-label="Close dialog" disabled={saving} onClick={() => setModal(emptyModal)} className="rounded-lg px-2 text-2xl text-[#66766d] hover:bg-[#e9e5d7]">×</button>
            </div>
            <div className="space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
              {sections.map((section) => (
                <ListEditor
                  key={section.key}
                  title={section.title}
                  description={section.description}
                  items={modal[section.key]}
                  onChange={(next) => setModal((current) => ({ ...current, [section.key]: next }))}
                />
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-[#e9e5d7] bg-[#f7f8f5] px-5 py-4 sm:px-7">
              <button type="button" disabled={saving} onClick={() => setModal(emptyModal)} className="rounded-xl border border-[#d8dfd5] bg-white px-5 py-2.5 text-sm font-semibold text-[#1f4d3d] hover:bg-[#eef4ee]">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void saveResource()} className="rounded-xl bg-[#1f4d3d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173e30] disabled:opacity-60">{saving ? "Saving…" : modal.mode === "create" ? "Create resources" : "Save changes"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ListEditor({ title, description, items, onChange }: {
  title: string;
  description: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#e9e5d7] bg-[#fcfdfb] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#1f4d3d]">{title}</h3>
          <p className="mt-1 text-xs text-[#66766d]">{description}</p>
        </div>
        <button type="button" onClick={() => onChange([...items, ""])} className="rounded-lg bg-[#e8f1e9] px-3 py-2 text-xs font-semibold text-[#1f4d3d] hover:bg-[#d8e8da]">+ Add item</button>
      </div>
      {items.length === 0 && <p className="mt-4 text-sm text-[#748077]">No items in this section.</p>}
      <div className="mt-4 space-y-2">
        {items.map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              aria-label={`${title} item ${index + 1}`}
              className="min-w-0 flex-1 rounded-xl border border-[#d8dfd5] bg-white px-3 py-2.5 text-sm text-[#263b32] outline-none focus:border-[#1f4d3d]"
              value={value}
              onChange={(event) => onChange(items.map((item, i) => i === index ? event.target.value : item))}
              placeholder={`Item ${index + 1}`}
            />
            <button type="button" aria-label={`Remove ${title} item ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))} className="rounded-xl border border-[#f2d7d4] bg-white px-3 text-sm font-semibold text-[#a34039] hover:bg-[#fff3f1]">Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}
