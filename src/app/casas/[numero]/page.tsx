import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, desc, eq, sum } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  casas,
  catalogoReferenciasBancarias,
  deudas,
  movimientosBancarios,
  tiposExpensa,
  usuarios,
} from "@/db/schema";
import { FormDeuda } from "./form-deuda";
import { FormPropietario } from "./form-propietario";
import { FormUsuario } from "./form-usuario";

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
  const [casa] = await db
    .select()
    .from(casas)
    .where(eq(casas.numero, numero))
    .limit(1);
  if (!casa) notFound();

  const [usuario] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.casaId, casa.id))
    .limit(1);

  const referencias = await db
    .select()
    .from(catalogoReferenciasBancarias)
    .where(eq(catalogoReferenciasBancarias.casaId, casa.id));

  const listaDeudas = await db
    .select({
      id: deudas.id,
      monto: deudas.monto,
      fecha: deudas.fecha,
      descripcion: deudas.descripcion,
      tipo: tiposExpensa.nombre,
    })
    .from(deudas)
    .innerJoin(tiposExpensa, eq(tiposExpensa.id, deudas.tipoExpensaId))
    .where(eq(deudas.casaId, casa.id))
    .orderBy(desc(deudas.fecha));

  const tipos = await db
    .select()
    .from(tiposExpensa)
    .orderBy(asc(tiposExpensa.nombre));

  const [{ totalDeudas }] = await db
    .select({ totalDeudas: sum(deudas.monto) })
    .from(deudas)
    .where(eq(deudas.casaId, casa.id));
  const [{ totalAbonado }] = await db
    .select({ totalAbonado: sum(movimientosBancarios.monto) })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.casaId, casa.id));

  const saldo = Number(totalDeudas ?? 0) - Number(totalAbonado ?? 0);
  const alDia = saldo <= 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/casas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a casas
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          Casa {casa.numero}
        </h1>
        <p className="text-sm text-muted-foreground">
          Bloque {casa.bloque} ·{" "}
          <span className={alDia ? "text-secondary" : "text-destructive"}>
            {alDia
              ? `$${Math.abs(saldo).toFixed(2)} a favor`
              : `$${saldo.toFixed(2)} pendiente`}
          </span>
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Propietario
          </h2>
          <FormPropietario casaId={casa.id} propietarioActual={casa.propietario ?? ""} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Acceso al sistema
          </h2>
          <p className="text-sm text-muted-foreground">
            {usuario?.email
              ? `Usuario actual: ${usuario.email}`
              : "Esta casa no tiene usuario creado todavía."}
          </p>
          <FormUsuario casaId={casa.id} emailActual={usuario?.email ?? ""} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Referencias bancarias ({referencias.length})
          </h2>
          {referencias.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Ninguna todavía — se aprenden cuando se carga o revisa el
              estado de cuenta del banco.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
              {referencias.map((r) => (
                <li key={r.id}>{r.referencia}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Deudas</h2>
          <FormDeuda casaId={casa.id} tipos={tipos} />
          {listaDeudas.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Sin deudas registradas.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {listaDeudas.map((d) => (
                <li
                  key={d.id}
                  className="flex justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {d.tipo} · {d.fecha}
                    {d.descripcion ? ` · ${d.descripcion}` : ""}
                  </span>
                  <span className="font-medium">
                    ${Number(d.monto).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
