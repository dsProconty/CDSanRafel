"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { obtenerPagosCasa, type PagosCasaData } from "./[numero]/actions";

export function TransaccionesModal({
  numero,
  onClose,
}: {
  numero: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PagosCasaData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [, startTransition] = useTransition();

  const cargar = useCallback(() => {
    startTransition(async () => {
      const resultado = await obtenerPagosCasa(numero);
      if (!resultado) {
        setNotFound(true);
        return;
      }
      setData(resultado);
    });
  }, [numero]);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    cargar();
  }, [cargar]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-foreground">
              Transacciones — Casa {data ? data.casa.numero : numero}
            </h2>
            {data && <Badge variant="secondary">Bloque {data.casa.bloque}</Badge>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {notFound ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No se encontró la casa {numero}.
            </p>
          ) : !data ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Cargando…
            </p>
          ) : data.pagos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Esta casa todavía no tiene pagos conciliados desde el banco.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {data.pagos.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-foreground">
                      {p.fecha}
                      {p.concepto ? ` · ${p.concepto}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Doc. {p.documento}
                    </p>
                  </div>
                  <span className="font-medium text-success">
                    +${Number(p.monto).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
