"use client";

import { useMemo, useState } from "react";
import { Eye, X } from "lucide-react";

import { SearchInput } from "@/components/ui/search-input";
import { proximoSort, SortableTh, type SortState } from "@/components/ui/sortable-th";

export type FilaHistorial = {
  id: number;
  // Ya formateada en el servidor (page.tsx) — evita mismatch de hidratación
  // por diferencias de ICU entre Node y el navegador en "a. m."/"p. m.".
  fecha: string;
  usuarioEmail: string | null;
  nombreArchivo: string;
  totalFilas: number;
  creditos: number;
  debitos: number;
  duplicados: number;
  matchedAutomatico: number;
  pendienteRevision: number;
  sinCatalogar: number;
};

type SortKey = "fecha" | "usuario" | "archivo" | "creditos" | "abonos" | "pendientes" | "sinCatalogar";

function comparar(a: FilaHistorial, b: FilaHistorial, key: SortKey): number {
  switch (key) {
    case "fecha":
      return a.id - b.id; // el id crece con la fecha de carga
    case "usuario":
      return (a.usuarioEmail ?? "").localeCompare(b.usuarioEmail ?? "");
    case "archivo":
      return a.nombreArchivo.localeCompare(b.nombreArchivo);
    case "creditos":
      return a.creditos - b.creditos;
    case "abonos":
      return a.matchedAutomatico - b.matchedAutomatico;
    case "pendientes":
      return a.pendienteRevision - b.pendienteRevision;
    case "sinCatalogar":
      return a.sinCatalogar - b.sinCatalogar;
    default:
      return 0;
  }
}

export function HistorialCargas({ filas }: { filas: FilaHistorial[] }) {
  const [detalle, setDetalle] = useState<FilaHistorial | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "fecha", dir: "desc" });

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const resultado = t
      ? filas.filter(
          (f) =>
            (f.usuarioEmail ?? "").toLowerCase().includes(t) ||
            f.nombreArchivo.toLowerCase().includes(t)
        )
      : [...filas];
    const signo = sort.dir === "asc" ? 1 : -1;
    return resultado.sort((a, b) => signo * comparar(a, b, sort.key));
  }, [filas, busqueda, sort]);

  if (filas.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Todavía no se cargó ningún estado de cuenta.
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por usuario o archivo…"
        />
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
              <SortableTh label="Fecha" sortKey="fecha" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
              <SortableTh label="Usuario" sortKey="usuario" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
              <SortableTh label="Archivo" sortKey="archivo" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
              <SortableTh label="Créditos" sortKey="creditos" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
              <SortableTh label="Abonos automáticos" sortKey="abonos" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
              <SortableTh label="Pendientes" sortKey="pendientes" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
              <SortableTh label="Sin catalogar" sortKey="sinCatalogar" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
              <th className="sticky right-0 bg-muted px-4 py-3 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.map((f) => (
              <tr key={f.id} className="group hover:bg-accent/40">
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {f.fecha}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-foreground">
                  {f.usuarioEmail ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{f.nombreArchivo}</td>
                <td className="px-4 py-3 text-foreground">{f.creditos}</td>
                <td className="px-4 py-3 text-success">{f.matchedAutomatico}</td>
                <td className="px-4 py-3 text-warning">{f.pendienteRevision}</td>
                <td className="px-4 py-3 text-destructive">{f.sinCatalogar}</td>
                <td className="sticky right-0 bg-card px-4 py-3 text-right group-hover:bg-accent/40">
                  <button
                    type="button"
                    onClick={() => setDetalle(f)}
                    title="Ver detalle"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No se encontraron resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detalle && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
          onClick={() => setDetalle(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                Detalle de la carga
              </h2>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                aria-label="Cerrar"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-foreground">{detalle.nombreArchivo}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {detalle.fecha} · {detalle.usuarioEmail ?? "—"}
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-3">
                <Dato label="Total filas del archivo" value={detalle.totalFilas} />
                <Dato label="Créditos" value={detalle.creditos} />
                <Dato label="Débitos (no procesados)" value={detalle.debitos} />
                <Dato label="Duplicados (ya cargados)" value={detalle.duplicados} />
                <Dato
                  label="Abonos automáticos"
                  value={detalle.matchedAutomatico}
                  colorClass="text-success"
                />
                <Dato
                  label="Pendientes de revisión"
                  value={detalle.pendienteRevision}
                  colorClass="text-warning"
                />
                <Dato
                  label="Sin catalogar"
                  value={detalle.sinCatalogar}
                  colorClass="text-destructive"
                />
              </dl>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Dato({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3.5 py-3">
      <p className={`text-xl font-semibold ${colorClass ?? "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
