"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearDeudaMasiva } from "./actions";

type Casa = { id: number; numero: string; bloque: string };

export function FormDeudaMasiva({
  tipos,
  casas,
}: {
  tipos: { id: number; nombre: string }[];
  casas: Casa[];
}) {
  const [tipoExpensaId, setTipoExpensaId] = useState(
    tipos[0]?.id.toString() ?? ""
  );
  const [monto, setMonto] = useState("60");
  const [fecha, setFecha] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [descripcion, setDescripcion] = useState("");
  const [excluidas, setExcluidas] = useState<Set<number>>(new Set());
  const [filtro, setFiltro] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const casasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return casas;
    return casas.filter((c) => c.numero.toLowerCase().includes(q));
  }, [casas, filtro]);

  const incluidas = casas.length - excluidas.size;

  function toggleCasa(id: number) {
    setExcluidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
        const excluidasTexto =
          excluidas.size > 0 ? ` (se excluyen ${excluidas.size} casas)` : "";
        if (
          !confirm(
            `¿Crear una deuda de $${monto} (${tipoNombre}) para ${incluidas} casas${excluidasTexto}?`
          )
        ) {
          return;
        }
        startTransition(async () => {
          const resultado = await crearDeudaMasiva(
            Number(tipoExpensaId),
            Number(monto),
            fecha,
            descripcion,
            Array.from(excluidas)
          );
          if (!resultado.ok) {
            setError(resultado.error);
          } else {
            setMensaje(
              `Se creó la deuda para ${resultado.casasAfectadas} de ${resultado.casasTotal} casas.`
            );
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

      <details className="group rounded-lg border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-medium text-foreground">
              Excluir casas puntuales
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Se aplicará a {incluidas} de {casas.length} casas.
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-border p-4">
          <Input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar casa…"
            className="mb-3"
          />
          <div className="grid max-h-56 grid-cols-3 gap-x-3 gap-y-2 overflow-y-auto sm:grid-cols-4">
            {casasFiltradas.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-1.5 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={!excluidas.has(c.id)}
                  onChange={() => toggleCasa(c.id)}
                  className="h-3.5 w-3.5 rounded border-input"
                />
                {c.numero}
              </label>
            ))}
            {casasFiltradas.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">
                Sin resultados.
              </p>
            )}
          </div>
          {excluidas.size > 0 && (
            <button
              type="button"
              onClick={() => setExcluidas(new Set())}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              Incluir todas de nuevo
            </button>
          )}
        </div>
      </details>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creando…" : `Aplicar a ${incluidas} casas`}
      </Button>
      {mensaje && <p className="text-sm text-success">{mensaje}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
