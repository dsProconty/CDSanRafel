"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearDeudaMasiva } from "./actions";

export function FormDeudaMasiva({
  tipos,
}: {
  tipos: { id: number; nombre: string }[];
}) {
  const [tipoExpensaId, setTipoExpensaId] = useState(
    tipos[0]?.id.toString() ?? ""
  );
  const [monto, setMonto] = useState("60");
  const [fecha, setFecha] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [descripcion, setDescripcion] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (tipos.length === 0) {
    return (
      <p className="text-sm text-destructive">
        No hay tipos de expensa creados todavía (corre el seed de tipos de
        expensa).
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setMensaje(null);
        const tipoNombre = tipos.find(
          (t) => t.id === Number(tipoExpensaId)
        )?.nombre;
        if (
          !confirm(
            `¿Crear una deuda de $${monto} (${tipoNombre}) para todas las casas?`
          )
        ) {
          return;
        }
        startTransition(async () => {
          const resultado = await crearDeudaMasiva(
            Number(tipoExpensaId),
            Number(monto),
            fecha,
            descripcion
          );
          if (!resultado.ok) {
            setError(resultado.error);
          } else {
            setMensaje(`Se creó la deuda para ${resultado.casasAfectadas} casas.`);
            setDescripcion("");
          }
        });
      }}
    >
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
        <Label htmlFor="monto">Monto</Label>
        <Input
          id="monto"
          type="number"
          step="0.01"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="fecha">Fecha</Label>
        <Input
          id="fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Input
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. Expensa ordinaria agosto 2026"
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creando…" : "Aplicar a todas las casas"}
      </Button>
      {mensaje && <p className="text-sm text-success">{mensaje}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
