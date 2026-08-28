"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { clasificarMovimientoIngreso } from "./pendientes-actions";

export function SelectorTipoIngreso({
  movimientoId,
  opciones,
}: {
  movimientoId: number;
  opciones: { id: number; nombre: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue=""
      disabled={pending}
      onChange={(e) => {
        const tipoIngresoId = e.target.value ? Number(e.target.value) : null;
        startTransition(async () => {
          await clasificarMovimientoIngreso(movimientoId, tipoIngresoId);
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
    >
      <option value="">Clasificar…</option>
      {opciones.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nombre}
        </option>
      ))}
    </select>
  );
}
