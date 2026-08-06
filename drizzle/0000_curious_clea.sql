CREATE TYPE "public"."estado_deuda" AS ENUM('pendiente', 'pagada');--> statement-breakpoint
CREATE TYPE "public"."estado_movimiento" AS ENUM('matched', 'pendiente_revision', 'sin_catalogar');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('admin', 'propietario');--> statement-breakpoint
CREATE TABLE "casas" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" text NOT NULL,
	"bloque" text NOT NULL,
	"propietario" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogo_referencias_bancarias" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa_id" integer NOT NULL,
	"referencia" text NOT NULL,
	"banco" text DEFAULT 'Banco Guayaquil' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deudas" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa_id" integer NOT NULL,
	"tipo_expensa_id" integer NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"fecha" date NOT NULL,
	"estado" "estado_deuda" DEFAULT 'pendiente' NOT NULL,
	"descripcion" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimiento_candidatos_casa" (
	"id" serial PRIMARY KEY NOT NULL,
	"movimiento_id" integer NOT NULL,
	"casa_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos_bancarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"documento" text NOT NULL,
	"fecha_transaccion" date NOT NULL,
	"fecha_contable" date,
	"monto" numeric(12, 2) NOT NULL,
	"referencia_cruda" text NOT NULL,
	"concepto" text,
	"agencia" text,
	"casa_id" integer,
	"estado" "estado_movimiento" DEFAULT 'sin_catalogar' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_expensa" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa_id" integer,
	"email" text,
	"password_hash" text NOT NULL,
	"rol" "rol_usuario" DEFAULT 'propietario' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalogo_referencias_bancarias" ADD CONSTRAINT "catalogo_referencias_bancarias_casa_id_casas_id_fk" FOREIGN KEY ("casa_id") REFERENCES "public"."casas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_casa_id_casas_id_fk" FOREIGN KEY ("casa_id") REFERENCES "public"."casas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_tipo_expensa_id_tipos_expensa_id_fk" FOREIGN KEY ("tipo_expensa_id") REFERENCES "public"."tipos_expensa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_candidatos_casa" ADD CONSTRAINT "movimiento_candidatos_casa_movimiento_id_movimientos_bancarios_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "public"."movimientos_bancarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_candidatos_casa" ADD CONSTRAINT "movimiento_candidatos_casa_casa_id_casas_id_fk" FOREIGN KEY ("casa_id") REFERENCES "public"."casas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_casa_id_casas_id_fk" FOREIGN KEY ("casa_id") REFERENCES "public"."casas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_casa_id_casas_id_fk" FOREIGN KEY ("casa_id") REFERENCES "public"."casas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "casas_numero_idx" ON "casas" USING btree ("numero");--> statement-breakpoint
CREATE UNIQUE INDEX "catalogo_referencias_casa_referencia_idx" ON "catalogo_referencias_bancarias" USING btree ("casa_id","referencia");--> statement-breakpoint
CREATE UNIQUE INDEX "movimiento_candidatos_movimiento_casa_idx" ON "movimiento_candidatos_casa" USING btree ("movimiento_id","casa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_documento_idx" ON "movimientos_bancarios" USING btree ("documento");--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_expensa_nombre_idx" ON "tipos_expensa" USING btree ("nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_casa_id_idx" ON "usuarios" USING btree ("casa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_idx" ON "usuarios" USING btree ("email");