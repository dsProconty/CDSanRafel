import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { obtenerPresupuesto } from "./actions";
import { PresupuestoManager } from "./presupuesto-manager";

export default async function CategoriasEgresoPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const tree = await obtenerPresupuesto();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Categorías de egreso
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de presupuesto en 3 niveles (Grupo → Tipo → Subtipo) para
            clasificar los gastos del informe económico. Los egresos que no
            se clasifican quedan &quot;pendiente de clasificar&quot; hasta que
            un admin les asigne un subtipo acá — salvo los servicios fijos
            (teléfono, internet, agua, luz) que se autoclasifican por palabra
            clave.
          </p>
        </div>

        <div className="mt-6">
          <PresupuestoManager tree={tree} />
        </div>
      </div>
    </AppShell>
  );
}
