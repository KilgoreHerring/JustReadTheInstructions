"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Scale,
  BookOpen,
  BookType,
  Telescope,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/regulations", label: "Regulations", icon: Scale },
  { href: "/obligations", label: "Obligations", icon: BookOpen },
  { href: "/readability", label: "Readability", icon: BookType },
  { href: "/horizon", label: "Horizon Scanning", icon: Telescope },
];

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

const STORAGE_KEY = "sidebar-collapsed";

export function SidebarNav({ user }: { user?: SidebarUser }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`shrink-0 border-r border-[var(--border)] bg-[var(--muted)] h-full overflow-y-auto flex flex-col transition-[width] duration-200 ${
        collapsed ? "w-[52px]" : "w-60"
      }`}
      style={{ opacity: mounted ? 1 : 0 }}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center ${collapsed ? "justify-center px-2 py-5" : "justify-between px-5 py-5"}`}>
        {!collapsed && (
          <a
            href="/"
            className="font-heading text-lg font-semibold text-[var(--accent)] tracking-tight"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Tractable
          </a>
        )}
        <button
          onClick={toggleCollapsed}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 rounded hover:bg-[var(--background)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
        </button>
      </div>

      <nav className={`flex flex-col gap-0.5 ${collapsed ? "px-1.5" : "px-3"} mt-2`}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <a
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`
                relative flex items-center ${collapsed ? "justify-center" : ""} gap-3 ${collapsed ? "px-2" : "px-3"} py-2 rounded-md text-sm
                transition-colors duration-150
                ${
                  active
                    ? "text-[var(--accent)] bg-[var(--accent-light)] font-medium"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--accent)] rounded-r" />
              )}
              <Icon size={16} strokeWidth={1.5} className="shrink-0" />
              {!collapsed && label}
            </a>
          );
        })}
      </nav>

      {/* User info + sign out */}
      {user && (
        <div className={`mt-auto ${collapsed ? "px-1.5" : "px-3"} py-4 border-t border-[var(--border)]`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5 px-3 py-1.5 mb-1">
                {user.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="w-6 h-6 rounded-full shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center text-[10px] font-medium shrink-0">
                    {(user.name || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  {user.name && (
                    <p className="text-xs font-medium text-[var(--foreground)] truncate">
                      {user.name}
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <a
                href="/api/auth/signout"
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-md transition-colors"
              >
                <LogOut size={12} />
                Sign out
              </a>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="w-6 h-6 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex items-center justify-center text-[10px] font-medium">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <a
                href="/api/auth/signout"
                title="Sign out"
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 rounded hover:bg-[var(--background)]"
              >
                <LogOut size={12} />
              </a>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
