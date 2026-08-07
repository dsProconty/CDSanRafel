CREATE TABLE "cargas_estado_cuenta" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"nombre_archivo" text NOT NULL,
	"total_filas" integer NOT NULL,
	"creditos" integer NOT NULL,
	"debitos" integer NOT NULL,
	"duplicados" integer NOT NULL,
	"matched_automatico" integer NOT NULL,
	"pendiente_revision" integer NOT NULL,
	"sin_catalogar" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cargas_estado_cuenta" ADD CONSTRAINT "cargas_estado_cuenta_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;