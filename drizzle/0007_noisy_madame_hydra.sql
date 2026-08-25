ALTER TABLE "casas" ADD COLUMN "usuario_id" integer;
--> statement-breakpoint
ALTER TABLE "casas" ADD CONSTRAINT "casas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
UPDATE "casas" SET "usuario_id" = "usuarios"."id" FROM "usuarios" WHERE "usuarios"."casa_id" = "casas"."id";
--> statement-breakpoint
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_casa_id_casas_id_fk";
--> statement-breakpoint
DROP INDEX "usuarios_casa_id_idx";
--> statement-breakpoint
ALTER TABLE "usuarios" DROP COLUMN "casa_id";
