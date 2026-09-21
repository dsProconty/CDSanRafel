"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Split } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dividirEntreCasas } from "./pendientes-actions";

export function BotonDividir({
  movimientoId,
  monto,
  numeros,
}: {
  movimientoId: number;
  monto: number;
  numeros: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function dividir() {
    const porCasa = monto / numeros.length;
    const confirmado = confirm(
      `¿Dividir $${monto.toFixed(2)} en partes iguales entre las casas ` +
        `${numeros.join(", ")} (≈ $${porCasa.toFixed(2)} cada una)?\n\n` +
        `Usalo solo si sabés que esta persona paga por las ${numeros.length} casas ` +
        `desde la misma cuenta.`
    );
    if (!confirmado) return;

    startTransition(async () => {
      const resultado = await dividirEntreCasas(movimientoId);
      if (!resultado.ok) {
        alert(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={dividir}>
      <Split className="h-3.5 w-3.5" />
      {pending ? "…" : `Dividir entre ${numeros.length} casas`}
    </Button>
  );
}
