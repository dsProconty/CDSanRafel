ALTER TYPE "public"."estado_movimiento" ADD VALUE 'debito';--> statement-breakpoint
ALTER TABLE "cargas_estado_cuenta" ADD COLUMN "debitos_clasificados" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cargas_estado_cuenta" ADD COLUMN "debitos_pendientes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD COLUMN "referencia_2" text;--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD COLUMN "referencia_3" text;--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD COLUMN "clase_id" integer;--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD COLUMN "reporte_egreso_linea_id" integer;--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_clase_id_presupuesto_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."presupuesto_clase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_reporte_egreso_linea_id_reporte_egreso_linea_id_fk" FOREIGN KEY ("reporte_egreso_linea_id") REFERENCES "public"."reporte_egreso_linea"("id") ON DELETE no action ON UPDATE no action;