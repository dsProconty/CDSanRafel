"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { alternarActivoConcepto, type Concepto } from "./actions";
import { ConceptoModal } from "./concepto-modal";

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

  const modalAbierto = creando || editando !== null;

  function cerrarModal() {
    setCreando(false);
    setEditando(null);
  }

  return (
    <>
      <div className="flex items-center justify-between">
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
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Monto por defecto</th>
                <th className="px-4 py-3">Descripción por defecto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conceptos.map((c) => (
                <tr key={c.id} className="hover:bg-accent/40">
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
                  <td className="px-4 py-3">
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
            </tbody>
          </table>
        </div>
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
