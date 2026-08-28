"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, catalogoReferenciasBancarias } from "@/db/schema";

export type Referencia = {
  id: number;
  casaId: number;
  numero: string;
  bloque: string;
  referencia: string;
  banco: string;
};

export async function obtenerReferencias(): Promise<Referencia[]> {
  const session = await auth();
  if (session?.user.rol !== "admin") return [];

  return db
    .select({
      id: catalogoReferenciasBancarias.id,
      casaId: catalogoReferenciasBancarias.casaId,
      numero: casas.numero,
      bloque: casas.bloque,
      referencia: catalogoReferenciasBancarias.referencia,
      banco: catalogoReferenciasBancarias.banco,
    })
    .from(catalogoReferenciasBancarias)
    .innerJoin(casas, eq(casas.id, catalogoReferenciasBancarias.casaId))
    .orderBy(asc(casas.numero));
}

export type GuardarReferenciaResultado = { ok: true } | { ok: false; error: string };

function validar(numeroCasa: string, referencia: string): string | null {
  if (!numeroCasa.trim()) return "Elegí una casa.";
  if (!referencia.trim()) return "Escribí la referencia bancaria.";
  return null;
}

async function buscarCasa(numeroCasa: string) {
  const [casa] = await db
    .select({ id: casas.id })
    .from(casas)
    .where(eq(casas.numero, numeroCasa.trim()))
    .limit(1);
  return casa ?? null;
}

// Una misma referencia SÍ puede repetirse en más de una casa (ej. dos
// unidades que pagan desde la misma cuenta bancaria) — a propósito no hay
// unicidad global sobre "referencia" sola, solo sobre (casa, referencia)
// para no cargar la misma referencia 2 veces a la misma casa. Cuando una
// referencia matchea más de una casa, el pago cae en la cola de "varias
// casas coinciden" de Cargar estado de cuenta para que el admin elija.
export async function crearReferencia(
  numeroCasa: string,
  referencia: string,
  banco: string
): Promise<GuardarReferenciaResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") return { ok: false, error: "No autorizado." };

  const error = validar(numeroCasa, referencia);
  if (error) return { ok: false, error };

  const casa = await buscarCasa(numeroCasa);
  if (!casa) return { ok: false, error: `No existe la casa "${numeroCasa}".` };

  try {
    await db.insert(catalogoReferenciasBancarias).values({
      casaId: casa.id,
      referencia: referencia.trim(),
      banco: banco.trim() || "Banco Guayaquil",
    });
  } catch {
    return { ok: false, error: "Esa casa ya tiene esa referencia cargada." };
  }

  revalidatePath("/referencias");
  return { ok: true };
}

export async function actualizarReferencia(
  id: number,
  numeroCasa: string,
  referencia: string,
  banco: string
): Promise<GuardarReferenciaResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") return { ok: false, error: "No autorizado." };

  const error = validar(numeroCasa, referencia);
  if (error) return { ok: false, error };

  const casa = await buscarCasa(numeroCasa);
  if (!casa) return { ok: false, error: `No existe la casa "${numeroCasa}".` };

  try {
    await db
      .update(catalogoReferenciasBancarias)
      .set({
        casaId: casa.id,
        referencia: referencia.trim(),
        banco: banco.trim() || "Banco Guayaquil",
      })
      .where(eq(catalogoReferenciasBancarias.id, id));
  } catch {
    return { ok: false, error: "Esa casa ya tiene esa referencia cargada." };
  }

  revalidatePath("/referencias");
  return { ok: true };
}

export async function eliminarReferencia(id: number): Promise<GuardarReferenciaResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") return { ok: false, error: "No autorizado." };
  await db.delete(catalogoReferenciasBancarias).where(eq(catalogoReferenciasBancarias.id, id));
  revalidatePath("/referencias");
  return { ok: true };
}
