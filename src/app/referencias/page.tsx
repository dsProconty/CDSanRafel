import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { obtenerReferencias } from "./actions";
import { ListaReferencias } from "./lista-referencias";

export default async function ReferenciasPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const [referencias, todasLasCasas] = await Promise.all([
    obtenerReferencias(),
    db
      .select({ numero: casas.numero, bloque: casas.bloque })
      .from(casas)
      .orderBy(asc(casas.numero)),
  ]);

  return (
    <AppShell>
      <datalist id="casas-datalist-referencias">
        {todasLasCasas.map((c) => (
          <option key={c.numero} value={c.numero} />
        ))}
      </datalist>

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Referencias bancarias
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Qué referencia bancaria usa cada casa para pagar — así el
            sistema los reconoce solos al subir el Excel del banco. Se
            completa sola cuando resolvés un pago en{" "}
            <span className="font-medium text-foreground">
              Cargar estado de cuenta
            </span>
            , pero acá las tenés todas juntas para agregar o corregir a
            mano. Una misma referencia puede estar vinculada a más de una
            casa (ej. pagan desde la misma cuenta) — en ese caso el pago
            cae en la cola de revisión para elegir a cuál corresponde.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
          <ListaReferencias referencias={referencias} />
        </div>
      </div>
    </AppShell>
  );
}
