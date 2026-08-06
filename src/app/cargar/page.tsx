import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { UploadForm } from "./upload-form";

export default async function CargarPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver
        </Link>
        <h1 className="mt-4 font-display text-3xl font-medium text-foreground">
          Cargar estado de cuenta
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Sube el Excel de movimientos de Banco Guayaquil. Los documentos ya
          cargados se descartan automáticamente y las referencias se cruzan
          contra el catálogo de casas.
        </p>

        <div className="mt-8">
          <UploadForm />
        </div>
      </div>
    </div>
  );
}
