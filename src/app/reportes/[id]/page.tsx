import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { NOMBRES_MES } from "@/lib/reporte-financiero";
import { obtenerReporteDetalle } from "../actions";
import { EditorReporte } from "./editor-reporte";

export default async function EditorReportePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const detalle = await obtenerReporteDetalle(Number(id));
  if (!detalle) {
    notFound();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Informe económico — {NOMBRES_MES[detalle.mes - 1]} {detalle.anio}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Los ingresos vienen sugeridos del catálogo de tipos de expensa —
            revisalos y ajustalos. Los gastos se cargan a mano.
          </p>
        </div>

        <div className="mt-6">
          <EditorReporte detalle={detalle} />
        </div>
      </div>
    </AppShell>
  );
}
