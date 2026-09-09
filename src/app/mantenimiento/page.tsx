import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { obtenerConteoAmbiente } from "./actions";
import { PanelVaciar } from "./panel-vaciar";

export default async function MantenimientoPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const conteo = await obtenerConteoAmbiente();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Mantenimiento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Herramientas para dejar el sistema en un estado limpio antes de
            una ronda de pruebas.
          </p>
        </div>

        <div className="mt-6">
          <PanelVaciar conteo={conteo} />
        </div>
      </div>
    </AppShell>
  );
}
