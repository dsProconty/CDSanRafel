import Link from "next/link";
import { eq, count, sum } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  casas,
  catalogoReferenciasBancarias,
  deudas,
  movimientosBancarios,
} from "@/db/schema";
import { OrchidMark } from "@/components/orchid-mark";
import { Button } from "@/components/ui/button";
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
  const porEstado = await db
    .select({ estado: movimientosBancarios.estado, total: count() })
    .from(movimientosBancarios)
    .groupBy(movimientosBancarios.estado);

  const totalesPorEstado = Object.fromEntries(
    porEstado.map((fila) => [fila.estado, fila.total])
  );
  const matched = totalesPorEstado.matched ?? 0;
  const pendienteRevision = totalesPorEstado.pendiente_revision ?? 0;
  const sinCatalogar = totalesPorEstado.sin_catalogar ?? 0;

  return (
    <section className="animate-rise">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-secondary uppercase">
            Catálogo cargado
          </p>
          <h2 className="mt-2 font-display text-3xl font-medium text-foreground">
            Casas y movimientos
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            El Excel del banco se cruza automáticamente contra el catálogo
            de casas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/casas">Casas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/deudas/masiva">Crear deuda masiva</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pendientes">Revisar pendientes</Link>
          </Button>
          <Button asChild>
            <Link href="/cargar">Cargar estado de cuenta</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:max-w-2xl sm:grid-cols-3">
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
        <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
          <p className="font-display text-4xl font-medium text-primary">
            {matched}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Abonos automáticos
          </p>
        </div>
        <Link
          href="/pendientes"
          className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm transition-colors hover:bg-accent"
        >
          <p className="font-display text-4xl font-medium text-foreground">
            {pendienteRevision}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pendientes de revisión
          </p>
        </Link>
        <Link
          href="/pendientes"
          className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm transition-colors hover:bg-accent"
        >
          <p className="font-display text-4xl font-medium text-foreground">
            {sinCatalogar}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Sin catalogar</p>
        </Link>
      </div>
    </section>
  );
}

async function ResumenCasa({ casaId }: { casaId: number | null }) {
  if (!casaId) {
    return <p className="text-sm text-muted-foreground">Sin casa asociada.</p>;
  }

  const [casa] = await db.select().from(casas).where(eq(casas.id, casaId)).limit(1);
  const [{ totalAbonado }] = await db
    .select({ totalAbonado: sum(movimientosBancarios.monto) })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.casaId, casaId));
  const [{ totalDeudas }] = await db
    .select({ totalDeudas: sum(deudas.monto) })
    .from(deudas)
    .where(eq(deudas.casaId, casaId));

  const abonado = Number(totalAbonado ?? 0);
  const deuda = Number(totalDeudas ?? 0);
  const saldo = deuda - abonado;
  const alDia = saldo <= 0;

  return (
    <section className="animate-rise">
      <p className="text-xs font-medium tracking-[0.2em] text-secondary uppercase">
        Bloque {casa.bloque}
      </p>
      <h2 className="mt-2 font-display text-4xl font-medium text-foreground">
        Casa {casa.numero}
      </h2>
      <div className="mt-8 max-w-md rounded-xl border border-border bg-card px-6 py-6 shadow-sm">
        <p
          className={`font-display text-3xl font-medium ${alDia ? "text-secondary" : "text-destructive"}`}
        >
          {alDia
            ? `$${Math.abs(saldo).toFixed(2)} a favor`
            : `$${saldo.toFixed(2)} pendiente`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {alDia ? "Estás al día" : "Saldo pendiente de pago"}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Deudas</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              ${deuda.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Abonado</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              ${abonado.toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
