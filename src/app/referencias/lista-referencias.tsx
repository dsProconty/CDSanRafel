"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
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

const BLOQUES = ["A", "B"] as const;

export function ListaReferencias({ referencias }: { referencias: Referencia[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Referencia | null>(null);
  const [creando, setCreando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "casa", dir: "asc" });

  const modalAbierto = creando || editando !== null;

  function cerrarModal() {
    setCreando(false);
    setEditando(null);
  }

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const resultado = referencias.filter((r) => {
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
  }, [referencias, busqueda, sort]);

  const porBloque = useMemo(() => {
    const mapa = new Map<string, Referencia[]>();
    for (const b of BLOQUES) mapa.set(b, []);
    for (const r of filtradas) {
      if (!mapa.has(r.bloque)) mapa.set(r.bloque, []);
      mapa.get(r.bloque)!.push(r);
    }
    return mapa;
  }, [filtradas]);

  const hayBusqueda = busqueda.trim().length > 0;

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
          <div className="mt-4">
            <SearchInput
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por casa o referencia…"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {[...porBloque.entries()].map(([bloque, filas]) => (
              <details
                key={bloque}
                className="group rounded-lg border border-border bg-card"
                open={hayBusqueda && filas.length > 0 ? true : undefined}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-sm font-semibold text-foreground">
                    Bloque {bloque} ({filas.length})
                  </h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>

                {filas.length === 0 ? (
                  <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground">
                    Sin resultados en este bloque.
                  </p>
                ) : (
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                          <SortableTh label="Casa" sortKey="casa" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-2.5" />
                          <SortableTh label="Referencia" sortKey="referencia" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-2.5" />
                          <SortableTh label="Banco" sortKey="banco" sort={sort} onSort={(k) => setSort((s) => proximoSort(s, k))} className="px-4 py-2.5" />
                          <th className="px-4 py-2.5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filas.map((r) => (
                          <tr key={r.id} className="hover:bg-accent/40">
                            <td className="px-4 py-2.5 font-medium whitespace-nowrap text-foreground">
                              {r.numero}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{r.referencia}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{r.banco}</td>
                            <td className="px-4 py-2.5 text-right">
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
                      </tbody>
                    </table>
                  </div>
                )}
              </details>
            ))}
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
