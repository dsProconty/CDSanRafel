"use server";

import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, sum } from "drizzle-orm";
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
  casa: {
    id: number;
    numero: string;
    bloque: string;
    propietario: string | null;
    enConvenio: boolean;
  };
  usuario: {
    email: string;
    cedula: string | null;
    telefono: string | null;
    telefonoSecundario: string | null;
    tipoResidente: TipoResidente;
    otrasCasas: string[];
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

  let usuario: CasaDetalleData["usuario"] = null;
  if (casa.usuarioId) {
    const [fila] = await db
      .select({
        email: usuarios.email,
        cedula: usuarios.cedula,
        telefono: usuarios.telefono,
        telefonoSecundario: usuarios.telefonoSecundario,
        tipoResidente: usuarios.tipoResidente,
      })
      .from(usuarios)
      .where(eq(usuarios.id, casa.usuarioId))
      .limit(1);
    if (fila?.email) {
      const otras = await db
        .select({ numero: casas.numero })
        .from(casas)
        .where(eq(casas.usuarioId, casa.usuarioId));
      usuario = {
        email: fila.email,
        cedula: fila.cedula,
        telefono: fila.telefono,
        telefonoSecundario: fila.telefonoSecundario,
        tipoResidente: fila.tipoResidente,
        otrasCasas: otras.map((o) => o.numero).filter((n) => n !== numero),
      };
    }
  }

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
      enConvenio: casa.enConvenio,
    },
    usuario,
    referencias,
    deudas: listaDeudas,
    tipos,
    saldo,
    alDia: saldo <= 0,
  };
}

export type FilaEstadoCuenta = {
  id: number;
  tipo: string;
  estado: "pendiente" | "pagada";
  valor: number;
  fechaEmision: string;
  fechaPago: string | null;
  comprobante: string | null;
  detalle: string | null;
};

export type EstadoCuentaCasaData = {
  casa: { numero: string; bloque: string };
  filas: FilaEstadoCuenta[];
};

