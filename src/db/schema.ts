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
  "debito",
]);

export const estadoDeudaEnum = pgEnum("estado_deuda", ["pendiente", "pagada"]);


// Catálogo de casas del condominio (159 casas, Bloque A y B). Una casa tiene
// a lo sumo un usuario (usuarioId), pero el mismo usuario puede estar
// asignado a varias casas (dueños con más de una unidad) — por eso la FK
// vive acá y no en usuarios.
export const casas = pgTable(
  "casas",
  {
    id: serial("id").primaryKey(),
    numero: text("numero").notNull(), // ej: "1A", "36A"
    bloque: text("bloque").notNull(), // "A" | "B" (derivado del número)
    propietario: text("propietario"), // se completa manualmente, no viene en CASAS.xlsx
    usuarioId: integer("usuario_id").references(() => usuarios.id), // null = sin acceso creado
    // Casa en mora con un acuerdo de pago manual con el administrador (pedido
    // del cliente ago 2026): mientras esté marcada, CUALQUIER pago que haga
    // esa casa se clasifica como ingreso "Convenio/Cartera" sin importar el
    // monto, en vez de aplicar las reglas automáticas normales (ver
    // `clasificarIngresoAutomatico` en src/lib/clasificar-ingreso.ts).
    enConvenio: boolean("en_convenio").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("casas_numero_idx").on(table.numero)]
);

// Un usuario puede tener acceso a una o varias casas (ver casas.usuarioId).
// Password inicial = cédula del propietario (v1, sin flujo de reset).
export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
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
  (table) => [uniqueIndex("usuarios_email_idx").on(table.email)]
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

