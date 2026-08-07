import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { obtenerDetalleCasa } from "./actions";
import { CasaDetalleContent } from "./casa-detalle-content";

export default async function CasaDetallePage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const { numero } = await params;
  const data = await obtenerDetalleCasa(numero);
  if (!data) notFound();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
        <Link
          href="/casas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a casas
        </Link>

        <div className="mt-4 flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-foreground">
            Casa {data.casa.numero}
          </h1>
          <Badge variant="secondary">Bloque {data.casa.bloque}</Badge>
        </div>

        <div className="mt-4">
          <CasaDetalleContent data={data} expanded />
        </div>
      </div>
    </AppShell>
  );
}
