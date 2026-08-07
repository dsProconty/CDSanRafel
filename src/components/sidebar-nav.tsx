"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export type SidebarNavChild = {
  href: string;
  label: string;
};

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  children?: SidebarNavChild[];
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-sidebar-foreground/50">
        PRINCIPAL
      </p>
      {items.map((item) =>
        item.children ? (
          <NavGroup key={item.label} item={item} pathname={pathname} />
        ) : (
          <NavLink
            key={item.href}
            href={item.href}
            active={isActive(pathname, item.href)}
          >
            {item.icon}
            {item.label}
          </NavLink>
        )
      )}
    </nav>
  );
}

function NavGroup({
  item,
  pathname,
}: {
  item: SidebarNavItem;
  pathname: string;
}) {
  const childActivo = item.children?.some((c) => isActive(pathname, c.href)) ?? false;
  const [abierto, setAbierto] = useState(childActivo);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          childActivo
            ? "text-sidebar-foreground-active"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground-active"
        }`}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>
      {abierto && (
        <div className="ml-4 flex flex-col gap-0.5 border-l border-sidebar-accent pl-3">
          {item.children!.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              active={isActive(pathname, child.href)}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-foreground-active"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground-active"
      }`}
    >
      {children}
    </Link>
  );
}
