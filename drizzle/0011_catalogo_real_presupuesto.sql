-- Carga el catálogo real de presupuesto que compartió el cliente (reunión
-- 27/ago/2026, Excel "Informe de Ingresos y Egresos JUL2026.xlsx", pestaña
-- "Clasificación"), reemplazando el placeholder sembrado en la 0008 a la
-- espera de este dato. Migración solo de datos, no hay cambios de schema
-- (por eso no la generó drizzle-kit — ver gotcha de journal.json en
-- ESTADO_PROYECTO.md, esta entrada se agregó a mano igual que las demás
-- puramente de datos).
--
-- Decisiones de esta migración:
-- * Los 4 "Tipo" placeholder (Mantenimiento/Operativos/Inversiones/Otros) se
--   RENOMBRAN a los 3 grupos reales (Gastos de Mantenimiento/Gastos
--   Operativos/Inversiones) en vez de crear filas nuevas, para no dejar
--   huérfanos los egresos ya clasificados con esos ids. "Otros" no tiene
--   equivalente en el presupuesto real del cliente — se deja igual, como
--   catch-all para lo que no encaje en ninguno de los 3 grupos oficiales.
-- * El subtipo placeholder "Servicios básicos" (bajo Operativos) se renombra
--   a "Servicios básicos comunales" (nombre real) y se le agregan las clases
--   que faltaban (Costos Bancarios) en vez de crear un subtipo duplicado.
-- * Las clases placeholder "Teléfono" e "Internet" (separadas, con
--   palabras clave distintas) se FUSIONAN en una sola clase "Telefonía /
--   internet" (así está en el presupuesto real, una sola línea de $1080) —
--   se migran las referencias existentes (reporte_egreso_linea,
--   movimientos_bancarios) antes de borrar las 2 clases viejas, y se
--   conservan todas las palabras clave de ambas + las que ya se habían
--   identificado como faltantes en ESTADO_PROYECTO.md (otecel, movip,
--   megadatos) para no perder autoclasificación.
-- * "Agua potable" y "Energía eléctrica" se mantienen (ya estaban en el
--   presupuesto real con esos mismos nombres), solo se les agregan las
--   palabras clave que ESTADO_PROYECTO.md ya había identificado como
--   faltantes (emaap, eee quito, empresa electrica) y el monto anual real
--   en la descripción.
-- * El resto de clases nuevas quedan con su nombre real y, en la
--   descripción, el presupuesto anual 2026 tal cual lo compartió el
--   cliente — es dato real de su Excel, no un valor inventado; sirve de
--   referencia hasta que el sistema compare presupuesto vs. gastado (no
--   pedido todavía).

-- 1) Renombrar los 3 grupos que sí tienen equivalente real.
UPDATE "presupuesto_tipo" SET "nombre" = 'Gastos Operativos' WHERE "nombre" = 'Operativos';
--> statement-breakpoint
UPDATE "presupuesto_tipo" SET "nombre" = 'Gastos de Mantenimiento' WHERE "nombre" = 'Mantenimiento';
--> statement-breakpoint

-- 2) Renombrar el subtipo placeholder de servicios básicos al nombre real.
UPDATE "presupuesto_subtipo" ps
  SET "nombre" = 'Servicios básicos comunales'
  FROM "presupuesto_tipo" pt
  WHERE ps."tipo_id" = pt."id" AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Servicios básicos';
--> statement-breakpoint

-- 3) Subtipos reales que faltaban bajo "Gastos Operativos".
INSERT INTO "presupuesto_subtipo" ("tipo_id", "nombre")
  SELECT pt."id", v.nombre
  FROM "presupuesto_tipo" pt
  CROSS JOIN (VALUES
    ('Administración y gestión'),
    ('Personal operativo'),
    ('Seguridad'),
    ('Provisiones')
  ) AS v(nombre)
  WHERE pt."nombre" = 'Gastos Operativos';
--> statement-breakpoint

-- 4) Subtipos reales bajo "Gastos de Mantenimiento".
INSERT INTO "presupuesto_subtipo" ("tipo_id", "nombre")
  SELECT pt."id", v.nombre
  FROM "presupuesto_tipo" pt
  CROSS JOIN (VALUES
    ('Áreas verdes, canchas y exteriores'),
    ('Infraestructura comunal general'),
    ('Sistema de bombeo agua potable'),
    ('Piscina, sauna y turco'),
    ('Sistemas tecnológicos')
  ) AS v(nombre)
  WHERE pt."nombre" = 'Gastos de Mantenimiento';
--> statement-breakpoint

