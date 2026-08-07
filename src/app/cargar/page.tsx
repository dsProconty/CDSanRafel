import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  cargasEstadoCuenta,
  casas,
  movimientoCandidatosCasa,
  movimientosBancarios,
  usuarios,
} from "@/db/schema";
import { ChevronDown } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatPill } from "@/components/ui/stat-pill";
import { BotonCandidato } from "./boton-candidato";
import { FormAsignarManual } from "./form-asignar-manual";
import { HistorialCargas, type FilaHistorial } from "./historial-cargas";
import { UploadForm } from "./upload-form";

export default async function CargarPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const historialRaw = await db
    .select({
      id: cargasEstadoCuenta.id,
      fecha: cargasEstadoCuenta.createdAt,
      usuarioEmail: usuarios.email,
      nombreArchivo: cargasEstadoCuenta.nombreArchivo,
      totalFilas: cargasEstadoCuenta.totalFilas,
      creditos: cargasEstadoCuenta.creditos,
      debitos: cargasEstadoCuenta.debitos,
      duplicados: cargasEstadoCuenta.duplicados,
      matchedAutomatico: cargasEstadoCuenta.matchedAutomatico,
      pendienteRevision: cargasEstadoCuenta.pendienteRevision,
      sinCatalogar: cargasEstadoCuenta.sinCatalogar,
    })
    .from(cargasEstadoCuenta)
    .leftJoin(usuarios, eq(usuarios.id, cargasEstadoCuenta.usuarioId))
    .orderBy(desc(cargasEstadoCuenta.createdAt))
    .limit(20);

  const formatoFecha = new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const historial: FilaHistorial[] = historialRaw.map((f) => ({
    ...f,
    fecha: formatoFecha.format(f.fecha),
  }));

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

      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Cargar estado de cuenta
          </h1>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Sube el Excel de movimientos de Banco Guayaquil. Los documentos ya
            cargados se descartan automáticamente y las referencias se cruzan
            contra el catálogo de casas.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
          <UploadForm />
        </div>

        <section className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
          <h2 className="text-base font-semibold text-foreground">
            Historial de cargas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quién subió cada estado de cuenta, cuándo, y qué pasó en esa
            corrida.
          </p>
          <HistorialCargas filas={historial} />
        </section>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            Pendientes de revisión
          </h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Pagos que no se pudieron abonar automáticamente porque la
            referencia no cruzó con una sola casa. Se resuelven a mano.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill
              label="varias casas coinciden"
              value={pendientes.length}
              color="warning"
            />
            <StatPill
              label="sin catalogar"
              value={sinCatalogar.length}
              color="destructive"
            />
          </div>
        </section>

        <details
          className="group mt-4 rounded-lg border border-border bg-card"
          open={pendientes.length > 0 ? true : undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Varias casas coinciden ({pendientes.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                La misma referencia bancaria está catalogada para más de una
                casa. Elige a cuál corresponde este pago.
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>

          {pendientes.length === 0 ? (
            <p className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
              Sin pendientes.
            </p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {pendientes.map((mov) => (
                <div key={mov.id} className="px-6 py-4">
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
                </div>
              ))}
            </div>
          )}
        </details>

        <details
          className="group mt-4 rounded-lg border border-border bg-card"
          open={sinCatalogar.length > 0 ? true : undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Sin catalogar ({sinCatalogar.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                La referencia no está en el catálogo. Asignar una casa la
                aprende para las próximas cargas.
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>

          {sinCatalogar.length === 0 ? (
            <p className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
              Sin pendientes.
            </p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {sinCatalogar.map((mov) => (
                <div key={mov.id} className="px-6 py-4">
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
                </div>
              ))}
            </div>
          )}
        </details>
      </div>
    </AppShell>
  );
}
