"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import type { OpcionClase } from "@/lib/opciones-clase";
import { clasificarMovimientoDebito } from "./pendientes-actions";

export function SelectorClaseDebito({
  movimientoId,
  opciones,
}: {
  movimientoId: number;
  opciones: OpcionClase[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue=""
      disabled={pending}
      onChange={(e) => {
        const claseId = e.target.value ? Number(e.target.value) : null;
        startTransition(async () => {
          await clasificarMovimientoDebito(movimientoId, claseId);
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
    >
      <option value="">Clasificar…</option>
      {opciones.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
