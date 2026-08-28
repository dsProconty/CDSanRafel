ALTER TABLE "tipos_ingreso" ADD COLUMN "palabras_clave" text;
--> statement-breakpoint
-- Único caso explícito que mencionó el cliente en la reunión: "todos los
-- que digan tag son tags" (pestaña Referencia 3 del banco). El resto de
-- palabras clave las agrega el admin desde la UI a medida que las
-- descubre, igual que ya pasa con el catálogo de egresos.
UPDATE "tipos_ingreso" SET "palabras_clave" = 'tag' WHERE "nombre" = 'Tags';