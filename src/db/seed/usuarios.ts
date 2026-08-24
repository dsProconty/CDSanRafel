import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { read, utils } from "xlsx";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { casas, usuarios } from "@/db/schema";

// Uso: npx tsx src/db/seed/usuarios.ts [ruta al USUARIOS.xlsx]
// El archivo no se versiona (contiene correos/cédulas reales de propietarios),
// se espera en ./data/USUARIOS.xlsx por defecto. Requiere que las casas ya
// estén cargadas (npm run db:seed:casas) — cada fila se vincula a una casa
// existente por número, si no existe se reporta y se salta.
//
// Password inicial = cédula (tal como documenta el schema, v1 sin flujo de
// reset). Si una fila no trae cédula, se genera una password aleatoria y se
// imprime al final para que el admin la comparta manualmente.
//
// Columnas esperadas en la hoja (con alias tolerados entre paréntesis):
//   CASA (Numero)               -> numero de casas.numero, ej "36A"
//   EMAIL (Correo)               -> obligatorio, único
//   CEDULA (Cédula)              -> opcional, también es la password inicial
//   TELEFONO (Teléfono)          -> opcional
//   TELEFONO_SECUNDARIO (Telefono2, Teléfono 2) -> opcional
//   TIPO_RESIDENTE (Tipo)        -> propietario|arrendatario|familiar, default propietario

const filePath = process.argv[2] ?? "data/USUARIOS.xlsx";

type TipoResidente = "propietario" | "arrendatario" | "familiar";
const TIPOS_VALIDOS: TipoResidente[] = ["propietario", "arrendatario", "familiar"];

type FilaUsuario = Record<string, unknown>;

function valorPorAlias(fila: FilaUsuario, alias: string[]): string {
  for (const key of Object.keys(fila)) {
    const normalizado = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (alias.includes(normalizado)) {
      const v = fila[key];
      return v == null ? "" : String(v).trim();
    }
  }
  return "";
}

function tipoResidenteDe(valor: string): TipoResidente {
  const v = valor.trim().toLowerCase();
  return TIPOS_VALIDOS.includes(v as TipoResidente) ? (v as TipoResidente) : "propietario";
}

async function main() {
  const buffer = readFileSync(filePath);
  const workbook = read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const filas = utils.sheet_to_json<FilaUsuario>(sheet, { defval: null });

  console.log(`Parseadas ${filas.length} filas de "${filePath}".`);

  let creados = 0;
  let actualizados = 0;
  let saltados = 0;
  const passwordsGeneradas: { email: string; password: string }[] = [];

  for (const [i, fila] of filas.entries()) {
    const numero = valorPorAlias(fila, ["casa", "numero", "numerocasa"]);
    const email = valorPorAlias(fila, ["email", "correo", "correoelectronico"]).toLowerCase();
    const cedula = valorPorAlias(fila, ["cedula"]);
    const telefono = valorPorAlias(fila, ["telefono", "telefono1"]);
    const telefonoSecundario = valorPorAlias(fila, [
      "telefonosecundario",
      "telefono2",
      "telefonoalterno",
    ]);
    const tipoResidente = tipoResidenteDe(
      valorPorAlias(fila, ["tiporesidente", "tipo"])
    );

    if (!numero || !email) {
      console.warn(`Fila ${i + 2}: falta casa o email, se salta.`);
      saltados++;
      continue;
    }

    const [casa] = await db
      .select({ id: casas.id })
      .from(casas)
      .where(eq(casas.numero, numero))
      .limit(1);
    if (!casa) {
      console.warn(`Fila ${i + 2}: no existe la casa "${numero}", se salta.`);
      saltados++;
      continue;
    }

    const [existente] = await db
      .select({ id: usuarios.id, casaId: usuarios.casaId })
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);
    if (existente && existente.casaId !== casa.id) {
      console.warn(
        `Fila ${i + 2}: el correo "${email}" ya está en uso por otra casa, se salta.`
      );
      saltados++;
      continue;
    }

    let password = cedula;
    if (!password) {
      password = randomBytes(9).toString("base64url");
      passwordsGeneradas.push({ email, password });
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const [{ id }] = await db
      .insert(usuarios)
      .values({
        casaId: casa.id,
        email,
        passwordHash,
        rol: "propietario",
        cedula: cedula || null,
        telefono: telefono || null,
        telefonoSecundario: telefonoSecundario || null,
        tipoResidente,
      })
      .onConflictDoUpdate({
        target: usuarios.casaId,
        set: {
          email,
          cedula: cedula || null,
          telefono: telefono || null,
          telefonoSecundario: telefonoSecundario || null,
          tipoResidente,
        },
      })
      .returning({ id: usuarios.id });

    if (existente?.id === id) actualizados++;
    else creados++;
  }

  console.log(
    `Listo: ${creados} usuarios creados, ${actualizados} actualizados, ${saltados} saltados.`
  );
  if (passwordsGeneradas.length) {
    console.log(
      "\nFilas sin cédula recibieron password aleatoria (guarda esto ahora, no se vuelve a mostrar):"
    );
    for (const { email, password } of passwordsGeneradas) {
      console.log(`  ${email} -> ${password}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
