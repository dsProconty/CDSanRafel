"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarAgenda } from "./actions";

const TIPOS_RESIDENTE = [
  { value: "propietario", label: "Propietario" },
  { value: "arrendatario", label: "Arrendatario" },
  { value: "familiar", label: "Familiar" },
] as const;

export function FormAgenda({
  casaId,
  cedulaActual,
  telefonoActual,
  telefonoSecundarioActual,
  tipoResidenteActual,
  onSaved,
}: {
  casaId: number;
  cedulaActual: string;
  telefonoActual: string;
  telefonoSecundarioActual: string;
  tipoResidenteActual: (typeof TIPOS_RESIDENTE)[number]["value"];
  onSaved?: () => void;
}) {
  const [cedula, setCedula] = useState(cedulaActual);
  const [telefono, setTelefono] = useState(telefonoActual);
  const [telefonoSecundario, setTelefonoSecundario] = useState(
    telefonoSecundarioActual
  );
  const [tipoResidente, setTipoResidente] = useState(tipoResidenteActual);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await actualizarAgenda(casaId, {
            cedula,
            telefono,
            telefonoSecundario,
            tipoResidente,
          });
          onSaved?.();
        });
      }}
    >
      <div>
        <Label htmlFor={`tipo-residente-${casaId}`}>Tipo de residente</Label>
        <select
          id={`tipo-residente-${casaId}`}
          value={tipoResidente}
          onChange={(e) =>
            setTipoResidente(e.target.value as typeof tipoResidente)
          }
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {TIPOS_RESIDENTE.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`cedula-${casaId}`}>Cédula</Label>
        <Input
          id={`cedula-${casaId}`}
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          className="w-36"
        />
      </div>
      <div>
        <Label htmlFor={`telefono-${casaId}`}>Teléfono</Label>
        <Input
          id={`telefono-${casaId}`}
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="w-36"
        />
      </div>
      <div>
        <Label htmlFor={`telefono2-${casaId}`}>Teléfono 2</Label>
        <Input
          id={`telefono2-${casaId}`}
          value={telefonoSecundario}
          onChange={(e) => setTelefonoSecundario(e.target.value)}
          className="w-36"
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "…" : "Guardar"}
      </Button>
    </form>
  );
}
