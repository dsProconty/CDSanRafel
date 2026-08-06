import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

const RUTAS_PUBLICAS = ["/login"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const esRutaPublica = RUTAS_PUBLICAS.some((ruta) =>
    req.nextUrl.pathname.startsWith(ruta)
  );

  if (!req.auth && !esRutaPublica) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
