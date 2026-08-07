"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  obtenerEstadoCuentaCasa,
  type EstadoCuentaCasaData,
  type FilaEstadoCuenta,
} from "./[numero]/actions";

function coincide(f: FilaEstadoCuenta, termino: string) {
  const t = termino.toLowerCase();
  return (
    f.tipo.toLowerCase().includes(t) ||
    (f.detalle ?? "").toLowerCase().includes(t) ||
    (f.comprobante ?? "").toLowerCase().includes(t) ||
    f.fechaEmision.includes(t) ||
    (f.fechaPago ?? "").includes(t) ||
    f.valor.toFixed(2).includes(t)
  );
}

export function EstadoCuentaModal({
  numero,
  onClose,
}: {
  numero: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<EstadoCuentaCasaData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [, startTransition] = useTransition();

  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");

  const cargar = useCallback(() => {
    startTransition(async () => {
      const resultado = await obtenerEstadoCuentaCasa(numero);
      if (!resultado) {
        setNotFound(true);
        return;
      }
      setData(resultado);
    });
  }, [numero]);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    cargar();
  }, [cargar]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const tipos = useMemo(
    () => (data ? Array.from(new Set(data.filas.map((f) => f.tipo))).sort() : []),
    [data]
  );

  const filtradas = useMemo(() => {
    if (!data) return [];
    return data.filas.filter((f) => {
      if (tipoFiltro !== "Todos" && f.tipo !== tipoFiltro) return false;
      if (estadoFiltro !== "Todos" && f.estado !== estadoFiltro) return false;
      if (busqueda.trim() && !coincide(f, busqueda.trim())) return false;
      return true;
    });
  }, [data, tipoFiltro, estadoFiltro, busqueda]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-foreground">
              Estado de cuenta — Casa {data ? data.casa.numero : numero}
            </h2>
            {data && <Badge variant="secondary">Bloque {data.casa.bloque}</Badge>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {notFound ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No se encontró la casa {numero}.
            </p>
          ) : !data ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Cargando…
            </p>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por cualquier dato…"
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <select
                  value={tipoFiltro}
                  onChange={(e) => setTipoFiltro(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="Todos">Todos los tipos</option>
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                </select>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Fecha emisión</th>
                      <th className="px-4 py-3">Fecha pago</th>
                      <th className="px-4 py-3">Comprobante</th>
                      <th className="px-4 py-3">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtradas.map((f, i) => (
                      <tr key={f.id} className="hover:bg-accent/40">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="secondary">{f.tipo}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={f.estado === "pagada" ? "success" : "warning"}>
                            {f.estado === "pagada" ? "Pagada" : "Pendiente"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                          ${f.valor.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {f.fechaEmision}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {f.fechaPago ?? "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {f.comprobante ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {f.detalle ?? "—"}
                        </td>
                      </tr>
                    ))}
                    {filtradas.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No se encontraron resultados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
