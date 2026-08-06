"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { asignarCandidato } from "./actions";

export function BotonCandidato({
  movimientoId,
  casaId,
  numero,
}: {
  movimientoId: number;
  casaId: number;
  numero: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => asignarCandidato(movimientoId, casaId))}
    >
      {pending ? "…" : `Asignar a ${numero}`}
    </Button>
  );
}
