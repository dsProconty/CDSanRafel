import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { casas, usuarios } from "@/db/schema";
import { authConfig } from "@/auth.config";

// Login v1: "identificador" es el número de casa (propietario) o el email (admin).
// Password inicial = cédula del propietario (no hay flujo de reset en v1).
// Esta config completa (con providers y acceso a DB) solo se importa en runtime
// Node (route handlers, server actions, server components) — nunca en middleware.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identificador: { label: "Casa o email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const identificador = String(credentials?.identificador ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!identificador || !password) return null;

        const esEmail = identificador.includes("@");

        const [usuario] = esEmail
          ? await db
              .select({
                id: usuarios.id,
                passwordHash: usuarios.passwordHash,
                rol: usuarios.rol,
                email: usuarios.email,
                casaId: usuarios.casaId,
              })
              .from(usuarios)
              .where(eq(usuarios.email, identificador))
              .limit(1)
          : await db
              .select({
                id: usuarios.id,
                passwordHash: usuarios.passwordHash,
                rol: usuarios.rol,
                email: usuarios.email,
                casaId: usuarios.casaId,
                casaNumero: casas.numero,
              })
              .from(usuarios)
              .innerJoin(casas, eq(casas.id, usuarios.casaId))
              .where(eq(casas.numero, identificador))
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
