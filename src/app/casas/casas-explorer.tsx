"use client";

import { useMemo, useState } from "react";
import { Eye, FileText, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { proximoSort, SortableTh, type SortState } from "@/components/ui/sortable-th";
import { CasaModal } from "./casa-modal";
import { EstadoCuentaModal } from "./estado-cuenta-modal";

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
    (c.cedula ?? "").toLowerCase().includes(t) ||
    (c.telefono ?? "").includes(t) ||
    (c.telefonoSecundario ?? "").includes(t)
  );
}

function formatoUltimoAcceso(f: FilaCasa) {
  if (f.ultimoAcceso) {
    return `Último acceso: ${new Date(f.ultimoAcceso).toLocaleDateString("es-EC", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  return f.tieneAcceso ? "Sin sesión registrada todavía" : "Esta casa no tiene usuario creado";
}

const ESTADO_FILTROS = ["Todos", "propietario", "arrendatario", "familiar", "sin_acceso"] as const;
type EstadoFiltro = (typeof ESTADO_FILTROS)[number];
const ESTADO_FILTRO_LABEL: Record<EstadoFiltro, string> = {
  Todos: "Todos los estados",
  propietario: "Propietario",
  arrendatario: "Arrendatario",
  familiar: "Familiar",
  sin_acceso: "Sin acceso",
};

const PAGO_FILTROS = ["Todos", "ok", "due", "none"] as const;
type PagoFiltro = (typeof PAGO_FILTROS)[number];
const PAGO_FILTRO_LABEL: Record<PagoFiltro, string> = {
  Todos: "Todos los pagos",
  ok: "Al día",
  due: "Pendiente",
  none: "Sin acceso",
};

function PagoBadge({ estado }: { estado: EstadoCasa }) {
  if (estado === "ok") return <Badge variant="success">Al día</Badge>;
  if (estado === "due") return <Badge variant="destructive">Pendiente</Badge>;
  return <span className="text-muted-foreground">—</span>;
}

type SortKey = "casa" | "estado" | "pago" | "nombre" | "cedula" | "contacto";

function numeroCasaOrden(numero: string): [number, string] {
  const match = numero.match(/^(\d+)(.*)$/);
  return match ? [Number(match[1]), match[2]] : [0, numero];
}

const ESTADO_ORDEN: Record<TipoResidente | "sin_acceso", number> = {
  propietario: 0,
  arrendatario: 1,
  familiar: 2,
  sin_acceso: 3,
};

const PAGO_ORDEN: Record<EstadoCasa, number> = { due: 0, ok: 1, none: 2 };

function comparar(a: FilaCasa, b: FilaCasa, key: SortKey): number {
  switch (key) {
    case "casa": {
      const [numA, letraA] = numeroCasaOrden(a.numero);
      const [numB, letraB] = numeroCasaOrden(b.numero);
      return numA - numB || letraA.localeCompare(letraB);
    }
    case "estado":
      return (
        ESTADO_ORDEN[a.tipoResidente ?? "sin_acceso"] -
        ESTADO_ORDEN[b.tipoResidente ?? "sin_acceso"]
      );
    case "pago":
      return PAGO_ORDEN[a.estado] - PAGO_ORDEN[b.estado];
    case "nombre":
      if (!a.propietario && !b.propietario) return 0;
      if (!a.propietario) return 1;
      if (!b.propietario) return -1;
      return a.propietario.localeCompare(b.propietario);
    case "cedula":
      if (!a.cedula && !b.cedula) return 0;
      if (!a.cedula) return 1;
      if (!b.cedula) return -1;
      return a.cedula.localeCompare(b.cedula);
    case "contacto":
      if (!a.email && !b.email) return 0;
      if (!a.email) return 1;
      if (!b.email) return -1;
      return a.email.localeCompare(b.email);
    default:
      return 0;
  }
}

export function CasasExplorer({ casas }: { casas: FilaCasa[] }) {
  const [bloque, setBloque] = useState<Bloque>("A");
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("Todos");
  const [pagoFiltro, setPagoFiltro] = useState<PagoFiltro>("Todos");
  const [casaAbierta, setCasaAbierta] = useState<string | null>(null);
  const [casaEstadoCuenta, setCasaEstadoCuenta] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "casa", dir: "asc" });

  const filtradas = useMemo(() => {
    const t = busqueda.trim();
    const resultado = casas.filter((c) => {
      if (!esDelBloque(c, bloque)) return false;
      if (estadoFiltro !== "Todos") {
        const estadoCasa = c.tipoResidente ?? "sin_acceso";
        if (estadoCasa !== estadoFiltro) return false;
      }
      if (pagoFiltro !== "Todos" && c.estado !== pagoFiltro) return false;
      if (t && !coincide(c, t)) return false;
      return true;
    });
    const signo = sort.dir === "asc" ? 1 : -1;
    return resultado.sort((a, b) => signo * comparar(a, b, sort.key));
  }, [casas, bloque, estadoFiltro, pagoFiltro, busqueda, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por casa, nombre, correo, cédula o teléfono…"
        />
        <Select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}
        >
          {ESTADO_FILTROS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_FILTRO_LABEL[e]}
            </option>
          ))}
        </Select>
        <Select value={pagoFiltro} onChange={(e) => setPagoFiltro(e.target.value as PagoFiltro)}>
          {PAGO_FILTROS.map((p) => (
            <option key={p} value={p}>
              {PAGO_FILTRO_LABEL[p]}
            </option>
          ))}
        </Select>
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

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
              <SortableTh
                label="Casa"
                sortKey="casa"
                sort={sort}
                onSort={(k) => setSort((s) => proximoSort(s, k))}
                className="px-4 py-3"
              />
              <SortableTh
                label="Estado"
                sortKey="estado"
                sort={sort}
                onSort={(k) => setSort((s) => proximoSort(s, k))}
                className="px-4 py-3"
              />
              <SortableTh
                label="Pago"
                sortKey="pago"
                sort={sort}
                onSort={(k) => setSort((s) => proximoSort(s, k))}
                className="px-4 py-3"
              />
              <SortableTh
                label="Nombre"
                sortKey="nombre"
                sort={sort}
                onSort={(k) => setSort((s) => proximoSort(s, k))}
                className="px-4 py-3"
              />
              <SortableTh
                label="Cédula"
                sortKey="cedula"
                sort={sort}
                onSort={(k) => setSort((s) => proximoSort(s, k))}
                className="px-4 py-3"
              />
              <SortableTh
                label="Contacto"
                sortKey="contacto"
                sort={sort}
                onSort={(k) => setSort((s) => proximoSort(s, k))}
                className="px-4 py-3"
              />
              <th className="sticky right-0 bg-muted px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.map((f) => (
              <tr key={f.id} className="group hover:bg-accent/40">
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
                <td className="sticky right-0 bg-card px-4 py-3 group-hover:bg-accent/40">
                  <div className="flex items-center justify-end gap-3">
                    <span
                      title={formatoUltimoAcceso(f)}
                      className="text-muted-foreground"
                    >
                      <Eye className="h-4 w-4" />
                    </span>
                    <button
                      type="button"
                      onClick={() => setCasaEstadoCuenta(f.numero)}
                      title="Estado de cuenta"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
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
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No se encontraron resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {casaAbierta && (
        <CasaModal numero={casaAbierta} onClose={() => setCasaAbierta(null)} />
      )}
      {casaEstadoCuenta && (
        <EstadoCuentaModal
          numero={casaEstadoCuenta}
          onClose={() => setCasaEstadoCuenta(null)}
        />
      )}
    </div>
  );
}
