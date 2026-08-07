"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { anularLoteDeudaMasiva, type LoteDeudaMasiva } from "./actions";

export type FilaLote = Omit<
  LoteDeudaMasiva,
  "createdAt" | "anuladoEn" | "conceptoNombre" | "tipoNombre"
> & {
  fechaCreacion: string;
  anulada: boolean;
  concepto: string;
};

export function HistorialDeudasMasivas({ filas }: { filas: FilaLote[] }) {
  const [pending, startTransition] = useTransition();

  if (filas.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Todavía no se creó ninguna deuda masiva.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Concepto</th>
            <th className="px-4 py-3">Monto</th>
            <th className="px-4 py-3">Descripción</th>
            <th className="px-4 py-3">Casas</th>
            <th className="px-4 py-3">Creada por</th>
            <th className="px-4 py-3 text-right">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((f) => (
            <tr key={f.id} className="hover:bg-accent/40">
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {f.fecha}
              </td>
              <td className="px-4 py-3 text-foreground">{f.concepto}</td>
              <td className="px-4 py-3 text-foreground">
                ${Number(f.monto).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {f.descripcion ?? "—"}
              </td>
              <td className="px-4 py-3 text-foreground">
                {f.casasAfectadas}
                {f.casasAfectadas !== f.casasTotal && (
                  <span className="text-muted-foreground">
                    {" "}
                    / {f.casasTotal}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {f.usuarioEmail ?? "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {f.anulada ? (
                  <Badge variant="outline">Anulada</Badge>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !confirm(
                          `¿Anular esta deuda masiva? Se eliminará la deuda de las ${f.casasAfectadas} casas afectadas. Esta acción no se puede deshacer.`
                        )
                      ) {
                        return;
                      }
                      startTransition(async () => {
                        await anularLoteDeudaMasiva(f.id);
                      });
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive transition-colors hover:text-destructive/80 disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Anular
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
