CREATE TABLE "deuda_masiva_lotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"tipo_expensa_id" integer NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"fecha" date NOT NULL,
	"descripcion" text,
	"casas_total" integer NOT NULL,
	"casas_afectadas" integer NOT NULL,
	"anulado_en" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deudas" ADD COLUMN "lote_id" integer;--> statement-breakpoint
ALTER TABLE "deuda_masiva_lotes" ADD CONSTRAINT "deuda_masiva_lotes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deuda_masiva_lotes" ADD CONSTRAINT "deuda_masiva_lotes_tipo_expensa_id_tipos_expensa_id_fk" FOREIGN KEY ("tipo_expensa_id") REFERENCES "public"."tipos_expensa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_lote_id_deuda_masiva_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."deuda_masiva_lotes"("id") ON DELETE no action ON UPDATE no action;