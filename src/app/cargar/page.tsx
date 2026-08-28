import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  cargasEstadoCuenta,
  casas,
  movimientoCandidatosCasa,
  movimientosBancarios,
  tiposIngreso,
  usuarios,
} from "@/db/schema";
import { ChevronDown } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatPill } from "@/components/ui/stat-pill";
import { obtenerPresupuesto } from "../egresos/categorias/actions";
import { descripcionEgresoBancario } from "@/lib/clasificar-egreso";
import { construirOpcionesClase } from "@/lib/opciones-clase";
import { BotonCandidato } from "./boton-candidato";
import { FormAsignarManual } from "./form-asignar-manual";
import { HistorialCargas, type FilaHistorial } from "./historial-cargas";
import { SelectorClaseDebito } from "./selector-clase-debito";
import { SelectorTipoIngreso } from "./selector-tipo-ingreso";
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
      debitosClasificados: cargasEstadoCuenta.debitosClasificados,
      debitosPendientes: cargasEstadoCuenta.debitosPendientes,
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
    .select({ id: casas.id, numero: casas.numero })
    .from(casas)
    .orderBy(casas.numero);

  // Débitos ya cargados pero todavía sin usar en un informe: acá se ven
  // ANTES de crear el informe económico del mes (no hay que esperar a
  // crearlo para clasificarlos).
  const debitosSinConsumir = await db
    .select()
    .from(movimientosBancarios)
    .where(
      and(eq(movimientosBancarios.estado, "debito"), isNull(movimientosBancarios.reporteEgresoLineaId))
    )
    .orderBy(desc(movimientosBancarios.fechaTransaccion));
  const debitosPendientes = debitosSinConsumir.filter((m) => m.claseId === null);
  const debitosAutoclasificados = debitosSinConsumir.filter((m) => m.claseId !== null);

  const presupuesto = await obtenerPresupuesto();
  const opcionesClase = construirOpcionesClase(presupuesto);

  // Ingresos ya asignados a una casa (matched) pero que no matchearon
  // ninguna regla automática (ver src/lib/clasificar-ingreso.ts) — pago
  // parcial sin convenio, o un tipo ambiguo (Tags/Reservas Comunales/
  // Multas/Agua-Basura/Devolución) que el admin tiene que elegir a mano.
  const ingresosPendientes = await db
    .select()
    .from(movimientosBancarios)
    .where(and(eq(movimientosBancarios.estado, "matched"), isNull(movimientosBancarios.tipoIngresoId)))
    .orderBy(desc(movimientosBancarios.fechaTransaccion));

  const opcionesTipoIngreso = await db
    .select({ id: tiposIngreso.id, nombre: tiposIngreso.nombre })
    .from(tiposIngreso)
    .where(eq(tiposIngreso.activo, true))
    .orderBy(tiposIngreso.nombre);

  const numeroDeCasaId = new Map(todasLasCasas.map((c) => [c.id, c.numero]));

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
          <p className="mt-1 text-sm text-muted-foreground">
            Sube el Excel de movimientos de Banco Guayaquil. Los documentos ya
            cargados se descartan automáticamente. Los créditos (pagos de
            propietarios) se cruzan contra el catálogo de casas; los débitos
            (egresos reales) se guardan y se autoclasifican por palabra clave
            — quedan disponibles para el informe económico del mes que
            corresponda según su fecha.
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
          <p className="mt-1 text-sm text-muted-foreground">
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

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            Ingresos pendientes de clasificar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagos ya asignados a una casa que no matchearon ninguna regla
            automática (Expensa, Anticipo o Convenio/Cartera) — puede ser un
            pago parcial, un Tag, una reserva comunal, una multa, agua/basura
            o una devolución. Elegí el tipo que corresponda.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill
              label="pendientes de clasificar"
              value={ingresosPendientes.length}
              color="warning"
            />
          </div>
        </section>

        <details
          className="group mt-4 rounded-lg border border-border bg-card"
          open={ingresosPendientes.length > 0 ? true : undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Sin clasificar ({ingresosPendientes.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Elegí a qué tipo de ingreso corresponde cada pago.
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>

          {ingresosPendientes.length === 0 ? (
            <p className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
              Sin pendientes.
            </p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {ingresosPendientes.map((mov) => (
                <div key={mov.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold text-foreground">
                      ${Number(mov.monto).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mov.fechaTransaccion} · doc. {mov.documento}
                      {mov.casaId ? ` · Casa ${numeroDeCasaId.get(mov.casaId) ?? mov.casaId}` : ""}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mov.referenciaCruda}
                  </p>
                  <div className="mt-3">
                    <SelectorTipoIngreso movimientoId={mov.id} opciones={opcionesTipoIngreso} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </details>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            Egresos pendientes de clasificar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Débitos ya cargados que todavía no se usaron en ningún informe.
            Podés clasificarlos acá mismo, antes de crear el informe del mes
            — o dejarlos así y clasificarlos después desde el editor del
            informe.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill
              label="pendientes de clasificar"
              value={debitosPendientes.length}
              color="warning"
            />
            <StatPill
              label="autoclasificados, esperando el informe del mes"
              value={debitosAutoclasificados.length}
              color="success"
            />
          </div>
        </section>

        <details
          className="group mt-4 rounded-lg border border-border bg-card"
          open={debitosPendientes.length > 0 ? true : undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Pendientes de clasificar ({debitosPendientes.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No matchearon ninguna palabra clave del catálogo de egresos.
                Elegí tipo/subtipo/clase para cada uno.
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>

          {debitosPendientes.length === 0 ? (
            <p className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
              Sin pendientes.
            </p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {debitosPendientes.map((mov) => (
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
                    {descripcionEgresoBancario(mov)}
                  </p>
                  <div className="mt-3">
                    <SelectorClaseDebito movimientoId={mov.id} opciones={opcionesClase} />
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
