CREATE TABLE "presupuesto_clase" (
	"id" serial PRIMARY KEY NOT NULL,
	"subtipo_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"palabras_clave" text,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presupuesto_subtipo" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presupuesto_tipo" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reporte_egreso_linea" ADD COLUMN "clase_id" integer;--> statement-breakpoint
ALTER TABLE "presupuesto_clase" ADD CONSTRAINT "presupuesto_clase_subtipo_id_presupuesto_subtipo_id_fk" FOREIGN KEY ("subtipo_id") REFERENCES "public"."presupuesto_subtipo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuesto_subtipo" ADD CONSTRAINT "presupuesto_subtipo_tipo_id_presupuesto_tipo_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."presupuesto_tipo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "presupuesto_clase_subtipo_nombre_idx" ON "presupuesto_clase" USING btree ("subtipo_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "presupuesto_subtipo_tipo_nombre_idx" ON "presupuesto_subtipo" USING btree ("tipo_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "presupuesto_tipo_nombre_idx" ON "presupuesto_tipo" USING btree ("nombre");--> statement-breakpoint
ALTER TABLE "reporte_egreso_linea" ADD CONSTRAINT "reporte_egreso_linea_clase_id_presupuesto_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."presupuesto_clase"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Semilla placeholder del catálogo de presupuesto (tipo/subtipo/clase), a la
-- espera de que el cliente comparta la lista real de ítems del presupuesto.
-- Incluye las 4 categorías fijas que ya existían + una clase "General" en
-- cada una para poder migrar los egresos ya cargados sin dejarlos como
-- "pendiente de clasificar" de golpe, y las clases de servicios fijos
-- (teléfono/internet/agua/luz) con palabras clave para autoclasificación.
INSERT INTO "presupuesto_tipo" ("nombre") VALUES
  ('Mantenimiento'), ('Operativos'), ('Inversiones'), ('Otros');
--> statement-breakpoint
INSERT INTO "presupuesto_subtipo" ("tipo_id", "nombre")
  SELECT "id", 'General' FROM "presupuesto_tipo";
--> statement-breakpoint
INSERT INTO "presupuesto_subtipo" ("tipo_id", "nombre")
  SELECT "id", 'Servicios básicos' FROM "presupuesto_tipo" WHERE "nombre" = 'Operativos';
--> statement-breakpoint
INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre")
  SELECT ps."id", pt."nombre" || ' general'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE ps."nombre" = 'General';
--> statement-breakpoint
INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "palabras_clave")
  SELECT ps."id", v."nombre", v."palabras_clave"
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Teléfono', 'telefono,telefonia,cnt,claro,movistar'),
    ('Internet', 'internet,netlife,puntonet'),
    ('Agua potable', 'agua,potable,eapa,empresa de agua'),
    ('Energía eléctrica', 'luz,electrica,electricidad,cnel,energia')
  ) AS v("nombre", "palabras_clave")
  WHERE ps."nombre" = 'Servicios básicos' AND pt."nombre" = 'Operativos';
--> statement-breakpoint
UPDATE "reporte_egreso_linea" rel
  SET "clase_id" = pc."id"
  FROM "presupuesto_clase" pc
  JOIN "presupuesto_subtipo" ps ON ps."id" = pc."subtipo_id"
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE ps."nombre" = 'General'
    AND (
      (rel."categoria" = 'mantenimiento' AND pt."nombre" = 'Mantenimiento') OR
      (rel."categoria" = 'operativos' AND pt."nombre" = 'Operativos') OR
      (rel."categoria" = 'inversiones' AND pt."nombre" = 'Inversiones') OR
      (rel."categoria" = 'otros' AND pt."nombre" = 'Otros')
    );