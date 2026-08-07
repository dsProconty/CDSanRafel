"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Pencil, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CasaModal } from "./casa-modal";

export type EstadoCasa = "ok" | "due" | "none";
export type TipoResidente = "propietario" | "arrendatario" | "familiar";

export type FilaCasa = {
  id: number;
  numero: string;
  bloque: string;
  propietario: string | null;
  estado: EstadoCasa;
  tieneAcceso: boolean;
  email: string | null;
  cedula: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  tipoResidente: TipoResidente | null;
  ultimoAcceso: string | null;
};

const BLOQUES = ["A", "B", "Otros"] as const;
type Bloque = (typeof BLOQUES)[number];

const DOT_CLASS: Record<EstadoCasa, string> = {
  ok: "bg-success",
  due: "bg-destructive",
  none: "bg-muted-foreground/40",
};

const TIPO_RESIDENTE_LABEL: Record<TipoResidente, string> = {
  propietario: "Propietario",
  arrendatario: "Arrendatario",
  familiar: "Familiar",
};

function esDelBloque(c: FilaCasa, b: Bloque) {
  return b === "Otros" ? c.bloque !== "A" && c.bloque !== "B" : c.bloque === b;
}

function coincide(c: FilaCasa, termino: string) {
  const t = termino.toLowerCase();
  return (
    c.numero.toLowerCase().includes(t) ||
    (c.propietario ?? "").toLowerCase().includes(t) ||
    (c.email ?? "").toLowerCase().includes(t) ||
    (c.cedula ?? "").toLowerCase().includes(t)
  );
}

function PagoBadge({ estado }: { estado: EstadoCasa }) {
  if (estado === "ok") return <Badge variant="success">Al día</Badge>;
  if (estado === "due") return <Badge variant="destructive">Pendiente</Badge>;
  return <span className="text-muted-foreground">—</span>;
}

export function CasasExplorer({ casas }: { casas: FilaCasa[] }) {
  const [vista, setVista] = useState<"grid" | "tabla">("grid");
  const [bloque, setBloque] = useState<Bloque>("A");
  const [busqueda, setBusqueda] = useState("");
  const [casaAbierta, setCasaAbierta] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const porBloque = casas.filter((c) => esDelBloque(c, bloque));
    const t = busqueda.trim();
    return t ? porBloque.filter((c) => coincide(c, t)) : porBloque;
  }, [casas, bloque, busqueda]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por casa, nombre, correo o cédula…"
              className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="inline-flex gap-0.5 rounded-lg bg-secondary p-0.5">
            {BLOQUES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBloque(b)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  bloque === b
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b === "Otros" ? "Otros" : `Bloque ${b}`}
                <span className="text-xs font-semibold tabular-nums text-muted-foreground/70">
                  {casas.filter((c) => esDelBloque(c, b)).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="inline-flex gap-0.5 rounded-lg bg-secondary p-0.5">
          <button
            type="button"
            onClick={() => setVista("grid")}
            aria-pressed={vista === "grid"}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              vista === "grid"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setVista("tabla")}
            aria-pressed={vista === "tabla"}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              vista === "tabla"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Tabla
          </button>
        </div>
      </div>

      {vista === "grid" ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-success" />
              Al día
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Pendiente
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              Sin acceso creado
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8">
            {filtradas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCasaAbierta(c.numero)}
                className="group relative flex aspect-square items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                {c.numero}
                <span
                  className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${DOT_CLASS[c.estado]}`}
                />
              </button>
            ))}
            {filtradas.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No se encontraron casas.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Casa</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Cédula</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.map((f) => (
                <tr key={f.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setCasaAbierta(f.numero)}
                      className="font-medium text-primary hover:underline"
                    >
                      {f.numero}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {f.tipoResidente ? (
                      <Badge variant="secondary">
                        {TIPO_RESIDENTE_LABEL[f.tipoResidente]}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sin acceso</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PagoBadge estado={f.estado} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">
                    {f.propietario || (
                      <span className="text-muted-foreground">Sin nombre</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {f.cedula || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {f.email ? (
                      <>
                        <p className="text-foreground">{f.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {[f.telefono, f.telefonoSecundario].filter(Boolean).join(" · ") ||
                            "Sin teléfono"}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {f.ultimoAcceso
                      ? new Date(f.ultimoAcceso).toLocaleDateString("es-EC", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : f.tieneAcceso
                        ? "Sin sesión registrada"
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setCasaAbierta(f.numero)}
                        title="Editar"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No se encontraron resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {casaAbierta && (
        <CasaModal numero={casaAbierta} onClose={() => setCasaAbierta(null)} />
      )}
    </div>
  );
}
