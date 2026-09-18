export type FilaEstadoCuenta = {
  id: number;
  tipo: string;
  estado: "pendiente" | "pagada";
  valor: number;
  fechaEmision: string;
  fechaPago: string | null;
  comprobante: string | null;
  detalle: string | null;
};

// Asigna cada pago a la deuda más antigua sin cubrir (FIFO), como un libro
// mayor simple. No hay vínculo real deuda↔pago en el modelo de datos —
// esto es una reconstrucción de lectura para mostrar Estado/Fecha de pago/
// Comprobante por línea, igual que en el sistema anterior. Se usa tanto en
// la pantalla de Casas como en el PDF de estado de cuenta descargable.
export function calcularEstadoCuenta(
  listaDeudas: { id: number; monto: string; fecha: string; descripcion: string | null; tipo: string }[],
  listaPagos: { documento: string; fecha: string; monto: string }[]
): FilaEstadoCuenta[] {
  const deudasOrdenadas = [...listaDeudas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pagosOrdenados = [...listaPagos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((p) => ({ ...p, restante: Number(p.monto) }));

  let idxPago = 0;

  return deudasOrdenadas.map((d) => {
    let pendiente = Number(d.monto);
    let fechaPago: string | null = null;
    const comprobantes: string[] = [];

    while (pendiente > 0.005 && idxPago < pagosOrdenados.length) {
      const pago = pagosOrdenados[idxPago];
      if (pago.restante <= 0.005) {
        idxPago++;
        continue;
      }
      const usar = Math.min(pendiente, pago.restante);
      pago.restante -= usar;
      pendiente -= usar;
      if (!comprobantes.includes(pago.documento)) comprobantes.push(pago.documento);
      fechaPago = pago.fecha;
      if (pago.restante <= 0.005) idxPago++;
    }

    const pagada = pendiente <= 0.005;
    return {
      id: d.id,
      tipo: d.tipo,
      estado: pagada ? "pagada" : "pendiente",
      valor: Number(d.monto),
      fechaEmision: d.fecha,
      fechaPago: pagada ? fechaPago : null,
      comprobante: pagada && comprobantes.length ? comprobantes.join(", ") : null,
      detalle: d.descripcion,
    };
  });
}
