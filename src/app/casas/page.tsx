import { redirect } from "next/navigation";
import { eq, isNotNull, sum } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, deudas, movimientosBancarios, usuarios } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { StatPill } from "@/components/ui/stat-pill";
import { CasasExplorer, type EstadoCasa, type FilaCasa } from "./casas-explorer";

export default async function CasasPage() {
  const session = await auth();
  if (session?.user.rol !== "admin") {
    redirect("/");
  }

  const [filasBase, deudasPorCasa, abonosPorCasa] = await Promise.all([
    db
      .select({
        id: casas.id,
        numero: casas.numero,
        bloque: casas.bloque,
        propietario: casas.propietario,
        usuarioId: casas.usuarioId,
        email: usuarios.email,
        cedula: usuarios.cedula,
        telefono: usuarios.telefono,
        telefonoSecundario: usuarios.telefonoSecundario,
        tipoResidente: usuarios.tipoResidente,
        ultimoAcceso: usuarios.ultimoAcceso,
      })
      .from(casas)
      .leftJoin(usuarios, eq(casas.usuarioId, usuarios.id)),
    db
      .select({ casaId: deudas.casaId, total: sum(deudas.monto) })
      .from(deudas)
      .groupBy(deudas.casaId),
    db
      .select({ casaId: movimientosBancarios.casaId, total: sum(movimientosBancarios.monto) })
      .from(movimientosBancarios)
      .where(isNotNull(movimientosBancarios.casaId))
      .groupBy(movimientosBancarios.casaId),
  ]);

  const deudaPorCasaId = new Map(deudasPorCasa.map((d) => [d.casaId, Number(d.total ?? 0)]));
  const abonoPorCasaId = new Map(
    abonosPorCasa.map((a) => [a.casaId as number, Number(a.total ?? 0)])
  );

  const filas: FilaCasa[] = filasBase
    .map((f) => {
      const tieneAcceso = f.usuarioId != null;
      let estado: EstadoCasa = "none";
      if (tieneAcceso) {
        const saldo = (deudaPorCasaId.get(f.id) ?? 0) - (abonoPorCasaId.get(f.id) ?? 0);
        estado = saldo > 0 ? "due" : "ok";
      }
      return {
        id: f.id,
        numero: f.numero,
        bloque: f.bloque,
        propietario: f.propietario,
        estado,
        tieneAcceso,
        email: f.email,
        cedula: f.cedula,
        telefono: f.telefono,
        telefonoSecundario: f.telefonoSecundario,
        tipoResidente: f.tipoResidente,
        ultimoAcceso: f.ultimoAcceso ? f.ultimoAcceso.toISOString() : null,
      };
    })
    .sort((a, b) => parseInt(a.numero, 10) - parseInt(b.numero, 10));

  const alDia = filas.filter((f) => f.estado === "ok").length;
  const pendientes = filas.filter((f) => f.estado === "due").length;
  const sinAcceso = filas.filter((f) => f.estado === "none").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">Casas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filas.length} unidades · catálogo, acceso y contacto en un solo lugar
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill label="total" value={filas.length} color="muted" />
            <StatPill label="al día" value={alDia} color="success" />
            <StatPill label="pendientes" value={pendientes} color="destructive" />
            <StatPill label="sin acceso creado" value={sinAcceso} color="muted" />
          </div>
        </div>

        <div className="mt-6">
          <CasasExplorer casas={filas} />
        </div>
      </div>
    </AppShell>
  );
}
