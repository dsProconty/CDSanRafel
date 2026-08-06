import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas } from "@/db/schema";

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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Casas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {todas.length} casas en total.
        </p>

        <div className="mt-6 flex gap-2">
          {BLOQUES.map((b) => (
            <Link
              key={b}
              href={`/casas?bloque=${b}`}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
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
              className="rounded-lg border border-border bg-card px-3 py-3 text-center text-sm font-medium text-foreground hover:bg-accent"
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
    </div>
  );
}