-- 5) Subtipos reales bajo "Inversiones".
INSERT INTO "presupuesto_subtipo" ("tipo_id", "nombre")
  SELECT pt."id", v.nombre
  FROM "presupuesto_tipo" pt
  CROSS JOIN (VALUES
    ('Infraestructura comunal general'),
    ('Seguridad y tecnología')
  ) AS v(nombre)
  WHERE pt."nombre" = 'Inversiones';
--> statement-breakpoint

-- 6) Clases bajo "Administración y gestión".
INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", v.nombre, v.descripcion
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Honorarios de Administrador', 'Presupuesto anual 2026: $6600'),
    ('Gastos notariales y registrales', 'Presupuesto anual 2026: $800'),
    ('Papelería, impresiones y suministros de oficina', 'Presupuesto anual 2026: $50'),
    ('Software de administración', 'Presupuesto anual 2026: $228'),
    ('Otros', 'Presupuesto anual 2026: $200')
  ) AS v(nombre, descripcion)
  WHERE pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Administración y gestión';
--> statement-breakpoint

-- 7) Clases bajo "Personal operativo".
INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", v.nombre, v.descripcion
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Sueldos de conserjes', 'Presupuesto anual 2026: $7200'),
    ('Caja Chica', 'Presupuesto anual 2026: $1200')
  ) AS v(nombre, descripcion)
  WHERE pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Personal operativo';
--> statement-breakpoint

-- 8) Clases bajo "Servicios básicos comunales" que faltaban (Costos
--    Bancarios es nueva; Teléfono/Internet se fusionan más abajo).
INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion", "palabras_clave")
  SELECT ps."id", 'Costos Bancarios', 'Presupuesto anual 2026: $50', 'comision,cash,iva servicio,mantenimiento cuenta,tarifa'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Servicios básicos comunales';
--> statement-breakpoint

INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion", "palabras_clave")
  SELECT ps."id", 'Telefonía / internet', 'Presupuesto anual 2026: $1080',
    'telefono,telefonia,cnt,claro,movistar,otecel,movip,internet,netlife,puntonet,megadatos'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Servicios básicos comunales';
--> statement-breakpoint

-- Migrar referencias de las clases viejas "Teléfono"/"Internet" a la nueva
-- clase fusionada antes de borrarlas.
UPDATE "reporte_egreso_linea" rel
  SET "clase_id" = nueva."id"
  FROM "presupuesto_clase" nueva
  JOIN "presupuesto_subtipo" ps ON ps."id" = nueva."subtipo_id"
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  JOIN "presupuesto_clase" vieja ON vieja."subtipo_id" = nueva."subtipo_id"
    AND vieja."nombre" IN ('Teléfono', 'Internet')
  WHERE nueva."nombre" = 'Telefonía / internet'
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Servicios básicos comunales'
    AND rel."clase_id" = vieja."id";
--> statement-breakpoint

UPDATE "movimientos_bancarios" mb
  SET "clase_id" = nueva."id"
  FROM "presupuesto_clase" nueva
  JOIN "presupuesto_subtipo" ps ON ps."id" = nueva."subtipo_id"
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  JOIN "presupuesto_clase" vieja ON vieja."subtipo_id" = nueva."subtipo_id"
    AND vieja."nombre" IN ('Teléfono', 'Internet')
  WHERE nueva."nombre" = 'Telefonía / internet'
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Servicios básicos comunales'
    AND mb."clase_id" = vieja."id";
--> statement-breakpoint

DELETE FROM "presupuesto_clase" pc
  USING "presupuesto_subtipo" ps, "presupuesto_tipo" pt
  WHERE pc."subtipo_id" = ps."id" AND ps."tipo_id" = pt."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Servicios básicos comunales'
    AND pc."nombre" IN ('Teléfono', 'Internet');
--> statement-breakpoint

-- Completar palabras clave y monto real de "Agua potable" y "Energía
-- eléctrica" (ya existían, solo les faltaban las palabras clave que
-- ESTADO_PROYECTO.md había marcado como pendientes de agregar).
UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'agua,potable,eapa,empresa de agua,emaap',
    "descripcion" = 'Presupuesto anual 2026: $8772'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id" AND pt."nombre" = 'Gastos Operativos'
    AND ps."nombre" = 'Servicios básicos comunales' AND pc."nombre" = 'Agua potable';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'luz,electrica,electricidad,cnel,energia,eee quito,empresa electrica',
    "descripcion" = 'Presupuesto anual 2026: $10800'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id" AND pt."nombre" = 'Gastos Operativos'
    AND ps."nombre" = 'Servicios básicos comunales' AND pc."nombre" = 'Energía eléctrica';
