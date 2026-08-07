import { Badge } from "@/components/ui/badge";
import { BotonEliminar } from "@/app/casas/boton-eliminar";
import type { CasaDetalleData } from "./actions";
import { FormAgenda } from "./form-agenda";
import { FormDeuda } from "./form-deuda";
import { FormPropietario } from "./form-propietario";
import { FormUsuario } from "./form-usuario";

export function CasaDetalleContent({
  data,
  onSaved,
}: {
  data: CasaDetalleData;
  onSaved?: () => void;
}) {
  const { casa, usuario, referencias, deudas, tipos, saldo, alDia } = data;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">Bloque {casa.bloque}</p>
        <div className="flex items-center gap-2">
          <p
            className={`text-base font-semibold ${alDia ? "text-success" : "text-destructive"}`}
          >
            {alDia
              ? `$${Math.abs(saldo).toFixed(2)} a favor`
              : `$${saldo.toFixed(2)} pendiente`}
          </p>
          <Badge variant={alDia ? "success" : "destructive"}>
            {alDia ? "Al día" : "Pendiente"}
          </Badge>
        </div>
      </div>

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
