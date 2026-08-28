-- Palabras clave de autoclasificación para egresos manuales (transferencias),
-- sacadas de la columna DETALLE real de la pestaña "Egresos" del Excel del
-- cliente (Informe de Ingresos y Egresos JUL2026.xlsx) — pedido de ago 2026.
-- Los débitos automáticos (agua/luz/telefonía-internet/comisiones) ya
-- tenían sus palabras clave correctas desde la 0011, acá solo se completan
-- los subtipos de pagos manuales que todavía no tenían ninguna.

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'seguridad'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Seguridad'
    AND pc."nombre" = 'Servicio de seguridad privada';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'caja chica'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Personal operativo'
    AND pc."nombre" = 'Caja Chica';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'conserje'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Personal operativo'
    AND pc."nombre" = 'Sueldos de conserjes';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'bomba,cisterna'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Sistema de bombeo agua potable'
    AND pc."nombre" = 'Mantenimiento de sistema de bombas';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'jardin'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Áreas verdes, canchas y exteriores'
    AND pc."nombre" = 'Mantenimiento de jardines, áreas verdes y canchas';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'cobertor'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Piscina, sauna y turco'
    AND pc."nombre" = 'Mantenimiento de equipos áreas húmedas';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'honorario'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos Operativos' AND ps."nombre" = 'Administración y gestión'
    AND pc."nombre" = 'Honorarios de Administrador';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'arreglo'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Infraestructura comunal general'
    AND pc."nombre" = 'Reparaciones comunales';
--> statement-breakpoint

UPDATE "presupuesto_clase" pc
  SET "palabras_clave" = 'tag vehicular'
  FROM "presupuesto_subtipo" ps
  JOIN "presupuesto_tipo" pt ON pt."id" = ps."tipo_id"
  WHERE pc."subtipo_id" = ps."id"
    AND pt."nombre" = 'Gastos de Mantenimiento' AND ps."nombre" = 'Sistemas tecnológicos'
    AND pc."nombre" = 'Mantenimiento del sistema ingresos';
