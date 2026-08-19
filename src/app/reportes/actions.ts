"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { put } from "@vercel/blob";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  reporteEgresoLinea,
  reporteIngresoLinea,
  reportesFinancieros,
  usuarios,
  type CategoriaGasto,
} from "@/db/schema";
import {
  calcularEstadoCasas,
  NOMBRES_MES,
  sugerirLineasIngreso,
} from "@/lib/reporte-financiero";
import { renderReportePdf } from "@/lib/reporte-pdf";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.rol !== "admin") return null;
  return session;
}

function totales(
  lineasIngreso: { monto: string }[],
  lineasEgreso: { monto: string }[],
  saldoInicial: string
) {
  const totalIngresos = lineasIngreso.reduce((acc, l) => acc + Number(l.monto), 0);
  const totalEgresos = lineasEgreso.reduce((acc, l) => acc + Number(l.monto), 0);
  const saldoFinal = Number(saldoInicial) + totalIngresos - totalEgresos;
  return { totalIngresos, totalEgresos, saldoFinal };
}

export type FilaReporte = {
  id: number;
  mes: number;
  anio: number;
  etiquetaPeriodo: string;
  saldoInicial: string;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number;
  casasMora: number;
  casasTotal: number;
  pdfUrl: string | null;
  generadoEn: Date | null;
  usuarioEmail: string | null;
};

export async function obtenerReportes(): Promise<FilaReporte[]> {
  const session = await auth();
  if (!session) return [];
  const esAdmin = session.user.rol === "admin";

  const filas = await db
    .select({
      id: reportesFinancieros.id,
      mes: reportesFinancieros.mes,
      anio: reportesFinancieros.anio,
      saldoInicial: reportesFinancieros.saldoInicial,
      casasMora: reportesFinancieros.casasMora,
      casasTotal: reportesFinancieros.casasTotal,
      pdfUrl: reportesFinancieros.pdfUrl,
      generadoEn: reportesFinancieros.generadoEn,
      usuarioEmail: usuarios.email,
    })
    .from(reportesFinancieros)
    .leftJoin(usuarios, eq(usuarios.id, reportesFinancieros.usuarioId))
    .where(esAdmin ? undefined : isNotNull(reportesFinancieros.pdfUrl))
    .orderBy(desc(reportesFinancieros.anio), desc(reportesFinancieros.mes));

  const resultado: FilaReporte[] = [];
  for (const f of filas) {
    const [ingresos, egresos] = await Promise.all([
      db
        .select({ monto: reporteIngresoLinea.monto })
        .from(reporteIngresoLinea)
        .where(eq(reporteIngresoLinea.reporteId, f.id)),
      db
        .select({ monto: reporteEgresoLinea.monto })
        .from(reporteEgresoLinea)
        .where(eq(reporteEgresoLinea.reporteId, f.id)),
    ]);
    const t = totales(ingresos, egresos, f.saldoInicial);
    resultado.push({
      ...f,
      etiquetaPeriodo: `${NOMBRES_MES[f.mes - 1]} ${f.anio}`,
      ...t,
    });
  }
  return resultado;
}

