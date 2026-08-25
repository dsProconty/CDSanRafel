"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { presupuestoClase, presupuestoSubtipo, presupuestoTipo } from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.rol !== "admin") return null;
  return session;
}

export type TipoFila = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

export type SubtipoFila = {
  id: number;
  tipoId: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

export type ClaseFila = {
  id: number;
  subtipoId: number;
  nombre: string;
  descripcion: string | null;
  palabrasClave: string | null;
  activo: boolean;
};

export type PresupuestoTree = {
  tipos: TipoFila[];
  subtipos: SubtipoFila[];
  clases: ClaseFila[];
};

export async function obtenerPresupuesto(): Promise<PresupuestoTree> {
  const session = await auth();
  if (session?.user.rol !== "admin") return { tipos: [], subtipos: [], clases: [] };

  const [tipos, subtipos, clases] = await Promise.all([
    db.select().from(presupuestoTipo).orderBy(asc(presupuestoTipo.nombre)),
    db.select().from(presupuestoSubtipo).orderBy(asc(presupuestoSubtipo.nombre)),
    db.select().from(presupuestoClase).orderBy(asc(presupuestoClase.nombre)),
  ]);

  return { tipos, subtipos, clases };
}

type Resultado = { ok: true } | { ok: false; error: string };

function revalidar() {
  revalidatePath("/egresos/categorias");
  revalidatePath("/reportes");
}

export async function crearTipo(nombre: string, descripcion: string): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (!nombre.trim()) return { ok: false, error: "Ponele un nombre al tipo." };
  try {
    await db.insert(presupuestoTipo).values({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
    });
  } catch {
    return { ok: false, error: "Ya existe un tipo con ese nombre." };
  }
  revalidar();
  return { ok: true };
}

export async function actualizarTipo(
  id: number,
  nombre: string,
  descripcion: string
): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (!nombre.trim()) return { ok: false, error: "Ponele un nombre al tipo." };
  try {
    await db
      .update(presupuestoTipo)
      .set({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
      .where(eq(presupuestoTipo.id, id));
  } catch {
    return { ok: false, error: "Ya existe un tipo con ese nombre." };
  }
  revalidar();
  return { ok: true };
}

export async function alternarActivoTipo(id: number, activo: boolean): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  await db.update(presupuestoTipo).set({ activo }).where(eq(presupuestoTipo.id, id));
  revalidar();
  return { ok: true };
}

export async function crearSubtipo(
  tipoId: number,
  nombre: string,
  descripcion: string
): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (!tipoId) return { ok: false, error: "Elegí un tipo." };
  if (!nombre.trim()) return { ok: false, error: "Ponele un nombre al subtipo." };
  try {
    await db.insert(presupuestoSubtipo).values({
      tipoId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
    });
  } catch {
    return { ok: false, error: "Ya existe un subtipo con ese nombre en este tipo." };
  }
  revalidar();
  return { ok: true };
}

export async function actualizarSubtipo(
  id: number,
  nombre: string,
  descripcion: string
): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (!nombre.trim()) return { ok: false, error: "Ponele un nombre al subtipo." };
  try {
    await db
      .update(presupuestoSubtipo)
      .set({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
      .where(eq(presupuestoSubtipo.id, id));
  } catch {
    return { ok: false, error: "Ya existe un subtipo con ese nombre en este tipo." };
  }
  revalidar();
  return { ok: true };
}

export async function alternarActivoSubtipo(id: number, activo: boolean): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  await db.update(presupuestoSubtipo).set({ activo }).where(eq(presupuestoSubtipo.id, id));
  revalidar();
  return { ok: true };
}

export async function crearClase(
  subtipoId: number,
  nombre: string,
  descripcion: string,
  palabrasClave: string
): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (!subtipoId) return { ok: false, error: "Elegí un subtipo." };
  if (!nombre.trim()) return { ok: false, error: "Ponele un nombre a la clase." };
  try {
    await db.insert(presupuestoClase).values({
      subtipoId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      palabrasClave: palabrasClave.trim() || null,
    });
  } catch {
    return { ok: false, error: "Ya existe una clase con ese nombre en este subtipo." };
  }
  revalidar();
  return { ok: true };
}

export async function actualizarClase(
  id: number,
  nombre: string,
  descripcion: string,
  palabrasClave: string
): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (!nombre.trim()) return { ok: false, error: "Ponele un nombre a la clase." };
  try {
    await db
      .update(presupuestoClase)
      .set({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        palabrasClave: palabrasClave.trim() || null,
      })
      .where(eq(presupuestoClase.id, id));
  } catch {
    return { ok: false, error: "Ya existe una clase con ese nombre en este subtipo." };
  }
  revalidar();
  return { ok: true };
}

export async function alternarActivoClase(id: number, activo: boolean): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  await db.update(presupuestoClase).set({ activo }).where(eq(presupuestoClase.id, id));
  revalidar();
  return { ok: true };
}
