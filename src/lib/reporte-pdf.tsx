import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import { NOMBRES_MES } from "./reporte-financiero";
import type { CategoriaGasto } from "@/db/schema";

export type ReportePdfData = {
  mes: number;
  anio: number;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number;
  casasPagaron: number;
  casasMora: number;
  casasTotal: number;
  lineasIngreso: { etiqueta: string; monto: number }[];
  lineasEgreso: { categoria: CategoriaGasto; subtipo: string; monto: number }[];
  historicoSaldo: { etiqueta: string; saldoFinal: number }[];
  comparativoMeses: { etiqueta: string; ingresos: number; egresos: number }[];
};

const ETIQUETA_CATEGORIA: Record<CategoriaGasto, string> = {
  mantenimiento: "GASTOS MANTENIMIENTO",
  operativos: "GASTOS OPERATIVOS",
  inversiones: "GASTOS INVERSIONES",
  otros: "OTROS",
};
const ORDEN_CATEGORIA: CategoriaGasto[] = ["mantenimiento", "operativos", "inversiones", "otros"];

const AZUL = "#1d4e6b";
const AZUL_CLARO = "#2f7ba3";
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
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: AZUL },
  brandSub: { fontSize: 7.5, color: GRIS },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 6, marginBottom: 16 },

  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#1a1a1a" },

  balanceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  balanceCard: { flexGrow: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 4, alignItems: "center" },
  balanceValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  balanceLabel: { fontSize: 7, color: GRIS, marginTop: 3, textAlign: "center" },
  balanceOp: { width: 16, textAlign: "center", fontSize: 13, fontFamily: "Helvetica-Bold", color: GRIS },

  twoCol: { flexDirection: "row", gap: 16, marginBottom: 16 },
  col: { flex: 1 },

  chartArea: { height: 90, flexDirection: "row", alignItems: "flex-end", gap: 8, borderBottomWidth: 1, borderBottomColor: LINEA, paddingBottom: 2 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barValueLabel: { fontSize: 6.5, marginBottom: 2, color: "#1a1a1a" },
  bar: { width: "60%", borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  barAxisLabel: { fontSize: 6.5, color: GRIS, marginTop: 4 },

  table: { borderWidth: 1, borderColor: LINEA, borderRadius: 4, overflow: "hidden" },
  theadRow: { flexDirection: "row", backgroundColor: FONDO_CARD, paddingVertical: 4, paddingHorizontal: 6 },
  tr: { flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: LINEA },
  trTotal: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: LINEA, backgroundColor: FONDO_CARD },
  trSubtotal: { flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: LINEA, backgroundColor: "#eaf1f5" },
  thLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, flex: 1 },
  thValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRIS, width: 62, textAlign: "right" },
  tdLabel: { fontSize: 8, flex: 1 },
  tdValue: { fontSize: 8, width: 62, textAlign: "right" },
  tdLabelBold: { fontSize: 8, flex: 1, fontFamily: "Helvetica-Bold" },
  tdValueBold: { fontSize: 8, width: 62, textAlign: "right", fontFamily: "Helvetica-Bold" },

  pagosRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 6.5, color: GRIS, textAlign: "center", borderTopWidth: 1, borderTopColor: LINEA, paddingTop: 6 },
});

