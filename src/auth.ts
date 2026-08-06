import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { authConfig } from "@/auth.config";

// Login: identificador = email (admin y propietario por igual).
// Password inicial = cédula del propietario (no hay flujo de reset en v1).
// Esta config completa (con providers y acceso a DB) solo se importa en runtime
// Node (route handlers, server actions, server components) — nunca en middleware.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const [usuario] = await db
          .select({
            id: usuarios.id,
            passwordHash: usuarios.passwordHash,
            rol: usuarios.rol,
            email: usuarios.email,
            casaId: usuarios.casaId,
          })
          .from(usuarios)
          .where(eq(usuarios.email, email))
          .limit(1);

        if (!usuario) return null;

        const passwordValida = await bcrypt.compare(
          password,
          usuario.passwordHash
        );
        if (!passwordValida) return null;

        return {
          id: String(usuario.id),
          rol: usuario.rol,
          casaId: usuario.casaId,
          email: usuario.email,
        };
      },
    }),
  ],
});
