"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarUsuario } from "./actions";

export function FormUsuario({
  casaId,
  emailActual,
  onSaved,
}: {
  casaId: number;
  emailActual: string;
  onSaved?: () => void;
}) {
  const [email, setEmail] = useState(emailActual);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const resultado = await guardarUsuario(casaId, email, password);
          if (!resultado.ok) {
            setError(resultado.error);
          } else {
            setPassword("");
            onSaved?.();
          }
        });
      }}
    >
      <div>
        <Label htmlFor={`email-${casaId}`}>Correo</Label>
        <Input
          id={`email-${casaId}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-56"
          required
        />
      </div>
      <div>
        <Label htmlFor={`password-${casaId}`}>
          {emailActual ? "Nueva contraseña" : "Contraseña inicial (cédula)"}
        </Label>
        <Input
          id={`password-${casaId}`}
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-44"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Guardar"}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </form>
  );
}
