import { Suspense } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2">
          <BrandMark className="h-8 w-8 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            SGAI Orquídeas San Rafael
          </span>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card px-6 py-8 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Ingresar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa con tu correo electrónico. La contraseña inicial es tu
            cédula.
          </p>

          <div className="mt-6">
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
