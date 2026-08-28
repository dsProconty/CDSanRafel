"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  alternarRequiereComprobante,
  subirComprobanteEgreso,
} from "../actions";

export function ComprobanteCell({
  lineaId,
  reporteId,
  requiereComprobante,
  comprobanteUrl,
}: {
  lineaId: number;
  reporteId: number;
  requiereComprobante: boolean;
  comprobanteUrl: string | null;
}) {
  const router = useRouter();
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
              await alternarRequiereComprobante(lineaId, reporteId, true);
              router.refresh();
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
            if (resultado.ok) router.refresh();
          });
        }}
      />
      <button
        type="button"
        disabled={pending}
        className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground disabled:opacity-50"
        onClick={() =>
          startTransition(async () => {
            await alternarRequiereComprobante(lineaId, reporteId, false);
            router.refresh();
          })
        }
      >
        No requiere
      </button>
    </div>
  );
}
