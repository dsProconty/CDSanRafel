import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  date,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const rolUsuarioEnum = pgEnum("rol_usuario", ["admin", "propietario"]);

export const tipoResidenteEnum = pgEnum("tipo_residente", [
  "propietario",
  "arrendatario",
  "familiar",
]);

export const estadoMovimientoEnum = pgEnum("estado_movimiento", [
  "matched",
  "pendiente_revision",
  "sin_catalogar",
]);

export const estadoDeudaEnum = pgEnum("estado_deuda", ["pendiente", "pagada"]);

export const categoriaGastoEnum = pgEnum("categoria_gasto", [
  "mantenimiento",
  "operativos",
  "inversiones",
  "otros",
]);
export type CategoriaGasto = (typeof categoriaGastoEnum.enumValues)[number];

// Catálogo de casas del condominio (159 casas, Bloque A y B)
export const casas = pgTable(
  "casas",
  {
    id: serial("id").primaryKey(),
    numero: text("numero").notNull(), // ej: "1A", "36A"
    bloque: text("bloque").notNull(), // "A" | "B" (derivado del número)
    propietario: text("propietario"), // se completa manualmente, no viene en CASAS.xlsx
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("casas_numero_idx").on(table.numero)]
);

// Un usuario = una casa. Password inicial = cédula (v1, sin flujo de reset).
export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    casaId: integer("casa_id").references(() => casas.id), // null para admin (no está atado a una sola casa)
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    rol: rolUsuarioEnum("rol").notNull().default("propietario"),
    // Datos de agenda/contacto (fusión de las pantallas "Usuarios" y "Agenda" del sistema viejo)
    cedula: text("cedula"),
    telefono: text("telefono"),
    telefonoSecundario: text("telefono_secundario"),
    tipoResidente: tipoResidenteEnum("tipo_residente")
      .notNull()
      .default("propietario"),
    comprobanteActivo: boolean("comprobante_activo").notNull().default(true),
    ultimoAcceso: timestamp("ultimo_acceso"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("usuarios_casa_id_idx").on(table.casaId),
    uniqueIndex("usuarios_email_idx").on(table.email),
  ]
);

