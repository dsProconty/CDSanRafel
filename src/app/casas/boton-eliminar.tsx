"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { eliminarUsuario } from "@/app/casas/[numero]/actions";

export function BotonEliminar({
  casaId,
  nombre,
}: {
  casaId: number;
  nombre: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Eliminar acceso"
      onClick={() => {
        if (
          confirm(
            `¿Eliminar el acceso y los datos de contacto de ${nombre || "esta casa"}? Esta acción no se puede deshacer.`
          )
        ) {
          startTransition(() => eliminarUsuario(casaId));
        }
      }}
      className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
