"use server";

import bcrypt from "bcryptjs";
import { asc, desc, eq, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  casas,
  catalogoReferenciasBancarias,
  deudas,
  movimientosBancarios,
  tiposExpensa,
  usuarios,
} from "@/db/schema";

type TipoResidente = "propietario" | "arrendatario" | "familiar";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    throw new Error("No autorizado.");
  }
}

export type CasaDetalleData = {
  casa: { id: number; numero: string; bloque: string; propietario: string | null };
  usuario: {
    email: string;
    cedula: string | null;
    telefono: string | null;
    telefonoSecundario: string | null;
    tipoResidente: TipoResidente;
  } | null;
  referencias: { id: number; referencia: string }[];
  deudas: {
    id: number;
    monto: string;
    fecha: string;
    descripcion: string | null;
    tipo: string;
  }[];
  tipos: { id: number; nombre: string }[];
  saldo: number;
  alDia: boolean;
};

export async function obtenerDetalleCasa(
  numero: string
): Promise<CasaDetalleData | null> {
  await requireAdmin();

  const [casa] = await db
    .select()
    .from(casas)
    .where(eq(casas.numero, numero))
    .limit(1);
  if (!casa) return null;

  const [usuario] = await db
    .select({
      email: usuarios.email,
      cedula: usuarios.cedula,
      telefono: usuarios.telefono,
      telefonoSecundario: usuarios.telefonoSecundario,
      tipoResidente: usuarios.tipoResidente,
    })
    .from(usuarios)
    .where(eq(usuarios.casaId, casa.id))
    .limit(1);

  const referencias = await db
    .select({ id: catalogoReferenciasBancarias.id, referencia: catalogoReferenciasBancarias.referencia })
    .from(catalogoReferenciasBancarias)
    .where(eq(catalogoReferenciasBancarias.casaId, casa.id));

  const listaDeudas = await db
    .select({
      id: deudas.id,
      monto: deudas.monto,
      fecha: deudas.fecha,
      descripcion: deudas.descripcion,
      tipo: tiposExpensa.nombre,
    })
    .from(deudas)
    .innerJoin(tiposExpensa, eq(tiposExpensa.id, deudas.tipoExpensaId))
    .where(eq(deudas.casaId, casa.id))
    .orderBy(desc(deudas.fecha));

  const tipos = await db
    .select({ id: tiposExpensa.id, nombre: tiposExpensa.nombre })
    .from(tiposExpensa)
    .orderBy(asc(tiposExpensa.nombre));

  const [{ totalDeudas }] = await db
    .select({ totalDeudas: sum(deudas.monto) })
    .from(deudas)
    .where(eq(deudas.casaId, casa.id));
  const [{ totalAbonado }] = await db
    .select({ totalAbonado: sum(movimientosBancarios.monto) })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.casaId, casa.id));

  const saldo = Number(totalDeudas ?? 0) - Number(totalAbonado ?? 0);

  return {
    casa: {
      id: casa.id,
      numero: casa.numero,
      bloque: casa.bloque,
      propietario: casa.propietario,
    },
    usuario: usuario?.email
      ? {
          email: usuario.email,
          cedula: usuario.cedula,
          telefono: usuario.telefono,
          telefonoSecundario: usuario.telefonoSecundario,
          tipoResidente: usuario.tipoResidente,
        }
      : null,
    referencias,
    deudas: listaDeudas,
    tipos,
    saldo,
    alDia: saldo <= 0,
  };
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

export async function actualizarAgenda(
  casaId: number,
  datos: {
    cedula: string;
    telefono: string;
    telefonoSecundario: string;
    tipoResidente: TipoResidente;
  }
) {
  await requireAdmin();
  await db
    .update(usuarios)
    .set({
      cedula: datos.cedula.trim() || null,
      telefono: datos.telefono.trim() || null,
      telefonoSecundario: datos.telefonoSecundario.trim() || null,
      tipoResidente: datos.tipoResidente,
    })
    .where(eq(usuarios.casaId, casaId));
  revalidatePath("/casas");
}

export async function eliminarUsuario(casaId: number) {
  await requireAdmin();
  await db.delete(usuarios).where(eq(usuarios.casaId, casaId));
  revalidatePath("/casas");
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
