import { eq, count } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, catalogoReferenciasBancarias } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogoutButton } from "./logout-button";

export default async function HomePage() {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Orquídeas San Rafael</h1>
          <p className="text-sm text-muted-foreground">
            {user.rol === "admin" ? "Administrador" : "Propietario"}
          </p>
        </div>
        <LogoutButton />
      </header>

      {user.rol === "admin" ? <ResumenAdmin /> : <ResumenCasa casaId={user.casaId} />}
    </div>
  );
}

async function ResumenAdmin() {
  const [{ totalCasas }] = await db
    .select({ totalCasas: count() })
    .from(casas);
  const [{ totalReferencias }] = await db
    .select({ totalReferencias: count() })
    .from(catalogoReferenciasBancarias);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo cargado</CardTitle>
        <CardDescription>
          Datos importados desde CASAS.xlsx en el Sprint 1.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-8">
        <div>
          <p className="text-2xl font-semibold">{totalCasas}</p>
          <p className="text-sm text-muted-foreground">Casas</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">{totalReferencias}</p>
          <p className="text-sm text-muted-foreground">Referencias bancarias</p>
        </div>
      </CardContent>
    </Card>
  );
}

async function ResumenCasa({ casaId }: { casaId: number | null }) {
  if (!casaId) {
    return <p className="text-sm text-muted-foreground">Sin casa asociada.</p>;
  }

  const [casa] = await db.select().from(casas).where(eq(casas.id, casaId)).limit(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Casa {casa.numero}</CardTitle>
        <CardDescription>Bloque {casa.bloque}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          El estado de cuenta y las expensas se habilitan en el Sprint 2.
        </p>
      </CardContent>
    </Card>
  );
}
