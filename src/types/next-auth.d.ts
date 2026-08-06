import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    rol: "admin" | "propietario";
    casaId: number | null;
  }

  interface Session {
    user: {
      id: string;
      rol: "admin" | "propietario";
      casaId: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol: "admin" | "propietario";
    casaId: number | null;
  }
}
