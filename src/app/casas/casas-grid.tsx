"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export type EstadoCasa = "ok" | "due" | "none";

export type FilaCasa = {
  id: number;
  numero: string;
  estado: EstadoCasa;
};

const DOT_CLASS: Record<EstadoCasa, string> = {
  ok: "bg-success",
  due: "bg-destructive",
  none: "bg-muted-foreground/40",
};

export function CasasGrid({ casas }: { casas: FilaCasa[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return t ? casas.filter((c) => c.numero.toLowerCase().includes(t)) : casas;
  }, [casas, busqueda]);

  return (
    <div>
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número de casa…"
          className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

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
          <Link
            key={c.id}
            href={`/casas/${c.numero}`}
            className="group relative flex aspect-square items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
          >
            {c.numero}
            <span
              className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${DOT_CLASS[c.estado]}`}
            />
          </Link>
        ))}
        {filtradas.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No se encontraron casas.
          </p>
        )}
      </div>
    </div>
  );
}