// Referencias bancarias asociadas a cada casa (relación 1 casa : N referencias).
// Importado desde CASAS.xlsx; se amplía cuando el admin cataloga una referencia nueva.
export const catalogoReferenciasBancarias = pgTable(
  "catalogo_referencias_bancarias",
  {
    id: serial("id").primaryKey(),
    casaId: integer("casa_id")
      .notNull()
      .references(() => casas.id),
    referencia: text("referencia").notNull(),
    banco: text("banco").notNull().default("Banco Guayaquil"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("catalogo_referencias_casa_referencia_idx").on(
      table.casaId,
      table.referencia
    ),
  ]
);

// Catálogo parametrizado de tipos de expensa (ordinaria, extraordinaria, otros...)
export const tiposExpensa = pgTable(
  "tipos_expensa",
  {
    id: serial("id").primaryKey(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [uniqueIndex("tipos_expensa_nombre_idx").on(table.nombre)]
);

// Catálogo de conceptos de deuda parametrizados por el admin de antemano
// (ej. "Alícuota ordinaria" $60, "Cuota extraordinaria piscina" $150).
// Al generar una deuda masiva se elige uno de estos conceptos en vez de
// tipear tipo/monto/descripción cada vez; monto y descripción quedan
// precargados pero son editables ese día sin tocar el catálogo.
export const conceptosDeuda = pgTable(
  "conceptos_deuda",
  {
    id: serial("id").primaryKey(),
    nombre: text("nombre").notNull(),
    tipoExpensaId: integer("tipo_expensa_id")
      .notNull()
      .references(() => tiposExpensa.id),
    montoDefault: numeric("monto_default", { precision: 12, scale: 2 }).notNull(),
    descripcionDefault: text("descripcion_default"),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("conceptos_deuda_nombre_idx").on(table.nombre)]
);

// Plan de deuda que se repite mes a mes (alícuota ordinaria indefinida, o
// una cuota extraordinaria dividida en N meses). `periodosGenerados` lleva
// la cuenta de cuántos meses ya se generaron; `totalPeriodos` null = sigue
// indefinidamente hasta que se pause. El cron (o "Generar ahora") crea una
// fila en `deuda_masiva_lotes` por cada período, referenciada por `recurrenteId`.
export const deudaRecurrente = pgTable("deuda_recurrente", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  conceptoId: integer("concepto_id")
    .notNull()
    .references(() => conceptosDeuda.id),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  descripcion: text("descripcion"),
  fechaInicio: date("fecha_inicio").notNull(),
  totalPeriodos: integer("total_periodos"),
  periodosGenerados: integer("periodos_generados").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Casas excluidas de un plan de deuda recurrente (se excluyen en todos los
// períodos que ese plan vaya generando, no solo en el primero).
export const deudaRecurrenteExclusion = pgTable(
  "deuda_recurrente_exclusion",
  {
    id: serial("id").primaryKey(),
    recurrenteId: integer("recurrente_id")
      .notNull()
      .references(() => deudaRecurrente.id),
    casaId: integer("casa_id")
      .notNull()
      .references(() => casas.id),
  },
  (table) => [
    uniqueIndex("deuda_recurrente_exclusion_idx").on(
      table.recurrenteId,
      table.casaId
    ),
  ]
);

// Corridas de "deuda masiva": registra quién, cuándo y con qué parámetros
// se generó una deuda para todo el catálogo (o catálogo menos exclusiones).
// `deudas.loteId` referencia esta tabla para poder auditar y anular la corrida.
export const deudaMasivaLotes = pgTable("deuda_masiva_lotes", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  conceptoId: integer("concepto_id").references(() => conceptosDeuda.id),
  recurrenteId: integer("recurrente_id").references(() => deudaRecurrente.id),
  tipoExpensaId: integer("tipo_expensa_id")
    .notNull()
    .references(() => tiposExpensa.id),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  fecha: date("fecha").notNull(),
  descripcion: text("descripcion"),
  casasTotal: integer("casas_total").notNull(),
  casasAfectadas: integer("casas_afectadas").notNull(),
  anuladoEn: timestamp("anulado_en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Deudas generadas por casa (el saldo = Σ deudas − Σ abonos, siempre calculado)
export const deudas = pgTable("deudas", {
  id: serial("id").primaryKey(),
  casaId: integer("casa_id")
    .notNull()
    .references(() => casas.id),
  tipoExpensaId: integer("tipo_expensa_id")
    .notNull()
    .references(() => tiposExpensa.id),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  fecha: date("fecha").notNull(),
  estado: estadoDeudaEnum("estado").notNull().default("pendiente"),
  descripcion: text("descripcion"),
  loteId: integer("lote_id").references(() => deudaMasivaLotes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Movimientos del Excel del banco (Banco Guayaquil). `documento` es la llave de idempotencia.
export const movimientosBancarios = pgTable(
  "movimientos_bancarios",
  {
    id: serial("id").primaryKey(),
    documento: text("documento").notNull(),
    fechaTransaccion: date("fecha_transaccion").notNull(),
    fechaContable: date("fecha_contable"),
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
    referenciaCruda: text("referencia_cruda").notNull(),
    concepto: text("concepto"),
    agencia: text("agencia"),
    casaId: integer("casa_id").references(() => casas.id),
    estado: estadoMovimientoEnum("estado").notNull().default("sin_catalogar"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("movimientos_documento_idx").on(table.documento)]
);

// Historial de cargas del Excel del banco: quién subió, cuándo, y el
// resumen de lo que pasó en esa corrida (para la tabla de auditoría).
export const cargasEstadoCuenta = pgTable("cargas_estado_cuenta", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  nombreArchivo: text("nombre_archivo").notNull(),
  totalFilas: integer("total_filas").notNull(),
  creditos: integer("creditos").notNull(),
  debitos: integer("debitos").notNull(),
  duplicados: integer("duplicados").notNull(),
  matchedAutomatico: integer("matched_automatico").notNull(),
  pendienteRevision: integer("pendiente_revision").notNull(),
  sinCatalogar: integer("sin_catalogar").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Informe económico mensual (uno por mes/año), estilo "INFORME ECONÓMICO —
// MES AÑO" que ya usa el cliente por fuera del sistema. Los ingresos por tipo
// se sugieren desde el catálogo de tipos de expensa + movimientos sin
// catalogar, y los egresos se cargan a mano cada mes — ambos quedan
// guardados como líneas editables antes de generar el PDF final.
export const reportesFinancieros = pgTable(
  "reportes_financieros",
  {
    id: serial("id").primaryKey(),
    mes: integer("mes").notNull(), // 1-12
    anio: integer("anio").notNull(),
    saldoInicial: numeric("saldo_inicial", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    casasPagaron: integer("casas_pagaron").notNull().default(0),
    casasMora: integer("casas_mora").notNull().default(0),
    casasTotal: integer("casas_total").notNull().default(0),
    usuarioId: integer("usuario_id").references(() => usuarios.id),
    pdfUrl: text("pdf_url"),
    generadoEn: timestamp("generado_en"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("reportes_financieros_periodo_idx").on(table.mes, table.anio),
  ]
);

// Línea de ingreso por tipo dentro de un informe (EXPENSAS, MULTAS, TAGS...).
// tipoExpensaId null = "No identificado" (dinero recibido sin casa asignada).
export const reporteIngresoLinea = pgTable("reporte_ingreso_linea", {
  id: serial("id").primaryKey(),
  reporteId: integer("reporte_id")
    .notNull()
    .references(() => reportesFinancieros.id),
  tipoExpensaId: integer("tipo_expensa_id").references(() => tiposExpensa.id),
  etiqueta: text("etiqueta").notNull(),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull().default("0"),
  orden: integer("orden").notNull().default(0),
});

// Línea de egreso dentro de un informe, agrupada por categoría fija
// (mantenimiento/operativos/inversiones/otros) con subtipo libre.
export const reporteEgresoLinea = pgTable("reporte_egreso_linea", {
  id: serial("id").primaryKey(),
  reporteId: integer("reporte_id")
    .notNull()
    .references(() => reportesFinancieros.id),
  categoria: categoriaGastoEnum("categoria").notNull(),
  subtipo: text("subtipo").notNull(),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull().default("0"),
  orden: integer("orden").notNull().default(0),
});

// Casas candidatas sugeridas cuando una referencia matchea con más de 1 casa
// (cola de revisión: el admin elige con un clic).
export const movimientoCandidatosCasa = pgTable(
  "movimiento_candidatos_casa",
  {
    id: serial("id").primaryKey(),
    movimientoId: integer("movimiento_id")
      .notNull()
      .references(() => movimientosBancarios.id),
    casaId: integer("casa_id")
      .notNull()
      .references(() => casas.id),
  },
  (table) => [
    uniqueIndex("movimiento_candidatos_movimiento_casa_idx").on(
      table.movimientoId,
      table.casaId
    ),
  ]
);
