"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { cargasEstadoCuenta } from "@/db/schema";
import { parseBankExcel } from "@/lib/parse-bank-excel";
import {
  procesarMovimientosBancarios,
  type ResumenCarga,
} from "@/lib/procesar-movimientos";

export type ResultadoCarga =
  | { ok: true; resumen: ResumenCarga }
  | { ok: false; error: string };

export async function cargarEstadoCuenta(
  _prev: ResultadoCarga | undefined,
  formData: FormData
): Promise<ResultadoCarga> {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Selecciona un archivo Excel." };
  }

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const filas = parseBankExcel(buffer);
    const resumen = await procesarMovimientosBancarios(filas);

    await db.insert(cargasEstadoCuenta).values({
      usuarioId: Number(session.user.id),
      nombreArchivo: archivo.name,
      totalFilas: resumen.totalFilas,
      creditos: resumen.creditos,
      debitos: resumen.debitos,
      duplicados: resumen.duplicados,
      matchedAutomatico: resumen.matchedAutomatico,
      pendienteRevision: resumen.pendienteRevision,
      sinCatalogar: resumen.sinCatalogar,
      debitosClasificados: resumen.debitosClasificados,
      debitosPendientes: resumen.debitosPendientes,
    });

    revalidatePath("/cargar");
    revalidatePath("/");
    return { ok: true, resumen };
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error inesperado al procesar el archivo.";
    return { ok: false, error: mensaje };
  }
}
