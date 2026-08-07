import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { tiposExpensa } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { obtenerConceptos } from "./actions";
import { ListaConceptos } from "./lista-conceptos";

export default async function ConceptosDeudaPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const tipos = await db
    .select()
    .from(tiposExpensa)
    .orderBy(asc(tiposExpensa.nombre));

  const conceptos = await obtenerConceptos();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Conceptos de deuda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de deudas parametrizadas de antemano (ej. alícuota
            ordinaria mensual, cuota extraordinaria). Se eligen desde{" "}
            <span className="font-medium text-foreground">
              Deudas masivas
            </span>{" "}
            para no volver a tipear tipo, monto y descripción cada vez.
          </p>
        </div>

        {tipos.length === 0 ? (
          <p className="mt-6 text-sm text-destructive">
            No hay tipos de expensa creados todavía (corre el seed de tipos de
            expensa) antes de crear conceptos.
          </p>
        ) : (
          <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
            <ListaConceptos conceptos={conceptos} tipos={tipos} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
