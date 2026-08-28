ALTER TABLE "reporte_egreso_linea" ADD COLUMN "requiere_comprobante" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reporte_egreso_linea" ADD COLUMN "comprobante_url" text;
--> statement-breakpoint
-- Las líneas que ya existían antes de este requisito se dan por
-- "completas" (no requieren comprobante retroactivamente) para no bloquear
-- la regeneración de informes de meses ya cerrados que nunca tuvieron este
-- campo. Solo las líneas nuevas de acá en adelante siguen la regla real
-- (ver requiereComprobanteBancario en src/lib/clasificar-egreso.ts).
UPDATE "reporte_egreso_linea" SET "requiere_comprobante" = false;