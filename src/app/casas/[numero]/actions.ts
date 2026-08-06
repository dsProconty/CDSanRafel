"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, deudas, usuarios } from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    throw new Error("No autorizado.");
  }
}

export async function actualizarPropietario(casaId: number, propietario: string) {
  await requireAdmin();
  await db
    .update(casas)
    .set({ propietario: propietario.trim() || null })
    .where(eq(casas.id, casaId));
  revalidatePath("/casas");
}

export type GuardarUsuarioResultado = { ok: true } | { ok: false; error: string };

export async function guardarUsuario(
  casaId: number,
  email: string,
  password: string
): Promise<GuardarUsuarioResultado> {
  await requireAdmin();

  const emailNormalizado = email.trim().toLowerCase();
  if (!emailNormalizado || !password) {
    return { ok: false, error: "Completa correo y contraseña." };
  }

  const [existente] = await db
    .select({ casaId: usuarios.casaId })
    .from(usuarios)
    .where(eq(usuarios.email, emailNormalizado))
    .limit(1);
  if (existente && existente.casaId !== casaId) {
    return { ok: false, error: "Ese correo ya está en uso por otra casa." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db
    .insert(usuarios)
    .values({
      casaId,
      email: emailNormalizado,
      passwordHash,
      rol: "propietario",
    })
    .onConflictDoUpdate({
      target: usuarios.casaId,
      set: { email: emailNormalizado, passwordHash },
    });

  revalidatePath("/casas");
  return { ok: true };
}

export async function crearDeuda(
  casaId: number,
  tipoExpensaId: number,
  monto: number,
  fecha: string,
  descripcion: string
) {
  await requireAdmin();
  await db.insert(deudas).values({
    casaId,
    tipoExpensaId,
    monto: monto.toFixed(2),
    fecha,
    descripcion: descripcion.trim() || null,
  });
  revalidatePath("/casas");
  revalidatePath("/");
}
