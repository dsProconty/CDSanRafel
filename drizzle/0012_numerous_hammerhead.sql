CREATE TABLE "tipos_ingreso" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "casas" ADD COLUMN "en_convenio" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD COLUMN "tipo_ingreso_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_ingreso_nombre_idx" ON "tipos_ingreso" USING btree ("nombre");--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_tipo_ingreso_id_tipos_ingreso_id_fk" FOREIGN KEY ("tipo_ingreso_id") REFERENCES "public"."tipos_ingreso"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Semilla del catálogo de tipos de ingreso (reunión 27/ago/2026, tal cual
-- las categorías reales que ya usa el cliente en su Excel manual: pestañas
-- "Deudas" columna TIPO y "Transacciones" columna Observaciones).
INSERT INTO "tipos_ingreso" ("nombre", "descripcion") VALUES
  ('Expensa', 'Pago que cubre exactamente el saldo pendiente de la casa al momento de pagar — se autoclasifica solo.'),
  ('Anticipo', 'Pago mayor al saldo pendiente de la casa — se autoclasifica solo.'),
  ('Convenio/Cartera', 'Casa en mora con acuerdo de pago (ver casas.en_convenio) — se autoclasifica solo, cualquiera sea el monto.'),
  ('Tags', 'Excedente de un pago para cubrir un TAG cargado como deuda aparte.'),
  ('Reservas Comunales', 'Reserva de cancha, piscina u otra área comunal.'),
  ('Multas', 'Multas del reglamento interno.'),
  ('Agua/Basura', 'Consumo de agua o recolección de basura facturado aparte de la expensa.'),
  ('Devolución', 'Devolución de dinero al condominio.'),
  ('No identificado', 'Dinero recibido sin casa asignada todavía — se asigna solo al cargar un crédito sin casa.');
--> statement-breakpoint
-- Créditos que ya estén cargados sin casa asignada (pendiente_revision o
-- sin_catalogar) arrancan como "No identificado" — igual que a los créditos
-- nuevos que se carguen de acá en adelante.
UPDATE "movimientos_bancarios" mb
  SET "tipo_ingreso_id" = ti."id"
  FROM "tipos_ingreso" ti
  WHERE ti."nombre" = 'No identificado'
    AND mb."estado" IN ('pendiente_revision', 'sin_catalogar');