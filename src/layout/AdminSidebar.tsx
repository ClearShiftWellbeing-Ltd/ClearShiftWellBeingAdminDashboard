"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  ListIcon,
  UserCircleIcon,
  DocsIcon,
  BoxCubeIcon,
  ChatIcon,
} from "../icons/index";

type MenuItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

const menuItems: MenuItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <ListIcon /> },
  { label: "Questions", href: "/admin/questions", icon: <UserCircleIcon /> },
  { label: "Users", href: "/admin/users", icon: <UserCircleIcon /> },
  { label: "Privacy policies", href: "/admin/privacy-policies", icon: <DocsIcon /> },
  { label: "Resources", href: "/admin/resources", icon: <BoxCubeIcon /> },
  { label: "Check-in summary", href: "/admin/checkin-responses", icon: <ListIcon /> },
  { label: "Support requests", href: "/admin/support-requests", icon: <ChatIcon /> },
];

export default function AdminSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const showLabels = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      aria-label="Admin navigation"
      className={`fixed left-0 top-0 z-50 mt-16 flex h-[calc(100vh-4rem)] flex-col border-r border-[#e4e8df] bg-[#f7f8f5] text-[#263b32] shadow-sm transition-all duration-300 ease-in-out lg:mt-0 lg:h-screen
        ${showLabels ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => { if (!isExpanded) setIsHovered(true); }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`border-b border-[#e4e8df] px-4 py-7 ${showLabels ? "" : "text-center"}`}>
        {showLabels ? (
          <Link href="/admin/dashboard" onClick={() => { if (isMobileOpen) toggleMobileSidebar(); }} className="block rounded-xl px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1f4d3d]">
            <span className="block text-xl font-bold tracking-tight text-[#1f4d3d]">ClearShift<span className="text-[#5d8a69]">Wellbeing</span></span>
            <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#66766d]">Organisation admin</span>
          </Link>
        ) : (
          <Link href="/admin/dashboard" aria-label="ClearShiftWellbeing dashboard" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1f4d3d] text-sm font-bold text-white">CS</Link>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-6" aria-label="Main menu">
        {showLabels && <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#748077]">Menu</p>}
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={!showLabels ? item.label : undefined}
                  aria-label={!showLabels ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={() => { if (isMobileOpen) toggleMobileSidebar(); }}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1f4d3d]
                    ${showLabels ? "justify-start" : "justify-center"}
                    ${active
                      ? "bg-[#1f4d3d] font-semibold text-white shadow-sm"
                      : "text-[#52645a] hover:bg-[#e8f1e9] hover:text-[#1f4d3d]"}`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">{item.icon}</span>
                  {showLabels && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {showLabels && (
        <div className="border-t border-[#e4e8df] px-6 py-5">
          <p className="text-xs leading-5 text-[#66766d]">Employee check-ins are grouped for employer reporting. Contact details belong in support requests.</p>
        </div>
      )}
    </aside>
  );
}
