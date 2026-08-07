"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { obtenerDetalleCasa, type CasaDetalleData } from "./[numero]/actions";
import { CasaDetalleContent } from "./[numero]/casa-detalle-content";

export function CasaModal({
  numero,
  onClose,
}: {
  numero: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<CasaDetalleData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const cargar = useCallback(() => {
    startTransition(async () => {
      const resultado = await obtenerDetalleCasa(numero);
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

  const handleSaved = useCallback(() => {
    cargar();
    router.refresh();
  }, [cargar, router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-xl border border-border bg-card shadow-xl transition-[max-width] duration-150 ${
          expanded ? "max-w-4xl" : "max-w-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-foreground">
              {data ? `Casa ${data.casa.numero}` : `Casa ${numero}`}
            </h2>
            {data && <Badge variant="secondary">Bloque {data.casa.bloque}</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Contraer" : "Expandir"}
              title={expanded ? "Contraer" : "Expandir"}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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
          ) : (
            <CasaDetalleContent data={data} onSaved={handleSaved} expanded={expanded} />
          )}
        </div>
      </div>
    </div>
  );
}
