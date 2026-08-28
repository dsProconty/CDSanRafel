"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarTipoIngreso, crearTipoIngreso, type TipoIngreso } from "./actions";

export function TipoIngresoModal({
  tipo,
  onClose,
  onSaved,
}: {
  tipo: TipoIngreso | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(tipo?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? "");
  const [palabrasClave, setPalabrasClave] = useState(tipo?.palabrasClave ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
            {tipo ? "Editar tipo de ingreso" : "Nuevo tipo de ingreso"}
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
              const resultado = tipo
                ? await actualizarTipoIngreso(tipo.id, nombre, descripcion, palabrasClave)
                : await crearTipoIngreso(nombre, descripcion, palabrasClave);
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
              placeholder="Ej. Reservas Comunales"
              required
            />
          </div>
          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label htmlFor="palabrasClave">Palabras clave</Label>
            <Input
              id="palabrasClave"
              value={palabrasClave}
              onChange={(e) => setPalabrasClave(e.target.value)}
              placeholder="Separadas por coma, ej. tag,tags"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Si la referencia o el concepto del banco contiene alguna de
              estas palabras, el pago se clasifica solo con este tipo — antes
              de aplicar las reglas por monto.
            </p>
          </div>

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
