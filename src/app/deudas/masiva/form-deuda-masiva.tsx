"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Concepto } from "../conceptos/actions";
import { crearDeudaMasiva } from "./actions";

type Casa = { id: number; numero: string; bloque: string };

export function FormDeudaMasiva({
  conceptos,
  casas,
}: {
  conceptos: Concepto[];
  casas: Casa[];
}) {
  const [conceptoId, setConceptoId] = useState(
    conceptos[0]?.id.toString() ?? ""
  );
  const [monto, setMonto] = useState(conceptos[0]?.montoDefault ?? "");
  const [fecha, setFecha] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [descripcion, setDescripcion] = useState(
    conceptos[0]?.descripcionDefault ?? ""
  );
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

  function elegirConcepto(id: string) {
    setConceptoId(id);
    const concepto = conceptos.find((c) => c.id === Number(id));
    if (concepto) {
      setMonto(concepto.montoDefault);
      setDescripcion(concepto.descripcionDefault ?? "");
    }
  }

  if (conceptos.length === 0) {
    return (
      <p className="text-sm text-destructive">
        Todavía no hay conceptos de deuda creados. Creá uno en{" "}
        <Link href="/deudas/conceptos" className="font-medium underline">
          Conceptos de deuda
        </Link>{" "}
        antes de generar una deuda masiva.
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
        const conceptoNombre = conceptos.find(
          (c) => c.id === Number(conceptoId)
        )?.nombre;
        const excluidasTexto =
          excluidas.size > 0 ? ` (se excluyen ${excluidas.size} casas)` : "";
        if (
          !confirm(
            `¿Crear la deuda "${conceptoNombre}" de $${monto} para ${incluidas} casas${excluidasTexto}?`
          )
        ) {
          return;
        }
        startTransition(async () => {
          const resultado = await crearDeudaMasiva(
            Number(conceptoId),
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
          }
        });
      }}
    >
      <div>
        <Label htmlFor="concepto">Concepto</Label>
        <select
          id="concepto"
          value={conceptoId}
          onChange={(e) => elegirConcepto(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {conceptos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Monto y descripción se precargan del concepto — podés ajustarlos
          para esta corrida sin tocar el catálogo.
        </p>
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
        <Label htmlFor="fecha">Fecha de ejecución</Label>
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
              A quiénes aplico esta deuda
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