// Asigna cada pago a la deuda más antigua sin cubrir (FIFO), como un libro
// mayor simple. No hay vínculo real deuda↔pago en el modelo de datos —
// esto es una reconstrucción de lectura para mostrar Estado/Fecha de pago/
// Comprobante por línea, igual que en el sistema anterior.
function calcularEstadoCuenta(
  listaDeudas: { id: number; monto: string; fecha: string; descripcion: string | null; tipo: string }[],
  listaPagos: { documento: string; fecha: string; monto: string }[]
): FilaEstadoCuenta[] {
  const deudasOrdenadas = [...listaDeudas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pagosOrdenados = [...listaPagos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((p) => ({ ...p, restante: Number(p.monto) }));

  let idxPago = 0;

  return deudasOrdenadas.map((d) => {
    let pendiente = Number(d.monto);
    let fechaPago: string | null = null;
    const comprobantes: string[] = [];

    while (pendiente > 0.005 && idxPago < pagosOrdenados.length) {
      const pago = pagosOrdenados[idxPago];
      if (pago.restante <= 0.005) {
        idxPago++;
        continue;
      }
      const usar = Math.min(pendiente, pago.restante);
      pago.restante -= usar;
      pendiente -= usar;
      if (!comprobantes.includes(pago.documento)) comprobantes.push(pago.documento);
      fechaPago = pago.fecha;
      if (pago.restante <= 0.005) idxPago++;
    }

    const pagada = pendiente <= 0.005;
    return {
      id: d.id,
      tipo: d.tipo,
      estado: pagada ? "pagada" : "pendiente",
      valor: Number(d.monto),
      fechaEmision: d.fecha,
      fechaPago: pagada ? fechaPago : null,
      comprobante: pagada && comprobantes.length ? comprobantes.join(", ") : null,
      detalle: d.descripcion,
    };
  });
}

export async function obtenerEstadoCuentaCasa(
  numero: string
): Promise<EstadoCuentaCasaData | null> {
  await requireAdmin();

  const [casa] = await db
    .select({ id: casas.id, numero: casas.numero, bloque: casas.bloque })
    .from(casas)
    .where(eq(casas.numero, numero))
    .limit(1);
  if (!casa) return null;

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
    .where(eq(deudas.casaId, casa.id));

  const listaPagos = await db
    .select({
      documento: movimientosBancarios.documento,
      fecha: movimientosBancarios.fechaTransaccion,
      monto: movimientosBancarios.monto,
    })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.casaId, casa.id));

  const filas = calcularEstadoCuenta(listaDeudas, listaPagos).sort((a, b) =>
    b.fechaEmision.localeCompare(a.fechaEmision)
  );

  return {
    casa: { numero: casa.numero, bloque: casa.bloque },
    filas,
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

// Marca/desmarca la casa como "en convenio de pago" (mora con acuerdo con
// el administrador) — mientras esté marcada, cualquier pago que haga esa
// casa se clasifica como ingreso "Convenio/Cartera" sin importar el monto
// (ver src/lib/clasificar-ingreso.ts). Pedido del cliente, reunión 27/ago/2026.
export async function alternarConvenio(casaId: number, enConvenio: boolean) {
  await requireAdmin();
  await db.update(casas).set({ enConvenio }).where(eq(casas.id, casaId));
  revalidatePath("/casas");
}

export type GuardarUsuarioResultado = { ok: true } | { ok: false; error: string };

// Si un usuario se queda sin ninguna casa asignada (se reasignó su email a
// otra cuenta, o se le quitó el acceso a su última casa), no tiene sentido
// dejar el login huérfano — se borra, salvo que sea un admin.
async function limpiarUsuarioSiHuerfano(usuarioId: number) {
  const [{ restantes }] = await db
    .select({ restantes: count() })
    .from(casas)
    .where(eq(casas.usuarioId, usuarioId));
  if (restantes === 0) {
    await db
      .delete(usuarios)
      .where(and(eq(usuarios.id, usuarioId), eq(usuarios.rol, "propietario")));
  }
}

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

  const [casaActual] = await db
    .select({ usuarioId: casas.usuarioId })
    .from(casas)
    .where(eq(casas.id, casaId))
    .limit(1);
  const usuarioAnteriorId = casaActual?.usuarioId ?? null;

  const passwordHash = await bcrypt.hash(password, 10);

  // Si el correo ya existe (ej. un propietario con más de una casa), se
  // reusa esa cuenta en vez de crear un login duplicado — una casa nunca
  // tiene más de un usuario, pero un usuario sí puede tener varias casas.
  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, emailNormalizado))
    .limit(1);

  let usuarioId: number;
  if (existente) {
    usuarioId = existente.id;
    await db.update(usuarios).set({ passwordHash }).where(eq(usuarios.id, usuarioId));
  } else {
    const [creado] = await db
      .insert(usuarios)
      .values({ email: emailNormalizado, passwordHash, rol: "propietario" })
      .returning({ id: usuarios.id });
    usuarioId = creado.id;
  }

  await db.update(casas).set({ usuarioId }).where(eq(casas.id, casaId));

  if (usuarioAnteriorId && usuarioAnteriorId !== usuarioId) {
    await limpiarUsuarioSiHuerfano(usuarioAnteriorId);
  }

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
  const [casa] = await db
    .select({ usuarioId: casas.usuarioId })
    .from(casas)
    .where(eq(casas.id, casaId))
    .limit(1);
  if (!casa?.usuarioId) return;
  await db
    .update(usuarios)
    .set({
      cedula: datos.cedula.trim() || null,
      telefono: datos.telefono.trim() || null,
      telefonoSecundario: datos.telefonoSecundario.trim() || null,
      tipoResidente: datos.tipoResidente,
    })
    .where(eq(usuarios.id, casa.usuarioId));
  revalidatePath("/casas");
}

export async function eliminarUsuario(casaId: number) {
  await requireAdmin();
  const [casa] = await db
    .select({ usuarioId: casas.usuarioId })
    .from(casas)
    .where(eq(casas.id, casaId))
    .limit(1);
  if (!casa?.usuarioId) return;
  await db.update(casas).set({ usuarioId: null }).where(eq(casas.id, casaId));
  await limpiarUsuarioSiHuerfano(casa.usuarioId);
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
