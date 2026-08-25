import Link from "next/link";
import { eq, sum } from "drizzle-orm";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  TrendingUp,
  UserX,
} from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/db";
import { casas, deudas, movimientosBancarios, usuarios } from "@/db/schema";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  CobranzaMensualChart,
  EstadoCasasDonut,
  type PuntoCobranza,
} from "./kpi-charts";

export default async function HomePage() {
  const session = await auth();
  const user = session!.user;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
        {user.rol === "admin" ? <ResumenAdmin /> : <ResumenCasa casaId={user.casaId} />}
      </div>
    </AppShell>
  );
}

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function moneda(valor: number) {
  return `$${valor.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
}

async function ResumenAdmin() {
  const [listaCasas, listaUsuarios, listaDeudas, listaMovimientos] = await Promise.all([
    db.select({ id: casas.id, numero: casas.numero }).from(casas),
    db.select({ casaId: usuarios.casaId }).from(usuarios),
    db.select({ casaId: deudas.casaId, monto: deudas.monto, fecha: deudas.fecha }).from(deudas),
    db
      .select({
        casaId: movimientosBancarios.casaId,
        monto: movimientosBancarios.monto,
        fecha: movimientosBancarios.fechaTransaccion,
        estado: movimientosBancarios.estado,
      })
      .from(movimientosBancarios),
  ]);

  const casasConAcceso = new Set(
    listaUsuarios.map((u) => u.casaId).filter((id): id is number => id !== null)
  );

  const deudaPorCasa = new Map<number, number>();
  for (const d of listaDeudas) {
    deudaPorCasa.set(d.casaId, (deudaPorCasa.get(d.casaId) ?? 0) + Number(d.monto));
  }
  const abonoPorCasa = new Map<number, number>();
  for (const m of listaMovimientos) {
    if (m.casaId === null) continue;
    abonoPorCasa.set(m.casaId, (abonoPorCasa.get(m.casaId) ?? 0) + Number(m.monto));
  }

  let saldoPendienteTotal = 0;
  let casasAlDia = 0;
  let casasPendientes = 0;
  const morosos: { numero: string; saldo: number }[] = [];

  for (const c of listaCasas) {
    const tieneAcceso = casasConAcceso.has(c.id);
    const saldo = (deudaPorCasa.get(c.id) ?? 0) - (abonoPorCasa.get(c.id) ?? 0);
    if (tieneAcceso) {
      if (saldo > 0.005) {
        casasPendientes++;
        saldoPendienteTotal += saldo;
        morosos.push({ numero: c.numero, saldo });
      } else {
        casasAlDia++;
      }
    }
  }
  const casasSinAcceso = listaCasas.length - casasConAcceso.size;
  morosos.sort((a, b) => b.saldo - a.saldo);

  const pendienteRevision = listaMovimientos.filter(
    (m) => m.estado === "pendiente_revision"
  ).length;
  const sinCatalogar = listaMovimientos.filter((m) => m.estado === "sin_catalogar").length;

  // Cobranza mensual: facturado (deudas emitidas) vs cobrado (movimientos), últimos 6 meses.
  const hoy = new Date();
  const meses: { clave: string; etiqueta: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({
      clave: `${d.getFullYear()}-${d.getMonth()}`,
      etiqueta: MESES_CORTOS[d.getMonth()],
    });
  }
  const facturadoPorMes = new Map<string, number>();
  for (const d of listaDeudas) {
    const [anio, mes] = d.fecha.split("-").map(Number);
    const clave = `${anio}-${mes - 1}`;
    facturadoPorMes.set(clave, (facturadoPorMes.get(clave) ?? 0) + Number(d.monto));
  }
  const cobradoPorMes = new Map<string, number>();
  for (const m of listaMovimientos) {
    const [anio, mes] = m.fecha.split("-").map(Number);
    const clave = `${anio}-${mes - 1}`;
    cobradoPorMes.set(clave, (cobradoPorMes.get(clave) ?? 0) + Number(m.monto));
  }
  const cobranzaMensual: PuntoCobranza[] = meses.map(({ clave, etiqueta }) => ({
    mes: etiqueta,
    facturado: Math.round(facturadoPorMes.get(clave) ?? 0),
    cobrado: Math.round(cobradoPorMes.get(clave) ?? 0),
  }));

  const claveMesActual = `${hoy.getFullYear()}-${hoy.getMonth()}`;
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const claveMesAnterior = `${mesAnterior.getFullYear()}-${mesAnterior.getMonth()}`;
  const cobradoMesActual = cobradoPorMes.get(claveMesActual) ?? 0;
  const cobradoMesAnterior = cobradoPorMes.get(claveMesAnterior) ?? 0;
  const variacionCobranza =
    cobradoMesAnterior > 0
      ? ((cobradoMesActual - cobradoMesAnterior) / cobradoMesAnterior) * 100
      : cobradoMesActual > 0
        ? 100
        : 0;

  const totalConAcceso = casasAlDia + casasPendientes;
  const porcentajeAlDia = totalConAcceso > 0 ? (casasAlDia / totalConAcceso) * 100 : 0;

  const estadoCasasDonut = [
    { name: "Al día", value: casasAlDia, color: "var(--success)" },
    { name: "Pendiente", value: casasPendientes, color: "var(--destructive)" },
    { name: "Sin acceso", value: casasSinAcceso, color: "var(--muted-foreground)" },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista general del condominio a hoy.
          </p>
        </div>
        <Button asChild>
          <Link href="/cargar">Cargar estado de cuenta</Link>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          icon={Banknote}
          color="destructive"
          label="Saldo pendiente total"
          value={moneda(saldoPendienteTotal)}
          hint={`${casasPendientes} casas en mora`}
        />
        <KpiCard
          icon={CheckCircle2}
          color="success"
          label="Casas al día"
          value={`${porcentajeAlDia.toFixed(0)}%`}
          hint={`${casasAlDia} de ${totalConAcceso} con acceso`}
        />
        <KpiCard
          icon={TrendingUp}
          color="info"
          label="Cobrado este mes"
          value={moneda(cobradoMesActual)}
          trend={{ value: variacionCobranza, label: "vs mes anterior" }}
        />
        <KpiCard
          icon={AlertTriangle}
          color="warning"
          label="Pendientes por revisar"
          value={String(pendienteRevision + sinCatalogar)}
          hint="Cola de conciliación bancaria"
          href="/cargar"
        />
        <KpiCard
          icon={UserX}
          color="muted"
          label="Casas sin acceso"
          value={String(casasSinAcceso)}
          hint="Sin usuario creado todavía"
          href="/casas"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-5 py-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">
            Cobranza mensual
          </h2>
          <p className="text-xs text-muted-foreground">
            Deuda facturada vs. dinero efectivamente cobrado, últimos 6 meses.
          </p>
          <div className="mt-2">
            <CobranzaMensualChart datos={cobranzaMensual} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-5">
          <h2 className="text-sm font-semibold text-foreground">Estado de casas</h2>
          <p className="text-xs text-muted-foreground">
            {listaCasas.length} unidades del condominio.
          </p>
          <div className="mt-2">
            <EstadoCasasDonut datos={estadoCasasDonut} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {estadoCasasDonut.map((d) => (
              <span key={d.name} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-muted-foreground">
                  {d.name} ({d.value})
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {morosos.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Casas con mayor saldo pendiente
              </h2>
              <p className="text-xs text-muted-foreground">
                Top {Math.min(8, morosos.length)} de {morosos.length} casas en mora.
              </p>
            </div>
            <Link
              href="/casas"
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {morosos.slice(0, 8).map((m) => {
              const porcentaje = Math.min(
                100,
                (m.saldo / morosos[0].saldo) * 100
              );
              return (
                <div key={m.numero} className="flex items-center gap-3 text-sm">
                  <span className="w-10 shrink-0 font-medium text-foreground">
                    {m.numero}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-destructive"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right font-medium text-foreground">
                    {moneda(m.saldo)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

async function ResumenCasa({ casaId }: { casaId: number | null }) {
  if (!casaId) {
    return <p className="text-sm text-muted-foreground">Sin casa asociada.</p>;
  }

  const [casa] = await db.select().from(casas).where(eq(casas.id, casaId)).limit(1);
  const [{ totalAbonado }] = await db
    .select({ totalAbonado: sum(movimientosBancarios.monto) })
    .from(movimientosBancarios)
    .where(eq(movimientosBancarios.casaId, casaId));
  const [{ totalDeudas }] = await db
    .select({ totalDeudas: sum(deudas.monto) })
    .from(deudas)
    .where(eq(deudas.casaId, casaId));

  const abonado = Number(totalAbonado ?? 0);
  const deuda = Number(totalDeudas ?? 0);
  const saldo = deuda - abonado;
  const alDia = saldo <= 0;

  return (
    <div>
      <p className="text-sm text-muted-foreground">Bloque {casa.bloque}</p>
      <h1 className="mt-1 text-2xl font-semibold text-foreground">
        Casa {casa.numero}
      </h1>
      <div className="mt-6 max-w-md rounded-lg border border-border bg-card px-6 py-6">
        <p
          className={`text-3xl font-semibold ${alDia ? "text-success" : "text-destructive"}`}
        >
          {alDia
            ? `$${Math.abs(saldo).toFixed(2)} a favor`
            : `$${saldo.toFixed(2)} pendiente`}
        </p>
        <Badge variant={alDia ? "success" : "destructive"} className="mt-2">
          {alDia ? "Al día" : "Saldo pendiente de pago"}
        </Badge>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Deudas</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              ${deuda.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Abonado</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              ${abonado.toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>
      <Link
        href="/reportes"
        className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
      >
        Ver informes económicos del condominio →
      </Link>
    </div>
  );
}
