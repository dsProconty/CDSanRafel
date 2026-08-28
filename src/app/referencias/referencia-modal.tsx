"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarReferencia, crearReferencia, type Referencia } from "./actions";

export function ReferenciaModal({
  referencia,
  onClose,
  onSaved,
}: {
  referencia: Referencia | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [numeroCasa, setNumeroCasa] = useState(referencia?.numero ?? "");
  const [textoReferencia, setTextoReferencia] = useState(referencia?.referencia ?? "");
  const [banco, setBanco] = useState(referencia?.banco ?? "Banco Guayaquil");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {referencia ? "Editar referencia" : "Nueva referencia"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="flex flex-col gap-4 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const resultado = referencia
                ? await actualizarReferencia(referencia.id, numeroCasa, textoReferencia, banco)
                : await crearReferencia(numeroCasa, textoReferencia, banco);
              if (!resultado.ok) {
                setError(resultado.error);
                return;
              }
              onSaved();
            });
          }}
        >
          <div>
            <Label htmlFor="numeroCasa">Casa</Label>
            <Input
              id="numeroCasa"
              list="casas-datalist-referencias"
              value={numeroCasa}
              onChange={(e) => setNumeroCasa(e.target.value)}
              placeholder="Ej. 36A"
              required
            />
          </div>
          <div>
            <Label htmlFor="referencia">Referencia bancaria</Label>
            <Input
              id="referencia"
              value={textoReferencia}
              onChange={(e) => setTextoReferencia(e.target.value)}
              placeholder="Tal como aparece en el Excel del banco"
              required
            />
          </div>
          <div>
            <Label htmlFor="banco">Banco</Label>
            <Input
              id="banco"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