export type CrearReporteResultado =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function crearBorradorReporte(
  mes: number,
  anio: number
): Promise<CrearReporteResultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (mes < 1 || mes > 12 || !anio) {
    return { ok: false, error: "Elegí un mes y año válidos." };
  }

  const [existente] = await db
    .select({ id: reportesFinancieros.id })
    .from(reportesFinancieros)
    .where(and(eq(reportesFinancieros.mes, mes), eq(reportesFinancieros.anio, anio)));
  if (existente) {
    return { ok: false, error: `Ya existe un informe para ${NOMBRES_MES[mes - 1]} ${anio}.` };
  }

  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anioAnterior = mes === 1 ? anio - 1 : anio;
  const [anterior] = await db
    .select({ id: reportesFinancieros.id, saldoInicial: reportesFinancieros.saldoInicial })
    .from(reportesFinancieros)
    .where(
      and(eq(reportesFinancieros.mes, mesAnterior), eq(reportesFinancieros.anio, anioAnterior))
    );

  let saldoInicial = "0";
  if (anterior) {
    const [ingresos, egresos] = await Promise.all([
      db
        .select({ monto: reporteIngresoLinea.monto })
        .from(reporteIngresoLinea)
        .where(eq(reporteIngresoLinea.reporteId, anterior.id)),
      db
        .select({ monto: reporteEgresoLinea.monto })
        .from(reporteEgresoLinea)
        .where(eq(reporteEgresoLinea.reporteId, anterior.id)),
    ]);
    const t = totales(ingresos, egresos, anterior.saldoInicial);
    saldoInicial = t.saldoFinal.toFixed(2);
  }

  const estadoCasas = await calcularEstadoCasas();
  const sugerencias = await sugerirLineasIngreso(mes, anio);

  const [reporte] = await db
    .insert(reportesFinancieros)
    .values({
      mes,
      anio,
      saldoInicial,
      casasPagaron: estadoCasas.casasPagaron,
      casasMora: estadoCasas.casasMora,
      casasTotal: estadoCasas.casasTotal,
      usuarioId: Number(session.user.id),
    })
    .returning({ id: reportesFinancieros.id });

  if (sugerencias.length > 0) {
    await db.insert(reporteIngresoLinea).values(
      sugerencias.map((s, i) => ({
        reporteId: reporte.id,
        tipoExpensaId: s.tipoExpensaId,
        etiqueta: s.etiqueta,
        monto: s.monto.toFixed(2),
        orden: i,
      }))
    );
  }

  revalidatePath("/reportes");
  return { ok: true, id: reporte.id };
}

export type ReporteDetalle = {
  id: number;
  mes: number;
  anio: number;
  saldoInicial: string;
  casasPagaron: number;
  casasMora: number;
  casasTotal: number;
  pdfUrl: string | null;
  lineasIngreso: { id: number; etiqueta: string; monto: string }[];
  lineasEgreso: { id: number; categoria: CategoriaGasto; subtipo: string; monto: string }[];
};

export async function obtenerReporteDetalle(id: number): Promise<ReporteDetalle | null> {
  const session = await requireAdmin();
  if (!session) return null;

  const [reporte] = await db
    .select()
    .from(reportesFinancieros)
    .where(eq(reportesFinancieros.id, id));
  if (!reporte) return null;

  const [lineasIngreso, lineasEgreso] = await Promise.all([
    db
      .select({
        id: reporteIngresoLinea.id,
        etiqueta: reporteIngresoLinea.etiqueta,
        monto: reporteIngresoLinea.monto,
      })
      .from(reporteIngresoLinea)
      .where(eq(reporteIngresoLinea.reporteId, id))
      .orderBy(asc(reporteIngresoLinea.orden)),
    db
      .select({
        id: reporteEgresoLinea.id,
        categoria: reporteEgresoLinea.categoria,
        subtipo: reporteEgresoLinea.subtipo,
        monto: reporteEgresoLinea.monto,
      })
      .from(reporteEgresoLinea)
      .where(eq(reporteEgresoLinea.reporteId, id))
      .orderBy(asc(reporteEgresoLinea.orden)),
  ]);

  return {
    id: reporte.id,
    mes: reporte.mes,
    anio: reporte.anio,
    saldoInicial: reporte.saldoInicial,
    casasPagaron: reporte.casasPagaron,
    casasMora: reporte.casasMora,
    casasTotal: reporte.casasTotal,
    pdfUrl: reporte.pdfUrl,
    lineasIngreso,
    lineasEgreso,
  };
}

type Resultado = { ok: true } | { ok: false; error: string };

export async function actualizarSaldoInicial(id: number, saldoInicial: number): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  await db
    .update(reportesFinancieros)
    .set({ saldoInicial: saldoInicial.toFixed(2), updatedAt: new Date() })
    .where(eq(reportesFinancieros.id, id));
  revalidatePath(`/reportes/${id}`);
  return { ok: true };
}

export async function actualizarLineaIngreso(id: number, monto: number): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  await db
    .update(reporteIngresoLinea)
    .set({ monto: monto.toFixed(2) })
    .where(eq(reporteIngresoLinea.id, id));
  return { ok: true };
}

export type AgregarLineaResultado = { ok: true; id: number } | { ok: false; error: string };

