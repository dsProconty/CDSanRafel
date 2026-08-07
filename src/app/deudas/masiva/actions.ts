"use server";

import { revalidatePath } from "next/cache";
import { count, desc, eq, notInArray } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  casas,
  conceptosDeuda,
  deudaMasivaLotes,
  deudas,
  tiposExpensa,
  usuarios,
} from "@/db/schema";

export type CrearDeudaMasivaResultado =
  | { ok: true; casasAfectadas: number; casasTotal: number }
  | { ok: false; error: string };

export async function crearDeudaMasiva(
  conceptoId: number,
  monto: number,
  fecha: string,
  descripcion: string,
  casaIdsExcluidas: number[] = []
): Promise<CrearDeudaMasivaResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  if (!conceptoId || !monto || monto <= 0 || !fecha) {
    return { ok: false, error: "Elegí un concepto, monto y fecha." };
  }

  const [concepto] = await db
    .select({ id: conceptosDeuda.id, tipoExpensaId: conceptosDeuda.tipoExpensaId })
    .from(conceptosDeuda)
    .where(eq(conceptosDeuda.id, conceptoId));

  if (!concepto) {
    return { ok: false, error: "El concepto elegido ya no existe." };
  }
  const tipoExpensaId = concepto.tipoExpensaId;

  const todasLasCasas = casaIdsExcluidas.length
    ? await db
        .select({ id: casas.id })
        .from(casas)
        .where(notInArray(casas.id, casaIdsExcluidas))
    : await db.select({ id: casas.id }).from(casas);

  if (todasLasCasas.length === 0) {
    return { ok: false, error: "No queda ninguna casa por incluir." };
  }

  const [{ casasTotal }] = await db.select({ casasTotal: count() }).from(casas);

  const [lote] = await db
    .insert(deudaMasivaLotes)
    .values({
      usuarioId: Number(session.user.id),
      conceptoId,
      tipoExpensaId,
      monto: monto.toFixed(2),
      fecha,
      descripcion: descripcion.trim() || null,
      casasTotal,
      casasAfectadas: todasLasCasas.length,
    })
    .returning({ id: deudaMasivaLotes.id });

  await db.insert(deudas).values(
    todasLasCasas.map((c) => ({
      casaId: c.id,
      tipoExpensaId,
      monto: monto.toFixed(2),
      fecha,
      descripcion: descripcion.trim() || null,
      loteId: lote.id,
    }))
  );

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/deudas/masiva");

  return { ok: true, casasAfectadas: todasLasCasas.length, casasTotal };
}

export type LoteDeudaMasiva = {
  id: number;
  fecha: string;
  createdAt: Date;
  tipoNombre: string;
  conceptoNombre: string | null;
  monto: string;
  descripcion: string | null;
  casasTotal: number;
  casasAfectadas: number;
  usuarioEmail: string | null;
  anuladoEn: Date | null;
};

export async function obtenerLotesDeudaMasiva(): Promise<LoteDeudaMasiva[]> {
  const session = await auth();
  if (session?.user.rol !== "admin") return [];

  return db
    .select({
      id: deudaMasivaLotes.id,
      fecha: deudaMasivaLotes.fecha,
      createdAt: deudaMasivaLotes.createdAt,
      tipoNombre: tiposExpensa.nombre,
      conceptoNombre: conceptosDeuda.nombre,
      monto: deudaMasivaLotes.monto,
      descripcion: deudaMasivaLotes.descripcion,
      casasTotal: deudaMasivaLotes.casasTotal,
      casasAfectadas: deudaMasivaLotes.casasAfectadas,
      usuarioEmail: usuarios.email,
      anuladoEn: deudaMasivaLotes.anuladoEn,
    })
    .from(deudaMasivaLotes)
    .innerJoin(tiposExpensa, eq(tiposExpensa.id, deudaMasivaLotes.tipoExpensaId))
    .leftJoin(conceptosDeuda, eq(conceptosDeuda.id, deudaMasivaLotes.conceptoId))
    .leftJoin(usuarios, eq(usuarios.id, deudaMasivaLotes.usuarioId))
    .orderBy(desc(deudaMasivaLotes.createdAt))
    .limit(20);
}

export type AnularLoteResultado =
  | { ok: true }
  | { ok: false; error: string };

export async function anularLoteDeudaMasiva(
  loteId: number
): Promise<AnularLoteResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  const [lote] = await db
    .select({ id: deudaMasivaLotes.id, anuladoEn: deudaMasivaLotes.anuladoEn })
    .from(deudaMasivaLotes)
    .where(eq(deudaMasivaLotes.id, loteId));

  if (!lote) {
    return { ok: false, error: "La corrida no existe." };
  }
  if (lote.anuladoEn) {
    return { ok: false, error: "Esta corrida ya fue anulada." };
  }

  await db.delete(deudas).where(eq(deudas.loteId, loteId));
  await db
    .update(deudaMasivaLotes)
    .set({ anuladoEn: new Date() })
    .where(eq(deudaMasivaLotes.id, loteId));

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/deudas/masiva");

  return { ok: true };
}
