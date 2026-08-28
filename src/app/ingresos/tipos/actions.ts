"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { tiposIngreso } from "@/db/schema";

export type TipoIngreso = {
  id: number;
  nombre: string;
  descripcion: string | null;
  palabrasClave: string | null;
  activo: boolean;
};

export async function obtenerTiposIngreso(): Promise<TipoIngreso[]> {
  const session = await auth();
  if (session?.user.rol !== "admin") return [];

  return db.select().from(tiposIngreso).orderBy(asc(tiposIngreso.nombre));
}

export type GuardarTipoIngresoResultado = { ok: true } | { ok: false; error: string };

function validar(nombre: string): string | null {
  if (!nombre.trim()) return "Ponele un nombre al tipo de ingreso.";
  return null;
}

export async function crearTipoIngreso(
  nombre: string,
  descripcion: string,
  palabrasClave: string
): Promise<GuardarTipoIngresoResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }
  const error = validar(nombre);
  if (error) return { ok: false, error };

  try {
    await db.insert(tiposIngreso).values({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      palabrasClave: palabrasClave.trim() || null,
    });
  } catch {
    return { ok: false, error: "Ya existe un tipo de ingreso con ese nombre." };
  }

  revalidatePath("/ingresos/tipos");
  return { ok: true };
}

export async function actualizarTipoIngreso(
  id: number,
  nombre: string,
  descripcion: string,
  palabrasClave: string
): Promise<GuardarTipoIngresoResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }
  const error = validar(nombre);
  if (error) return { ok: false, error };

  try {
    await db
      .update(tiposIngreso)
      .set({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        palabrasClave: palabrasClave.trim() || null,
      })
      .where(eq(tiposIngreso.id, id));
  } catch {
    return { ok: false, error: "Ya existe un tipo de ingreso con ese nombre." };
  }

  revalidatePath("/ingresos/tipos");
  return { ok: true };
}

export async function alternarActivoTipoIngreso(
  id: number,
  activo: boolean
): Promise<GuardarTipoIngresoResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }
  await db.update(tiposIngreso).set({ activo }).where(eq(tiposIngreso.id, id));
  revalidatePath("/ingresos/tipos");
  return { ok: true };
}
