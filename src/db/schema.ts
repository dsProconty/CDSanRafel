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

export const estadoMovimientoEnum = pgEnum("estado_movimiento", [
  "matched",
  "pendiente_revision",
  "sin_catalogar",
]);

export const estadoDeudaEnum = pgEnum("estado_deuda", ["pendiente", "pagada"]);

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
