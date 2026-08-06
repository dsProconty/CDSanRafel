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

export function parseBankExcel(buffer: Buffer): FilaBanco[] {
  const workbook = read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matriz = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  // Antes de la tabla hay filas de metadata (cuenta, periodo, saldo) cuya
  // cantidad puede variar; se ubica el encabezado real buscando la fila
  // cuyo contenido coincide con las columnas esperadas.
  const indiceEncabezado = matriz.findIndex((fila) => {
    const texto = fila.map((c) => String(c).trim());
    return COLUMNAS_ESPERADAS.every((col, i) => texto[i] === col);
  });

  if (indiceEncabezado === -1) {
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
