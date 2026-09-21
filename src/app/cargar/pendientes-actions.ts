"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  casas,
  catalogoReferenciasBancarias,
  movimientoCandidatosCasa,
  movimientosBancarios,
} from "@/db/schema";
import { clasificarIngresoAutomatico, textoBusquedaIngreso } from "@/lib/clasificar-ingreso";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    throw new Error("No autorizado.");
  }
}

// Cola de revisión: la referencia ya matcheaba N casas candidatas, el admin
// elige una. No hace falta "aprender" nada: esa referencia ya apuntaba a
// esta casa en el catálogo.
export async function asignarCandidato(movimientoId: number, casaId: number) {
  await requireAdmin();

  const [movimiento] = await db
    .select({
      monto: movimientosBancarios.monto,
      referenciaCruda: movimientosBancarios.referenciaCruda,
      referencia2: movimientosBancarios.referencia2,
      referencia3: movimientosBancarios.referencia3,
      concepto: movimientosBancarios.concepto,
    })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.id, movimientoId))
    .limit(1);
  const tipoIngresoId = movimiento
    ? await clasificarIngresoAutomatico(
        casaId,
        Number(movimiento.monto),
        textoBusquedaIngreso({
          referencia: movimiento.referenciaCruda,
          referencia2: movimiento.referencia2,
          referencia3: movimiento.referencia3,
          concepto: movimiento.concepto,
        }),
        movimientoId
      )
    : null;

  await db.batch([
    db
      .update(movimientosBancarios)
      .set({ casaId, estado: "matched", tipoIngresoId })
      .where(eq(movimientosBancarios.id, movimientoId)),
    db
      .delete(movimientoCandidatosCasa)
      .where(eq(movimientoCandidatosCasa.movimientoId, movimientoId)),
  ]);

  revalidatePath("/cargar");
  revalidatePath("/");
}

export type DividirEntreCasasResultado = { ok: true } | { ok: false; error: string };

// Cuando la misma referencia matchea varias casas porque una sola persona
// paga por todas ellas desde una cuenta compartida (ej. dueño con 3
// unidades que deposita un monto que cubre las 3 alícuotas de una sola
// vez), reparte el monto del movimiento en partes iguales entre esas
// casas en vez de forzar al admin a elegir una sola (pedido real del
// cliente, llamada sep 2026 con Nico — caso "Freire Palomino").
//
// El movimiento original NUNCA se borra (se deja en $0, `estado` pasa a
// "matched" para que salga de la cola) — así, si el mismo Excel se vuelve
// a subir, el dedupe por `documento` lo sigue reconociendo como ya
// procesado. Se crean N movimientos nuevos, uno por casa, con el mismo
// `documento` sufijado (-1, -2, ...) para no violar el índice único.
export async function dividirEntreCasas(
  movimientoId: number
): Promise<DividirEntreCasasResultado> {
  await requireAdmin();

  const [movimiento] = await db
    .select({
      documento: movimientosBancarios.documento,
      fechaTransaccion: movimientosBancarios.fechaTransaccion,
      fechaContable: movimientosBancarios.fechaContable,
      monto: movimientosBancarios.monto,
      referenciaCruda: movimientosBancarios.referenciaCruda,
      referencia2: movimientosBancarios.referencia2,
      referencia3: movimientosBancarios.referencia3,
      concepto: movimientosBancarios.concepto,
      agencia: movimientosBancarios.agencia,
      estado: movimientosBancarios.estado,
    })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.id, movimientoId))
    .limit(1);

  if (!movimiento) {
    return { ok: false, error: "El movimiento ya no existe." };
  }
  if (movimiento.estado !== "pendiente_revision") {
    return { ok: false, error: "Este movimiento ya fue resuelto." };
  }

  const candidatos = await db
    .select({ casaId: movimientoCandidatosCasa.casaId })
    .from(movimientoCandidatosCasa)
    .where(eq(movimientoCandidatosCasa.movimientoId, movimientoId));

  if (candidatos.length < 2) {
    return { ok: false, error: "Este movimiento no tiene varias casas candidatas." };
  }

  const casaIds = candidatos.map((c) => c.casaId).sort((a, b) => a - b);
  const n = casaIds.length;
  // Reparto en centavos para no arrastrar error de punto flotante — el
  // resto (si el monto no es exactamente divisible) va a las primeras casas.
  const totalCentavos = Math.round(Number(movimiento.monto) * 100);
  const baseCentavos = Math.floor(totalCentavos / n);
  const restoCentavos = totalCentavos - baseCentavos * n;

  const texto = textoBusquedaIngreso({
    referencia: movimiento.referenciaCruda,
    referencia2: movimiento.referencia2,
    referencia3: movimiento.referencia3,
    concepto: movimiento.concepto,
  });

  const partes = await Promise.all(
    casaIds.map(async (casaId, i) => {
      const centavos = baseCentavos + (i < restoCentavos ? 1 : 0);
      const monto = centavos / 100;
      const tipoIngresoId = await clasificarIngresoAutomatico(casaId, monto, texto, movimientoId);
      return { casaId, monto, tipoIngresoId };
    })
  );

  await db.batch([
    db
      .update(movimientosBancarios)
      .set({ monto: "0.00", estado: "matched" })
      .where(eq(movimientosBancarios.id, movimientoId)),
    db
      .delete(movimientoCandidatosCasa)
      .where(eq(movimientoCandidatosCasa.movimientoId, movimientoId)),
    db.insert(movimientosBancarios).values(
      partes.map((p, i) => ({
        documento: `${movimiento.documento}-${i + 1}`,
        fechaTransaccion: movimiento.fechaTransaccion,
        fechaContable: movimiento.fechaContable,
        monto: p.monto.toFixed(2),
        referenciaCruda: movimiento.referenciaCruda,
        referencia2: movimiento.referencia2,
        referencia3: movimiento.referencia3,
        concepto: movimiento.concepto,
        agencia: movimiento.agencia,
        casaId: p.casaId,
        tipoIngresoId: p.tipoIngresoId,
        estado: "matched" as const,
      }))
    ),
  ]);

  revalidatePath("/cargar");
  revalidatePath("/");
  return { ok: true };
}

