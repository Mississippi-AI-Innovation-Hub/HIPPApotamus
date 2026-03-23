"use client";

import { useState } from "react";
import type { UserRole } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  userName: string;
  userRole: UserRole;
  userEmail: string;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
}

interface NavItem {
  label: string;
  tab: string;
  icon: string;
  roles: UserRole[];
}

// ─── Navigation Config ──────────────────────────────────────────────────────

const ADMIN_NAV: NavItem[] = [
  {
    label: "Dashboard",
    tab: "contracts",
    icon: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    roles: ["admin"],
  },
  {
    label: "Vendors",
    tab: "vendors",
    icon: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
    roles: ["admin"],
  },
  {
    label: "Contracts",
    tab: "contracts",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
    roles: ["admin"],
  },
  {
    label: "Reminders",
    tab: "reminders",
    icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
    roles: ["admin"],
  },
  {
    label: "Audit Packets",
    tab: "reminders",
    icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z",
    roles: ["admin"],
  },
];

const VENDOR_NAV: NavItem[] = [
  {
    label: "My Contracts",
    tab: "contracts",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
    roles: ["vendor"],
  },
  {
    label: "Request Changes",
    tab: "requests",
    icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
    roles: ["vendor"],
  },
  {
    label: "Contact Support",
    tab: "support",
    icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z",
    roles: ["vendor"],
  },
];

// ─── Sidebar Component ──────────────────────────────────────────────────────

export default function Sidebar({
  userName,
  userRole,
  userEmail,
  onNavigate,
  activeTab,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navItems = userRole === "admin" ? ADMIN_NAV : VENDOR_NAV;

  const handleNavClick = (item: NavItem) => {
    if (onNavigate) {
      onNavigate(item.tab);
    }
  };

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout";
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      style={{ backgroundColor: "#0F172A" }}
      className={`relative flex h-full flex-col border-r border-slate-700/50 transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Subtle gradient overlay at top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(15,118,110,0.12) 0%, transparent 70%)",
        }}
      />

      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex h-16 items-center border-b border-slate-700/50 px-4">
        <div className="flex items-center gap-3">
          {/* Shield icon */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
            }}
          >
            <svg
              className="h-5 w-5"
              style={{ color: "#F8FAFC" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1
                className="flex items-center gap-1.5 truncate text-lg font-bold"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  color: "#F8FAFC",
                }}
              >
                <span
                  style={{ color: "#14B8A6", fontSize: "14px" }}
                  aria-hidden="true"
                >
                  &#10022;
                </span>
                HIPAApotamus
              </h1>
              <div className="flex items-center gap-2">
                <p
                  className="truncate text-[11px] font-medium uppercase tracking-wider"
                  style={{
                    color: "rgba(148,163,184,0.6)",
                  }}
                >
                  BAA Management
                </p>
                <span
                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: "rgba(20,184,166,0.15)",
                    color: "#14B8A6",
                    letterSpacing: "0.05em",
                  }}
                >
                  v2.0
                </span>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded p-2 transition-colors"
          style={{ color: "rgba(148,163,184,0.6)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#F8FAFC";
            e.currentTarget.style.backgroundColor = "rgba(148,163,184,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(148,163,184,0.6)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
              collapsed ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p
            className="mb-3 px-3 font-semibold uppercase"
            style={{
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: "rgba(148,163,184,0.5)",
              fontFamily: "'Satoshi', sans-serif",
            }}
          >
            {userRole === "admin" ? "Administration" : "Vendor Portal"}
          </p>
        )}
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.tab &&
              // For admin, "Dashboard" is active only when tab is "contracts"
              // and "Contracts" item also maps to "contracts", so we disambiguate:
              // Dashboard is "active" only if it's the first item with tab "contracts"
              (item.label === "Dashboard"
                ? activeTab === "contracts"
                : item.tab !== "contracts" || item.label !== "Dashboard");

            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => handleNavClick(item)}
                  className={`group relative flex w-full items-center gap-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    collapsed ? "justify-center rounded px-2" : "rounded-lg px-3"
                  }`}
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    color: isActive ? "#F8FAFC" : "rgba(148,163,184,0.8)",
                    backgroundColor: isActive
                      ? "rgba(15,118,110,0.15)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#F8FAFC";
                      e.currentTarget.style.backgroundColor =
                        "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "rgba(148,163,184,0.8)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active indicator — left border accent */}
                  {isActive && !collapsed && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                      style={{
                        width: "3px",
                        height: "20px",
                        background:
                          "linear-gradient(180deg, #14B8A6 0%, #0F766E 100%)",
                        borderRadius: "0 2px 2px 0",
                      }}
                    />
                  )}
                  <svg
                    className="h-5 w-5 shrink-0 transition-colors"
                    style={{
                      color: isActive ? "#14B8A6" : "rgba(148,163,184,0.6)",
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={item.icon}
                    />
                  </svg>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User Footer ────────────────────────────────────────────────── */}
      <div
        className="relative z-10 border-t px-3 py-3"
        style={{ borderColor: "rgba(148,163,184,0.15)" }}
      >
        <div
          className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {/* Avatar with gradient initials */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
              color: "#FFFFFF",
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[13px] font-medium"
                style={{
                  color: "#F8FAFC",
                  fontFamily: "'Satoshi', sans-serif",
                }}
              >
                {userName}
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block rounded px-1.5 py-0.5 font-bold uppercase"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.05em",
                    borderRadius: "4px",
                    backgroundColor:
                      userRole === "admin"
                        ? "rgba(15,118,110,0.25)"
                        : "rgba(29,78,216,0.25)",
                    color: userRole === "admin" ? "#14B8A6" : "#60A5FA",
                  }}
                >
                  {userRole}
                </span>
                <span
                  className="truncate"
                  style={{
                    fontSize: "11px",
                    color: "rgba(148,163,184,0.6)",
                  }}
                >
                  {userEmail}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sign out — ghost with red hover */}
        <button
          type="button"
          onClick={handleSignOut}
          className={`mt-1 flex w-full items-center gap-3 rounded-lg py-2.5 text-[13px] font-medium transition-all duration-150 ${
            collapsed ? "justify-center px-2" : "px-3"
          }`}
          style={{
            color: "rgba(148,163,184,0.5)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FCA5A5";
            e.currentTarget.style.backgroundColor = "rgba(185,28,28,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(148,163,184,0.5)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title={collapsed ? "Sign Out" : undefined}
        >
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
