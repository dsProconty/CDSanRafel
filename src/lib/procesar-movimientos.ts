import { inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  catalogoReferenciasBancarias,
  movimientoCandidatosCasa,
  movimientosBancarios,
} from "@/db/schema";
import { intentarAutoclasificarEgreso } from "./clasificar-egreso";
import {
  clasificarIngresoAutomatico,
  idTipoIngresoNoIdentificado,
  textoBusquedaIngreso,
} from "./clasificar-ingreso";
import type { FilaBanco } from "./parse-bank-excel";

export type ResumenCarga = {
  totalFilas: number;
  creditos: number;
  debitos: number;
  duplicados: number;
  matchedAutomatico: number;
  pendienteRevision: number;
  sinCatalogar: number;
  debitosClasificados: number;
  debitosPendientes: number;
};

// Créditos (signo "+") son los pagos de propietarios: se cruzan contra el
// catálogo de casas. Débitos (signo "-") son egresos reales del condominio:
// se guardan también (antes se descartaban) y se autoclasifican por palabra
// clave contra concepto + referencia2 — el resto queda "pendiente de
// clasificar" hasta que un admin los revise desde el editor del informe
// económico del mes correspondiente (ver `crearBorradorReporte`).
export async function procesarMovimientosBancarios(
  filas: FilaBanco[]
): Promise<ResumenCarga> {
  const creditosFilas = filas.filter((f) => f.signo === "+");
  const debitosFilas = filas.filter((f) => f.signo === "-");

  const porDocumento = new Map<string, FilaBanco>();
  for (const fila of filas) {
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

  const duplicados = filas.length - nuevas.length;

  const resumenBase = {
    totalFilas: filas.length,
    creditos: creditosFilas.length,
    debitos: debitosFilas.length,
    duplicados,
  };

  if (nuevas.length === 0) {
    return {
      ...resumenBase,
      matchedAutomatico: 0,
      pendienteRevision: 0,
      sinCatalogar: 0,
      debitosClasificados: 0,
      debitosPendientes: 0,
    };
  }

  const nuevosCreditos = nuevas.filter((f) => f.signo === "+");
  const nuevosDebitos = nuevas.filter((f) => f.signo === "-");

  // --- Créditos: matching contra el catálogo de casas (igual que antes) ---
  const referenciasUnicas = [...new Set(nuevosCreditos.map((f) => f.referencia))];
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

  const idNoIdentificado = await idTipoIngresoNoIdentificado();

  const creditosParaInsertar = await Promise.all(
    nuevosCreditos.map(async (fila) => {
      const candidatos = candidatosPorReferencia.get(fila.referencia) ?? [];
      let estado: "matched" | "pendiente_revision" | "sin_catalogar";
      let casaId: number | null = null;
      let tipoIngresoId: number | null = null;

      if (candidatos.length === 1) {
        estado = "matched";
        casaId = candidatos[0];
        matchedAutomatico++;
        tipoIngresoId = await clasificarIngresoAutomatico(
          casaId,
          fila.monto,
          textoBusquedaIngreso(fila)
        );
      } else if (candidatos.length > 1) {
        estado = "pendiente_revision";
        pendienteRevision++;
        tipoIngresoId = idNoIdentificado;
      } else {
        estado = "sin_catalogar";
        sinCatalogar++;
        tipoIngresoId = idNoIdentificado;
      }

      return { fila, estado, casaId, candidatos, tipoIngresoId };
    })
  );

  const creditosInsertados = creditosParaInsertar.length
    ? await db
        .insert(movimientosBancarios)
        .values(
          creditosParaInsertar.map(({ fila, estado, casaId, tipoIngresoId }) => ({
            documento: fila.documento,
            fechaTransaccion: fila.fechaTransaccion,
            fechaContable: fila.fechaContable || null,
            monto: fila.monto.toFixed(2),
            referenciaCruda: fila.referencia,
            referencia2: fila.referencia2 || null,
            referencia3: fila.referencia3 || null,
            concepto: fila.concepto || null,
            agencia: fila.agencia || null,
            casaId,
            tipoIngresoId,
            estado,
          }))
        )
        .returning({ id: movimientosBancarios.id })
    : [];

  const candidatosAInsertar = creditosParaInsertar.flatMap((item, i) =>
    item.estado === "pendiente_revision"
      ? item.candidatos.map((casaId) => ({
          movimientoId: creditosInsertados[i].id,
          casaId,
        }))
      : []
  );

  if (candidatosAInsertar.length > 0) {
    await db.insert(movimientoCandidatosCasa).values(candidatosAInsertar);
  }

  // --- Débitos: autoclasificación por palabra clave (concepto + referencia2) ---
  let debitosClasificados = 0;
  let debitosPendientes = 0;
  const debitosParaInsertar: { fila: FilaBanco; claseId: number | null }[] = [];
  for (const fila of nuevosDebitos) {
    const claseId = await intentarAutoclasificarEgreso(`${fila.concepto} ${fila.referencia2}`);
    if (claseId !== null) debitosClasificados++;
    else debitosPendientes++;
    debitosParaInsertar.push({ fila, claseId });
  }

  if (debitosParaInsertar.length > 0) {
    await db.insert(movimientosBancarios).values(
      debitosParaInsertar.map(({ fila, claseId }) => ({
        documento: fila.documento,
        fechaTransaccion: fila.fechaTransaccion,
        fechaContable: fila.fechaContable || null,
        monto: fila.monto.toFixed(2),
        referenciaCruda: fila.referencia,
        referencia2: fila.referencia2 || null,
        referencia3: fila.referencia3 || null,
        concepto: fila.concepto || null,
        agencia: fila.agencia || null,
        casaId: null,
        estado: "debito" as const,
        claseId,
      }))
    );
  }

  return {
    ...resumenBase,
    matchedAutomatico,
    pendienteRevision,
    sinCatalogar,
    debitosClasificados,
    debitosPendientes,
  };
}
