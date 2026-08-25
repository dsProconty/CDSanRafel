"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { proximoSort, SortableTh, type SortState } from "@/components/ui/sortable-th";
import { anularLoteDeudaMasiva, type LoteDeudaMasiva } from "./actions";

export type FilaLote = Omit<
  LoteDeudaMasiva,
  "createdAt" | "anuladoEn" | "conceptoNombre" | "tipoNombre" | "recurrenteId"
> & {
  fechaCreacion: string;
  anulada: boolean;
  concepto: string;
  automatica: boolean;
};

const ESTADO_FILTROS = ["Todos", "vigente", "anulada"] as const;
type EstadoFiltro = (typeof ESTADO_FILTROS)[number];
const ESTADO_FILTRO_LABEL: Record<EstadoFiltro, string> = {
  Todos: "Todos los estados",
  vigente: "Vigente",
  anulada: "Anulada",
};

type SortKey = "fecha" | "concepto" | "monto" | "descripcion" | "casas" | "creadaPor";

function comparar(a: FilaLote, b: FilaLote, key: SortKey): number {
  switch (key) {
    case "fecha":
      return a.fecha.localeCompare(b.fecha);
    case "concepto":
      return a.concepto.localeCompare(b.concepto);
    case "monto":
      return Number(a.monto) - Number(b.monto);
    case "descripcion":
      return (a.descripcion ?? "").localeCompare(b.descripcion ?? "");
    case "casas":
      return a.casasAfectadas - b.casasAfectadas;
    case "creadaPor":
      return (a.usuarioEmail ?? "").localeCompare(b.usuarioEmail ?? "");
    default:
      return 0;
  }
}

export function HistorialDeudasMasivas({ filas }: { filas: FilaLote[] }) {
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("Todos");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "fecha", dir: "desc" });

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const resultado = filas.filter((f) => {
      if (estadoFiltro !== "Todos" && f.anulada !== (estadoFiltro === "anulada")) return false;
      if (
        t &&
        !f.concepto.toLowerCase().includes(t) &&
        !(f.descripcion ?? "").toLowerCase().includes(t) &&
        !(f.usuarioEmail ?? "").toLowerCase().includes(t)
      ) {
        return false;
      }
      return true;
    });
    const signo = sort.dir === "asc" ? 1 : -1;
    return resultado.sort((a, b) => signo * comparar(a, b, sort.key));
  }, [filas, busqueda, estadoFiltro, sort]);

  if (filas.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Todavía no se creó ninguna deuda masiva.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por concepto, descripción o creada por…"
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
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
            <SortableTh label="Fecha" sortKey="fecha" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Concepto" sortKey="concepto" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Monto" sortKey="monto" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Descripción" sortKey="descripcion" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Casas" sortKey="casas" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <SortableTh label="Creada por" sortKey="creadaPor" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
            <th className="sticky right-0 bg-muted px-4 py-3 text-right">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filtradas.map((f) => (
            <tr key={f.id} className="group hover:bg-accent/40">
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {f.fecha}
              </td>
              <td className="px-4 py-3 text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  {f.concepto}
                  {f.automatica && (
                    <Badge variant="info" className="text-[10px]">
                      Auto
                    </Badge>
                  )}
                </span>
              </td>
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
              <td className="sticky right-0 bg-card px-4 py-3 text-right group-hover:bg-accent/40">
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
          {filtradas.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
