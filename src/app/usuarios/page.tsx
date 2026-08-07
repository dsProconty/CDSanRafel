import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, usuarios } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatPill } from "@/components/ui/stat-pill";
import { TablaUsuarios } from "./tabla-usuarios";

export default async function UsuariosPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const filas = await db
    .select({
      casaId: casas.id,
      numero: casas.numero,
      propietario: casas.propietario,
      email: usuarios.email,
      cedula: usuarios.cedula,
      telefono: usuarios.telefono,
      telefonoSecundario: usuarios.telefonoSecundario,
      tipoResidente: usuarios.tipoResidente,
      comprobanteActivo: usuarios.comprobanteActivo,
      ultimoAcceso: usuarios.ultimoAcceso,
    })
    .from(usuarios)
    .innerJoin(casas, eq(casas.id, usuarios.casaId))
    .where(eq(usuarios.rol, "propietario"))
    .orderBy(asc(casas.numero));

  const filasSerializables = filas.map((f) => ({
    ...f,
    email: f.email ?? "",
    ultimoAcceso: f.ultimoAcceso ? f.ultimoAcceso.toISOString() : null,
  }));

  const conAcceso = filasSerializables.filter((f) => f.ultimoAcceso).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Usuarios
            </h1>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Directorio de residentes con acceso al sistema. Fusiona lo que
              antes eran las pantallas "Usuarios" y "Agenda".
            </p>
          </div>
          <Button asChild>
            <Link href="/casas">+ Nuevo acceso</Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <StatPill label="con acceso creado" value={filas.length} color="muted" />
          <StatPill label="ya iniciaron sesión" value={conAcceso} color="success" />
        </div>

        <div className="mt-6">
          <TablaUsuarios filas={filasSerializables} />
        </div>
      </div>
    </AppShell>
  );
}
