CREATE TABLE "deuda_recurrente" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"concepto_id" integer NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"descripcion" text,
	"fecha_inicio" date NOT NULL,
	"total_periodos" integer,
	"periodos_generados" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deuda_recurrente_exclusion" (
	"id" serial PRIMARY KEY NOT NULL,
	"recurrente_id" integer NOT NULL,
	"casa_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deuda_masiva_lotes" ADD COLUMN "recurrente_id" integer;--> statement-breakpoint
ALTER TABLE "deuda_recurrente" ADD CONSTRAINT "deuda_recurrente_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deuda_recurrente" ADD CONSTRAINT "deuda_recurrente_concepto_id_conceptos_deuda_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."conceptos_deuda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deuda_recurrente_exclusion" ADD CONSTRAINT "deuda_recurrente_exclusion_recurrente_id_deuda_recurrente_id_fk" FOREIGN KEY ("recurrente_id") REFERENCES "public"."deuda_recurrente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deuda_recurrente_exclusion" ADD CONSTRAINT "deuda_recurrente_exclusion_casa_id_casas_id_fk" FOREIGN KEY ("casa_id") REFERENCES "public"."casas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deuda_recurrente_exclusion_idx" ON "deuda_recurrente_exclusion" USING btree ("recurrente_id","casa_id");--> statement-breakpoint
ALTER TABLE "deuda_masiva_lotes" ADD CONSTRAINT "deuda_masiva_lotes_recurrente_id_deuda_recurrente_id_fk" FOREIGN KEY ("recurrente_id") REFERENCES "public"."deuda_recurrente"("id") ON DELETE no action ON UPDATE no action;