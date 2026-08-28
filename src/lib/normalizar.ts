// Normaliza texto para comparar referencias bancarias de forma tolerante:
// minúsculas, sin tildes/ñ (el banco a veces los saca, el admin a veces no)
// y espacios de más colapsados. Pedido del cliente ago 2026, tras encontrar
// que el catálogo cargado a mano no siempre coincide carácter a carácter
// con el texto real que manda el banco (ej. "cañadas" vs "canadas").
const DIACRITICOS = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

export function normalizarReferencia(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
