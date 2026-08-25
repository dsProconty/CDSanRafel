"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { cargarEstadoCuenta, type ResultadoCarga } from "./actions";

export function UploadForm() {
  const [resultado, formAction, pending] = useActionState<
    ResultadoCarga | undefined,
    FormData
  >(cargarEstadoCuenta, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="file"
        name="archivo"
        accept=".xlsx"
        required
        className="rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
      />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Procesando…" : "Cargar y procesar"}
      </Button>

      {resultado && !resultado.ok && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {resultado.error}
        </p>
      )}

      {resultado?.ok && (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Créditos en el archivo" value={resultado.resumen.creditos} />
          <Stat label="Débitos en el archivo" value={resultado.resumen.debitos} />
          <Stat label="Duplicados (ya cargados)" value={resultado.resumen.duplicados} />
          <Stat
            label="Abonos automáticos"
            value={resultado.resumen.matchedAutomatico}
            destacado
          />
          <Stat
            label="Pendientes de revisión"
            value={resultado.resumen.pendienteRevision}
            destacado
          />
          <Stat
            label="Sin catalogar"
            value={resultado.resumen.sinCatalogar}
            destacado
          />
          <Stat
            label="Egresos autoclasificados"
            value={resultado.resumen.debitosClasificados}
            destacado
          />
          <Stat
            label="Egresos pendientes de clasificar"
            value={resultado.resumen.debitosPendientes}
            destacado
          />
        </div>
      )}
    </form>
  );
}

function Stat({
  label,
  value,
  destacado,
}: {
  label: string;
  value: number;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-4">
      <p
        className={`text-2xl font-semibold ${destacado ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
