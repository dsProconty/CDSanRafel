import { read, utils } from "xlsx";

export type FilaBanco = {
  numero: number;
  fechaTransaccion: string;
  fechaContable: string;
  tipoMovimiento: string;
  documento: string;
  concepto: string;
  agencia: string;
  monto: number;
  referencia: string;
  referencia2: string;
  referencia3: string;
  signo: "+" | "-";
};

const COLUMNAS_ESPERADAS = [
  "#",
  "Fecha de transacción",
  "Fecha contable",
  "Tipo de movimiento",
  "Documento",
  "Concepto",
  "Agencia",
  "Monto",
  "Saldo efectivo",
  "Saldo total",
  "Referencia",
  "Referencia 2",
  "Referencia 3",
  "Signo",
];

function parsearMonto(valor: unknown): number {
  const texto = String(valor ?? "")
    .replace(/[$,]/g, "")
    .trim();
  const monto = Number(texto);
  if (Number.isNaN(monto)) {
    throw new Error(`Monto inválido en el Excel: "${valor}"`);
  }
  return monto;
}

// El parser no lee las columnas "Saldo efectivo"/"Saldo total" (índices 8 y
// 9) — y algunas exportaciones del banco (ej. la pestaña "general" de un
// "Estado de Cuenta" armado a mano) las traen ambas rotuladas "Monto" en vez
// de sus nombres reales. Por eso no se exigen para reconocer el encabezado,
// solo las columnas que el parser sí usa.
const INDICES_VALIDADOS = [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13];

function buscarEncabezado(matriz: unknown[][]): number {
  return matriz.findIndex((fila) => {
    const texto = fila.map((c) => String(c).trim());
    return INDICES_VALIDADOS.every((i) => texto[i] === COLUMNAS_ESPERADAS[i]);
  });
}

export function parseBankExcel(buffer: Buffer): FilaBanco[] {
  const workbook = read(buffer, { type: "buffer" });

  // El archivo puede traer varias pestañas (ej. el "Estado de Cuenta" que
  // arma el cliente agrega "Validación"/"transacciones"/"casas" antes o
  // después de la hoja real de movimientos, y su nombre no es fijo — a
  // veces es la primera hoja, a veces se llama "general"). Se busca en
  // TODAS las hojas la que tenga el encabezado esperado, sin asumir que es
  // la primera ni que se llama de una forma en particular.
  let matriz: unknown[][] | null = null;
  let indiceEncabezado = -1;
  for (const nombreHoja of workbook.SheetNames) {
    const intento = utils.sheet_to_json<unknown[]>(workbook.Sheets[nombreHoja], {
      header: 1,
      defval: "",
    });
    const indice = buscarEncabezado(intento);
    if (indice !== -1) {
      matriz = intento;
      indiceEncabezado = indice;
      break;
    }
  }

  if (!matriz || indiceEncabezado === -1) {
    throw new Error(
      `El formato del Excel del banco cambió. Se esperaban las columnas: ${COLUMNAS_ESPERADAS.join(", ")}.`
    );
  }

  return matriz
    .slice(indiceEncabezado + 1)
    .filter((fila) => String(fila[4] ?? "").trim() !== "")
    .map((fila) => ({
      numero: Number(fila[0]),
      fechaTransaccion: String(fila[1]).trim(),
      fechaContable: String(fila[2]).trim(),
      tipoMovimiento: String(fila[3]).trim(),
      documento: String(fila[4]).trim(),
      concepto: String(fila[5]).trim(),
      agencia: String(fila[6]).trim(),
      monto: parsearMonto(fila[7]),
      referencia: String(fila[10] ?? "").trim(),
      referencia2: String(fila[11] ?? "").trim(),
      referencia3: String(fila[12] ?? "").trim(),
      signo: String(fila[13]).trim() as "+" | "-",
    }));
}
