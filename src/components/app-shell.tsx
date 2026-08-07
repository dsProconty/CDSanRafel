import {
  Building2,
  LayoutDashboard,
  ListChecks,
  Menu,
  Receipt,
  Upload,
} from "lucide-react";

import { auth } from "@/auth";
import { BrandMark } from "@/components/brand-mark";
import { SidebarNav, type SidebarNavItem } from "@/components/sidebar-nav";
import { LogoutButton } from "@/app/logout-button";

const ICON_CLASS = "h-4 w-4 shrink-0";

const NAV_ADMIN: SidebarNavItem[] = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard className={ICON_CLASS} /> },
  { href: "/casas", label: "Casas", icon: <Building2 className={ICON_CLASS} /> },
  {
    href: "/cargar",
    label: "Cargar estado de cuenta",
    icon: <Upload className={ICON_CLASS} />,
  },
  {
    href: "/pendientes",
    label: "Pendientes",
    icon: <ListChecks className={ICON_CLASS} />,
  },
  {
    href: "/deudas/masiva",
    label: "Deudas masivas",
    icon: <Receipt className={ICON_CLASS} />,
  },
];

const HOY = new Intl.DateTimeFormat("es-EC", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

export async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session!.user;
  const esAdmin = user.rol === "admin";
  const userLabel = user.email ?? (esAdmin ? "Administrador" : "Propietario");

  return (
    <div className="flex min-h-screen">
      {esAdmin && (
        <>
          <input
            type="checkbox"
            id="sidebar-toggle"
            className="peer hidden"
          />
          <label
            htmlFor="sidebar-toggle"
            className="fixed inset-0 z-30 hidden bg-black/50 peer-checked:block lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-60 -translate-x-full shrink-0 flex-col bg-sidebar transition-transform duration-200 peer-checked:translate-x-0 lg:static lg:translate-x-0">
            <div className="flex items-center gap-2.5 px-5 py-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <BrandMark className="h-5 w-5 text-primary-foreground" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-sm font-bold text-white">SGAI</span>
                <span className="text-xs text-sidebar-foreground/70">
                  Orquídeas San Rafael
                </span>
              </span>
            </div>
            <SidebarNav items={NAV_ADMIN} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            {esAdmin && (
              <label
                htmlFor="sidebar-toggle"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </label>
            )}
            {!esAdmin && (
              <>
                <BrandMark className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  SGAI Orquídeas
                </span>
              </>
            )}
            {esAdmin && (
              <p className="whitespace-nowrap text-sm font-medium text-foreground">
                SGAI{" "}
                <span className="hidden text-muted-foreground sm:inline">
                  · Orquídeas San Rafael
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {HOY}
            </p>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <p className="hidden text-sm text-muted-foreground md:block">
              {userLabel}
            </p>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