--> statement-breakpoint

-- 9) Clases bajo "Seguridad" y "Provisiones" (Gastos Operativos).
INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", 'Servicio de seguridad privada', 'Presupuesto anual 2026: $37800'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Seguridad';
--> statement-breakpoint

INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", v.nombre, v.descripcion
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Suministros y consumibles áreas comunales', 'Presupuesto anual 2026: $2400'),
    ('Eventos Comunitarios', 'Presupuesto anual 2026: $500'),
    ('Fondo de emergencia', 'Presupuesto anual 2026: $1000'),
    ('Suministros y consumibles varios (Señalética, elementos de seguridad, otros)', 'Presupuesto anual 2026: $1200')
  ) AS v(nombre, descripcion)
  WHERE pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Provisiones';
--> statement-breakpoint

-- 10) Clases de "Gastos de Mantenimiento".
INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion", "palabras_clave")
  SELECT ps."id", v.nombre, v.descripcion, v.palabras_clave
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Mantenimiento de jardines, áreas verdes y canchas', 'Presupuesto anual 2026: $2100', NULL),
    ('Control de plagas', 'Presupuesto anual 2026: $500', 'plaga,fumigacion')
  ) AS v(nombre, descripcion, palabras_clave)
  WHERE pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Áreas verdes, canchas y exteriores';
--> statement-breakpoint

INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion", "palabras_clave")
  SELECT ps."id", v.nombre, v.descripcion, v.palabras_clave
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Mantenimiento de adoquinado', 'Presupuesto anual 2026: $3000', NULL),
    ('Limpieza de sumideros y drenajes', 'Presupuesto anual 2026: $1100', NULL),
    ('Pintura zonas comunales', 'Presupuesto anual 2026: $3000', 'pintura'),
    ('Reparaciones comunales', 'Presupuesto anual 2026: $2000', NULL),
    ('Mantenimiento de techos', 'Presupuesto anual 2026: $800', NULL),
    ('Reparaciones eléctricas', 'Presupuesto anual 2026: $2500', NULL)
  ) AS v(nombre, descripcion, palabras_clave)
  WHERE pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Infraestructura comunal general';
--> statement-breakpoint

INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", 'Mantenimiento de sistema de bombas', 'Presupuesto anual 2026: $1800'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Sistema de bombeo agua potable';
--> statement-breakpoint

INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", v.nombre, v.descripcion
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Productos químicos', 'Presupuesto anual 2026: $450'),
    ('Suministros de Limpieza', 'Presupuesto anual 2026: $600'),
    ('Mantenimiento de equipos áreas húmedas', 'Presupuesto anual 2026: $2000')
  ) AS v(nombre, descripcion)
  WHERE pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Piscina, sauna y turco';
--> statement-breakpoint

INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", v.nombre, v.descripcion
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Mantenimiento del sistema de cámaras', 'Presupuesto anual 2026: $1000'),
    ('Reemplazo de cámaras defectuosas', 'Presupuesto anual 2026: $800'),
    ('Mantenimiento del sistema ingresos', 'Presupuesto anual 2026: $450'),
    ('Mantenimiento de servidores / grabadores', 'Presupuesto anual 2026: $1500'),
    ('Mantenimiento de cerca eléctrica', 'Presupuesto anual 2026: $500')
  ) AS v(nombre, descripcion)
  WHERE pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Sistemas tecnológicos';
--> statement-breakpoint

-- 11) Clases de "Inversiones".
INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", v.nombre, v.descripcion
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Compra de implementos comunales', 'Presupuesto anual 2026: $600'),
    ('Remodelación de áreas comunales', 'Presupuesto anual 2026: $5940'),
    ('Renovación de mobiliario comunal', 'Presupuesto anual 2026: $1000')
  ) AS v(nombre, descripcion)
  WHERE pt."nombre" = 'Inversiones' AND ps."nombre" = 'Infraestructura comunal general';
--> statement-breakpoint

INSERT INTO "presupuesto_clase" ("subtipo_id", "nombre", "descripcion")
  SELECT ps."id", v.nombre, v.descripcion
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  CROSS JOIN (VALUES
    ('Sistema biométrico', 'Presupuesto anual 2026: $500'),
    ('Actualización de la cerca eléctrica', 'Presupuesto anual 2026: $300')
  ) AS v(nombre, descripcion)
  WHERE pt."nombre" = 'Inversiones' AND ps."nombre" = 'Seguridad y tecnología';
