import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, isNotNull, sum } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, deudas, movimientosBancarios, usuarios } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { CasasGrid, type EstadoCasa } from "./casas-grid";

const BLOQUES = ["A", "B", "Otros"] as const;

export default async function CasasPage({
  searchParams,
}: {
  searchParams: Promise<{ bloque?: string }>;
}) {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const { bloque: bloqueParam } = await searchParams;
  const bloqueActivo = BLOQUES.includes(bloqueParam as (typeof BLOQUES)[number])
    ? (bloqueParam as (typeof BLOQUES)[number])
    : "A";

  const todas = await db.select().from(casas).orderBy(asc(casas.numero));
  const porNumero = (a: (typeof todas)[number], b: (typeof todas)[number]) =>
    parseInt(a.numero, 10) - parseInt(b.numero, 10);
  const casasFiltradas = (
    bloqueActivo === "Otros"
      ? todas.filter((c) => c.bloque !== "A" && c.bloque !== "B")
      : todas.filter((c) => c.bloque === bloqueActivo)
  ).sort(porNumero);

  const contarBloque = (b: (typeof BLOQUES)[number]) =>
    b === "Otros"
      ? todas.filter((c) => c.bloque !== "A" && c.bloque !== "B").length
      : todas.filter((c) => c.bloque === b).length;

  const [deudasPorCasa, abonosPorCasa, casasConUsuario] = await Promise.all([
    db
      .select({ casaId: deudas.casaId, total: sum(deudas.monto) })
      .from(deudas)
      .groupBy(deudas.casaId),
    db
      .select({ casaId: movimientosBancarios.casaId, total: sum(movimientosBancarios.monto) })
      .from(movimientosBancarios)
      .where(isNotNull(movimientosBancarios.casaId))
      .groupBy(movimientosBancarios.casaId),
    db
      .select({ casaId: usuarios.casaId })
      .from(usuarios)
      .where(isNotNull(usuarios.casaId)),
  ]);

  const deudaPorCasaId = new Map(deudasPorCasa.map((d) => [d.casaId, Number(d.total ?? 0)]));
  const abonoPorCasaId = new Map(
    abonosPorCasa.map((a) => [a.casaId as number, Number(a.total ?? 0)])
  );
  const casasConAcceso = new Set(casasConUsuario.map((u) => u.casaId));

  function estadoDeCasa(casaId: number): EstadoCasa {
    if (!casasConAcceso.has(casaId)) return "none";
    const saldo = (deudaPorCasaId.get(casaId) ?? 0) - (abonoPorCasaId.get(casaId) ?? 0);
    return saldo > 0 ? "due" : "ok";
  }

  const filasGrid = casasFiltradas.map((c) => ({
    id: c.id,
    numero: c.numero,
    estado: estadoDeCasa(c.id),
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">Casas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {todas.length} unidades · Bloque A y Bloque B
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex gap-0.5 rounded-lg bg-secondary p-0.5">
            {BLOQUES.map((b) => (
              <Link
                key={b}
                href={`/casas?bloque=${b}`}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  bloqueActivo === b
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b === "Otros" ? "Otros" : `Bloque ${b}`}
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    bloqueActivo === b ? "text-muted-foreground" : "text-muted-foreground/70"
                  }`}
                >
                  {contarBloque(b)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <CasasGrid casas={filasGrid} />
        </div>
      </div>
    </AppShell>
  );
}
