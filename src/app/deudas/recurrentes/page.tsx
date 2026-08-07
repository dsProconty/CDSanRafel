import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { obtenerConceptos } from "../conceptos/actions";
import { obtenerRecurrentes } from "./actions";
import { FormRecurrente } from "./form-recurrente";
import { ListaRecurrentes } from "./lista-recurrentes";

export default async function DeudasRecurrentesPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const todosLosConceptos = await obtenerConceptos();
  const conceptosActivos = todosLosConceptos.filter((c) => c.activo);

  const listaCasas = await db
    .select({ id: casas.id, numero: casas.numero, bloque: casas.bloque })
    .from(casas)
    .orderBy(asc(casas.numero));

  const recurrentes = await obtenerRecurrentes();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Deudas recurrentes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Programá un concepto para que se repita mes a mes — la alícuota
            ordinaria (indefinida) o una cuota extraordinaria dividida en
            varios meses. Se generan solas todos los meses; también podés
            pre-cargar varios meses de una vez.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
          <FormRecurrente conceptos={conceptosActivos} casas={listaCasas} />
        </div>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            Planes programados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuántos períodos lleva generados cada plan y si está activo,
            pausado o completo.
          </p>
          <ListaRecurrentes recurrentes={recurrentes} />
        </section>
      </div>
    </AppShell>
  );
}
