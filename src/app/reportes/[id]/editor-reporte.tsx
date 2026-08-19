"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoriaGasto } from "@/db/schema";
import {
  actualizarLineaEgreso,
  actualizarLineaIngreso,
  actualizarSaldoInicial,
  agregarLineaEgreso,
  agregarLineaIngreso,
  eliminarLineaEgreso,
  eliminarLineaIngreso,
  generarPdfReporte,
  type ReporteDetalle,
} from "../actions";

const CATEGORIAS: { value: CategoriaGasto; label: string }[] = [
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "operativos", label: "Operativos" },
  { value: "inversiones", label: "Inversiones" },
  { value: "otros", label: "Otros" },
];

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function EditorReporte({ detalle }: { detalle: ReporteDetalle }) {
  const router = useRouter();
  const [saldoInicial, setSaldoInicial] = useState(detalle.saldoInicial);
  const [lineasIngreso, setLineasIngreso] = useState(detalle.lineasIngreso);
  const [lineasEgreso, setLineasEgreso] = useState(detalle.lineasEgreso);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [nuevoMontoIngreso, setNuevoMontoIngreso] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState<CategoriaGasto>("mantenimiento");
  const [nuevoSubtipo, setNuevoSubtipo] = useState("");
  const [nuevoMontoEgreso, setNuevoMontoEgreso] = useState("");
  const [pdfUrl, setPdfUrl] = useState(detalle.pdfUrl);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingPdf, startPdfTransition] = useTransition();

  const totalIngresos = useMemo(
    () => lineasIngreso.reduce((a, l) => a + Number(l.monto), 0),
    [lineasIngreso]
  );
  const totalEgresos = useMemo(
    () => lineasEgreso.reduce((a, l) => a + Number(l.monto), 0),
    [lineasEgreso]
  );
  const saldoFinal = Number(saldoInicial || 0) + totalIngresos - totalEgresos;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResumenCard label="Saldo inicial" value={Number(saldoInicial || 0)} />
        <ResumenCard label="Ingresos" value={totalIngresos} color="text-success" />
        <ResumenCard label="Egresos" value={totalEgresos} color="text-destructive" />
        <ResumenCard label="Saldo final" value={saldoFinal} strong />
      </div>

      <div>
        <Label htmlFor="saldoInicial">Saldo inicial (editable)</Label>
        <Input
          id="saldoInicial"
          type="number"
          step="0.01"
          value={saldoInicial}
          onChange={(e) => setSaldoInicial(e.target.value)}
          onBlur={() => {
            startTransition(async () => {
              await actualizarSaldoInicial(detalle.id, Number(saldoInicial || 0));
            });
          }}
          className="mt-1 w-40"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          <span className="font-semibold text-foreground">{detalle.casasPagaron}</span> al día
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          <span className="font-semibold text-foreground">{detalle.casasMora}</span> en mora
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          <span className="font-semibold text-foreground">{detalle.casasTotal}</span> total
        </span>
      </div>

      <section>
        <h2 className="text-base font-semibold text-foreground">Ingresos por tipo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sugeridos del catálogo de tipos de expensa. Ajustá los montos si no
          coinciden con lo realmente cobrado.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Monto</th>
                <th className="px-4 py-2.5 text-right">​</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineasIngreso.map((linea) => (
                <tr key={linea.id}>
                  <td className="px-4 py-2 text-foreground">{linea.etiqueta}</td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={linea.monto}
                      onChange={(e) =>
                        setLineasIngreso((prev) =>
                          prev.map((l) =>
                            l.id === linea.id ? { ...l, monto: e.target.value } : l
                          )
                        )
                      }
                      onBlur={() => {
                        startTransition(async () => {
                          await actualizarLineaIngreso(linea.id, Number(linea.monto || 0));
                        });
                      }}
                      className="h-8 w-32"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      title="Eliminar línea"
                      onClick={() => {
                        setLineasIngreso((prev) => prev.filter((l) => l.id !== linea.id));
                        startTransition(async () => {
                          await eliminarLineaIngreso(linea.id, detalle.id);
                        });
                      }}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold text-foreground">
                <td className="px-4 py-2">Total general</td>
                <td className="px-4 py-2">{money(totalIngresos)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="nuevaEtiqueta">Otro tipo de ingreso</Label>
            <Input
              id="nuevaEtiqueta"
              value={nuevaEtiqueta}
              onChange={(e) => setNuevaEtiqueta(e.target.value)}
              placeholder="Ej. Multas"
              className="h-9 w-44"
            />
          </div>
          <div>
            <Label htmlFor="nuevoMontoIngreso">Monto</Label>
            <Input
              id="nuevoMontoIngreso"
              type="number"
              step="0.01"
              value={nuevoMontoIngreso}
              onChange={(e) => setNuevoMontoIngreso(e.target.value)}
              className="h-9 w-28"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const resultado = await agregarLineaIngreso(
                  detalle.id,
                  nuevaEtiqueta,
                  Number(nuevoMontoIngreso || 0)
                );
                if (resultado.ok) {
                  setLineasIngreso((prev) => [
                    ...prev,
                    { id: resultado.id, etiqueta: nuevaEtiqueta.trim(), monto: (Number(nuevoMontoIngreso) || 0).toFixed(2) },
                  ]);
                  setNuevaEtiqueta("");
                  setNuevoMontoIngreso("");
                } else {
                  setError(resultado.error);
                }
              });
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Egresos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá cada gasto del mes con su categoría.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-2.5">Categoría</th>
                <th className="px-4 py-2.5">Subtipo</th>
                <th className="px-4 py-2.5">Monto</th>
                <th className="px-4 py-2.5 text-right">​</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineasEgreso.map((linea) => (
                <tr key={linea.id}>
                  <td className="px-4 py-2">
                    <select
                      value={linea.categoria}
                      onChange={(e) => {
                        const categoria = e.target.value as CategoriaGasto;
                        setLineasEgreso((prev) =>
                          prev.map((l) => (l.id === linea.id ? { ...l, categoria } : l))
                        );
                        startTransition(async () => {
                          await actualizarLineaEgreso(linea.id, detalle.id, categoria, linea.subtipo, Number(linea.monto || 0));
                        });
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={linea.subtipo}
                      onChange={(e) =>
                        setLineasEgreso((prev) =>
                          prev.map((l) => (l.id === linea.id ? { ...l, subtipo: e.target.value } : l))
                        )
                      }
                      onBlur={() => {
                        startTransition(async () => {
                          await actualizarLineaEgreso(linea.id, detalle.id, linea.categoria, linea.subtipo, Number(linea.monto || 0));
                        });
                      }}
                      className="h-8 w-56"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={linea.monto}
                      onChange={(e) =>
                        setLineasEgreso((prev) =>
                          prev.map((l) => (l.id === linea.id ? { ...l, monto: e.target.value } : l))
                        )
                      }
                      onBlur={() => {
                        startTransition(async () => {
                          await actualizarLineaEgreso(linea.id, detalle.id, linea.categoria, linea.subtipo, Number(linea.monto || 0));
                        });
                      }}
                      className="h-8 w-28"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      title="Eliminar línea"
                      onClick={() => {
                        setLineasEgreso((prev) => prev.filter((l) => l.id !== linea.id));
                        startTransition(async () => {
                          await eliminarLineaEgreso(linea.id, detalle.id);
                        });
                      }}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {lineasEgreso.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">
                    Sin gastos cargados todavía.
                  </td>
                </tr>
              )}
              <tr className="bg-muted/30 font-semibold text-foreground">
                <td className="px-4 py-2" colSpan={2}>
                  Total general
                </td>
                <td className="px-4 py-2">{money(totalEgresos)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="nuevaCategoria">Categoría</Label>
            <select
              id="nuevaCategoria"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value as CategoriaGasto)}
              className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="nuevoSubtipo">Gasto</Label>
            <Input
              id="nuevoSubtipo"
              value={nuevoSubtipo}
              onChange={(e) => setNuevoSubtipo(e.target.value)}
              placeholder="Ej. Servicio de seguridad privada"
              className="h-9 w-56"
            />
          </div>
          <div>
            <Label htmlFor="nuevoMontoEgreso">Monto</Label>
            <Input
              id="nuevoMontoEgreso"
              type="number"
              step="0.01"
              value={nuevoMontoEgreso}
              onChange={(e) => setNuevoMontoEgreso(e.target.value)}
              className="h-9 w-28"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const resultado = await agregarLineaEgreso(
                  detalle.id,
                  nuevaCategoria,
                  nuevoSubtipo,
                  Number(nuevoMontoEgreso || 0)
                );
                if (resultado.ok) {
                  setLineasEgreso((prev) => [
                    ...prev,
                    {
                      id: resultado.id,
                      categoria: nuevaCategoria,
                      subtipo: nuevoSubtipo.trim(),
                      monto: (Number(nuevoMontoEgreso) || 0).toFixed(2),
                    },
                  ]);
                  setNuevoSubtipo("");
                  setNuevoMontoEgreso("");
                } else {
                  setError(resultado.error);
                }
              });
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">PDF del informe</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pdfUrl
                ? "Ya se generó. Podés regenerarlo si cambiaste algo — se reemplaza el archivo anterior."
                : "Cargá al menos un gasto y generá el PDF para publicarlo."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver PDF actual
              </a>
            )}
            <Button
              type="button"
              disabled={pendingPdf}
              onClick={() => {
                setError(null);
                setMensaje(null);
                startPdfTransition(async () => {
                  const resultado = await generarPdfReporte(detalle.id);
                  if (!resultado.ok) {
                    setError(resultado.error);
                  } else {
                    setPdfUrl(resultado.pdfUrl);
                    setMensaje("PDF generado y publicado.");
                    router.refresh();
                  }
                });
              }}
            >
              {pendingPdf ? "Generando…" : pdfUrl ? "Regenerar PDF" : "Generar y publicar PDF"}
            </Button>
          </div>
        </div>
        {mensaje && <p className="mt-3 text-sm text-success">{mensaje}</p>}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}

function ResumenCard({
  label,
  value,
  color,
  strong,
}: {
  label: string;
  value: number;
  color?: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className={`text-lg font-semibold ${strong ? "text-foreground" : color ?? "text-foreground"}`}>
        {money(value)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