export async function agregarLineaIngreso(
  reporteId: number,
  etiqueta: string,
  monto: number
): Promise<AgregarLineaResultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (!etiqueta.trim()) return { ok: false, error: "Ponele un nombre a la línea." };
  const [{ maxOrden }] = await db
    .select({ maxOrden: reporteIngresoLinea.orden })
    .from(reporteIngresoLinea)
    .where(eq(reporteIngresoLinea.reporteId, reporteId))
    .orderBy(desc(reporteIngresoLinea.orden))
    .limit(1);
  const [linea] = await db
    .insert(reporteIngresoLinea)
    .values({
      reporteId,
      tipoExpensaId: null,
      etiqueta: etiqueta.trim(),
      monto: monto.toFixed(2),
      orden: (maxOrden ?? 0) + 1,
    })
    .returning({ id: reporteIngresoLinea.id });
  revalidatePath(`/reportes/${reporteId}`);
  return { ok: true, id: linea.id };
}

export async function eliminarLineaIngreso(id: number, reporteId: number): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  await db.delete(reporteIngresoLinea).where(eq(reporteIngresoLinea.id, id));
  revalidatePath(`/reportes/${reporteId}`);
  return { ok: true };
}

export async function agregarLineaEgreso(
  reporteId: number,
  categoria: CategoriaGasto,
  subtipo: string,
  monto: number
): Promise<AgregarLineaResultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  if (!subtipo.trim()) return { ok: false, error: "Ponele un nombre al gasto." };
  const [{ maxOrden }] = await db
    .select({ maxOrden: reporteEgresoLinea.orden })
    .from(reporteEgresoLinea)
    .where(eq(reporteEgresoLinea.reporteId, reporteId))
    .orderBy(desc(reporteEgresoLinea.orden))
    .limit(1);
  const [linea] = await db
    .insert(reporteEgresoLinea)
    .values({
      reporteId,
      categoria,
      subtipo: subtipo.trim(),
      monto: monto.toFixed(2),
      orden: (maxOrden ?? 0) + 1,
    })
    .returning({ id: reporteEgresoLinea.id });
  revalidatePath(`/reportes/${reporteId}`);
  return { ok: true, id: linea.id };
}

export async function actualizarLineaEgreso(
  id: number,
  reporteId: number,
  categoria: CategoriaGasto,
  subtipo: string,
  monto: number
): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  await db
    .update(reporteEgresoLinea)
    .set({ categoria, subtipo: subtipo.trim(), monto: monto.toFixed(2) })
    .where(eq(reporteEgresoLinea.id, id));
  revalidatePath(`/reportes/${reporteId}`);
  return { ok: true };
}

export async function eliminarLineaEgreso(id: number, reporteId: number): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  await db.delete(reporteEgresoLinea).where(eq(reporteEgresoLinea.id, id));
  revalidatePath(`/reportes/${reporteId}`);
  return { ok: true };
}

export async function eliminarBorrador(id: number): Promise<Resultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };
  const [reporte] = await db
    .select({ pdfUrl: reportesFinancieros.pdfUrl })
    .from(reportesFinancieros)
    .where(eq(reportesFinancieros.id, id));
  if (!reporte) return { ok: false, error: "El informe no existe." };
  if (reporte.pdfUrl) {
    return { ok: false, error: "Ya se generó el PDF; no se puede borrar un informe publicado." };
  }
  await db.delete(reporteIngresoLinea).where(eq(reporteIngresoLinea.reporteId, id));
  await db.delete(reporteEgresoLinea).where(eq(reporteEgresoLinea.reporteId, id));
  await db.delete(reportesFinancieros).where(eq(reportesFinancieros.id, id));
  revalidatePath("/reportes");
  return { ok: true };
}

export type GenerarPdfResultado = { ok: true; pdfUrl: string } | { ok: false; error: string };

