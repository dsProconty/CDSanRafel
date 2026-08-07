"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { eliminarUsuario } from "@/app/casas/[numero]/actions";

export function BotonEliminar({
  casaId,
  nombre,
  onDeleted,
}: {
  casaId: number;
  nombre: string;
  onDeleted?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `¿Eliminar el acceso y los datos de contacto de ${nombre || "esta casa"}? Esta acción no se puede deshacer.`
          )
        ) {
          startTransition(async () => {
            await eliminarUsuario(casaId);
            onDeleted?.();
          });
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive transition-colors hover:text-destructive/80 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Eliminando…" : "Eliminar acceso"}
    </button>
  );
}
