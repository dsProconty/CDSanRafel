import { eq, count } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, catalogoReferenciasBancarias } from "@/db/schema";
import { OrchidMark } from "@/components/orchid-mark";
import { LogoutButton } from "./logout-button";

export default async function HomePage() {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <OrchidMark className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-display text-lg leading-tight font-medium text-foreground">
                Orquídeas San Rafael
              </h1>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {user.rol === "admin" ? "Administrador" : "Propietario"}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {user.rol === "admin" ? <ResumenAdmin /> : <ResumenCasa casaId={user.casaId} />}
      </main>
    </div>
  );
}

async function ResumenAdmin() {
  const [{ totalCasas }] = await db
    .select({ totalCasas: count() })
    .from(casas);
  const [{ totalReferencias }] = await db
    .select({ totalReferencias: count() })
    .from(catalogoReferenciasBancarias);

  return (
    <section className="animate-rise">
      <p className="text-xs font-medium tracking-[0.2em] text-secondary uppercase">
        Catálogo cargado
      </p>
      <h2 className="mt-2 font-display text-3xl font-medium text-foreground">
        Sprint 1 — casas y referencias
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Importado desde CASAS.xlsx. El estado de cuenta y la validación
        automática de pagos se habilitan en el Sprint 2.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
          <p className="font-display text-4xl font-medium text-primary">
            {totalCasas}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Casas</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
          <p className="font-display text-4xl font-medium text-primary">
            {totalReferencias}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Referencias bancarias
          </p>
        </div>
      </div>
    </section>
  );
}

async function ResumenCasa({ casaId }: { casaId: number | null }) {
  if (!casaId) {
    return <p className="text-sm text-muted-foreground">Sin casa asociada.</p>;
  }

  const [casa] = await db.select().from(casas).where(eq(casas.id, casaId)).limit(1);

  return (
    <section className="animate-rise">
      <p className="text-xs font-medium tracking-[0.2em] text-secondary uppercase">
        Bloque {casa.bloque}
      </p>
      <h2 className="mt-2 font-display text-4xl font-medium text-foreground">
        Casa {casa.numero}
      </h2>
      <div className="mt-8 max-w-md rounded-xl border border-border bg-card px-6 py-6 shadow-sm">
        <p className="text-sm leading-relaxed text-muted-foreground">
          El estado de cuenta y las expensas se habilitan en el Sprint 2.
        </p>
      </div>
    </section>
  );
}
