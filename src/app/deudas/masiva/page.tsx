import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { tiposExpensa } from "@/db/schema";
import { FormDeudaMasiva } from "./form-deuda-masiva";

export default async function DeudaMasivaPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const tipos = await db
    .select()
    .from(tiposExpensa)
    .orderBy(asc(tiposExpensa.nombre));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          Crear deuda para todas las casas
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Se crea una deuda igual para todas las casas del catálogo. Úsalo
          para la alícuota mensual o para cuotas extraordinarias.
        </p>
        <div className="mt-6">
          <FormDeudaMasiva tipos={tipos} />
        </div>
      </div>
    </div>
  );
}
