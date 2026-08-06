import { Suspense } from "react";

import { OrchidMark } from "@/components/orchid-mark";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="grain-overlay relative flex min-h-[220px] flex-col justify-between overflow-hidden bg-brand-panel px-8 py-10 text-brand-panel-foreground md:min-h-screen md:w-[42%] md:px-14 md:py-14">
        <OrchidMark className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 text-white/10 md:-right-10 md:-top-10 md:h-96 md:w-96" />

        <div className="relative flex items-center gap-3">
          <OrchidMark className="h-8 w-8 text-brand-panel-foreground" />
          <span className="font-display text-sm tracking-[0.2em] uppercase text-brand-panel-foreground/80">
            SGAI
          </span>
        </div>

        <div className="relative animate-rise">
          <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-5xl">
            Orquídeas
            <br />
            San Rafael
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-brand-panel-foreground/75">
            Administración de expensas y estado de cuenta del condominio,
            Bloque A y Bloque B.
          </p>
        </div>

        <p className="relative hidden text-xs text-brand-panel-foreground/50 md:block">
          159 unidades · 2 bloques
        </p>
      </div>

      <div className="flex flex-1 justify-center bg-background px-6 py-10 md:items-center md:px-12 md:py-14">
        <div className="w-full max-w-sm animate-rise [animation-delay:120ms]">
          <h2 className="font-display text-2xl font-medium text-foreground">
            Ingresar
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Propietarios: número de casa. Administrador: correo. La
            contraseña inicial es tu cédula.
          </p>

          <div className="mt-8">
            <Suspense>
              <LoginFormWithCallback searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

async function LoginFormWithCallback({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <LoginForm callbackUrl={callbackUrl ?? "/"} />;
}
