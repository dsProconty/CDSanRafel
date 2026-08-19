"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { eliminarBorrador, type FilaReporte } from "./actions";

export function ListaReportes({
  reportes,
  esAdmin,
}: {
  reportes: FilaReporte[];
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (reportes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {esAdmin
          ? "Todavía no se creó ningún informe."
          : "Todavía no hay informes económicos publicados."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3">Ingresos</th>
            <th className="px-4 py-3">Egresos</th>
            <th className="px-4 py-3">Saldo final</th>
            <th className="px-4 py-3">Casas en mora</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {reportes.map((r) => (
            <tr key={r.id} className="hover:bg-accent/40">
              <td className="px-4 py-3 font-medium text-foreground">{r.etiquetaPeriodo}</td>
              <td className="px-4 py-3 text-success">${r.totalIngresos.toFixed(2)}</td>
              <td className="px-4 py-3 text-destructive">${r.totalEgresos.toFixed(2)}</td>
              <td className="px-4 py-3 text-foreground">${r.saldoFinal.toFixed(2)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {r.casasMora} / {r.casasTotal}
              </td>
              <td className="px-4 py-3">
                {r.pdfUrl ? (
                  <Badge variant="success">Publicado</Badge>
                ) : (
                  <Badge variant="warning">Borrador</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-3">
                  {r.pdfUrl && (
                    <a
                      href={r.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver PDF"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <FileText className="h-4 w-4" />
                    </a>
                  )}
                  {esAdmin && (
                    <Link
                      href={`/reportes/${r.id}`}
                      title="Editar"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                  {esAdmin && !r.pdfUrl && (
                    <button
                      type="button"
                      disabled={pending}
                      title="Eliminar borrador"
                      onClick={() => {
                        if (!confirm(`¿Eliminar el borrador de ${r.etiquetaPeriodo}?`)) return;
                        startTransition(async () => {
                          await eliminarBorrador(r.id);
                          router.refresh();
                        });
                      }}
                      className="text-destructive transition-colors hover:text-destructive/80 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
