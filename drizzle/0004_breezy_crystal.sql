CREATE TABLE "conceptos_deuda" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo_expensa_id" integer NOT NULL,
	"monto_default" numeric(12, 2) NOT NULL,
	"descripcion_default" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deuda_masiva_lotes" ADD COLUMN "concepto_id" integer;--> statement-breakpoint
ALTER TABLE "conceptos_deuda" ADD CONSTRAINT "conceptos_deuda_tipo_expensa_id_tipos_expensa_id_fk" FOREIGN KEY ("tipo_expensa_id") REFERENCES "public"."tipos_expensa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conceptos_deuda_nombre_idx" ON "conceptos_deuda" USING btree ("nombre");--> statement-breakpoint
ALTER TABLE "deuda_masiva_lotes" ADD CONSTRAINT "deuda_masiva_lotes_concepto_id_conceptos_deuda_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."conceptos_deuda"("id") ON DELETE no action ON UPDATE no action;