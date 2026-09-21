import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import type { FilaEstadoCuenta } from "./estado-cuenta";

export type EstadoCuentaPdfData = {
  casa: { numero: string; bloque: string; propietario: string | null };
  titular: { email: string | null; cedula: string | null; telefono: string | null } | null;
  referencias: { referencia: string; banco: string }[];
  filas: FilaEstadoCuenta[];
  totalFacturado: number;
  totalPagado: number;
  saldo: number;
};

// Mismos colores/marca que el informe económico mensual (src/lib/reporte-pdf.tsx)
// para que ambos documentos se vean como parte del mismo sistema.
const AZUL = "#1d4e6b";
const ROJO = "#c65b5b";
const VERDE = "#2f8f5b";
const GRIS = "#6b7280";
const LINEA = "#d9d9d9";
const FONDO_CARD = "#f5f6f8";

function money(n: number): string {
  return `$ ${n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: AZUL },
  brandSub: { fontSize: 7.5, color: GRIS },
  fechaGeneracion: { fontSize: 7.5, color: GRIS, textAlign: "right" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 6, marginBottom: 16 },

  infoRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  infoCol: { flex: 1, borderWidth: 1, borderColor: LINEA, borderRadius: 4, padding: 10 },
  infoTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, marginBottom: 4 },
  infoLine: { fontSize: 8.5, marginBottom: 2 },

  balanceRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  balanceCard: { flex: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 4, alignItems: "center" },
  balanceValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  balanceLabel: { fontSize: 7, color: GRIS, marginTop: 3, textAlign: "center" },

  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#1a1a1a" },

  table: { borderWidth: 1, borderColor: LINEA, borderRadius: 4, overflow: "hidden" },
  theadRow: { flexDirection: "row", backgroundColor: FONDO_CARD, paddingVertical: 4, paddingHorizontal: 6 },
  tr: { flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: LINEA },
  trTotal: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: LINEA,
    backgroundColor: FONDO_CARD,
  },

  thFecha: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, width: 52 },
  thConcepto: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, flex: 1 },
  thValor: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, width: 55, textAlign: "right" },
  thEstado: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, width: 48, textAlign: "center" },
  thFechaPago: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, width: 52 },
  thDocumento: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, width: 62 },

  tdFecha: { fontSize: 7.5, width: 52, color: GRIS },
  tdConcepto: { fontSize: 8, flex: 1 },
  tdDetalle: { fontSize: 6.8, color: GRIS, marginTop: 1 },
  tdValor: { fontSize: 8, width: 55, textAlign: "right", fontFamily: "Helvetica-Bold" },
  tdEstado: { fontSize: 7, width: 48, textAlign: "center", fontFamily: "Helvetica-Bold" },
  tdFechaPago: { fontSize: 7.5, width: 52, color: GRIS },
  tdDocumento: { fontSize: 7, width: 62, color: GRIS },

  referenciasBox: { marginTop: 14, borderWidth: 1, borderColor: LINEA, borderRadius: 4, padding: 10 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 6.5,
    color: GRIS,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: LINEA,
    paddingTop: 6,
  },
});

function EstadoCuentaDocument({ data }: { data: EstadoCuentaPdfData }) {
  const alDia = data.saldo <= 0;
  const hoy = new Date().toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>SGAI · Orquídeas</Text>
            <Text style={styles.brandSub}>Conjunto Habitacional San Rafael</Text>
          </View>
          <Text style={styles.fechaGeneracion}>Generado el {hoy}</Text>
        </View>
        <Text style={styles.title}>
          ESTADO DE CUENTA — CASA {data.casa.numero}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoTitle}>DATOS DE LA CASA</Text>
            <Text style={styles.infoLine}>Casa {data.casa.numero} · Bloque {data.casa.bloque}</Text>
            <Text style={styles.infoLine}>
              Propietario: {data.casa.propietario || "—"}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoTitle}>TITULAR DE ACCESO</Text>
            <Text style={styles.infoLine}>Cédula: {data.titular?.cedula || "—"}</Text>
            <Text style={styles.infoLine}>Correo: {data.titular?.email || "—"}</Text>
            <Text style={styles.infoLine}>Teléfono: {data.titular?.telefono || "—"}</Text>
          </View>
        </View>

        <View style={styles.balanceRow}>
          <View style={[styles.balanceCard, { backgroundColor: "#eaf1f5" }]}>
            <Text style={[styles.balanceValue, { color: AZUL }]}>{money(data.totalFacturado)}</Text>
            <Text style={styles.balanceLabel}>Total deuda</Text>
          </View>
          <View style={[styles.balanceCard, { backgroundColor: "#e9f5ee" }]}>
            <Text style={[styles.balanceValue, { color: VERDE }]}>{money(data.totalPagado)}</Text>
            <Text style={styles.balanceLabel}>Total pagado</Text>
          </View>
          <View
            style={[
              styles.balanceCard,
              {
                backgroundColor: alDia ? "#e9f5ee" : "#fbeaea",
                borderWidth: 1,
                borderColor: alDia ? VERDE : ROJO,
              },
            ]}
          >
            <Text style={[styles.balanceValue, { color: alDia ? VERDE : ROJO }]}>
              {money(Math.abs(data.saldo))}
            </Text>
            <Text style={styles.balanceLabel}>{alDia ? "A favor / al día" : "Saldo pendiente"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detalle de movimientos</Text>
        <View style={styles.table}>
          <View style={styles.theadRow}>
            <Text style={styles.thFecha}>Emisión</Text>
            <Text style={styles.thConcepto}>Concepto</Text>
            <Text style={styles.thValor}>Valor</Text>
            <Text style={styles.thEstado}>Estado</Text>
            <Text style={styles.thFechaPago}>Fecha pago</Text>
            <Text style={styles.thDocumento}>Documento</Text>
          </View>
          {data.filas.map((f) => (
            <View key={f.id} style={styles.tr}>
              <Text style={styles.tdFecha}>{f.fechaEmision}</Text>
              <View style={styles.tdConcepto}>
                <Text>{f.tipo}</Text>
                {f.detalle && <Text style={styles.tdDetalle}>{f.detalle}</Text>}
              </View>
              <Text style={styles.tdValor}>{money(f.valor)}</Text>
              <Text style={[styles.tdEstado, { color: f.estado === "pagada" ? VERDE : ROJO }]}>
                {f.estado === "pagada" ? "Pagada" : "Pendiente"}
              </Text>
              <Text style={styles.tdFechaPago}>{f.fechaPago ?? "—"}</Text>
              <Text style={styles.tdDocumento}>{f.comprobante ?? "—"}</Text>
            </View>
          ))}
          {data.filas.length === 0 && (
            <View style={styles.tr}>
              <Text style={{ fontSize: 8, color: GRIS }}>Esta casa no tiene deudas registradas.</Text>
            </View>
          )}
          <View style={styles.trTotal}>
            <Text style={[styles.tdConcepto, { fontFamily: "Helvetica-Bold" }]}>Saldo pendiente actual</Text>
            <Text style={[styles.tdValor, { color: alDia ? VERDE : ROJO }]}>
              {money(Math.abs(data.saldo))}
            </Text>
          </View>
        </View>

        {data.referencias.length > 0 && (
          <View style={styles.referenciasBox}>
            <Text style={styles.infoTitle}>REFERENCIAS DE PAGO REGISTRADAS PARA ESTA CASA</Text>
            {data.referencias.map((r, i) => (
              <Text key={i} style={styles.infoLine}>
                {r.banco}: {r.referencia}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Generado por SGAI · Orquídeas San Rafael el {hoy}. Documento informativo, no reemplaza
          un comprobante contable oficial.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderEstadoCuentaPdf(data: EstadoCuentaPdfData): Promise<Buffer> {
  return renderToBuffer(<EstadoCuentaDocument data={data} />);
}
