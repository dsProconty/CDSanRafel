import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { StatPill } from "@/components/ui/stat-pill";

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

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">Casas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de casas y referencias bancarias.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill label="total" value={todas.length} color="muted" />
            {BLOQUES.map((b) => (
              <StatPill
                key={b}
                label={b === "Otros" ? "otros" : `bloque ${b}`}
                value={contarBloque(b)}
                color={b === bloqueActivo ? "primary" : "muted"}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {BLOQUES.map((b) => (
            <Link
              key={b}
              href={`/casas?bloque=${b}`}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                bloqueActivo === b
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {b === "Otros" ? "Otros" : `Bloque ${b}`}
            </Link>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
          {casasFiltradas.map((c) => (
            <Link
              key={c.id}
              href={`/casas/${c.numero}`}
              className="rounded-lg border border-border bg-card px-3 py-3 text-center text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-accent"
            >
              {c.numero}
            </Link>
          ))}
          {casasFiltradas.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              No hay casas en este bloque.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
