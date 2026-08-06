import "dotenv/config";

import { db } from "@/db";
import { tiposExpensa } from "@/db/schema";

const TIPOS = ["Ordinaria", "Extraordinaria", "Otros"];

async function main() {
  for (const nombre of TIPOS) {
    await db
      .insert(tiposExpensa)
      .values({ nombre })
      .onConflictDoNothing({ target: tiposExpensa.nombre });
  }
  console.log("Tipos de expensa listos:", TIPOS.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
