"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Concepto } from "../conceptos/actions";
import { crearRecurrente } from "./actions";

type Casa = { id: number; numero: string; bloque: string };

export function FormRecurrente({
  conceptos,
  casas,
}: {
  conceptos: Concepto[];
  casas: Casa[];
}) {
  const router = useRouter();
  const [conceptoId, setConceptoId] = useState(conceptos[0]?.id.toString() ?? "");
  const [monto, setMonto] = useState(conceptos[0]?.montoDefault ?? "");
  const [descripcion, setDescripcion] = useState(
    conceptos[0]?.descripcionDefault ?? ""
  );
  const [fechaInicio, setFechaInicio] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [indefinido, setIndefinido] = useState(true);
  const [totalPeriodos, setTotalPeriodos] = useState("12");
  const [generarAhora, setGenerarAhora] = useState("1");
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
        antes de programar una deuda recurrente.
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
        startTransition(async () => {
          const resultado = await crearRecurrente(
            Number(conceptoId),
            Number(monto),
            fechaInicio,
            descripcion,
            indefinido ? null : Number(totalPeriodos),
            Array.from(excluidas),
            Number(generarAhora) || 0
          );
          if (!resultado.ok) {
            setError(resultado.error);
          } else {
            setMensaje(
              "Plan creado. El resto de los meses se va a ir generando solo, sin que tengas que volver a entrar."
            );
            router.refresh();
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
      </div>
      <div>
        <Label htmlFor="monto">Monto por mes</Label>
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
        <Label htmlFor="descripcion">Descripción</Label>
        <Input
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Opcional"
        />
      </div>
      <div>
        <Label htmlFor="fechaInicio">Primera fecha</Label>
        <Input
          id="fechaInicio"
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          required
        />
      </div>

      <div className="rounded-lg border border-border p-4">
        <label className="flex items-start gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={indefinido}
            onChange={(e) => setIndefinido(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-input"
          />
          Repetir indefinidamente (hasta que lo pauses) — usalo para la
          alícuota ordinaria
        </label>
        {!indefinido && (
          <div className="mt-3">
            <Label htmlFor="totalPeriodos">Cantidad de meses/cuotas</Label>
            <Input
              id="totalPeriodos"
              type="number"
              min="1"
              max="60"
              value={totalPeriodos}
              onChange={(e) => setTotalPeriodos(e.target.value)}
              className="w-32"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ej. una cuota extraordinaria a pagar en 6 meses.
            </p>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="generarAhora">Generar ya los primeros N meses</Label>
        <Input
          id="generarAhora"
          type="number"
          min="0"
          max="24"
          value={generarAhora}
          onChange={(e) => setGenerarAhora(e.target.value)}
          className="w-32"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Poné 0 si preferís que arranque solo desde el próximo mes.
        </p>
      </div>

      <details className="group rounded-lg border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-medium text-foreground">
              A quiénes aplico este plan
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Se aplicará a {incluidas} de {casas.length} casas cada mes.
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
        {pending ? "Programando…" : "Programar deuda recurrente"}
      </Button>
      {mensaje && <p className="text-sm text-success">{mensaje}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
