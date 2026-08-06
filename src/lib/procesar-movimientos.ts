import { inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  catalogoReferenciasBancarias,
  movimientoCandidatosCasa,
  movimientosBancarios,
} from "@/db/schema";
import type { FilaBanco } from "./parse-bank-excel";

export type ResumenCarga = {
  totalFilas: number;
  creditos: number;
  debitos: number;
  duplicados: number;
  matchedAutomatico: number;
  pendienteRevision: number;
  sinCatalogar: number;
};

// Solo se procesan créditos (Signo "+"): son los pagos de propietarios que
// hay que cruzar contra el catálogo de casas. Los débitos son egresos del
// condominio (comisiones, pagos a terceros) y no participan del matching.
export async function procesarMovimientosBancarios(
  filas: FilaBanco[]
): Promise<ResumenCarga> {
  const creditos = filas.filter((f) => f.signo === "+");
  const debitos = filas.length - creditos.length;

  const porDocumento = new Map<string, FilaBanco>();
  for (const fila of creditos) {
    if (!porDocumento.has(fila.documento)) {
      porDocumento.set(fila.documento, fila);
    }
  }
  const documentosUnicos = [...porDocumento.keys()];

  const existentes = documentosUnicos.length
    ? await db
        .select({ documento: movimientosBancarios.documento })
        .from(movimientosBancarios)
        .where(inArray(movimientosBancarios.documento, documentosUnicos))
    : [];
  const yaCargados = new Set(existentes.map((e) => e.documento));

  const nuevas = documentosUnicos
    .filter((doc) => !yaCargados.has(doc))
    .map((doc) => porDocumento.get(doc)!);

  const duplicados = creditos.length - nuevas.length;

  const resumenBase = {
    totalFilas: filas.length,
    creditos: creditos.length,
    debitos,
    duplicados,
  };

  if (nuevas.length === 0) {
    return {
      ...resumenBase,
      matchedAutomatico: 0,
      pendienteRevision: 0,
      sinCatalogar: 0,
    };
  }

  const referenciasUnicas = [...new Set(nuevas.map((f) => f.referencia))];
  const catalogo = referenciasUnicas.length
    ? await db
        .select({
          referencia: catalogoReferenciasBancarias.referencia,
          casaId: catalogoReferenciasBancarias.casaId,
        })
        .from(catalogoReferenciasBancarias)
        .where(inArray(catalogoReferenciasBancarias.referencia, referenciasUnicas))
    : [];

  const candidatosPorReferencia = new Map<string, number[]>();
  for (const fila of catalogo) {
    const lista = candidatosPorReferencia.get(fila.referencia) ?? [];
    lista.push(fila.casaId);
    candidatosPorReferencia.set(fila.referencia, lista);
  }

  let matchedAutomatico = 0;
  let pendienteRevision = 0;
  let sinCatalogar = 0;

  const filasParaInsertar = nuevas.map((fila) => {
    const candidatos = candidatosPorReferencia.get(fila.referencia) ?? [];
    let estado: "matched" | "pendiente_revision" | "sin_catalogar";
    let casaId: number | null = null;

    if (candidatos.length === 1) {
      estado = "matched";
      casaId = candidatos[0];
      matchedAutomatico++;
    } else if (candidatos.length > 1) {
      estado = "pendiente_revision";
      pendienteRevision++;
    } else {
      estado = "sin_catalogar";
      sinCatalogar++;
    }

    return { fila, estado, casaId, candidatos };
  });

  const insertados = await db
    .insert(movimientosBancarios)
    .values(
      filasParaInsertar.map(({ fila, estado, casaId }) => ({
        documento: fila.documento,
        fechaTransaccion: fila.fechaTransaccion,
        fechaContable: fila.fechaContable || null,
        monto: fila.monto.toFixed(2),
        referenciaCruda: fila.referencia,
        concepto: fila.concepto || null,
        agencia: fila.agencia || null,
        casaId,
        estado,
      }))
    )
    .returning({ id: movimientosBancarios.id });

  const candidatosAInsertar = filasParaInsertar.flatMap((item, i) =>
    item.estado === "pendiente_revision"
      ? item.candidatos.map((casaId) => ({
          movimientoId: insertados[i].id,
          casaId,
        }))
      : []
  );

  if (candidatosAInsertar.length > 0) {
    await db.insert(movimientoCandidatosCasa).values(candidatosAInsertar);
  }

  return {
    ...resumenBase,
    matchedAutomatico,
    pendienteRevision,
    sinCatalogar,
  };
}
