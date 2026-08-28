"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { proximoSort, SortableTh, type SortState } from "@/components/ui/sortable-th";
import { alternarActivoTipoIngreso, type TipoIngreso } from "./actions";
import { TipoIngresoModal } from "./tipo-ingreso-modal";

type SortKey = "nombre" | "descripcion" | "palabrasClave" | "estado";

function comparar(a: TipoIngreso, b: TipoIngreso, key: SortKey): number {
  switch (key) {
    case "nombre":
      return a.nombre.localeCompare(b.nombre);
    case "descripcion":
      return (a.descripcion ?? "").localeCompare(b.descripcion ?? "");
    case "palabrasClave":
      return (a.palabrasClave ?? "").localeCompare(b.palabrasClave ?? "");
    case "estado":
      return Number(a.activo) - Number(b.activo);
    default:
      return 0;
  }
}

const ESTADO_FILTROS = ["Todos", "activo", "inactivo"] as const;
type EstadoFiltro = (typeof ESTADO_FILTROS)[number];
const ESTADO_FILTRO_LABEL: Record<EstadoFiltro, string> = {
  Todos: "Todos los estados",
  activo: "Activo",
  inactivo: "Inactivo",
};

export function ListaTiposIngreso({ tipos }: { tipos: TipoIngreso[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<TipoIngreso | null>(null);
  const [creando, setCreando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("Todos");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "nombre", dir: "asc" });

  const modalAbierto = creando || editando !== null;

  function cerrarModal() {
    setCreando(false);
    setEditando(null);
  }

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const resultado = tipos.filter((ti) => {
      if (estadoFiltro !== "Todos" && ti.activo !== (estadoFiltro === "activo")) return false;
      if (
        t &&
        !ti.nombre.toLowerCase().includes(t) &&
        !(ti.palabrasClave ?? "").toLowerCase().includes(t)
      )
        return false;
      return true;
    });
    const signo = sort.dir === "asc" ? 1 : -1;
    return resultado.sort((a, b) => signo * comparar(a, b, sort.key));
  }, [tipos, busqueda, estadoFiltro, sort]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {tipos.length} tipo{tipos.length !== 1 ? "s" : ""} de ingreso en el catálogo.
        </p>
        <Button size="sm" onClick={() => setCreando(true)}>
          <Plus className="h-4 w-4" />
          Nuevo tipo
        </Button>
      </div>

      {tipos.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Todavía no hay tipos de ingreso creados.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SearchInput
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o palabra clave…"
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
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                  <SortableTh label="Nombre" sortKey="nombre" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
                  <SortableTh label="Descripción" sortKey="descripcion" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
                  <SortableTh label="Palabras clave" sortKey="palabrasClave" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
                  <SortableTh label="Estado" sortKey="estado" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
                  <th className="sticky right-0 bg-muted px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrados.map((ti) => (
                  <tr key={ti.id} className="group hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium text-foreground">{ti.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ti.descripcion ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ti.palabrasClave ? `🔑 ${ti.palabrasClave}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ti.activo ? "success" : "outline"}>
                        {ti.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="sticky right-0 bg-card px-4 py-3 group-hover:bg-accent/40">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditando(ti)}
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
                              await alternarActivoTipoIngreso(ti.id, !ti.activo);
                              router.refresh();
                            });
                          }}
                          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                        >
                          {ti.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
        <TipoIngresoModal
          tipo={editando}
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
