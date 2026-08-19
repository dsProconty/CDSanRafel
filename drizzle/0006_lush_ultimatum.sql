CREATE TYPE "public"."categoria_gasto" AS ENUM('mantenimiento', 'operativos', 'inversiones', 'otros');--> statement-breakpoint
CREATE TABLE "reporte_egreso_linea" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporte_id" integer NOT NULL,
	"categoria" "categoria_gasto" NOT NULL,
	"subtipo" text NOT NULL,
	"monto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporte_ingreso_linea" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporte_id" integer NOT NULL,
	"tipo_expensa_id" integer,
	"etiqueta" text NOT NULL,
	"monto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reportes_financieros" (
	"id" serial PRIMARY KEY NOT NULL,
	"mes" integer NOT NULL,
	"anio" integer NOT NULL,
	"saldo_inicial" numeric(12, 2) DEFAULT '0' NOT NULL,
	"casas_pagaron" integer DEFAULT 0 NOT NULL,
	"casas_mora" integer DEFAULT 0 NOT NULL,
	"casas_total" integer DEFAULT 0 NOT NULL,
	"usuario_id" integer,
	"pdf_url" text,
	"generado_en" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reporte_egreso_linea" ADD CONSTRAINT "reporte_egreso_linea_reporte_id_reportes_financieros_id_fk" FOREIGN KEY ("reporte_id") REFERENCES "public"."reportes_financieros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporte_ingreso_linea" ADD CONSTRAINT "reporte_ingreso_linea_reporte_id_reportes_financieros_id_fk" FOREIGN KEY ("reporte_id") REFERENCES "public"."reportes_financieros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporte_ingreso_linea" ADD CONSTRAINT "reporte_ingreso_linea_tipo_expensa_id_tipos_expensa_id_fk" FOREIGN KEY ("tipo_expensa_id") REFERENCES "public"."tipos_expensa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes_financieros" ADD CONSTRAINT "reportes_financieros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reportes_financieros_periodo_idx" ON "reportes_financieros" USING btree ("mes","anio");