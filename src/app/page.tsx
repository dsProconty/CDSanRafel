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
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  const user = session!.user;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
        {user.rol === "admin" ? <ResumenAdmin /> : <ResumenCasa casaId={user.casaId} />}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
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
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El Excel del banco se cruza automáticamente contra el catálogo
            de casas.
          </p>
        </div>
        <Button asChild>
          <Link href="/cargar">Cargar estado de cuenta</Link>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Casas" value={totalCasas} />
        <StatCard label="Referencias bancarias" value={totalReferencias} />
        <StatCard label="Abonos automáticos" value={matched} />
        <Link href="/pendientes">
          <StatCard label="Pendientes de revisión" value={pendienteRevision} />
        </Link>
        <Link href="/pendientes">
          <StatCard label="Sin catalogar" value={sinCatalogar} />
        </Link>
      </div>
    </div>
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
    <div>
      <p className="text-sm text-muted-foreground">Bloque {casa.bloque}</p>
      <h1 className="mt-1 text-2xl font-semibold text-foreground">
        Casa {casa.numero}
      </h1>
      <div className="mt-6 max-w-md rounded-lg border border-border bg-card px-6 py-6">
        <p
          className={`text-3xl font-semibold ${alDia ? "text-success" : "text-destructive"}`}
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
    </div>
  );
}
