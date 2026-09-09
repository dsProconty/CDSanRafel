"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eraser } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { obtenerConteoAmbiente, vaciarAmbienteQA, type ConteoAmbiente } from "./actions";

const FILAS: { key: keyof ConteoAmbiente; label: string }[] = [
  { key: "movimientosBancarios", label: "Movimientos bancarios (créditos y débitos)" },
  { key: "movimientoCandidatosCasa", label: "Candidatos de revisión (\"varias casas coinciden\")" },
  { key: "cargasEstadoCuenta", label: "Historial de cargas de Excel del banco" },
  { key: "deudas", label: "Deudas" },
  { key: "deudaMasivaLotes", label: "Corridas de deuda masiva" },
  { key: "deudaRecurrente", label: "Planes de deuda recurrente" },
  { key: "reportesFinancieros", label: "Informes económicos (con sus PDF)" },
];

export function PanelVaciar({ conteo }: { conteo: ConteoAmbiente | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function vaciar() {
    const total = conteo ? Object.values(conteo).reduce((a, b) => a + b, 0) : 0;
    const confirmado = confirm(
      `¿Vaciar el ambiente de pruebas?\n\n` +
        `Se van a borrar ${total} registros en total: movimientos bancarios, deudas, ` +
        `informes económicos y planes recurrentes.\n\n` +
        `NO se toca: casas, usuarios, referencias bancarias ni los catálogos ` +
        `(egresos, ingresos, deudas).\n\n` +
        `Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    startTransition(async () => {
      const resultado = await vaciarAmbienteQA();
      if (!resultado.ok) {
        alert(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-card px-6 py-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Vaciar información de prueba
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Borra todo lo transaccional (movimientos bancarios, deudas,
            informes económicos, planes recurrentes) para dejar un ambiente
            limpio y volver a probar de cero. Es irreversible.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Lo que se va a borrar ahora
        </p>
        <div className="mt-2 divide-y divide-border rounded-lg border border-border">
          {FILAS.map((f) => (
            <div key={f.key} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-foreground">{f.label}</span>
              <Badge variant={conteo && conteo[f.key] > 0 ? "warning" : "outline"}>
                {conteo ? conteo[f.key] : "—"}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Lo que NUNCA se toca
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Casas, usuarios (propietarios/responsables), referencias bancarias
          y los catálogos parametrizados (egresos, ingresos, conceptos de
          deuda).
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="destructive" disabled={pending} onClick={vaciar}>
          <Eraser className="h-4 w-4" />
          {pending ? "Vaciando…" : "Vaciar información"}
        </Button>
      </div>
    </div>
  );
}