// Catálogo de presupuesto para clasificar egresos, en 3 niveles jerárquicos
// (pedido del cliente ago 2026): Tipo → Subtipo → Clase. Ej. Tipo "Operativos"
// → Subtipo "Servicios básicos" → Clase "Internet". Reemplaza el enum fijo
// mantenimiento/operativos/inversiones/otros — el admin lo edita libremente
// desde Catálogo → Egresos, y la lista real de ítems la define el cliente.
export const presupuestoTipo = pgTable(
  "presupuesto_tipo",
  {
    id: serial("id").primaryKey(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [uniqueIndex("presupuesto_tipo_nombre_idx").on(table.nombre)]
);

export const presupuestoSubtipo = pgTable(
  "presupuesto_subtipo",
  {
    id: serial("id").primaryKey(),
    tipoId: integer("tipo_id")
      .notNull()
      .references(() => presupuestoTipo.id),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [
    uniqueIndex("presupuesto_subtipo_tipo_nombre_idx").on(table.tipoId, table.nombre),
  ]
);

// `palabrasClave`: lista separada por comas (ej. "internet,cnt,netlife") para
// autoclasificar egresos de servicios fijos recurrentes (teléfono, internet,
// agua, luz) sin que el admin tenga que clasificarlos a mano cada vez — el
// resto de los egresos quedan "pendiente de clasificar" hasta que el admin
// los revise (ver reporteEgresoLinea.claseId más abajo).
export const presupuestoClase = pgTable(
  "presupuesto_clase",
  {
    id: serial("id").primaryKey(),
    subtipoId: integer("subtipo_id")
      .notNull()
      .references(() => presupuestoSubtipo.id),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    palabrasClave: text("palabras_clave"),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [
    uniqueIndex("presupuesto_clase_subtipo_nombre_idx").on(table.subtipoId, table.nombre),
  ]
);

// Catálogo de clasificación de INGRESOS (un solo nivel, a diferencia del
// catálogo de egresos que tiene 3 — pedido explícito del cliente en la
// reunión del 27/ago/2026: "aquí solo hay un tipo, no hay tipo subtipo,
// nada, aquí solo hay de qué pertenece"). Ver `movimientosBancarios.
// tipoIngresoId` y `src/lib/clasificar-ingreso.ts` para las reglas de
// autoclasificación.
export const tiposIngreso = pgTable(
  "tipos_ingreso",
  {
    id: serial("id").primaryKey(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [uniqueIndex("tipos_ingreso_nombre_idx").on(table.nombre)]
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

// Movimientos del Excel del banco (Banco Guayaquil). `documento` es la llave
// de idempotencia, para créditos Y débitos por igual. Créditos (signo "+")
// se cruzan contra el catálogo de casas (`estado` matched/pendiente_revision/
// sin_catalogar). Débitos (signo "-", `estado` = "debito") son egresos reales
// del condominio: se autoclasifican por palabra clave contra `concepto` +
// `referencia2` (ahí vive el nombre del proveedor — ej. "Emaap quito",
// "Empresa electrica quito s a" — para los servicios fijos recurrentes;
// `claseId` null = pendiente de clasificar). `reporteEgresoLineaId` se llena
// cuando ese débito ya se consumió como línea de egreso de algún informe
// mensual (ver `crearBorradorReporte`), para no duplicarlo si se sube de
// nuevo un excel que se solape en fechas.
export const movimientosBancarios = pgTable(
  "movimientos_bancarios",
  {
    id: serial("id").primaryKey(),
    documento: text("documento").notNull(),
    fechaTransaccion: date("fecha_transaccion").notNull(),
    fechaContable: date("fecha_contable"),
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
    referenciaCruda: text("referencia_cruda").notNull(),
    referencia2: text("referencia_2"),
    referencia3: text("referencia_3"),
    concepto: text("concepto"),
    agencia: text("agencia"),
    casaId: integer("casa_id").references(() => casas.id),
    claseId: integer("clase_id").references(() => presupuestoClase.id),
    // Clasificación de INGRESO (créditos): null = matched pero sin regla
    // automática que aplique — el admin lo clasifica a mano desde /cargar.
    // Se asigna "No identificado" solo (sin casa) al cargar; al asignarle
    // casa se recalcula con `clasificarIngresoAutomatico`.
    tipoIngresoId: integer("tipo_ingreso_id").references(() => tiposIngreso.id),
    reporteEgresoLineaId: integer("reporte_egreso_linea_id").references(
      () => reporteEgresoLinea.id
    ),
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
  debitosClasificados: integer("debitos_clasificados").notNull().default(0),
  debitosPendientes: integer("debitos_pendientes").notNull().default(0),
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

// Línea de egreso dentro de un informe. `subtipo` es texto libre (qué fue el
// gasto, ej. "Compra de materiales de jardín") — no confundir con el nivel
// "Subtipo" del catálogo de presupuesto. `claseId` null = "pendiente de
// clasificar" (el admin cargó el gasto pero todavía no le asignó tipo/
// subtipo/clase del presupuesto) — excepto que se autoclasifique al crearla
// por matchear `presupuestoClase.palabrasClave` contra `subtipo`.
// `requiereComprobante`/`comprobanteUrl` (desde ago 2026): pedido del
// cliente en la reunión del 27/ago/2026 — un gasto pagado manualmente (no
// un débito automático de servicios fijos) necesita factura/recibo
// escaneado de respaldo para auditoría; la línea queda marcada como
// "incompleta" en la UI y no se puede generar el PDF hasta subirlo. Los
// débitos automáticos (agua/luz/internet/teléfono/comisiones) no lo
// necesitan — ver `requiereComprobanteBancario` en clasificar-egreso.ts.
export const reporteEgresoLinea = pgTable("reporte_egreso_linea", {
  id: serial("id").primaryKey(),
  reporteId: integer("reporte_id")
    .notNull()
    .references(() => reportesFinancieros.id),
  claseId: integer("clase_id").references(() => presupuestoClase.id),
  subtipo: text("subtipo").notNull(),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull().default("0"),
  orden: integer("orden").notNull().default(0),
  requiereComprobante: boolean("requiere_comprobante").notNull().default(true),
  comprobanteUrl: text("comprobante_url"),
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
