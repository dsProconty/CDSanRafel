"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-sidebar-foreground/50">
        PRINCIPAL
      </p>
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-foreground-active"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground-active"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
