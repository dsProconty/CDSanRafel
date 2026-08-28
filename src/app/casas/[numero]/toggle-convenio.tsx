"use client";

import { useTransition } from "react";
import { HandCoins } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { alternarConvenio } from "./actions";

export function ToggleConvenio({
  casaId,
  enConvenio,
  onSaved,
}: {
  casaId: number;
  enConvenio: boolean;
  onSaved?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2.5">
        <HandCoins className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Convenio de pago
          </p>
          <p className="text-xs text-muted-foreground">
            Mientras esté marcada, cualquier pago de esta casa se clasifica
            como ingreso &quot;Convenio/Cartera&quot;, sea cual sea el monto.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={enConvenio ? "warning" : "outline"}>
          {enConvenio ? "En convenio" : "Sin convenio"}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await alternarConvenio(casaId, !enConvenio);
              onSaved?.();
            })
          }
        >
          {enConvenio ? "Quitar convenio" : "Marcar en convenio"}
        </Button>
      </div>
    </div>
  );
}
