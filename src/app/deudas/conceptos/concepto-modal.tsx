"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarConcepto,
  crearConcepto,
  type Concepto,
} from "./actions";

export function ConceptoModal({
  tipos,
  concepto,
  onClose,
  onSaved,
}: {
  tipos: { id: number; nombre: string }[];
  concepto: Concepto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(concepto?.nombre ?? "");
  const [tipoExpensaId, setTipoExpensaId] = useState(
    (concepto?.tipoExpensaId ?? tipos[0]?.id)?.toString() ?? ""
  );
  const [montoDefault, setMontoDefault] = useState(
    concepto?.montoDefault ?? ""
  );
  const [descripcionDefault, setDescripcionDefault] = useState(
    concepto?.descripcionDefault ?? ""
  );
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
            {concepto ? "Editar concepto" : "Nuevo concepto"}
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
              const resultado = concepto
                ? await actualizarConcepto(
                    concepto.id,
                    nombre,
                    Number(tipoExpensaId),
                    Number(montoDefault),
                    descripcionDefault
                  )
                : await crearConcepto(
                    nombre,
                    Number(tipoExpensaId),
                    Number(montoDefault),
                    descripcionDefault
                  );
              if (!resultado.ok) {
                setError(resultado.error);
                return;
              }
              onSaved();
            });
          }}
        >
          <div>
            <Label htmlFor="nombre">Nombre del concepto</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Alícuota ordinaria mensual"
              required
            />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo de expensa</Label>
            <select
              id="tipo"
              value={tipoExpensaId}
              onChange={(e) => setTipoExpensaId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="monto">Monto por defecto</Label>
            <Input
              id="monto"
              type="number"
              step="0.01"
              min="0"
              value={montoDefault}
              onChange={(e) => setMontoDefault(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="descripcion">Descripción por defecto</Label>
            <Input
              id="descripcion"
              value={descripcionDefault}
              onChange={(e) => setDescripcionDefault(e.target.value)}
              placeholder="Opcional — se precarga al elegir este concepto"
            />
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
