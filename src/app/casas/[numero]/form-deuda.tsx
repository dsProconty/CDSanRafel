"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearDeuda } from "./actions";

export function FormDeuda({
  casaId,
  tipos,
  onSaved,
}: {
  casaId: number;
  tipos: { id: number; nombre: string }[];
  onSaved?: () => void;
}) {
  const [tipoExpensaId, setTipoExpensaId] = useState(
    tipos[0]?.id.toString() ?? ""
  );
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [descripcion, setDescripcion] = useState("");
  const [pending, startTransition] = useTransition();

  if (tipos.length === 0) {
    return (
      <p className="mt-2 text-sm text-destructive">
        No hay tipos de expensa creados todavía (corre el seed de tipos de
        expensa).
      </p>
    );
  }

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await crearDeuda(casaId, Number(tipoExpensaId), Number(monto), fecha, descripcion);
          onSaved?.();
        });
        setMonto("");
        setDescripcion("");
      }}
    >
      <div>
        <Label htmlFor={`tipo-${casaId}`}>Tipo</Label>
        <select
          id={`tipo-${casaId}`}
          value={tipoExpensaId}
          onChange={(e) => setTipoExpensaId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`monto-${casaId}`}>Monto</Label>
        <Input
          id={`monto-${casaId}`}
          type="number"
          step="0.01"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-28"
          required
        />
      </div>
      <div>
        <Label htmlFor={`fecha-${casaId}`}>Fecha</Label>
        <Input
          id={`fecha-${casaId}`}
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-40"
          required
        />
      </div>
      <div>
        <Label htmlFor={`descripcion-${casaId}`}>Descripción</Label>
        <Input
          id={`descripcion-${casaId}`}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-48"
          placeholder="Opcional"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Crear deuda"}
      </Button>
    </form>
  );
}
