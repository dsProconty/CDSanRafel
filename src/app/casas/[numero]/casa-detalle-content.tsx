import { Banknote, CircleDollarSign, Home, User, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BotonEliminar } from "@/app/casas/boton-eliminar";
import type { CasaDetalleData } from "./actions";
import { FormAgenda } from "./form-agenda";
import { FormDeuda } from "./form-deuda";
import { FormPropietario } from "./form-propietario";
import { FormUsuario } from "./form-usuario";
import { ToggleConvenio } from "./toggle-convenio";

function KpiCard({
  icon: Icon,
  colorClass,
  label,
  value,
}: {
  icon: LucideIcon;
  colorClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${colorClass}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-foreground" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function CasaDetalleContent({
  data,
  onSaved,
  expanded,
}: {
  data: CasaDetalleData;
  onSaved?: () => void;
  expanded?: boolean;
}) {
  const { casa, usuario, referencias, deudas, tipos, saldo, alDia } = data;
  const saldoFavor = alDia ? Math.abs(saldo) : 0;
  const saldoPendiente = alDia ? 0 : saldo;

  return (
    <div>
      <div
        className={`grid grid-cols-2 gap-2.5 ${expanded ? "lg:grid-cols-4" : ""}`}
      >
        <KpiCard
          icon={User}
          colorClass="bg-primary"
          label="Propietario"
          value={casa.propietario || "Sin nombre"}
        />
        <KpiCard
          icon={Home}
          colorClass="bg-slate-700"
          label="Casa"
          value={`${casa.numero} · Bloque ${casa.bloque}`}
        />
        <KpiCard
          icon={CircleDollarSign}
          colorClass="bg-success"
          label="Saldo a favor"
          value={`$${saldoFavor.toFixed(2)}`}
        />
        <KpiCard
          icon={Banknote}
          colorClass="bg-destructive"
          label="Saldo pendiente"
          value={`$${saldoPendiente.toFixed(2)}`}
        />
      </div>

      <ToggleConvenio casaId={casa.id} enConvenio={casa.enConvenio} onSaved={onSaved} />

      <section className="mt-6 rounded-lg border border-border bg-card px-6 py-5">
        <h2 className="text-sm font-semibold text-foreground">Propietario</h2>
        <FormPropietario
          casaId={casa.id}
          propietarioActual={casa.propietario ?? ""}
          onSaved={onSaved}
        />
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Acceso al sistema
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {usuario?.email
                ? `Usuario actual: ${usuario.email}`
                : "Esta casa no tiene usuario creado todavía."}
            </p>
            {usuario && usuario.otrasCasas.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Este mismo usuario también tiene acceso a:{" "}
                <span className="font-medium text-foreground">
                  {usuario.otrasCasas.join(", ")}
                </span>
                . Editar correo/contraseña o eliminar acceso acá afecta esas casas también.
              </p>
            )}
          </div>
          {usuario && (
            <BotonEliminar
              casaId={casa.id}
              nombre={casa.propietario ?? ""}
              onDeleted={onSaved}
            />
          )}
        </div>
        <FormUsuario
          casaId={casa.id}
          emailActual={usuario?.email ?? ""}
          onSaved={onSaved}
        />
      </section>

      {usuario && (
        <section className="mt-6 rounded-lg border border-border bg-card px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            Datos de contacto
          </h2>
          <FormAgenda
            casaId={casa.id}
            cedulaActual={usuario.cedula ?? ""}
            telefonoActual={usuario.telefono ?? ""}
            telefonoSecundarioActual={usuario.telefonoSecundario ?? ""}
            tipoResidenteActual={usuario.tipoResidente}
            onSaved={onSaved}
          />
        </section>
      )}

      <section className="mt-6 rounded-lg border border-border bg-card px-6 py-5">
        <h2 className="text-sm font-semibold text-foreground">
          Referencias bancarias ({referencias.length})
        </h2>
        {referencias.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Ninguna todavía — se aprenden cuando se carga o revisa el estado
            de cuenta del banco.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {referencias.map((r) => (
              <Badge key={r.id} variant="outline">
                {r.referencia}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card px-6 py-5">
        <h2 className="text-sm font-semibold text-foreground">
          Deudas ({deudas.length})
        </h2>
        <FormDeuda casaId={casa.id} tipos={tipos} onSaved={onSaved} />
        {deudas.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Sin deudas registradas.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border rounded-lg border border-border">
            {deudas.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{d.tipo}</Badge>
                  <span className="text-muted-foreground">
                    {d.fecha}
                    {d.descripcion ? ` · ${d.descripcion}` : ""}
                  </span>
                </div>
                <span className="font-medium text-foreground">
                  ${Number(d.monto).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
