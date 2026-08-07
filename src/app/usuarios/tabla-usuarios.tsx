"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleComprobante } from "./toggle-comprobante";
import { BotonEliminar } from "./boton-eliminar";

export type FilaUsuario = {
  casaId: number;
  numero: string;
  propietario: string | null;
  email: string;
  cedula: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  tipoResidente: "propietario" | "arrendatario" | "familiar";
  comprobanteActivo: boolean;
  ultimoAcceso: string | null;
};

const TIPO_RESIDENTE_LABEL: Record<FilaUsuario["tipoResidente"], string> = {
  propietario: "Propietario",
  arrendatario: "Arrendatario",
  familiar: "Familiar",
};

function coincide(fila: FilaUsuario, termino: string) {
  const t = termino.toLowerCase();
  return (
    fila.numero.toLowerCase().includes(t) ||
    (fila.propietario ?? "").toLowerCase().includes(t) ||
    fila.email.toLowerCase().includes(t) ||
    (fila.cedula ?? "").toLowerCase().includes(t)
  );
}

export function TablaUsuarios({ filas }: { filas: FilaUsuario[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(
    () => (busqueda.trim() ? filas.filter((f) => coincide(f, busqueda)) : filas),
    [filas, busqueda]
  );

  return (
    <div>
      <Input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por casa, nombre, correo o cédula…"
        className="max-w-sm"
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-3">Casa</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Cédula</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Último acceso</th>
              <th className="px-4 py-3">Comprobante</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.map((f) => (
              <tr key={f.casaId} className="hover:bg-accent/40">
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/casas/${f.numero}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {f.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant="secondary">
                    {TIPO_RESIDENTE_LABEL[f.tipoResidente]}
                  </Badge>
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
                  <p className="text-foreground">{f.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {[f.telefono, f.telefonoSecundario].filter(Boolean).join(" · ") ||
                      "Sin teléfono"}
                  </p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {f.ultimoAcceso
                    ? new Date(f.ultimoAcceso).toLocaleDateString("es-EC", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Sin sesión registrada"}
                </td>
                <td className="px-4 py-3">
                  <ToggleComprobante
                    casaId={f.casaId}
                    activo={f.comprobanteActivo}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/casas/${f.numero}`}
                      title="Editar"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <BotonEliminar casaId={f.casaId} nombre={f.propietario ?? ""} />
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
    </div>
  );
}
