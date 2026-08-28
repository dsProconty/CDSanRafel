import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { obtenerTiposIngreso } from "./actions";
import { ListaTiposIngreso } from "./lista-tipos-ingreso";

export default async function TiposIngresoPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const tipos = await obtenerTiposIngreso();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Tipos de ingreso
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo con el que se clasifican los pagos que entran (un solo
            nivel, a diferencia del catálogo de egresos). Los pagos se
            clasifican solos por convenio de pago, palabra clave o monto —
            el resto queda pendiente en{" "}
            <span className="font-medium text-foreground">
              Cargar estado de cuenta
            </span>
            . Las palabras clave (ej. &quot;tag&quot;) se prueban contra la
            referencia/concepto del banco antes que las reglas por monto.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
          <ListaTiposIngreso tipos={tipos} />
        </div>
      </div>
    </AppShell>
  );
}
