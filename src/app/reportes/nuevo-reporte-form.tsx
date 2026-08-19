"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { crearBorradorReporte } from "./actions";

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function NuevoReporteForm() {
  const router = useRouter();
  const hoy = new Date();
  const [mes, setMes] = useState(String(hoy.getMonth() + 1));
  const [anio, setAnio] = useState(String(hoy.getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const resultado = await crearBorradorReporte(Number(mes), Number(anio));
          if (!resultado.ok) {
            setError(resultado.error);
          } else {
            router.push(`/reportes/${resultado.id}`);
          }
        });
      }}
    >
      <div>
        <Label htmlFor="mes">Mes</Label>
        <select
          id="mes"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="mt-1 h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
        >
          {NOMBRES_MES.map((n, i) => (
            <option key={n} value={i + 1}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="anio">Año</Label>
        <select
          id="anio"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          className="mt-1 h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
        >
          {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Nuevo informe"}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}
