"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://clearshiftwellbeingapis-production.up.railway.app";

type Status = "new" | "in_progress" | "resolved";
type SupportRequest = {
  _id: string;
  domain: string;
  employeeId?: string;
  supportType: "hr" | "eap" | "crisis" | "other";
  message?: string;
  contact?: { name?: string; email?: string; phone?: string };
  status: Status;
  routedTo?: number;
  submittedAt: string;
};

const statusLabel: Record<Status, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-GB");
}

export default function AdminSupportRequestsPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SupportRequest[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [applied, setApplied] = useState({ employee: "", status: "" });
  const [busyId, setBusyId] = useState("");

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

  const loadRequests = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ domain, limit: "200" });
      if (applied.employee) params.set("employeeId", applied.employee);
      if (applied.status) params.set("status", applied.status);
      const response = await fetch(`${API_BASE}/support-request?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(list.filter((item: SupportRequest) =>
        String(item?.domain || "").toLowerCase() === domain.toLowerCase()
      ));
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Failed to load support requests.");
    } finally {
      setLoading(false);
    }
  }, [domain, applied]);

  useEffect(() => {
    if (domain) void loadRequests();
  }, [domain, loadRequests]);

  async function setRequestStatus(id: string, status: Status) {
    if (!id || !domain) return;
    setBusyId(id);
    try {
      const response = await fetch(`${API_BASE}/support-request/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, status }),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadRequests();
    } catch (cause: unknown) {
      alert(cause instanceof Error ? cause.message : "Failed to update request status.");
    } finally {
      setBusyId("");
    }
  }

  const counts = useMemo(() => ({
    total: items.length,
    new: items.filter((item) => item.status === "new").length,
    inProgress: items.filter((item) => item.status === "in_progress").length,
    resolved: items.filter((item) => item.status === "resolved").length,
  }), [items]);

  if (loading && !domain) {
    return <div className="rounded-3xl border border-[#e9e5d7] bg-white p-8 text-[#52645a]">Loading support requests…</div>;
  }

  return (
    <main className="space-y-6 bg-[#f7f8f5] pb-8 text-[#263b32]">
      <section className="overflow-hidden rounded-3xl bg-[#1f4d3d] px-6 py-8 text-white shadow-sm sm:px-8">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#e9e5d7]">Requested support</span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">Support Requests</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e9e5d7]">Review requests where an employee has chosen to ask for contact, and track follow-up.</p>
        {domain && <p className="mt-3 text-xs text-[#d7e2d6]">Domain: {domain}</p>}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Shown", value: counts.total },
          { label: "New", value: counts.new },
          { label: "In progress", value: counts.inProgress },
          { label: "Resolved", value: counts.resolved },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#e9e5d7] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[#66766d]">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[#1f4d3d]">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-[#e9e5d7] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-[#1f4d3d]">Find a request</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="employee-filter" className="mb-2 block text-sm font-medium text-[#52645a]">Employee ID</label>
            <input id="employee-filter" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} placeholder="Filter by employee" className="w-full rounded-xl border border-[#d8dfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f4d3d]" />
          </div>
          <div>
            <label htmlFor="status-filter" className="mb-2 block text-sm font-medium text-[#52645a]">Status</label>
            <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-xl border border-[#d8dfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f4d3d]">
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <button type="button" disabled={loading || !domain} onClick={() => { const next = { employee: employeeFilter.trim(), status: statusFilter }; if (next.employee === applied.employee && next.status === applied.status) void loadRequests(); else setApplied(next); }} className="rounded-xl bg-[#1f4d3d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#173e30] disabled:opacity-60">{loading ? "Loading…" : "Apply / refresh"}</button>
        </div>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-[#f2d7d4] bg-white p-5 text-sm text-red-700">{error}</div>}

      <section className="rounded-3xl border border-[#e9e5d7] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#1f4d3d]">Requests</h2>
            <p className="mt-1 text-sm text-[#66766d]">Contact details are shown here for employees who requested support.</p>
          </div>
          <span className="rounded-full bg-[#e8f1e9] px-3 py-1 text-xs font-semibold text-[#1f4d3d]">{items.length} shown</span>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-[#66766d]">Loading requests…</p>
        ) : error ? null : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8dfd5] bg-[#f8faf7] px-6 py-12 text-center">
            <p className="font-semibold text-[#1f4d3d]">No requests found</p>
            <p className="mt-2 text-sm text-[#66766d]">Try another filter or refresh the list.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item._id} className="rounded-2xl border border-[#e9e5d7] bg-[#fcfdfb] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-all font-semibold text-[#1f4d3d]">{item.contact?.name || item.employeeId || "Employee requesting support"}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "resolved" ? "bg-[#e4f2e5] text-[#236044]" : item.status === "in_progress" ? "bg-[#fff1d7] text-[#81571e]" : "bg-[#edf0eb] text-[#52645a]"}`}>{statusLabel[item.status] || "New"}</span>
                    </div>
                    <p className="mt-2 text-xs text-[#748077]">Received {dateLabel(item.submittedAt)}</p>
                  </div>
                  {item.routedTo != null && <span className="text-xs text-[#66766d]">Routed to {item.routedTo} {item.routedTo === 1 ? "recipient" : "recipients"}</span>}
                </div>

                <div className="mt-5 rounded-xl border border-[#e9e5d7] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#66766d]">Message</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#263b32]">{item.message?.trim() || "No message provided."}</p>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <ContactDetail label="Name" value={item.contact?.name} />
                  <ContactDetail label="Email" value={item.contact?.email} href={item.contact?.email ? `mailto:${item.contact.email}` : undefined} />
                  <ContactDetail label="Phone" value={item.contact?.phone} href={item.contact?.phone ? `tel:${item.contact.phone}` : undefined} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e9e5d7] pt-4">
                  {(["new", "in_progress", "resolved"] as Status[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busyId === item._id || item.status === status}
                      onClick={() => void setRequestStatus(item._id, status)}
                      className="rounded-xl border border-[#cbd9cd] bg-white px-4 py-2 text-xs font-semibold text-[#1f4d3d] hover:bg-[#eef4ee] disabled:cursor-not-allowed disabled:opacity-45"
                    >Mark {statusLabel[status]}</button>
                  ))}
                  {busyId === item._id && <span className="self-center text-xs text-[#66766d]">Updating…</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ContactDetail({ label, value, href }: { label: string; value?: string; href?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#f4f6f1] px-4 py-3">
      <p className="text-xs font-medium text-[#66766d]">{label}</p>
      {href && value ? <a href={href} className="mt-1 block break-all font-semibold text-[#1f4d3d] underline-offset-2 hover:underline">{value}</a> : <p className="mt-1 break-all font-semibold text-[#263b32]">{value || "Not provided"}</p>}
    </div>
  );
}
