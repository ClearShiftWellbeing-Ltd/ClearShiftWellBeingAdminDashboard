"use client";

import React, { useCallback, useEffect, useState } from "react";

type Employee = {
  _id: string;
  domain: string;
  name: string;
  email: string;
  role: "employee" | "admin";
  emailVerified: boolean;
  createdAt: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE || "";

export default function AdminUsersPage() {
  const [domain, setDomain] = useState("");
  const [items, setItems] = useState<Employee[]>([]);
  const [seatLimit, setSeatLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"employee" | "admin">("employee");
  const [editVerified, setEditVerified] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setErr("Session expired");
          setLoading(false);
          return;
        }
        setDomain(data.admin.domain);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load session");
        setLoading(false);
      }
    })();
  }, []);

  const reload = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/company/users?domain=${encodeURIComponent(domain)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items || []);
      setErr(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => { if (domain) void reload(); }, [domain, reload]);

  useEffect(() => {
    (async () => {
      if (!domain) return;
      try {
        const res = await fetch(`${API}/admins?domain=${encodeURIComponent(domain)}&limit=1`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const admin = Array.isArray(data) ? data[0] : data?.items?.[0];
        setSeatLimit(typeof admin?.seatLimit === "number" ? admin.seatLimit : null);
      } catch {
        setSeatLimit(null);
      }
    })();
  }, [domain]);

  async function createUser() {
    if (!email) return;
    if (typeof seatLimit === "number" && items.length >= seatLimit) {
      alert(`Seat limit reached (${items.length}/${seatLimit}).`);
      return;
    }
    try {
      const res = await fetch(`${API}/company/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, name, email }),
      });
      if (!res.ok) throw new Error(await res.text());
      setName("");
      setEmail("");
      await reload();
      alert("Invitation sent");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Create failed");
    }
  }

  function openEdit(u: Employee) {
    setEditing(u);
    setEditName(u.name || "");
    setEditRole(u.role);
    setEditVerified(!!u.emailVerified);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const res = await fetch(`${API}/company/users/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          name: editName,
          role: editRole,
          emailVerified: editVerified,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditing(null);
      await reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`${API}/company/users/${id}?domain=${encodeURIComponent(domain)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
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
                    <p className="text-xs text-emerald-100/75">Access management</p>
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Users</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                  Invite employees and manage their access to the app.
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold">
                Seats: {items.length}/{typeof seatLimit === "number" ? seatLimit : "Unlimited"}
              </div>
            </div>
          </div>
        </header>

        {err && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {err}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#38745f]">Organisation</p>
            <h2 className="mt-1 break-all text-xl font-bold">{domain || "Loading…"}</h2>
          </div>
          <button type="button" onClick={() => void reload()} disabled={!domain || loading}
            className="rounded-xl border border-[#d8e5df] bg-white px-4 py-2.5 text-sm font-semibold text-[#285444] hover:bg-[#eef5f1] disabled:opacity-50">
            {loading ? "Refreshing…" : "Refresh users"}
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38745f]">Employee access</p>
          <h2 className="mt-1 text-xl font-bold">Invite a user</h2>
          <p className="mt-2 text-sm text-slate-500">An email address is needed to send an invitation.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="invite-name" className="block text-sm font-semibold text-slate-700">Name (optional)</label>
              <input id="invite-name" value={name} onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-[#fbfcfa] px-4 py-3 text-sm outline-none focus:border-[#38745f] focus:ring-2 focus:ring-[#38745f]/15" />
            </div>
            <div>
              <label htmlFor="invite-email" className="block text-sm font-semibold text-slate-700">Email</label>
              <input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@company.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-[#fbfcfa] px-4 py-3 text-sm outline-none focus:border-[#38745f] focus:ring-2 focus:ring-[#38745f]/15" />
            </div>
          </div>
          <button type="button" onClick={() => void createUser()}
            disabled={!domain || !email.trim() || (typeof seatLimit === "number" && items.length >= seatLimit)}
            className="mt-5 rounded-xl bg-[#1f4d3d] px-5 py-3 text-sm font-bold text-white hover:bg-[#173c30] disabled:cursor-not-allowed disabled:opacity-50">
            Invite user
          </button>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38745f]">Directory</p>
            <h2 className="mt-1 text-xl font-bold">All users</h2>
            <p className="mt-2 text-sm text-slate-500">Emails here identify people for invitations and access management. Check-in answers are handled separately.</p>
          </div>
          {loading ? (
            <p role="status" className="p-7 text-sm text-slate-500">Loading users…</p>
          ) : items.length === 0 ? (
            <p className="p-7 text-sm text-slate-500">No users yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((u) => (
                <li key={u._id} className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef5f1] text-sm font-bold text-[#285444]" aria-hidden="true">
                      {(u.name || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{u.name || "(no name)"}</p>
                        <span className="rounded-full bg-[#eef5f1] px-2.5 py-1 text-xs font-bold capitalize text-[#285444]">{u.role}</span>
                      </div>
                      <p className="mt-1 break-all text-sm text-slate-600">{u.email}</p>
                      <p className="mt-1 text-xs text-slate-500">{u.emailVerified ? "Verified" : "Unverified"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openEdit(u)}
                      className="rounded-lg border border-[#d8e5df] px-3 py-2 text-sm font-semibold text-[#285444] hover:bg-[#eef5f1]">Edit</button>
                    <button type="button" onClick={() => void removeUser(u._id)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="edit-user-heading"
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38745f]">Access management</p>
              <h3 id="edit-user-heading" className="mt-1 text-xl font-bold">Edit user</h3>
              <p className="mt-1 break-all text-sm text-slate-500">{editing.email}</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-semibold text-slate-700">Name</label>
                  <input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-[#fbfcfa] px-4 py-3 text-sm outline-none focus:border-[#38745f]" />
                </div>
                <div>
                  <label htmlFor="edit-role" className="block text-sm font-semibold text-slate-700">Role</label>
                  <select id="edit-role" value={editRole} onChange={(e) => setEditRole(e.target.value as "employee" | "admin")}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-[#fbfcfa] px-4 py-3 text-sm outline-none focus:border-[#38745f]">
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 rounded-xl bg-[#f8faf7] p-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={editVerified} onChange={(e) => setEditVerified(e.target.checked)}
                    className="h-4 w-4 accent-[#1f4d3d]" />
                  Email verified
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setEditing(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="button" onClick={() => void saveEdit()}
                  className="rounded-xl bg-[#1f4d3d] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#173c30]">Save changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
