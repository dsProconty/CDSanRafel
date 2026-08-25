"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { alternarActivoConcepto, type Concepto } from "./actions";
import { ConceptoModal } from "./concepto-modal";

const ESTADO_FILTROS = ["Todos", "activo", "inactivo"] as const;
type EstadoFiltro = (typeof ESTADO_FILTROS)[number];
const ESTADO_FILTRO_LABEL: Record<EstadoFiltro, string> = {
  Todos: "Todos los estados",
  activo: "Activo",
  inactivo: "Inactivo",
};

export function ListaConceptos({
  conceptos,
  tipos,
}: {
  conceptos: Concepto[];
  tipos: { id: number; nombre: string }[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Concepto | null>(null);
  const [creando, setCreando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("Todos");

  const modalAbierto = creando || editando !== null;

  function cerrarModal() {
    setCreando(false);
    setEditando(null);
  }

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return conceptos.filter((c) => {
      if (tipoFiltro !== "Todos" && c.tipoNombre !== tipoFiltro) return false;
      if (estadoFiltro !== "Todos" && c.activo !== (estadoFiltro === "activo")) return false;
      if (t && !c.nombre.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [conceptos, busqueda, tipoFiltro, estadoFiltro]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {conceptos.length} concepto{conceptos.length !== 1 ? "s" : ""} en el
          catálogo.
        </p>
        <Button size="sm" onClick={() => setCreando(true)}>
          <Plus className="h-4 w-4" />
          Nuevo concepto
        </Button>
      </div>

      {conceptos.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Todavía no hay conceptos de deuda creados.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SearchInput
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre…"
            />
            <Select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="Todos">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </Select>
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
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Monto por defecto</th>
                  <th className="px-4 py-3">Descripción por defecto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="sticky right-0 bg-muted px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrados.map((c) => (
                  <tr key={c.id} className="group hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.nombre}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.tipoNombre}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      ${Number(c.montoDefault).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.descripcionDefault ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.activo ? "success" : "outline"}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="sticky right-0 bg-card px-4 py-3 group-hover:bg-accent/40">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditando(c)}
                          title="Editar"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              await alternarActivoConcepto(c.id, !c.activo);
                              router.refresh();
                            });
                          }}
                          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                        >
                          {c.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No se encontraron resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modalAbierto && (
        <ConceptoModal
          tipos={tipos}
          concepto={editando}
          onClose={cerrarModal}
          onSaved={() => {
            cerrarModal();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
