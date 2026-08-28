"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarClase,
  actualizarSubtipo,
  actualizarTipo,
  crearClase,
  crearSubtipo,
  crearTipo,
  type ClaseFila,
  type SubtipoFila,
  type TipoFila,
} from "./actions";

export type ModalState =
  | { nivel: "tipo"; item: TipoFila | null }
  | { nivel: "subtipo"; item: SubtipoFila | null; tipoId: number }
  | { nivel: "clase"; item: ClaseFila | null; subtipoId: number };

// Los niveles internos (tipo/subtipo/clase, nombres de las tablas del
// schema) se muestran al admin como Grupo/Tipo/Subtipo — así los llama el
// cliente en su Excel real (columnas GRUPO/TIPO/SUBTIPO).
const TITULOS: Record<ModalState["nivel"], string> = {
  tipo: "grupo",
  subtipo: "tipo",
  clase: "subtipo",
};

export function ItemModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: ModalState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(modal.item?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(modal.item?.descripcion ?? "");
  const [palabrasClave, setPalabrasClave] = useState(
    modal.nivel === "clase" ? (modal.item?.palabrasClave ?? "") : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const esNuevo = modal.item === null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {esNuevo ? `Nuevo ${TITULOS[modal.nivel]}` : `Editar ${TITULOS[modal.nivel]}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="flex flex-col gap-4 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const resultado =
                modal.nivel === "tipo"
                  ? modal.item
                    ? await actualizarTipo(modal.item.id, nombre, descripcion)
                    : await crearTipo(nombre, descripcion)
                  : modal.nivel === "subtipo"
                    ? modal.item
                      ? await actualizarSubtipo(modal.item.id, nombre, descripcion)
                      : await crearSubtipo(modal.tipoId, nombre, descripcion)
                    : modal.item
                      ? await actualizarClase(modal.item.id, nombre, descripcion, palabrasClave)
                      : await crearClase(modal.subtipoId, nombre, descripcion, palabrasClave);

              if (!resultado.ok) {
                setError(resultado.error);
                return;
              }
              onSaved();
            });
          }}
        >
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          {modal.nivel === "clase" && (
            <div>
              <Label htmlFor="palabrasClave">Palabras clave para autoclasificar (opcional)</Label>
              <Input
                id="palabrasClave"
                value={palabrasClave}
                onChange={(e) => setPalabrasClave(e.target.value)}
                placeholder="Ej. internet,netlife,cnt"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separadas por coma. Si el texto del gasto contiene alguna, se
                autoclasifica acá al cargarlo — pensado para servicios fijos
                recurrentes (teléfono, internet, agua, luz).
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
