import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, tiposExpensa } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { FormDeudaMasiva } from "./form-deuda-masiva";
import { HistorialDeudasMasivas, type FilaLote } from "./historial-deudas-masivas";
import { obtenerLotesDeudaMasiva } from "./actions";

export default async function DeudaMasivaPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const tipos = await db
    .select()
    .from(tiposExpensa)
    .orderBy(asc(tiposExpensa.nombre));

  const listaCasas = await db
    .select({ id: casas.id, numero: casas.numero, bloque: casas.bloque })
    .from(casas)
    .orderBy(asc(casas.numero));

  const lotes = await obtenerLotesDeudaMasiva();

  const formatoFecha = new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const filasHistorial: FilaLote[] = lotes.map((l) => ({
    id: l.id,
    fecha: formatoFecha.format(new Date(`${l.fecha}T00:00:00`)),
    fechaCreacion: formatoFecha.format(l.createdAt),
    tipoNombre: l.tipoNombre,
    monto: l.monto,
    descripcion: l.descripcion,
    casasTotal: l.casasTotal,
    casasAfectadas: l.casasAfectadas,
    usuarioEmail: l.usuarioEmail,
    anulada: l.anuladoEn !== null,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Crear deuda para todas las casas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Se crea una deuda igual para todas las casas del catálogo. Úsalo
            para la alícuota mensual o para cuotas extraordinarias. Podés
            excluir casas puntuales antes de aplicarla.
          </p>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
          <FormDeudaMasiva tipos={tipos} casas={listaCasas} />
        </div>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            Historial de deudas masivas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Corridas anteriores: quién las creó, cuántas casas afectaron y si
            fueron anuladas.
          </p>
          <HistorialDeudasMasivas filas={filasHistorial} />
        </section>
      </div>
    </AppShell>
  );
}
