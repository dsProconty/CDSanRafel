import "dotenv/config";
import { readFileSync } from "node:fs";
import { read, utils } from "xlsx";

import { db } from "@/db";
import { casas, catalogoReferenciasBancarias } from "@/db/schema";

// Uso: npx tsx src/db/seed/casas.ts [ruta al CASAS.xlsx]
// El archivo no se versiona (contiene nombres/cédulas de propietarios reales),
// se espera en ./data/CASAS.xlsx por defecto.

const filePath = process.argv[2] ?? "data/CASAS.xlsx";

type FilaCasa = { CASA?: unknown; Referencia?: unknown };

function bloqueDeNumero(numero: string): string {
  const match = numero.trim().match(/([A-Za-z])$/);
  if (!match) {
    throw new Error(`No se pudo derivar el bloque de la casa "${numero}"`);
  }
  return match[1].toUpperCase();
}

async function main() {
  const buffer = readFileSync(filePath);
  const workbook = read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const filas = utils.sheet_to_json<FilaCasa>(sheet, { defval: null });

  const numerosUnicos = new Map<string, string>(); // numero -> bloque
  const referenciasPorCasa = new Map<string, Set<string>>(); // numero -> referencias

  for (const fila of filas) {
    const numero = String(fila.CASA ?? "").trim();
    const referencia = String(fila.Referencia ?? "").trim();
    if (!numero || !referencia) continue;

    if (!numerosUnicos.has(numero)) {
      numerosUnicos.set(numero, bloqueDeNumero(numero));
    }
    if (!referenciasPorCasa.has(numero)) {
      referenciasPorCasa.set(numero, new Set());
    }
    referenciasPorCasa.get(numero)!.add(referencia);
  }

  console.log(
    `Parseadas ${filas.length} filas → ${numerosUnicos.size} casas únicas.`
  );

  const casaIdPorNumero = new Map<string, number>();

  for (const [numero, bloque] of numerosUnicos) {
    const [row] = await db
      .insert(casas)
      .values({ numero, bloque })
      .onConflictDoUpdate({
        target: casas.numero,
        set: { bloque },
      })
      .returning({ id: casas.id });
    casaIdPorNumero.set(numero, row.id);
  }

  let referenciasInsertadas = 0;
  for (const [numero, referencias] of referenciasPorCasa) {
    const casaId = casaIdPorNumero.get(numero)!;
    for (const referencia of referencias) {
      await db
        .insert(catalogoReferenciasBancarias)
        .values({ casaId, referencia })
        .onConflictDoNothing({
          target: [
            catalogoReferenciasBancarias.casaId,
            catalogoReferenciasBancarias.referencia,
          ],
        });
      referenciasInsertadas++;
    }
  }

  console.log(
    `Listo: ${casaIdPorNumero.size} casas y ${referenciasInsertadas} referencias bancarias procesadas.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
