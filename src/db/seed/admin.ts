import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import { db } from "@/db";
import { usuarios } from "@/db/schema";

// Uso: npx tsx src/db/seed/admin.ts [email] [password]
// Si no se pasa password, se genera una aleatoria y se imprime una sola vez.
// El admin no tiene casa asociada (administra el condominio completo, no una unidad).

async function main() {
  const email = process.argv[2] ?? "admin@orquideassanrafael.local";
  const password = process.argv[3] ?? randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  await db
    .insert(usuarios)
    .values({ email, passwordHash, rol: "admin" })
    .onConflictDoUpdate({
      target: usuarios.email,
      set: { passwordHash, rol: "admin" },
    });

  console.log(`Admin listo → email: ${email} / password: ${password}`);
  console.log("Guarda este password ahora, no se vuelve a mostrar.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
