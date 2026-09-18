import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  casas,
  catalogoReferenciasBancarias,
  deudas,
  movimientosBancarios,
  tiposExpensa,
  usuarios,
} from "@/db/schema";
import { calcularEstadoCuenta, type FilaEstadoCuenta } from "./estado-cuenta";

export type DatosEstadoCuenta = {
  casa: {
    id: number;
    numero: string;
    bloque: string;
    propietario: string | null;
    usuarioId: number | null;
  };
  titular: {
    email: string | null;
    cedula: string | null;
    telefono: string | null;
  } | null;
  referencias: { referencia: string; banco: string }[];
  filas: FilaEstadoCuenta[];
  totalFacturado: number;
  totalPagado: number;
  saldo: number;
};

// Datos completos para el PDF de estado de cuenta de una casa — usado tanto
// por el admin (desde /casas) como por el propio propietario (desde su
// dashboard). El chequeo de quién puede pedir esta casa se hace en el
// llamador (server action o route handler), acá solo se arma la data.
export async function obtenerDatosEstadoCuenta(
  numero: string
): Promise<DatosEstadoCuenta | null> {
  const [casa] = await db
    .select({
      id: casas.id,
      numero: casas.numero,
      bloque: casas.bloque,
      propietario: casas.propietario,
      usuarioId: casas.usuarioId,
    })
    .from(casas)
    .where(eq(casas.numero, numero))
    .limit(1);
  if (!casa) return null;

  const [titular] = casa.usuarioId
    ? await db
        .select({
          email: usuarios.email,
          cedula: usuarios.cedula,
          telefono: usuarios.telefono,
        })
        .from(usuarios)
        .where(eq(usuarios.id, casa.usuarioId))
        .limit(1)
    : [];

  const referencias = await db
    .select({
      referencia: catalogoReferenciasBancarias.referencia,
      banco: catalogoReferenciasBancarias.banco,
    })
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
    a.fechaEmision.localeCompare(b.fechaEmision)
  );

  const totalFacturado = listaDeudas.reduce((acc, d) => acc + Number(d.monto), 0);
  const totalPagado = listaPagos.reduce((acc, p) => acc + Number(p.monto), 0);

  return {
    casa,
    titular: titular ?? null,
    referencias,
    filas,
    totalFacturado,
    totalPagado,
    saldo: totalFacturado - totalPagado,
  };
}
