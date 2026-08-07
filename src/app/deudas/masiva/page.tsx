import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { obtenerConceptos } from "../conceptos/actions";
import { obtenerRecurrentes } from "../recurrentes/actions";
import { SelectorModoDeuda } from "./selector-modo";
import { HistorialDeudasMasivas, type FilaLote } from "./historial-deudas-masivas";
import { obtenerLotesDeudaMasiva } from "./actions";

export default async function DeudaMasivaPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const todosLosConceptos = await obtenerConceptos();
  const conceptosActivos = todosLosConceptos.filter((c) => c.activo);

  const listaCasas = await db
    .select({ id: casas.id, numero: casas.numero, bloque: casas.bloque })
    .from(casas)
    .orderBy(asc(casas.numero));

  const [lotes, recurrentes] = await Promise.all([
    obtenerLotesDeudaMasiva(),
    obtenerRecurrentes(),
  ]);

  const formatoFecha = new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const filasHistorial: FilaLote[] = lotes.map((l) => ({
    id: l.id,
    fecha: formatoFecha.format(new Date(`${l.fecha}T00:00:00`)),
    fechaCreacion: formatoFecha.format(l.createdAt),
    concepto: l.conceptoNombre ?? l.tipoNombre,
    monto: l.monto,
    descripcion: l.descripcion,
    casasTotal: l.casasTotal,
    casasAfectadas: l.casasAfectadas,
    usuarioEmail: l.usuarioEmail,
    anulada: l.anuladoEn !== null,
    automatica: l.recurrenteId !== null,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Crear deuda para todas las casas
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Aplicala una sola vez, o programala para que se repita sola
                mes a mes (alícuota) o en cuotas (cuota extraordinaria).
              </p>
            </div>
            <Link
              href="/deudas/conceptos"
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Gestionar catálogo de conceptos
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <SelectorModoDeuda
            conceptos={conceptosActivos}
            casas={listaCasas}
            recurrentes={recurrentes}
          />
        </div>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            Historial de deudas masivas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Corridas anteriores (manuales y automáticas): quién las creó,
            cuántas casas afectaron y si fueron anuladas.
          </p>
          <HistorialDeudasMasivas filas={filasHistorial} />
        </section>
      </div>
    </AppShell>
  );
}
