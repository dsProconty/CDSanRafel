"use client";

import { useOptimistic, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { actualizarComprobante } from "@/app/casas/[numero]/actions";

export function ToggleComprobante({
  casaId,
  activo,
  disabled,
}: {
  casaId: number;
  activo: boolean;
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [optimisticActivo, setOptimisticActivo] = useOptimistic(activo);

  return (
    <Switch
      checked={optimisticActivo}
      disabled={disabled}
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
