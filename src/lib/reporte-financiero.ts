import { and, eq, gte, inArray, isNotNull, lte, sum } from "drizzle-orm";

import { db } from "@/db";
import { casas, deudas, movimientosBancarios, tiposIngreso } from "@/db/schema";

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

// Sugiere las líneas de ingreso agrupando los créditos del banco recibidos
// ese mes por tipo de ingreso (Expensa/Convenio-Cartera/Anticipo/Tags/
// Reservas Comunales/Multas/Agua-Basura/Devolución/No identificado — ver
// src/lib/clasificar-ingreso.ts), tal como pidió el cliente en la reunión
// del 27/ago/2026. Los créditos que todavía no se clasificaron (matched
// pero sin regla automática, esperando que el admin elija a mano desde
// /cargar) se agrupan aparte como "Pendiente de clasificar" para que el
// total siga cuadrando con el estado de cuenta del banco. El admin revisa
// y ajusta las líneas a mano antes de guardar — no se auto-completa el informe.
export async function sugerirLineasIngreso(
  mes: number,
  anio: number
): Promise<SugerenciaIngreso[]> {
  const { desde, hasta } = rangoDelMes(mes, anio);

  const filas = await db
    .select({ nombre: tiposIngreso.nombre, total: sum(movimientosBancarios.monto) })
    .from(movimientosBancarios)
    .leftJoin(tiposIngreso, eq(tiposIngreso.id, movimientosBancarios.tipoIngresoId))
    .where(
      and(
        inArray(movimientosBancarios.estado, ["matched", "pendiente_revision", "sin_catalogar"]),
        gte(movimientosBancarios.fechaTransaccion, desde),
        lte(movimientosBancarios.fechaTransaccion, hasta)
      )
    )
    .groupBy(tiposIngreso.nombre);

  return filas
    .map((f) => ({
      tipoExpensaId: null,
      etiqueta: f.nombre ?? "Pendiente de clasificar",
      monto: Number(f.total ?? 0),
    }))
    .filter((l) => l.monto > 0);
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
