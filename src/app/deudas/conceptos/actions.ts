"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { conceptosDeuda, tiposExpensa } from "@/db/schema";

export type Concepto = {
  id: number;
  nombre: string;
  tipoExpensaId: number;
  tipoNombre: string;
  montoDefault: string;
  descripcionDefault: string | null;
  activo: boolean;
};

export async function obtenerConceptos(): Promise<Concepto[]> {
  const session = await auth();
  if (session?.user.rol !== "admin") return [];

  return db
    .select({
      id: conceptosDeuda.id,
      nombre: conceptosDeuda.nombre,
      tipoExpensaId: conceptosDeuda.tipoExpensaId,
      tipoNombre: tiposExpensa.nombre,
      montoDefault: conceptosDeuda.montoDefault,
      descripcionDefault: conceptosDeuda.descripcionDefault,
      activo: conceptosDeuda.activo,
    })
    .from(conceptosDeuda)
    .innerJoin(tiposExpensa, eq(tiposExpensa.id, conceptosDeuda.tipoExpensaId))
    .orderBy(asc(conceptosDeuda.nombre));
}

export type GuardarConceptoResultado =
  | { ok: true }
  | { ok: false; error: string };

function validarConcepto(
  nombre: string,
  tipoExpensaId: number,
  montoDefault: number
): string | null {
  if (!nombre.trim()) return "Ponele un nombre al concepto.";
  if (!tipoExpensaId) return "Elegí un tipo de expensa.";
  if (!montoDefault || montoDefault <= 0) return "El monto debe ser mayor a 0.";
  return null;
}

export async function crearConcepto(
  nombre: string,
  tipoExpensaId: number,
  montoDefault: number,
  descripcionDefault: string
): Promise<GuardarConceptoResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  const error = validarConcepto(nombre, tipoExpensaId, montoDefault);
  if (error) return { ok: false, error };

  try {
    await db.insert(conceptosDeuda).values({
      nombre: nombre.trim(),
      tipoExpensaId,
      montoDefault: montoDefault.toFixed(2),
      descripcionDefault: descripcionDefault.trim() || null,
    });
  } catch {
    return { ok: false, error: "Ya existe un concepto con ese nombre." };
  }

  revalidatePath("/deudas/conceptos");
  revalidatePath("/deudas/masiva");
  return { ok: true };
}

export async function actualizarConcepto(
  id: number,
  nombre: string,
  tipoExpensaId: number,
  montoDefault: number,
  descripcionDefault: string
): Promise<GuardarConceptoResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  const error = validarConcepto(nombre, tipoExpensaId, montoDefault);
  if (error) return { ok: false, error };

  try {
    await db
      .update(conceptosDeuda)
      .set({
        nombre: nombre.trim(),
        tipoExpensaId,
        montoDefault: montoDefault.toFixed(2),
        descripcionDefault: descripcionDefault.trim() || null,
      })
      .where(eq(conceptosDeuda.id, id));
  } catch {
    return { ok: false, error: "Ya existe un concepto con ese nombre." };
  }

  revalidatePath("/deudas/conceptos");
  revalidatePath("/deudas/masiva");
  return { ok: true };
}

export async function alternarActivoConcepto(
  id: number,
  activo: boolean
): Promise<GuardarConceptoResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  await db.update(conceptosDeuda).set({ activo }).where(eq(conceptosDeuda.id, id));

  revalidatePath("/deudas/conceptos");
  revalidatePath("/deudas/masiva");
  return { ok: true };
}
