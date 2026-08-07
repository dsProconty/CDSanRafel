"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  generarSiguienteAhora,
  pausarRecurrente,
  reanudarRecurrente,
  type Recurrente,
} from "./actions";

export function ListaRecurrentes({ recurrentes }: { recurrentes: Recurrente[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (recurrentes.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Todavía no hay ningún plan de deuda recurrente programado.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
            <th className="px-4 py-3">Concepto</th>
            <th className="px-4 py-3">Monto/mes</th>
            <th className="px-4 py-3">Inicio</th>
            <th className="px-4 py-3">Progreso</th>
            <th className="px-4 py-3">Excluidas</th>
            <th className="px-4 py-3">Creado por</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {recurrentes.map((r) => {
            const completo =
              r.totalPeriodos !== null && r.periodosGenerados >= r.totalPeriodos;
            return (
              <tr key={r.id} className="hover:bg-accent/40">
                <td className="px-4 py-3 font-medium text-foreground">
                  {r.conceptoNombre}
                </td>
                <td className="px-4 py-3 text-foreground">
                  ${Number(r.monto).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {r.fechaInicio}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {r.periodosGenerados}
                  {r.totalPeriodos !== null ? ` / ${r.totalPeriodos}` : " (indefinido)"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.casasExcluidas || "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {r.usuarioEmail ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {completo ? (
                    <Badge variant="outline">Completo</Badge>
                  ) : r.activo ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="warning">Pausado</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    {!completo && (
                      <button
                        type="button"
                        disabled={pending}
                        title="Generar el siguiente período ahora"
                        onClick={() => {
                          startTransition(async () => {
                            await generarSiguienteAhora(r.id);
                            router.refresh();
                          });
                        }}
                        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        <Zap className="h-4 w-4" />
                      </button>
                    )}
                    {!completo && (
                      <button
                        type="button"
                        disabled={pending}
                        title={r.activo ? "Pausar" : "Reanudar"}
                        onClick={() => {
                          startTransition(async () => {
                            if (r.activo) await pausarRecurrente(r.id);
                            else await reanudarRecurrente(r.id);
                            router.refresh();
                          });
                        }}
                        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        {r.activo ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
