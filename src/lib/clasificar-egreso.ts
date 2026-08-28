import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { presupuestoClase } from "@/db/schema";

// Autoclasificación de servicios fijos recurrentes (teléfono, internet,
// agua, luz): si el texto matchea alguna palabra clave de una clase del
// presupuesto, se asigna sola sin que el admin tenga que clasificarla a
// mano (pedido del cliente, ago 2026). El resto queda "pendiente de
// clasificar" (claseId null). Se usa tanto para lo que el admin tipea a
// mano en el editor del informe como para los débitos importados del Excel
// del banco (ahí el texto es `concepto + referencia2`, donde vive el
// nombre del proveedor — ej. "Emaap quito", "Empresa electrica quito s a").
export async function intentarAutoclasificarEgreso(texto: string): Promise<number | null> {
  const clases = await db
    .select({ id: presupuestoClase.id, palabrasClave: presupuestoClase.palabrasClave })
    .from(presupuestoClase)
    .where(and(eq(presupuestoClase.activo, true), isNotNull(presupuestoClase.palabrasClave)));

  const texto2 = texto.toLowerCase();
  for (const c of clases) {
    const palabras = (c.palabrasClave ?? "")
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    if (palabras.some((p) => texto2.includes(p))) {
      return c.id;
    }
  }
  return null;
}

// El Excel de Banco Guayaquil usa "Pago a terceros" como concepto genérico
// para casi cualquier egreso manual — ahí la descripción real está en
// Referencia 3 (ej. "Seguridad junio", "Compra de pintura"). Para el resto
// de los conceptos (ej. "Cuota otecel", "Recaud.agua potable quito tr") el
// concepto ya es descriptivo por sí solo — Referencia 3 en esos casos suele
// ser solo un número de cliente, no texto útil.
const CONCEPTOS_GENERICOS = new Set(["pago a terceros"]);

export function descripcionEgresoBancario(mov: {
  concepto: string | null;
  referencia3: string | null;
}): string {
  const concepto = (mov.concepto ?? "").trim();
  const referencia3 = (mov.referencia3 ?? "").trim();
  if (CONCEPTOS_GENERICOS.has(concepto.toLowerCase()) && referencia3) {
    return referencia3;
  }
  return concepto || referencia3 || "Egreso sin descripción";
}

// Un débito con concepto genérico ("Pago a terceros") es una transferencia
// manual que Christian inició él mismo — de ley necesita factura/recibo de
// respaldo para auditoría (pedido del cliente, reunión 27/ago/2026). Los
// débitos automáticos (concepto específico, ej. "Cuota otecel", "Recaud.agua
// potable quito tr") no lo necesitan — Christian: "estos son los débitos
// automáticos, estos ni siquiera los ven".
export function requiereComprobanteBancario(concepto: string | null): boolean {
  return CONCEPTOS_GENERICOS.has((concepto ?? "").trim().toLowerCase());
}
