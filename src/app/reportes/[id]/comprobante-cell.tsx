"use client";

import { useRef, useState, useTransition } from "react";
import { FileCheck2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  alternarRequiereComprobante,
  subirComprobanteEgreso,
} from "../actions";

export function ComprobanteCell({
  lineaId,
  reporteId,
  requiereComprobante: requiereComprobanteInicial,
  comprobanteUrl: comprobanteUrlInicial,
}: {
  lineaId: number;
  reporteId: number;
  requiereComprobante: boolean;
  comprobanteUrl: string | null;
}) {
  // Estado local propio (en vez de depender de router.refresh()): el padre
  // (EditorReporte) guarda las líneas en su propio estado de React que solo
  // se inicializa una vez desde el server component — un refresh no lo
  // vuelve a sincronizar, así que esta celda quedaba "congelada" mostrando
  // el valor viejo aunque la escritura en la base sí funcionara (hallazgo
  // de QA, sep 2026). Acá se actualiza de forma optimista apenas la action
  // confirma éxito.
  const [requiereComprobante, setRequiereComprobante] = useState(requiereComprobanteInicial);
  const [comprobanteUrl, setComprobanteUrl] = useState(comprobanteUrlInicial);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  if (!requiereComprobante) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">No requiere</Badge>
        <button
          type="button"
          disabled={pending}
          className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              const resultado = await alternarRequiereComprobante(lineaId, reporteId, true);
              if (!resultado.ok) {
                alert(resultado.error);
                return;
              }
              setRequiereComprobante(true);
            })
          }
        >
          Sí requiere
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {comprobanteUrl ? (
        <>
          <Badge variant="success">
            <FileCheck2 className="mr-1 h-3 w-3" />
            Cargado
          </Badge>
          <a
            href={comprobanteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver
          </a>
        </>
      ) : (
        <>
          <Badge variant="warning">Incompleto</Badge>
          <button
            type="button"
            disabled={pending}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            {pending ? "Subiendo…" : "Subir"}
          </button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (!archivo) return;
          const formData = new FormData();
          formData.set("archivo", archivo);
          startTransition(async () => {
            const resultado = await subirComprobanteEgreso(lineaId, reporteId, formData);
            if (!resultado.ok) {
              alert(resultado.error);
              return;
            }
            setComprobanteUrl(resultado.url);
          });
        }}
      />
      <button
        type="button"
        disabled={pending}
        className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground disabled:opacity-50"
        onClick={() =>
          startTransition(async () => {
            const resultado = await alternarRequiereComprobante(lineaId, reporteId, false);
            if (!resultado.ok) {
              alert(resultado.error);
              return;
            }
            setRequiereComprobante(false);
          })
        }
      >
        No requiere
      </button>
    </div>
  );
}
