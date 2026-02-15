"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Scale,
  BookOpen,
  Telescope,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/regulations", label: "Regulations", icon: Scale },
  { href: "/obligations", label: "Obligations", icon: BookOpen },
  { href: "/horizon", label: "Horizon Scanning", icon: Telescope },
];

export function SidebarNav() {
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
    </aside>
  );
}
