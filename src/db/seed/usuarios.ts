import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { read, utils } from "xlsx";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { casas, usuarios } from "@/db/schema";

// Uso: npx tsx src/db/seed/usuarios.ts [ruta a la agenda de residentes .xlsx]
// El archivo no se versiona (contiene correos/cédulas reales de propietarios),
// se espera en ./data/AGENDA_RESIDENTES.xlsx por defecto. Requiere que las
// casas ya estén cargadas (npm run db:seed:casas) — cada fila se vincula a
// una casa existente por número; si no existe se reporta y se salta (así se
// descartan filas administrativas del sistema viejo como "NO IDENT." o
// "CAJA CHICA" que no son casas reales).
//
// Además de crear/actualizar el usuario, actualiza casas.propietario con el
// nombre completo de la fila (nombres + apellidos), que hasta ahora se
// completaba a mano.
//
// Password inicial = cédula (tal como documenta el schema, v1 sin flujo de
// reset). Si una fila no trae cédula, se genera una password aleatoria y se
// imprime al final para que el admin la comparta manualmente.
//
// Columnas esperadas (con alias tolerados, case-insensitive):
//   CASA (Numero)                      -> numero de casas.numero, ej "36A"
//   EMAIL (Correo)                      -> obligatorio, único por usuario
//   CEDULA (Identificacion)             -> también es la password inicial
//   NOMBRES / APELLIDOS (Nombre)        -> arma casas.propietario
//   TELEFONO (Telefono1)                -> opcional
//   TELEFONO_SECUNDARIO (Telefono2)     -> opcional
//   TIPO_RESIDENTE (Tiporesidentes_id)  -> propietario|arrendatario|familiar, default propietario
//
// El export viejo (Excel de origen numérico) suele perder el cero inicial de
// cédulas y celulares ecuatorianos (10 dígitos) al guardarlos como número:
// se detecta y se repone automáticamente.

const filePath = process.argv[2] ?? "data/AGENDA_RESIDENTES.xlsx";

type TipoResidente = "propietario" | "arrendatario" | "familiar";
const TIPOS_VALIDOS: TipoResidente[] = ["propietario", "arrendatario", "familiar"];

type FilaUsuario = Record<string, unknown>;

function valorPorAlias(fila: FilaUsuario, alias: string[]): string {
  for (const key of Object.keys(fila)) {
    const normalizado = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (alias.includes(normalizado)) {
      const v = fila[key];
      const texto = v == null ? "" : String(v).trim();
      return texto.toLowerCase() === "null" ? "" : texto;
    }
  }
  return "";
}

function tipoResidenteDe(valor: string): TipoResidente {
  const v = valor.trim().toLowerCase();
  return TIPOS_VALIDOS.includes(v as TipoResidente) ? (v as TipoResidente) : "propietario";
}

// Deja solo dígitos. La cédula ecuatoriana siempre tiene 10 dígitos: si
// Excel la guardó como número y perdió el cero inicial (queda en 9 dígitos),
// se repone sin condición extra.
function soloDigitosCedula(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 9 ? `0${digitos}` : digitos;
}

// El celular ecuatoriano (10 dígitos, empieza con "09") sufre el mismo
// problema pero solo se repone el cero cuando el resultado quedó en 9
// dígitos empezando con "9" — así no se toca un número extranjero o fijo.
function soloDigitosTelefono(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length === 9 && digitos.startsWith("9")) return `0${digitos}`;
  return digitos;
}

function nombreCompleto(fila: FilaUsuario): string {
  const nombres = valorPorAlias(fila, ["nombres", "nombre"]);
  const apellidos = valorPorAlias(fila, ["apellidos", "apellido"]);
  return `${nombres} ${apellidos}`.replace(/\s+/g, " ").trim();
}

async function main() {
  const buffer = readFileSync(filePath);
  const workbook = read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const filas = utils.sheet_to_json<FilaUsuario>(sheet, { defval: null });

  console.log(`Parseadas ${filas.length} filas de "${filePath}".`);

  const casasVistasEnArchivo = new Map<string, number>(); // numero -> fila donde ya se vio

  let creados = 0;
  let actualizados = 0;
  let saltados = 0;
  const passwordsGeneradas: { email: string; password: string }[] = [];

  for (const [i, fila] of filas.entries()) {
    const numeroFila = i + 2; // +1 por índice 0-based, +1 por la fila de encabezado
    const numero = valorPorAlias(fila, ["casa", "numero", "numerocasa"]).replace(/\s+/g, "");
    const email = valorPorAlias(fila, ["email", "correo", "correoelectronico"]).toLowerCase();
    const cedula = soloDigitosCedula(valorPorAlias(fila, ["cedula", "identificacion"]));
    const telefono = soloDigitosTelefono(valorPorAlias(fila, ["telefono", "telefono1"]));
    const telefonoSecundario = soloDigitosTelefono(
      valorPorAlias(fila, ["telefonosecundario", "telefono2", "telefonoalterno"])
    );
    const tipoResidente = tipoResidenteDe(
      valorPorAlias(fila, ["tiporesidente", "tipo", "tiporesidentesid"])
    );
    const propietario = nombreCompleto(fila);

    if (!numero || !email) {
      console.warn(`Fila ${numeroFila}: falta casa o email, se salta.`);
      saltados++;
      continue;
    }

    const [casa] = await db
      .select({ id: casas.id })
      .from(casas)
      .where(eq(casas.numero, numero))
      .limit(1);
    if (!casa) {
      console.warn(`Fila ${numeroFila}: no existe la casa "${numero}", se salta.`);
      saltados++;
      continue;
    }

    const filaPrevia = casasVistasEnArchivo.get(numero);
    if (filaPrevia) {
      console.warn(
        `Fila ${numeroFila}: la casa "${numero}" ya apareció en la fila ${filaPrevia} del archivo (con otro usuario) — una casa no puede tener 2 usuarios, se sobrescribe con esta fila, revisar manualmente cuál es la correcta.`
      );
    }
    casasVistasEnArchivo.set(numero, numeroFila);

    if (propietario) {
      await db.update(casas).set({ propietario }).where(eq(casas.id, casa.id));
    }

    let password = cedula;
    if (!password) {
      password = randomBytes(9).toString("base64url");
      passwordsGeneradas.push({ email, password });
    }
    const passwordHash = await bcrypt.hash(password, 10);

    // El mismo correo puede repetirse en varias filas (una persona con más
    // de una casa) — se reusa el mismo usuario y solo se vincula la casa,
    // en vez de crear un login duplicado.
    const [existente] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);

    let usuarioId: number;
    if (existente) {
      usuarioId = existente.id;
      await db
        .update(usuarios)
        .set({
          passwordHash,
          cedula: cedula || null,
          telefono: telefono || null,
          telefonoSecundario: telefonoSecundario || null,
          tipoResidente,
        })
        .where(eq(usuarios.id, usuarioId));
      actualizados++;
    } else {
      const [creado] = await db
        .insert(usuarios)
        .values({
          email,
          passwordHash,
          rol: "propietario",
          cedula: cedula || null,
          telefono: telefono || null,
          telefonoSecundario: telefonoSecundario || null,
          tipoResidente,
        })
        .returning({ id: usuarios.id });
      usuarioId = creado.id;
      creados++;
    }

    await db.update(casas).set({ usuarioId }).where(eq(casas.id, casa.id));
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
