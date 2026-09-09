-- Palabras clave de autoclasificación para egresos manuales (transferencias),
-- sacadas de la columna DETALLE real de la pestaña "Egresos" del Excel del
-- cliente (Informe de Ingresos y Egresos JUL2026.xlsx) — pedido de ago 2026.
-- Los débitos automáticos (agua/luz/telefonía-internet/comisiones) ya
-- tenían sus palabras clave correctas desde la 0011, acá solo se completan
-- los subtipos de pagos manuales que todavía no tenían ninguna.
--
-- Cada UPDATE es aditivo e idempotente en vez de pisar el valor directo:
-- como el admin puede editar `palabrasClave` a mano desde
-- `/egresos/categorias` en cualquier momento (incluso antes de que esta
-- migración se corra en producción, como pasó acá: "Honorarios de
-- Administrador" ya tenía "administracion, administración" cargado a mano
-- cuando se corrió esta migración), pisar el valor directo hubiera perdido
-- esa edición. Si ya está vacío, lo pone directo; si ya contiene la
-- palabra, no la duplica; si no, la agrega al final.

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'seguridad'
    WHEN pc."palabras_clave" ILIKE '%seguridad%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', seguridad'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Seguridad'
    AND pc."nombre" = 'Servicio de seguridad privada';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'caja chica'
    WHEN pc."palabras_clave" ILIKE '%caja chica%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', caja chica'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Personal operativo'
    AND pc."nombre" = 'Caja Chica';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'conserje'
    WHEN pc."palabras_clave" ILIKE '%conserje%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', conserje'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Personal operativo'
    AND pc."nombre" = 'Sueldos de conserjes';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'bomba,cisterna'
    WHEN pc."palabras_clave" ILIKE '%bomba%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', bomba,cisterna'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Sistema de bombeo agua potable'
    AND pc."nombre" = 'Mantenimiento de sistema de bombas';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'jardin'
    WHEN pc."palabras_clave" ILIKE '%jardin%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', jardin'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Áreas verdes, canchas y exteriores'
    AND pc."nombre" = 'Mantenimiento de jardines, áreas verdes y canchas';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'cobertor'
    WHEN pc."palabras_clave" ILIKE '%cobertor%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', cobertor'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Piscina, sauna y turco'
    AND pc."nombre" = 'Mantenimiento de equipos áreas húmedas';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'honorario'
    WHEN pc."palabras_clave" ILIKE '%honorario%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', honorario'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Administración y gestión'
    AND pc."nombre" = 'Honorarios de Administrador';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'arreglo'
    WHEN pc."palabras_clave" ILIKE '%arreglo%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', arreglo'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Infraestructura comunal general'
    AND pc."nombre" = 'Reparaciones comunales';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = CASE
    WHEN pc."palabras_clave" IS NULL OR pc."palabras_clave" = '' THEN 'tag vehicular'
    WHEN pc."palabras_clave" ILIKE '%tag vehicular%' THEN pc."palabras_clave"
    ELSE pc."palabras_clave" || ', tag vehicular'
  END
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Sistemas tecnológicos'
    AND pc."nombre" = 'Mantenimiento del sistema ingresos';
