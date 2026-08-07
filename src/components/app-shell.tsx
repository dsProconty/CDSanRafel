import { auth } from "@/auth";
import { BrandMark } from "@/components/brand-mark";
import { SidebarNav } from "@/components/sidebar-nav";
import { LogoutButton } from "@/app/logout-button";

const NAV_ADMIN = [
  { href: "/", label: "Dashboard" },
  { href: "/casas", label: "Casas" },
  { href: "/cargar", label: "Cargar estado de cuenta" },
  { href: "/pendientes", label: "Pendientes" },
  { href: "/deudas/masiva", label: "Deudas masivas" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;
  const esAdmin = user.rol === "admin";
  const userLabel = user.email ?? (esAdmin ? "Administrador" : "Propietario");

  return (
    <div className="flex min-h-screen">
      {esAdmin && (
        <aside className="flex w-60 shrink-0 flex-col bg-sidebar">
          <div className="flex items-center gap-2 px-5 py-5">
            <BrandMark className="h-8 w-8 text-primary" />
            <span className="text-sm font-semibold text-white">
              SGAI Orquídeas
            </span>
          </div>
          <SidebarNav items={NAV_ADMIN} />
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <div className="flex items-center gap-2">
            {!esAdmin && (
              <>
                <BrandMark className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  SGAI Orquídeas
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">{userLabel}</p>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
