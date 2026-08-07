import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { tiposExpensa } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
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
    <AppShell>
      <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Crear deuda para todas las casas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Se crea una deuda igual para todas las casas del catálogo. Úsalo
            para la alícuota mensual o para cuotas extraordinarias.
          </p>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
          <FormDeudaMasiva tipos={tipos} />
        </div>
      </div>
    </AppShell>
  );
}
