"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  casas,
  catalogoReferenciasBancarias,
  movimientoCandidatosCasa,
  movimientosBancarios,
} from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    throw new Error("No autorizado.");
  }
}

// Cola de revisión: la referencia ya matcheaba N casas candidatas, el admin
// elige una. No hace falta "aprender" nada: esa referencia ya apuntaba a
// esta casa en el catálogo.
export async function asignarCandidato(movimientoId: number, casaId: number) {
  await requireAdmin();

  await db.batch([
    db
      .update(movimientosBancarios)
      .set({ casaId, estado: "matched" })
      .where(eq(movimientosBancarios.id, movimientoId)),
    db
      .delete(movimientoCandidatosCasa)
      .where(eq(movimientoCandidatosCasa.movimientoId, movimientoId)),
  ]);

  revalidatePath("/cargar");
  revalidatePath("/");
}

export type AsignarManualResultado = { ok: true } | { ok: false; error: string };

// Cola "sin catalogar": el admin busca la casa a mano. Además de confirmar
// el abono, se aprende la referencia para que la próxima carga la matchee sola.
export async function asignarManual(
  movimientoId: number,
  numeroCasa: string
): Promise<AsignarManualResultado> {
  await requireAdmin();

  const [casa] = await db
    .select({ id: casas.id })
    .from(casas)
    .where(eq(casas.numero, numeroCasa.trim()))
    .limit(1);

  if (!casa) {
    return { ok: false, error: `No existe la casa "${numeroCasa}".` };
  }

  const [movimiento] = await db
    .select({ referenciaCruda: movimientosBancarios.referenciaCruda })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.id, movimientoId))
    .limit(1);

  if (!movimiento) {
    return { ok: false, error: "El movimiento ya no existe." };
  }

  await db.batch([
    db
      .update(movimientosBancarios)
      .set({ casaId: casa.id, estado: "matched" })
      .where(eq(movimientosBancarios.id, movimientoId)),
    db
      .insert(catalogoReferenciasBancarias)
      .values({ casaId: casa.id, referencia: movimiento.referenciaCruda })
      .onConflictDoNothing({
        target: [
          catalogoReferenciasBancarias.casaId,
          catalogoReferenciasBancarias.referencia,
        ],
      }),
  ]);

  revalidatePath("/cargar");
  revalidatePath("/");
  return { ok: true };
}

// Clasificación anticipada de un débito antes de que exista el informe del
// mes: cuando se cree el borrador, `crearBorradorReporte` ya lo trae con
// esta clase asignada (o pendiente, si acá se elige "Clasificar…" sin nada).
export async function clasificarMovimientoDebito(
  movimientoId: number,
  claseId: number | null
) {
  await requireAdmin();
  await db
    .update(movimientosBancarios)
    .set({ claseId })
    .where(eq(movimientosBancarios.id, movimientoId));
  revalidatePath("/cargar");
}
