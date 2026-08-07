"use client";

import { useState } from "react";

import type { Concepto } from "../conceptos/actions";
import type { Recurrente } from "../recurrentes/actions";
import { FormRecurrente } from "../recurrentes/form-recurrente";
import { ListaRecurrentes } from "../recurrentes/lista-recurrentes";
import { FormDeudaMasiva } from "./form-deuda-masiva";

type Casa = { id: number; numero: string; bloque: string };
type Modo = "unica" | "recurrente";

export function SelectorModoDeuda({
  conceptos,
  casas,
  recurrentes,
}: {
  conceptos: Concepto[];
  casas: Casa[];
  recurrentes: Recurrente[];
}) {
  const [modo, setModo] = useState<Modo>("unica");

  return (
    <div>
      <div className="inline-flex rounded-full border border-border bg-muted/50 p-1">
        <TabButton activo={modo === "unica"} onClick={() => setModo("unica")}>
          Aplicación única
        </TabButton>
        <TabButton
          activo={modo === "recurrente"}
          onClick={() => setModo("recurrente")}
        >
          Recurrente / cuotas
        </TabButton>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card px-6 py-6">
        {modo === "unica" ? (
          <FormDeudaMasiva conceptos={conceptos} casas={casas} />
        ) : (
          <FormRecurrente conceptos={conceptos} casas={casas} />
        )}
      </div>

      {modo === "recurrente" && (
        <section className="mt-6">
          <h2 className="text-base font-semibold text-foreground">
            Planes programados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuántos períodos lleva generados cada plan y si está activo,
            pausado o completo.
          </p>
          <ListaRecurrentes recurrentes={recurrentes} />
        </section>
      )}
    </div>
  );
}

function TabButton({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        activo
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
