"use client";

import { useOptimistic, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { actualizarComprobante } from "@/app/casas/[numero]/actions";

export function ToggleComprobante({
  casaId,
  activo,
}: {
  casaId: number;
  activo: boolean;
}) {
  const [, startTransition] = useTransition();
  const [optimisticActivo, setOptimisticActivo] = useOptimistic(activo);

  return (
    <Switch
      checked={optimisticActivo}
      aria-label="Activar comprobante"
      onCheckedChange={(nuevoValor) => {
        startTransition(async () => {
          setOptimisticActivo(nuevoValor);
          await actualizarComprobante(casaId, nuevoValor);
        });
      }}
    />
  );
}
