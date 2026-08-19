import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { obtenerReportes } from "./actions";
import { ListaReportes } from "./lista-reportes";
import { NuevoReporteForm } from "./nuevo-reporte-form";

export default async function ReportesPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  const esAdmin = session.user.rol === "admin";

  const reportes = await obtenerReportes();

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Informes económicos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {esAdmin
              ? "Un informe por mes: ingresos por tipo, gastos y saldo del condominio, listo para exportar a PDF."
              : "Informes económicos mensuales del condominio, publicados por la administración."}
          </p>
        </div>

        {esAdmin && (
          <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
            <NuevoReporteForm />
          </div>
        )}

        <section className="mt-8">
          <ListaReportes reportes={reportes} esAdmin={esAdmin} />
        </section>
      </div>
    </AppShell>
  );
}
