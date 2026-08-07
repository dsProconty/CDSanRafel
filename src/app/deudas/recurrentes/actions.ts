"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  conceptosDeuda,
  deudaRecurrente,
  deudaRecurrenteExclusion,
  usuarios,
} from "@/db/schema";
import { generarOcurrenciaRecurrente } from "@/lib/deuda-recurrente";

export type RecurrenteResultado = { ok: true } | { ok: false; error: string };

export type Recurrente = {
  id: number;
  conceptoNombre: string;
  monto: string;
  descripcion: string | null;
  fechaInicio: string;
  totalPeriodos: number | null;
  periodosGenerados: number;
  activo: boolean;
  usuarioEmail: string | null;
  casasExcluidas: number;
};

function revalidarTodo() {
  revalidatePath("/deudas/recurrentes");
  revalidatePath("/deudas/masiva");
  revalidatePath("/casas");
  revalidatePath("/");
}

export async function obtenerRecurrentes(): Promise<Recurrente[]> {
  const session = await auth();
  if (session?.user.rol !== "admin") return [];

  const filas = await db
    .select({
      id: deudaRecurrente.id,
      conceptoNombre: conceptosDeuda.nombre,
      monto: deudaRecurrente.monto,
      descripcion: deudaRecurrente.descripcion,
      fechaInicio: deudaRecurrente.fechaInicio,
      totalPeriodos: deudaRecurrente.totalPeriodos,
      periodosGenerados: deudaRecurrente.periodosGenerados,
      activo: deudaRecurrente.activo,
      usuarioEmail: usuarios.email,
    })
    .from(deudaRecurrente)
    .innerJoin(conceptosDeuda, eq(conceptosDeuda.id, deudaRecurrente.conceptoId))
    .leftJoin(usuarios, eq(usuarios.id, deudaRecurrente.usuarioId))
    .orderBy(desc(deudaRecurrente.createdAt));

  const exclusiones = await db
    .select({ recurrenteId: deudaRecurrenteExclusion.recurrenteId })
    .from(deudaRecurrenteExclusion);
  const conteo = new Map<number, number>();
  for (const e of exclusiones) {
    conteo.set(e.recurrenteId, (conteo.get(e.recurrenteId) ?? 0) + 1);
  }

  return filas.map((f) => ({ ...f, casasExcluidas: conteo.get(f.id) ?? 0 }));
}

export async function crearRecurrente(
  conceptoId: number,
  monto: number,
  fechaInicio: string,
  descripcion: string,
  totalPeriodos: number | null,
  casaIdsExcluidas: number[],
  generarAhora: number
): Promise<RecurrenteResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }
  if (!conceptoId || !monto || monto <= 0 || !fechaInicio) {
    return { ok: false, error: "Completa concepto, monto y fecha de inicio." };
  }
  if (totalPeriodos !== null && totalPeriodos <= 0) {
    return { ok: false, error: "La cantidad de períodos debe ser mayor a 0." };
  }

  const [plan] = await db
    .insert(deudaRecurrente)
    .values({
      usuarioId: Number(session.user.id),
      conceptoId,
      monto: monto.toFixed(2),
      descripcion: descripcion.trim() || null,
      fechaInicio,
      totalPeriodos,
    })
    .returning({ id: deudaRecurrente.id });

  if (casaIdsExcluidas.length > 0) {
    await db
      .insert(deudaRecurrenteExclusion)
      .values(casaIdsExcluidas.map((casaId) => ({ recurrenteId: plan.id, casaId })));
  }

  const tope = Math.max(
    0,
    Math.min(generarAhora, totalPeriodos ?? generarAhora, 24)
  );
  for (let i = 0; i < tope; i++) {
    const resultado = await generarOcurrenciaRecurrente(plan.id);
    if (!resultado) break;
  }

  revalidarTodo();
  return { ok: true };
}

export async function pausarRecurrente(id: number): Promise<RecurrenteResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") return { ok: false, error: "No autorizado." };
  await db.update(deudaRecurrente).set({ activo: false }).where(eq(deudaRecurrente.id, id));
  revalidarTodo();
  return { ok: true };
}

export async function reanudarRecurrente(id: number): Promise<RecurrenteResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") return { ok: false, error: "No autorizado." };
  await db.update(deudaRecurrente).set({ activo: true }).where(eq(deudaRecurrente.id, id));
  revalidarTodo();
  return { ok: true };
}

export async function generarSiguienteAhora(id: number): Promise<RecurrenteResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") return { ok: false, error: "No autorizado." };
  const resultado = await generarOcurrenciaRecurrente(id);
  if (!resultado) {
    return {
      ok: false,
      error: "No se pudo generar (el plan está pausado, ya se completó, o no existe).",
    };
  }
  revalidarTodo();
  return { ok: true };
}
