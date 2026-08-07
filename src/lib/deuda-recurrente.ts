import { count, eq, notInArray } from "drizzle-orm";

import { db } from "@/db";
import {
  casas,
  conceptosDeuda,
  deudaMasivaLotes,
  deudaRecurrente,
  deudaRecurrenteExclusion,
  deudas,
} from "@/db/schema";

// Suma N meses a una fecha ISO ("YYYY-MM-DD"), ajustando al último día del
// mes destino si el día original no existe ahí (ej. 31 ene + 1 mes → 28/29 feb).
export function sumarMesesClamp(fechaIso: string, meses: number): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + meses, 1));
  const ultimoDiaDelMes = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const dia = Math.min(d, ultimoDiaDelMes);
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), dia))
    .toISOString()
    .slice(0, 10);
}

export async function generarOcurrenciaRecurrente(
  recurrenteId: number
): Promise<{ loteId: number; casasAfectadas: number } | null> {
  const [plan] = await db
    .select()
    .from(deudaRecurrente)
    .where(eq(deudaRecurrente.id, recurrenteId));

  if (!plan || !plan.activo) return null;
  if (plan.totalPeriodos !== null && plan.periodosGenerados >= plan.totalPeriodos) {
    return null;
  }

  const [concepto] = await db
    .select({ tipoExpensaId: conceptosDeuda.tipoExpensaId })
    .from(conceptosDeuda)
    .where(eq(conceptosDeuda.id, plan.conceptoId));
  if (!concepto) return null;

  const exclusiones = await db
    .select({ casaId: deudaRecurrenteExclusion.casaId })
    .from(deudaRecurrenteExclusion)
    .where(eq(deudaRecurrenteExclusion.recurrenteId, recurrenteId));
  const excluidas = exclusiones.map((e) => e.casaId);

  const todasLasCasas = excluidas.length
    ? await db
        .select({ id: casas.id })
        .from(casas)
        .where(notInArray(casas.id, excluidas))
    : await db.select({ id: casas.id }).from(casas);

  const [{ casasTotal }] = await db.select({ casasTotal: count() }).from(casas);

  const fecha = sumarMesesClamp(plan.fechaInicio, plan.periodosGenerados);

  const [lote] = await db
    .insert(deudaMasivaLotes)
    .values({
      usuarioId: plan.usuarioId,
      conceptoId: plan.conceptoId,
      recurrenteId: plan.id,
      tipoExpensaId: concepto.tipoExpensaId,
      monto: plan.monto,
      fecha,
      descripcion: plan.descripcion,
      casasTotal,
      casasAfectadas: todasLasCasas.length,
    })
    .returning({ id: deudaMasivaLotes.id });

  if (todasLasCasas.length > 0) {
    await db.insert(deudas).values(
      todasLasCasas.map((c) => ({
        casaId: c.id,
        tipoExpensaId: concepto.tipoExpensaId,
        monto: plan.monto,
        fecha,
        descripcion: plan.descripcion,
        loteId: lote.id,
      }))
    );
  }

  const periodosGenerados = plan.periodosGenerados + 1;
  const completo =
    plan.totalPeriodos !== null && periodosGenerados >= plan.totalPeriodos;

  await db
    .update(deudaRecurrente)
    .set({ periodosGenerados, activo: completo ? false : plan.activo })
    .where(eq(deudaRecurrente.id, recurrenteId));

  return { loteId: lote.id, casasAfectadas: todasLasCasas.length };
}

// Recorre todos los planes activos y genera el período que ya venció
// (usado por el cron diario). Idempotente: un plan al día no genera nada.
export async function generarPendientesGlobal(): Promise<
  { recurrenteId: number; loteId: number }[]
> {
  const hoy = new Date().toISOString().slice(0, 10);
  const planes = await db
    .select({
      id: deudaRecurrente.id,
      fechaInicio: deudaRecurrente.fechaInicio,
      periodosGenerados: deudaRecurrente.periodosGenerados,
      totalPeriodos: deudaRecurrente.totalPeriodos,
    })
    .from(deudaRecurrente)
    .where(eq(deudaRecurrente.activo, true));

  const resultados: { recurrenteId: number; loteId: number }[] = [];
  for (const plan of planes) {
    if (plan.totalPeriodos !== null && plan.periodosGenerados >= plan.totalPeriodos) {
      continue;
    }
    const proximaFecha = sumarMesesClamp(plan.fechaInicio, plan.periodosGenerados);
    if (proximaFecha > hoy) continue;

    const resultado = await generarOcurrenciaRecurrente(plan.id);
    if (resultado) resultados.push({ recurrenteId: plan.id, loteId: resultado.loteId });
  }
  return resultados;
}
