"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-foreground-active"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground-active"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
