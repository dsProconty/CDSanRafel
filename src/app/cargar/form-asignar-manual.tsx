"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asignarManual } from "./pendientes-actions";

export function FormAsignarManual({ movimientoId }: { movimientoId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [valor, setValor] = useState("");

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const resultado = await asignarManual(movimientoId, valor);
          if (!resultado.ok) {
            setError(resultado.error);
          } else {
            setValor("");
          }
        });
      }}
    >
      <Input
        list="casas-datalist"
        placeholder="Nº de casa (ej. 36A)"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="h-8 w-36 text-sm"
        required
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Asignar"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
