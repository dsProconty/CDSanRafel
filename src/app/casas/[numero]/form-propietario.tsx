"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actualizarPropietario } from "./actions";

export function FormPropietario({
  casaId,
  propietarioActual,
}: {
  casaId: number;
  propietarioActual: string;
}) {
  const [valor, setValor] = useState(propietarioActual);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => actualizarPropietario(casaId, valor));
      }}
    >
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Nombre del propietario"
        className="max-w-sm"
      />
      <Button type="submit" disabled={pending} variant="outline">
        {pending ? "…" : "Guardar"}
      </Button>
    </form>
  );
}
