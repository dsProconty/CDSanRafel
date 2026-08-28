import { and, eq, ne, sum } from "drizzle-orm";

import { db } from "@/db";
import { casas, deudas, movimientosBancarios, tiposIngreso } from "@/db/schema";

let cacheIdsPorNombre: Map<string, number> | null = null;

async function idPorNombre(nombre: string): Promise<number | null> {
  if (!cacheIdsPorNombre) {
    const filas = await db.select({ id: tiposIngreso.id, nombre: tiposIngreso.nombre }).from(tiposIngreso);
    cacheIdsPorNombre = new Map(filas.map((f) => [f.nombre, f.id]));
  }
  return cacheIdsPorNombre.get(nombre) ?? null;
}

// Saldo pendiente de la casa SIN contar el pago que se está clasificando
// (si ya existe como fila, se excluye por id; si todavía no se insertó,
// no hace falta excluir nada porque no puede estar contado).
async function saldoPendienteAntes(casaId: number, excluirMovimientoId?: number): Promise<number> {
  const [[deudaTotal], [abonoTotal]] = await Promise.all([
    db.select({ total: sum(deudas.monto) }).from(deudas).where(eq(deudas.casaId, casaId)),
    db
      .select({ total: sum(movimientosBancarios.monto) })
      .from(movimientosBancarios)
      .where(
        and(
          eq(movimientosBancarios.casaId, casaId),
          excluirMovimientoId ? ne(movimientosBancarios.id, excluirMovimientoId) : undefined
        )
      ),
  ]);
  return Number(deudaTotal.total ?? 0) - Number(abonoTotal.total ?? 0);
}

// Reglas de clasificación automática de ingresos (pedido del cliente, reunión
// 27/ago/2026) — cubre los 3 casos donde Christian dijo que "no hace falta
// redireccionarlo":
//   1. Casa marcada "en convenio de pago" → Convenio/Cartera siempre, pague
//      lo que pague ("directamente ese pago va a convenio y cartera").
//   2. Paga exactamente el saldo pendiente que tenía antes de este pago →
//      Expensa.
//   3. Paga más de lo que debía → Anticipo.
// El resto (pago parcial sin convenio, o casos ambiguos como Tags/Reservas
// Comunales/Multas/Agua-Basura/Devolución) queda sin clasificar — el admin
// lo resuelve a mano desde /cargar, igual que ya pasa con los egresos que no
// matchean ninguna palabra clave.
export async function clasificarIngresoAutomatico(
  casaId: number,
  monto: number,
  excluirMovimientoId?: number
): Promise<number | null> {
  const [casa] = await db.select({ enConvenio: casas.enConvenio }).from(casas).where(eq(casas.id, casaId));
  if (casa?.enConvenio) return idPorNombre("Convenio/Cartera");

  const saldoAntes = await saldoPendienteAntes(casaId, excluirMovimientoId);
  if (Math.abs(monto - saldoAntes) < 0.01) return idPorNombre("Expensa");
  if (monto > saldoAntes + 0.01) return idPorNombre("Anticipo");
  return null;
}

export async function idTipoIngresoNoIdentificado(): Promise<number | null> {
  return idPorNombre("No identificado");
}
