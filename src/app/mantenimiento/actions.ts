"use server";

import { revalidatePath } from "next/cache";
import { count } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  cargasEstadoCuenta,
  deudaMasivaLotes,
  deudaRecurrente,
  deudaRecurrenteExclusion,
  deudas,
  movimientoCandidatosCasa,
  movimientosBancarios,
  reporteEgresoLinea,
  reporteIngresoLinea,
  reportesFinancieros,
} from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.rol !== "admin") return null;
  return session;
}

export type ConteoAmbiente = {
  movimientosBancarios: number;
  movimientoCandidatosCasa: number;
  cargasEstadoCuenta: number;
  reportesFinancieros: number;
  deudas: number;
  deudaMasivaLotes: number;
  deudaRecurrente: number;
};

// Cuenta las filas de todo lo que borra `vaciarAmbienteQA` — se muestra en
// pantalla y se usa en el mensaje de confirmación antes de borrar, para que
// el admin vea el impacto real antes de confirmar (pedido del cliente,
// sep 2026: dar un ambiente limpio a QA sin tocar casas/usuarios/catálogos).
export async function obtenerConteoAmbiente(): Promise<ConteoAmbiente | null> {
  const session = await requireAdmin();
  if (!session) return null;

  const [
    [{ value: mb }],
    [{ value: mcc }],
    [{ value: cec }],
    [{ value: rf }],
    [{ value: d }],
    [{ value: dml }],
    [{ value: dr }],
  ] = await Promise.all([
    db.select({ value: count() }).from(movimientosBancarios),
    db.select({ value: count() }).from(movimientoCandidatosCasa),
    db.select({ value: count() }).from(cargasEstadoCuenta),
    db.select({ value: count() }).from(reportesFinancieros),
    db.select({ value: count() }).from(deudas),
    db.select({ value: count() }).from(deudaMasivaLotes),
    db.select({ value: count() }).from(deudaRecurrente),
  ]);

  return {
    movimientosBancarios: mb,
    movimientoCandidatosCasa: mcc,
    cargasEstadoCuenta: cec,
    reportesFinancieros: rf,
    deudas: d,
    deudaMasivaLotes: dml,
    deudaRecurrente: dr,
  };
}

export type VaciarResultado = { ok: true } | { ok: false; error: string };

// Vacía el ambiente para pruebas de QA (pedido del cliente, sep 2026):
// borra TODO lo transaccional/dummy (movimientos bancarios, deudas,
// informes económicos, planes recurrentes) pero NUNCA toca casas,
// usuarios, catalogoReferenciasBancarias ni los catálogos parametrizados
// (tiposExpensa, conceptosDeuda, presupuestoTipo/Subtipo/Clase,
// tiposIngreso) — esas tablas ni se mencionan acá a propósito. Orden de
// borrado respeta las foreign keys (validado a mano, ver ESTADO_PROYECTO.md).
export async function vaciarAmbienteQA(): Promise<VaciarResultado> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "No autorizado." };

  await db.delete(movimientoCandidatosCasa);
  await db.delete(movimientosBancarios);
  await db.delete(cargasEstadoCuenta);
  await db.delete(reporteIngresoLinea);
  await db.delete(reporteEgresoLinea);
  await db.delete(reportesFinancieros);
  await db.delete(deudaRecurrenteExclusion);
  await db.delete(deudas);
  await db.delete(deudaMasivaLotes);
  await db.delete(deudaRecurrente);

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/cargar");
  revalidatePath("/deudas/masiva");
  revalidatePath("/reportes");
  revalidatePath("/mantenimiento");

  return { ok: true };
}
