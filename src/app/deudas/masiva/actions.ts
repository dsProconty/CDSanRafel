"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, deudas } from "@/db/schema";

export type CrearDeudaMasivaResultado =
  | { ok: true; casasAfectadas: number }
  | { ok: false; error: string };

export async function crearDeudaMasiva(
  tipoExpensaId: number,
  monto: number,
  fecha: string,
  descripcion: string
): Promise<CrearDeudaMasivaResultado> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  if (!tipoExpensaId || !monto || monto <= 0 || !fecha) {
    return { ok: false, error: "Completa tipo, monto y fecha." };
  }

  const todasLasCasas = await db.select({ id: casas.id }).from(casas);

  await db.insert(deudas).values(
    todasLasCasas.map((c) => ({
      casaId: c.id,
      tipoExpensaId,
      monto: monto.toFixed(2),
      fecha,
      descripcion: descripcion.trim() || null,
    }))
  );

  revalidatePath("/");
  revalidatePath("/casas");

  return { ok: true, casasAfectadas: todasLasCasas.length };
}