export async function generarPdfReporte(id: number): Promise<GenerarPdfResultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };

  const detalle = await obtenerReporteDetalle(id);
  if (!detalle) return { ok: false, error: "El informe no existe." };
  if (detalle.lineasEgreso.length === 0) {
    return { ok: false, error: "Cargá al menos un gasto antes de generar el PDF." };
  }

  const t = totales(detalle.lineasIngreso, detalle.lineasEgreso, detalle.saldoInicial);

  // Histórico de saldo final de los últimos meses, para el gráfico "Bancos".
  const todos = await db
    .select({
      id: reportesFinancieros.id,
      mes: reportesFinancieros.mes,
      anio: reportesFinancieros.anio,
      saldoInicial: reportesFinancieros.saldoInicial,
    })
    .from(reportesFinancieros)
    .orderBy(asc(reportesFinancieros.anio), asc(reportesFinancieros.mes));

  const historico: { etiqueta: string; saldoFinal: number }[] = [];
  for (const r of todos) {
    if (r.mes === detalle.mes && r.anio === detalle.anio) break;
    const [ingresos, egresos] = await Promise.all([
      db.select({ monto: reporteIngresoLinea.monto }).from(reporteIngresoLinea).where(eq(reporteIngresoLinea.reporteId, r.id)),
      db.select({ monto: reporteEgresoLinea.monto }).from(reporteEgresoLinea).where(eq(reporteEgresoLinea.reporteId, r.id)),
    ]);
    const tt = totales(ingresos, egresos, r.saldoInicial);
    historico.push({ etiqueta: `1-${NOMBRES_MES[r.mes - 1].slice(0, 3).toLowerCase()}`, saldoFinal: tt.saldoFinal });
  }
  historico.push({
    etiqueta: `1-${NOMBRES_MES[detalle.mes - 1].slice(0, 3).toLowerCase()}`,
    saldoFinal: t.saldoFinal,
  });
  const ultimos4 = historico.slice(-4);

  // Mes anterior, para el gráfico comparativo "Estadística".
  const mesAnterior = detalle.mes === 1 ? 12 : detalle.mes - 1;
  const anioAnterior = detalle.mes === 1 ? detalle.anio - 1 : detalle.anio;
  const [anterior] = await db
    .select({ id: reportesFinancieros.id, saldoInicial: reportesFinancieros.saldoInicial })
    .from(reportesFinancieros)
    .where(and(eq(reportesFinancieros.mes, mesAnterior), eq(reportesFinancieros.anio, anioAnterior)));
  let comparativo: { etiqueta: string; ingresos: number; egresos: number }[] = [];
  if (anterior) {
    const [ingresos, egresos] = await Promise.all([
      db.select({ monto: reporteIngresoLinea.monto }).from(reporteIngresoLinea).where(eq(reporteIngresoLinea.reporteId, anterior.id)),
      db.select({ monto: reporteEgresoLinea.monto }).from(reporteEgresoLinea).where(eq(reporteEgresoLinea.reporteId, anterior.id)),
    ]);
    const tt = totales(ingresos, egresos, anterior.saldoInicial);
    comparativo.push({
      etiqueta: NOMBRES_MES[mesAnterior - 1],
      ingresos: tt.totalIngresos,
      egresos: tt.totalEgresos,
    });
  }
  comparativo.push({
    etiqueta: NOMBRES_MES[detalle.mes - 1],
    ingresos: t.totalIngresos,
    egresos: t.totalEgresos,
  });

  const pdfBuffer = await renderReportePdf({
    mes: detalle.mes,
    anio: detalle.anio,
    saldoInicial: Number(detalle.saldoInicial),
    totalIngresos: t.totalIngresos,
    totalEgresos: t.totalEgresos,
    saldoFinal: t.saldoFinal,
    casasPagaron: detalle.casasPagaron,
    casasMora: detalle.casasMora,
    casasTotal: detalle.casasTotal,
    lineasIngreso: detalle.lineasIngreso.map((l) => ({ etiqueta: l.etiqueta, monto: Number(l.monto) })),
    lineasEgreso: detalle.lineasEgreso.map((l) => ({
      categoria: l.categoria,
      subtipo: l.subtipo,
      monto: Number(l.monto),
    })),
    historicoSaldo: ultimos4,
    comparativoMeses: comparativo,
  });

  const nombreArchivo = `reportes/${detalle.anio}-${String(detalle.mes).padStart(2, "0")}-informe-economico.pdf`;
  const blob = await put(nombreArchivo, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
    allowOverwrite: true,
  });

  await db
    .update(reportesFinancieros)
    .set({ pdfUrl: blob.url, generadoEn: new Date(), updatedAt: new Date() })
    .where(eq(reportesFinancieros.id, id));

  revalidatePath("/reportes");
  revalidatePath(`/reportes/${id}`);
  return { ok: true, pdfUrl: blob.url };
}
