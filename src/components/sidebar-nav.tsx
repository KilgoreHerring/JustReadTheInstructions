"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Scale,
  BookOpen,
  BookType,
  Telescope,
  LogOut,
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

export function SidebarNav({ user }: { user?: SidebarUser }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--muted)] h-full overflow-y-auto flex flex-col">
      <a
        href="/"
        className="font-heading text-lg font-semibold px-5 py-5 text-[var(--accent)] tracking-tight"
        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
      >
        Tractable
      </a>
      <nav className="flex flex-col gap-0.5 px-3 mt-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <a
              key={href}
              href={href}
              className={`
                relative flex items-center gap-3 px-3 py-2 rounded-md text-sm
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
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </a>
          );
        })}
      </nav>

      {/* User info + sign out */}
      {user && (
        <div className="mt-auto px-3 py-4 border-t border-[var(--border)]">
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
        </div>
      )}
    </aside>
  );
}
