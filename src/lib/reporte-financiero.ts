import { and, eq, gte, inArray, isNotNull, lte, sum } from "drizzle-orm";

import { db } from "@/db";
import { casas, deudas, movimientosBancarios, tiposExpensa } from "@/db/schema";

export function rangoDelMes(mes: number, anio: number): { desde: string; hasta: string } {
  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const hasta = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { desde, hasta };
}

export const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export type SugerenciaIngreso = {
  tipoExpensaId: number | null;
  etiqueta: string;
  monto: number;
};

// Sugiere las líneas de ingreso por tipo: para cada tipo de expensa activo,
// suma las deudas emitidas ese mes bajo ese tipo (proxy razonable de
// "expensas del mes"); más una línea "No identificado" con el dinero que
// entró ese mes pero no se pudo asignar a ninguna casa. El admin las revisa
// y ajusta a mano antes de guardar — no se auto-completa el informe.
export async function sugerirLineasIngreso(
  mes: number,
  anio: number
): Promise<SugerenciaIngreso[]> {
  const { desde, hasta } = rangoDelMes(mes, anio);

  const tipos = await db
    .select({ id: tiposExpensa.id, nombre: tiposExpensa.nombre })
    .from(tiposExpensa)
    .where(eq(tiposExpensa.activo, true));

  const deudasPorTipo = await db
    .select({ tipoExpensaId: deudas.tipoExpensaId, total: sum(deudas.monto) })
    .from(deudas)
    .where(and(gte(deudas.fecha, desde), lte(deudas.fecha, hasta)))
    .groupBy(deudas.tipoExpensaId);
  const totalPorTipoId = new Map(
    deudasPorTipo.map((d) => [d.tipoExpensaId, Number(d.total ?? 0)])
  );

  const [{ total: noIdentificado }] = await db
    .select({ total: sum(movimientosBancarios.monto) })
    .from(movimientosBancarios)
    .where(
      and(
        inArray(movimientosBancarios.estado, ["pendiente_revision", "sin_catalogar"]),
        gte(movimientosBancarios.fechaTransaccion, desde),
        lte(movimientosBancarios.fechaTransaccion, hasta)
      )
    );

  const lineas: SugerenciaIngreso[] = tipos
    .map((t) => ({
      tipoExpensaId: t.id,
      etiqueta: t.nombre,
      monto: totalPorTipoId.get(t.id) ?? 0,
    }))
    .filter((l) => l.monto > 0);

  lineas.push({
    tipoExpensaId: null,
    etiqueta: "No identificado",
    monto: Number(noIdentificado ?? 0),
  });

  return lineas;
}

export type EstadoCasas = {
  casasPagaron: number;
  casasMora: number;
  casasTotal: number;
};

// Mismo cálculo de saldo que ya se usa en /casas (Σ deudas − Σ abonos por
// casa), agregado como conteo. Se toma el estado ACTUAL (a la fecha de
// generación), no el histórico del mes — igual que hace hoy el informe manual.
export async function calcularEstadoCasas(): Promise<EstadoCasas> {
  const [todasLasCasas, deudasPorCasa, abonosPorCasa] = await Promise.all([
    db.select({ id: casas.id }).from(casas),
    db.select({ casaId: deudas.casaId, total: sum(deudas.monto) }).from(deudas).groupBy(deudas.casaId),
    db
      .select({ casaId: movimientosBancarios.casaId, total: sum(movimientosBancarios.monto) })
      .from(movimientosBancarios)
      .where(isNotNull(movimientosBancarios.casaId))
      .groupBy(movimientosBancarios.casaId),
  ]);

  const deudaPorCasaId = new Map(deudasPorCasa.map((d) => [d.casaId, Number(d.total ?? 0)]));
  const abonoPorCasaId = new Map(
    abonosPorCasa.map((a) => [a.casaId as number, Number(a.total ?? 0)])
  );

  let casasMora = 0;
  for (const c of todasLasCasas) {
    const saldo = (deudaPorCasaId.get(c.id) ?? 0) - (abonoPorCasaId.get(c.id) ?? 0);
    if (saldo > 0.005) casasMora++;
  }

  return {
    casasTotal: todasLasCasas.length,
    casasMora,
    casasPagaron: todasLasCasas.length - casasMora,
  };
}
