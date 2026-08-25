"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { proximoSort, SortableTh, type SortState } from "@/components/ui/sortable-th";
import {
  generarSiguienteAhora,
  pausarRecurrente,
  reanudarRecurrente,
  type Recurrente,
} from "./actions";

const ESTADO_FILTROS = ["Todos", "activo", "pausado", "completo"] as const;
type EstadoFiltro = (typeof ESTADO_FILTROS)[number];
const ESTADO_FILTRO_LABEL: Record<EstadoFiltro, string> = {
  Todos: "Todos los estados",
  activo: "Activo",
  pausado: "Pausado",
  completo: "Completo",
};

type SortKey = "concepto" | "monto" | "inicio" | "progreso" | "excluidas" | "creadoPor" | "estado";

const ESTADO_RECURRENTE_ORDEN: Record<EstadoFiltro, number> = {
  Todos: -1,
  activo: 0,
  pausado: 1,
  completo: 2,
};

function estadoDe(r: Recurrente): "activo" | "pausado" | "completo" {
  const completo = r.totalPeriodos !== null && r.periodosGenerados >= r.totalPeriodos;
  return completo ? "completo" : r.activo ? "activo" : "pausado";
}

function comparar(a: Recurrente, b: Recurrente, key: SortKey): number {
  switch (key) {
    case "concepto":
      return a.conceptoNombre.localeCompare(b.conceptoNombre);
    case "monto":
      return Number(a.monto) - Number(b.monto);
    case "inicio":
      return a.fechaInicio.localeCompare(b.fechaInicio);
    case "progreso":
      return a.periodosGenerados - b.periodosGenerados;
    case "excluidas":
      return a.casasExcluidas - b.casasExcluidas;
    case "creadoPor":
      return (a.usuarioEmail ?? "").localeCompare(b.usuarioEmail ?? "");
    case "estado":
      return ESTADO_RECURRENTE_ORDEN[estadoDe(a)] - ESTADO_RECURRENTE_ORDEN[estadoDe(b)];
    default:
      return 0;
  }
}

export function ListaRecurrentes({ recurrentes }: { recurrentes: Recurrente[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("Todos");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "concepto", dir: "asc" });

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const resultado = recurrentes.filter((r) => {
      const estado = estadoDe(r);
      if (estadoFiltro !== "Todos" && estado !== estadoFiltro) return false;
      if (
        t &&
        !r.conceptoNombre.toLowerCase().includes(t) &&
        !(r.usuarioEmail ?? "").toLowerCase().includes(t)
      ) {
        return false;
      }
      return true;
    });
    const signo = sort.dir === "asc" ? 1 : -1;
    return resultado.sort((a, b) => signo * comparar(a, b, sort.key));
  }, [recurrentes, busqueda, estadoFiltro, sort]);

  if (recurrentes.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Todavía no hay ningún plan de deuda recurrente programado.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por concepto o creado por…"
        />
        <Select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}
        >
          {ESTADO_FILTROS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_FILTRO_LABEL[e]}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
            <SortableTh label="Concepto" sortKey="concepto" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Monto/mes" sortKey="monto" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Inicio" sortKey="inicio" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Progreso" sortKey="progreso" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Excluidas" sortKey="excluidas" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Creado por" sortKey="creadoPor" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Estado" sortKey="estado" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <th className="sticky right-0 bg-muted px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filtrados.map((r) => {
            const completo =
              r.totalPeriodos !== null && r.periodosGenerados >= r.totalPeriodos;
            return (
              <tr key={r.id} className="group hover:bg-accent/40">
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
                <td className="sticky right-0 bg-card px-4 py-3 group-hover:bg-accent/40">
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
          {filtrados.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No se encontraron resultados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
