import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  casas,
  movimientoCandidatosCasa,
  movimientosBancarios,
} from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { BotonCandidato } from "./boton-candidato";
import { FormAsignarManual } from "./form-asignar-manual";

export default async function PendientesPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const pendientes = await db
    .select()
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.estado, "pendiente_revision"))
    .orderBy(desc(movimientosBancarios.fechaTransaccion));

  const candidatosRaw = pendientes.length
    ? await db
        .select({
          movimientoId: movimientoCandidatosCasa.movimientoId,
          casaId: casas.id,
          numero: casas.numero,
        })
        .from(movimientoCandidatosCasa)
        .innerJoin(casas, eq(casas.id, movimientoCandidatosCasa.casaId))
        .where(
          inArray(
            movimientoCandidatosCasa.movimientoId,
            pendientes.map((p) => p.id)
          )
        )
    : [];

  const candidatosPorMovimiento = new Map<
    number,
    { casaId: number; numero: string }[]
  >();
  for (const c of candidatosRaw) {
    const lista = candidatosPorMovimiento.get(c.movimientoId) ?? [];
    lista.push({ casaId: c.casaId, numero: c.numero });
    candidatosPorMovimiento.set(c.movimientoId, lista);
  }

  const sinCatalogar = await db
    .select()
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.estado, "sin_catalogar"))
    .orderBy(desc(movimientosBancarios.fechaTransaccion));

  const todasLasCasas = await db
    .select({ numero: casas.numero })
    .from(casas)
    .orderBy(casas.numero);

  return (
    <AppShell>
      <datalist id="casas-datalist">
        {todasLasCasas.map((c) => (
          <option key={c.numero} value={c.numero} />
        ))}
      </datalist>

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
        <h1 className="text-xl font-semibold text-foreground">
          Pendientes de revisión
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted-foreground">
          Pagos que no se pudieron abonar automáticamente. Asignar aquí
          actualiza el estado de cuenta al instante.
        </p>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-foreground">
            Varias casas coinciden ({pendientes.length})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La misma referencia bancaria está catalogada para más de una
            casa. Elige a cuál corresponde este pago.
          </p>

          {pendientes.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sin pendientes.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {pendientes.map((mov) => (
                <li
                  key={mov.id}
                  className="rounded-lg border border-border bg-card px-5 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold text-foreground">
                      ${Number(mov.monto).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mov.fechaTransaccion} · doc. {mov.documento}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mov.referenciaCruda}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(candidatosPorMovimiento.get(mov.id) ?? []).map((c) => (
                      <BotonCandidato
                        key={c.casaId}
                        movimientoId={mov.id}
                        casaId={c.casaId}
                        numero={c.numero}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            Sin catalogar ({sinCatalogar.length})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La referencia no está en el catálogo. Asignar una casa la
            aprende para las próximas cargas.
          </p>

          {sinCatalogar.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sin pendientes.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {sinCatalogar.map((mov) => (
                <li
                  key={mov.id}
                  className="rounded-lg border border-border bg-card px-5 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold text-foreground">
                      ${Number(mov.monto).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mov.fechaTransaccion} · doc. {mov.documento}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mov.referenciaCruda}
                  </p>
                  <div className="mt-3">
                    <FormAsignarManual movimientoId={mov.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
