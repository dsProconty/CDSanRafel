import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { UploadForm } from "./upload-form";

export default async function CargarPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Cargar estado de cuenta
          </h1>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Sube el Excel de movimientos de Banco Guayaquil. Los documentos ya
            cargados se descartan automáticamente y las referencias se cruzan
            contra el catálogo de casas.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
          <UploadForm />
        </div>
      </div>
    </AppShell>
  );
}