function BarChart({
  data,
  color,
  height = 90,
}: {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={[styles.chartArea, { height }]}>
      {data.map((d, i) => (
        <View key={i} style={styles.barCol}>
          <Text style={styles.barValueLabel}>{money(d.value)}</Text>
          <View
            style={[
              styles.bar,
              { height: Math.max((d.value / max) * (height - 22), 3), backgroundColor: color },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function GroupedBarChart({
  data,
  colorA,
  colorB,
  labelA,
  labelB,
  height = 90,
}: {
  data: { label: string; a: number; b: number }[];
  colorA: string;
  colorB: string;
  labelA: string;
  labelB: string;
  height?: number;
}) {
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1);
  return (
    <View>
      <View style={[styles.chartArea, { height }]}>
        {data.map((d, i) => (
          <View key={i} style={[styles.barCol, { flexDirection: "row", alignItems: "flex-end", gap: 3 }]}>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.barValueLabel}>{money(d.a)}</Text>
              <View style={[styles.bar, { width: 22, height: Math.max((d.a / max) * (height - 22), 3), backgroundColor: colorA }]} />
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.barValueLabel}>{money(d.b)}</Text>
              <View style={[styles.bar, { width: 22, height: Math.max((d.b / max) * (height - 22), 3), backgroundColor: colorB }]} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 7, height: 7, backgroundColor: colorA }} />
          <Text style={{ fontSize: 6.5, color: GRIS }}>{labelA}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 7, height: 7, backgroundColor: colorB }} />
          <Text style={{ fontSize: 6.5, color: GRIS }}>{labelB}</Text>
        </View>
      </View>
    </View>
  );
}

function ReporteDocument({ data }: { data: ReportePdfData }) {
  const lineasEgresoPorCategoria = ORDEN_CATEGORIA.map((cat) => ({
    categoria: cat,
    lineas: data.lineasEgreso.filter((l) => l.categoria === cat),
    subtotal: data.lineasEgreso.filter((l) => l.categoria === cat).reduce((a, l) => a + l.monto, 0),
  })).filter((g) => g.lineas.length > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>SGAI · Orquídeas</Text>
            <Text style={styles.brandSub}>Conjunto Habitacional San Rafael</Text>
          </View>
        </View>
        <Text style={styles.title}>
          INFORME ECONÓMICO — {NOMBRES_MES[data.mes - 1].toUpperCase()} {data.anio}
        </Text>

        <View style={styles.balanceRow}>
          <View style={[styles.balanceCard, { backgroundColor: "#eaf1f5" }]}>
            <Text style={[styles.balanceValue, { color: AZUL }]}>{money(data.saldoInicial)}</Text>
            <Text style={styles.balanceLabel}>Saldo inicial{"\n"}01-{NOMBRES_MES[data.mes - 1].slice(0, 3)}</Text>
          </View>
          <Text style={styles.balanceOp}>+</Text>
          <View style={[styles.balanceCard, { backgroundColor: "#eaf1f5" }]}>
            <Text style={[styles.balanceValue, { color: AZUL_CLARO }]}>{money(data.totalIngresos)}</Text>
            <Text style={styles.balanceLabel}>Ingresos</Text>
          </View>
          <Text style={styles.balanceOp}>−</Text>
          <View style={[styles.balanceCard, { backgroundColor: "#fbeaea" }]}>
            <Text style={[styles.balanceValue, { color: ROJO }]}>{money(data.totalEgresos)}</Text>
            <Text style={styles.balanceLabel}>Egresos</Text>
          </View>
          <Text style={styles.balanceOp}>=</Text>
          <View style={[styles.balanceCard, { backgroundColor: "#e9f5ee", borderWidth: 1, borderColor: VERDE }]}>
            <Text style={[styles.balanceValue, { color: VERDE }]}>{money(data.saldoFinal)}</Text>
            <Text style={styles.balanceLabel}>Saldo final{"\n"}fin de mes</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Bancos</Text>
            <BarChart
              data={data.historicoSaldo.map((h) => ({ label: h.etiqueta, value: h.saldoFinal }))}
              color={AZUL}
            />
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              {data.historicoSaldo.map((h, i) => (
                <Text key={i} style={[styles.barAxisLabel, { flex: 1, textAlign: "center" }]}>
                  {h.etiqueta}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Pagos</Text>
            <View style={styles.table}>
              <View style={styles.theadRow}>
                <Text style={styles.thLabel}>Detalle</Text>
                <Text style={styles.thValue}>#Casas</Text>
              </View>
              <View style={styles.tr}>
                <Text style={styles.tdLabel}>Pagaron + No identificados</Text>
                <Text style={styles.tdValue}>{data.casasPagaron}</Text>
              </View>
              <View style={styles.tr}>
                <Text style={styles.tdLabel}>Mora</Text>
                <Text style={styles.tdValue}>{data.casasMora}</Text>
              </View>
              <View style={styles.trTotal}>
                <Text style={styles.tdLabelBold}>Total</Text>
                <Text style={styles.tdValueBold}>{data.casasTotal}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Ingresos</Text>
            <View style={styles.table}>
              <View style={styles.theadRow}>
                <Text style={styles.thLabel}>Tipo</Text>
                <Text style={styles.thValue}>Valor</Text>
              </View>
              {data.lineasIngreso.map((l, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={styles.tdLabel}>{l.etiqueta.toUpperCase()}</Text>
                  <Text style={styles.tdValue}>{money(l.monto)}</Text>
                </View>
              ))}
              <View style={styles.trTotal}>
                <Text style={styles.tdLabelBold}>Total general</Text>
                <Text style={styles.tdValueBold}>{money(data.totalIngresos)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Egresos</Text>
            <View style={styles.table}>
              <View style={styles.theadRow}>
                <Text style={styles.thLabel}>Subtipo</Text>
                <Text style={styles.thValue}>Total</Text>
              </View>
              {lineasEgresoPorCategoria.map((g) => (
                <View key={g.categoria}>
                  {g.lineas.map((l, i) => (
                    <View key={i} style={styles.tr}>
                      <Text style={styles.tdLabel}>{l.subtipo}</Text>
                      <Text style={styles.tdValue}>{money(l.monto)}</Text>
                    </View>
                  ))}
                  <View style={styles.trSubtotal}>
                    <Text style={styles.tdLabelBold}>{ETIQUETA_CATEGORIA[g.categoria]}</Text>
                    <Text style={styles.tdValueBold}>{money(g.subtotal)}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.trTotal}>
                <Text style={styles.tdLabelBold}>TOTAL GENERAL</Text>
                <Text style={styles.tdValueBold}>{money(data.totalEgresos)}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Estadística</Text>
        <GroupedBarChart
          data={data.comparativoMeses.map((c) => ({ label: c.etiqueta, a: c.ingresos, b: c.egresos }))}
          colorA={AZUL_CLARO}
          colorB={ROJO}
          labelA="Ingresos"
          labelB="Egresos"
          height={80}
        />
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          {data.comparativoMeses.map((c, i) => (
            <Text key={i} style={[styles.barAxisLabel, { flex: 1, textAlign: "center" }]}>
              {c.etiqueta}
            </Text>
          ))}
        </View>

        <Text style={styles.footer}>
          Generado por SGAI · Orquídeas San Rafael el {new Date().toLocaleDateString("es-EC")}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderReportePdf(data: ReportePdfData): Promise<Buffer> {
  return renderToBuffer(<ReporteDocument data={data} />);
}
