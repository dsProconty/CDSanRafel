"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, formAction, pending] = useActionState(
    async (_prevState: string | undefined, formData: FormData) => login(formData),
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tucorreo@ejemplo.com"
          required
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} size="lg" className="mt-2">
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
