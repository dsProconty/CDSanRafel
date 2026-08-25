import type { NextAuthConfig } from "next-auth";

// Config "edge-safe": sin providers ni acceso a DB, apta para middleware.
// El middleware solo necesita leer el JWT, no ejecutar `authorize()`.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.rol = user.rol;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.sub!;
      session.user.rol = token.rol as "admin" | "propietario";
      return session;
    },
  },
};
