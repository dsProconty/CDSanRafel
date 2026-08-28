"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { proximoSort, SortableTh, type SortState } from "@/components/ui/sortable-th";
import { eliminarReferencia, type Referencia } from "./actions";
import { ReferenciaModal } from "./referencia-modal";

type SortKey = "casa" | "referencia" | "banco";

function comparar(a: Referencia, b: Referencia, key: SortKey): number {
  switch (key) {
    case "casa":
      return a.numero.localeCompare(b.numero, undefined, { numeric: true });
    case "referencia":
      return a.referencia.localeCompare(b.referencia);
    case "banco":
      return a.banco.localeCompare(b.banco);
    default:
      return 0;
  }
}

const BLOQUE_FILTROS = ["Todos", "A", "B"] as const;
type BloqueFiltro = (typeof BLOQUE_FILTROS)[number];

export function ListaReferencias({ referencias }: { referencias: Referencia[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Referencia | null>(null);
  const [creando, setCreando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [bloqueFiltro, setBloqueFiltro] = useState<BloqueFiltro>("Todos");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "casa", dir: "asc" });

  const modalAbierto = creando || editando !== null;

  function cerrarModal() {
    setCreando(false);
    setEditando(null);
  }

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const resultado = referencias.filter((r) => {
      if (bloqueFiltro !== "Todos" && r.bloque !== bloqueFiltro) return false;
      if (
        t &&
        !r.numero.toLowerCase().includes(t) &&
        !r.referencia.toLowerCase().includes(t)
      )
        return false;
      return true;
    });
    const signo = sort.dir === "asc" ? 1 : -1;
    return resultado.sort((a, b) => signo * comparar(a, b, sort.key));
  }, [referencias, busqueda, bloqueFiltro, sort]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {referencias.length} referencia{referencias.length !== 1 ? "s" : ""}{" "}
          cargadas.
        </p>
        <Button size="sm" onClick={() => setCreando(true)}>
          <Plus className="h-4 w-4" />
          Nueva referencia
        </Button>
      </div>

      {referencias.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Todavía no hay referencias cargadas.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SearchInput
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por casa o referencia…"
            />
            <Select
              value={bloqueFiltro}
              onChange={(e) => setBloqueFiltro(e.target.value as BloqueFiltro)}
            >
              {BLOQUE_FILTROS.map((b) => (
                <option key={b} value={b}>
                  {b === "Todos" ? "Todos los bloques" : `Bloque ${b}`}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                  <SortableTh label="Casa" sortKey="casa" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
                  <SortableTh label="Referencia" sortKey="referencia" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
                  <SortableTh label="Banco" sortKey="banco" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-3" />
                  <th className="sticky right-0 bg-muted px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtradas.map((r) => (
                  <tr key={r.id} className="group hover:bg-accent/40">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">{r.numero}</span>{" "}
                      <Badge variant="secondary">Bloque {r.bloque}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.referencia}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.banco}</td>
                    <td className="sticky right-0 bg-card px-4 py-3 group-hover:bg-accent/40">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditando(r)}
                          title="Editar"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          title="Eliminar"
                          onClick={() => {
                            if (!confirm(`¿Borrar la referencia "${r.referencia}" de la casa ${r.numero}?`)) return;
                            startTransition(async () => {
                              await eliminarReferencia(r.id);
                              router.refresh();
                            });
                          }}
                          className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
        <ReferenciaModal
          referencia={editando}
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
