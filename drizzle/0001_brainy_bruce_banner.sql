CREATE TYPE "public"."tipo_residente" AS ENUM('propietario', 'arrendatario', 'familiar');--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "cedula" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "telefono_secundario" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "tipo_residente" "tipo_residente" DEFAULT 'propietario' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "comprobante_activo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "ultimo_acceso" timestamp;