export type AsignarManualResultado = { ok: true } | { ok: false; error: string };

// Cola "sin catalogar": el admin busca la casa a mano. Además de confirmar
// el abono, se aprende la referencia para que la próxima carga la matchee sola.
export async function asignarManual(
  movimientoId: number,
  numeroCasa: string
): Promise<AsignarManualResultado> {
  await requireAdmin();

  const [casa] = await db
    .select({ id: casas.id })
    .from(casas)
    .where(eq(casas.numero, numeroCasa.trim()))
    .limit(1);

  if (!casa) {
    return { ok: false, error: `No existe la casa "${numeroCasa}".` };
  }

  const [movimiento] = await db
    .select({
      referenciaCruda: movimientosBancarios.referenciaCruda,
      referencia2: movimientosBancarios.referencia2,
      referencia3: movimientosBancarios.referencia3,
      concepto: movimientosBancarios.concepto,
      monto: movimientosBancarios.monto,
    })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.id, movimientoId))
    .limit(1);

  if (!movimiento) {
    return { ok: false, error: "El movimiento ya no existe." };
  }

  const tipoIngresoId = await clasificarIngresoAutomatico(
    casa.id,
    Number(movimiento.monto),
    textoBusquedaIngreso({
      referencia: movimiento.referenciaCruda,
      referencia2: movimiento.referencia2,
      referencia3: movimiento.referencia3,
      concepto: movimiento.concepto,
    }),
    movimientoId
  );

  await db.batch([
    db
      .update(movimientosBancarios)
      .set({ casaId: casa.id, estado: "matched", tipoIngresoId })
      .where(eq(movimientosBancarios.id, movimientoId)),
    db
      .insert(catalogoReferenciasBancarias)
      .values({ casaId: casa.id, referencia: movimiento.referenciaCruda })
      .onConflictDoNothing({
        target: [
          catalogoReferenciasBancarias.casaId,
          catalogoReferenciasBancarias.referencia,
        ],
      }),
  ]);

  revalidatePath("/cargar");
  revalidatePath("/");
  return { ok: true };
}

// Clasificación anticipada de un débito antes de que exista el informe del
// mes: cuando se cree el borrador, `crearBorradorReporte` ya lo trae con
// esta clase asignada (o pendiente, si acá se elige "Clasificar…" sin nada).
export async function clasificarMovimientoDebito(
  movimientoId: number,
  claseId: number | null
) {
  await requireAdmin();
  await db
    .update(movimientosBancarios)
    .set({ claseId })
    .where(eq(movimientosBancarios.id, movimientoId));
  revalidatePath("/cargar");
}

// Clasificación manual de un ingreso que quedó "matched" pero sin regla
// automática que aplicara (pago parcial sin convenio, o directamente un
// tipo ambiguo como Tags/Reservas Comunales/Multas/Agua-Basura/Devolución).
export async function clasificarMovimientoIngreso(
  movimientoId: number,
  tipoIngresoId: number | null
) {
  await requireAdmin();
  await db
    .update(movimientosBancarios)
    .set({ tipoIngresoId })
    .where(eq(movimientosBancarios.id, movimientoId));
  revalidatePath("/cargar");
}
