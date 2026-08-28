# Estado actual — SGAI Orquídeas San Rafael

> Este archivo resume el estado REAL del sistema a la fecha (ago 2026), para
> arrancar una conversación nueva sin tener que releer todo el historial de
> chat. El alcance/pedido ORIGINAL del cliente sigue en
> `contexto_proyecto_sgai.md` (no se tocó, sigue siendo la fuente de verdad
> de "qué pidieron al principio"). Este archivo es "qué hay construido hoy".

## Qué es

Sistema de administración del condominio "Orquídeas San Rafael" (159 casas,
Bloque A y B). Next.js 16 (App Router) + Drizzle ORM + Neon Postgres +
Auth.js (credenciales) + Tailwind, desplegado en Vercel. Cliente: Christian
Terán Panchi (administrador).

## Cómo correr / tocar el proyecto

- `npm install`
- `npm run dev` — requiere `.env.local` con `DATABASE_URL` y `AUTH_SECRET`
  (ver `.env.example`).
- `npm run db:generate` (alias `drizzle-kit generate`) — genera una migración
  SQL nueva a partir de cambios en `src/db/schema.ts`. **Nota:** hay que
  exportar `DATABASE_URL` (puede ser cualquier valor, no necesita conectar)
  para que `drizzle.config.ts` no tire error al leer el config.
- `npm run db:migrate` — aplica migraciones pendientes contra `DATABASE_URL`.
- Seeds: `npm run db:seed:casas` (importa `data/CASAS.xlsx`, no versionado),
  `npm run db:seed:usuarios` (importa `data/AGENDA_RESIDENTES.xlsx`, no
  versionado — carga masiva de propietarios reales: correo, cédula,
  teléfono, tipo de residente; password inicial = cédula), `npm run
  db:seed:admin`, `npm run db:seed:tipos` (Ordinaria/Extraordinaria/Otros).
- `npx next build` con `DATABASE_URL` y `AUTH_SECRET` dummy sirve para
  correr el build + typecheck sin necesitar una base real (las páginas son
  todas dinámicas, no hacen queries en build time).

### Gotcha importante de este proyecto: dos bases distintas

Varias veces la migración se corrió con éxito aparente contra una base de
**desarrollo/local**, pero la base real de **producción** (proyecto Neon
`neon-blue-prism`, integrado a Vercel) se quedó atrás. Sin acceso directo a
esa base desde este entorno de trabajo, el flujo que terminó funcionando fue:

1. El usuario corre `npm run db:migrate` en su máquina — a veces no alcanza
   la base correcta y no tira error igual (el driver de Neon serverless solo
   tira un warning de websockets, no un error de conexión fallida).
2. Para confirmar/aplicar de verdad: el usuario entra a **Vercel → Storage →
   neon-blue-prism → Query** (editor SQL de Neon embebido en Vercel) y:
   - Verifica con `select to_regclass('public.<tabla>');` (da `null` si no
     existe).
   - Si falta, se le pasa el SQL de la migración envuelto en un solo bloque
     `DO $$ BEGIN ... END $$;` con `EXECUTE '...'` para cada sentencia,
     porque **ese editor no acepta múltiples sentencias separadas por `;`**
     ("cannot insert multiple commands into a prepared statement"). Los
     `ALTER TABLE ... ADD CONSTRAINT` van envueltos en un `BEGIN ... EXCEPTION
     WHEN duplicate_object THEN NULL; END;` interno para que sea idempotente.

Todas las migraciones (`0000` a `0007`) ya están confirmadas aplicadas en
`neon-blue-prism` a esta fecha. Además, en esta sesión se cargaron datos
reales de producción: 156 casas, 153 usuarios (correo/cédula/teléfono desde
`data/AGENDA_RESIDENTES.xlsx`, no versionado) — ver "Un usuario puede tener
varias casas" abajo para el detalle del último ajuste sobre esos datos.

## Variables de entorno / config en Vercel (confirmado)

- `DATABASE_URL` ✅ (Neon, proyecto `neon-blue-prism`)
- `AUTH_SECRET` ✅
- `CRON_SECRET` ✅ (protege el endpoint de cron de deudas recurrentes)
- Vercel Blob Store conectado (`cd-san-rafel-blob`, **Public**, con
  `BLOB_READ_WRITE_TOKEN` generado) ✅ — usado para subir los PDF de
  informes económicos.

## Esquema de datos actual (`src/db/schema.ts`)

- **`casas`** — id, numero (ej "36A"), bloque (A/B), propietario (texto
  libre, manual), `usuarioId` (nullable, FK a `usuarios.id` — null = sin
  acceso creado). Único por `numero`. La FK vive acá (no en `usuarios`)
  justamente para permitir que un mismo usuario tenga varias casas sin
  duplicar login. `enConvenio` (boolean, default false, desde ago 2026) =
  casa en mora con acuerdo de pago manual — ver "Clasificación de ingresos"
  más abajo.
- **`usuarios`** — login (email único, `passwordHash` bcrypt, `rol`
  admin/propietario) + los campos de "Agenda" fusionados: `cedula`,
  `telefono`, `telefonoSecundario`, `tipoResidente`
  (propietario/arrendatario/familiar), `comprobanteActivo`, `ultimoAcceso`.
  **Ya no tiene `casaId`** — la relación se invirtió (ver `casas.usuarioId`
  abajo): una casa tiene un solo usuario, pero el mismo usuario puede estar
  asignado a varias casas (dueños con más de una unidad). Migración `0007`.
- **`catalogo_referencias_bancarias`** — `casaId` + `referencia` + `banco`
  (default "Banco Guayaquil"). Relación 1 casa : N referencias. Se completa
  también dinámicamente cuando el admin cataloga una referencia nueva desde
  la cola de "sin catalogar".
- **`tipos_expensa`** — catálogo simple: nombre, descripcion, activo.
  Sembrado con Ordinaria/Extraordinaria/Otros.
- **`tipos_ingreso`** (desde ago 2026) — catálogo de clasificación de
  INGRESOS, un solo nivel (a diferencia del de egresos que tiene 3):
  Expensa/Anticipo/Convenio-Cartera/Tags/Reservas Comunales/Multas/
  Agua-Basura/Devolución/No identificado. Ver "Clasificación de ingresos"
  más abajo.
- **`conceptos_deuda`** — catálogo parametrizado más fino sobre tipos_expensa
  (ej. "Alícuota ordinaria" → tipo Ordinaria, monto_default $60). Se elige un
  concepto al generar una deuda masiva o recurrente; monto/descripción se
  precargan pero son editables por corrida.
- **`deuda_recurrente`** + **`deuda_recurrente_exclusion`** — planes que se
  repiten mes a mes (alícuota indefinida, o cuota extraordinaria en N
  cuotas). `totalPeriodos` null = indefinido. `periodosGenerados` lleva la
  cuenta. Exclusiones = casas que no reciben ese plan.
- **`deuda_masiva_lotes`** — cada corrida de deuda masiva (manual o generada
  por un plan recurrente vía `recurrenteId`). Permite anular (borra las
  `deudas` de esa corrida, marca `anuladoEn`).
- **`deudas`** — la deuda real por casa. `loteId` opcional (de qué corrida
  masiva salió). El saldo de una casa siempre se calcula como
  Σ`deudas.monto` − Σ`movimientos_bancarios.monto` (casaId no nulo), nunca se
  marca "pagada" a mano.
- **`movimientos_bancarios`** — una fila por movimiento del Excel del banco,
  créditos Y débitos. `documento` es la clave de idempotencia (dedupe, para
  ambos signos). `estado`: matched/pendiente_revision/sin_catalogar (créditos,
  cruzan contra casas) o **`debito`** (egresos reales, desde ago 2026 — ver
  "Ingesta automática de egresos" abajo). `claseId` (nullable) = clasificación
  del presupuesto para un débito; `reporteEgresoLineaId` (nullable) marca que
  ese débito ya se usó como línea de egreso de algún informe mensual.
  `tipoIngresoId` (nullable, desde ago 2026) = clasificación del ingreso para
  un crédito — ver "Clasificación de ingresos" más abajo.
- **`cargas_estado_cuenta`** — historial de cada subida del Excel del banco.
- **`movimiento_candidatos_casa`** — candidatos cuando una referencia
  matchea > 1 casa.
- **`reportes_financieros`** + **`reporte_ingreso_linea`** +
  **`reporte_egreso_linea`** — informes económicos mensuales (uno por
  mes/año). Ingresos se sugieren solos agrupando los créditos del banco
  recibidos ese mes por `tipoIngresoId` (desde ago 2026 — antes se agrupaban
  las deudas *emitidas* ese mes, no los pagos *recibidos*; ver "Clasificación
  de ingresos" más abajo), egresos se cargan a mano por clase del catálogo de
  presupuesto. Genera PDF con `@react-pdf/renderer` (con gráfico de saldo
  bancario histórico, tabla de ingresos/egresos, y comparativo ingresos vs.
  egresos de los últimos 3 meses), se sube a Vercel Blob, `pdfUrl` queda
  guardado. `reporteEgresoLinea.requiereComprobante`/`comprobanteUrl`
  (desde ago 2026) — ver "Comprobantes de egreso" más abajo.

## Un usuario puede tener varias casas (desde ago 2026)

El pedido original decía "un usuario = una casa". El cliente (Christian)
pidió por WhatsApp poder soportar dueños con más de una unidad, con la
regla: **una casa nunca tiene más de un usuario, pero un usuario sí puede
tener varias casas**. Por eso la FK vive en `casas.usuarioId` y no en
`usuarios.casaId` (ver arriba). Consecuencias en el código
(`src/app/casas/[numero]/actions.ts`):

- `guardarUsuario`: si el correo ya existe, reusa esa cuenta y solo
  vincula la casa nueva (antes rechazaba con "correo ya está en uso").
- `eliminarUsuario`: desvincula la casa (`usuarioId = null`), no borra el
  usuario — si tras desvincular queda sin ninguna casa, recién ahí se borra
  automáticamente (`limpiarUsuarioSiHuerfano`).
- El dashboard del propietario (`/`) muestra una tarjeta por cada casa a su
  nombre.
- El modal de detalle de casa avisa "este usuario también tiene acceso a:
  X, Y" cuando corresponde.

## Módulos construidos (por pantalla)

| Ruta | Quién | Qué hace |
|---|---|---|
| `/login` | todos | Login por email + password (Auth.js credentials) |
| `/` | todos | Dashboard: admin ve un panel de KPIs (saldo pendiente total, % casas al día, cobrado este mes con variación vs mes anterior, cola de revisión bancaria, casas sin acceso) + gráficos Recharts (cobranza mensual facturado/cobrado, donut de estado de casas) + top 8 morosos. Propietario ve una tarjeta por cada casa a su nombre (antes asumía una sola). |
| `/casas` | admin | Casas + Usuarios + Agenda unificados, tabla con buscador + filtros (estado/pago) + columnas ordenables (flechitas) + columna Acciones fija (sticky) para no scrollear, modal de detalle con KPIs (avisa si el usuario también tiene acceso a otras casas) + toggle "en convenio de pago", estado de cuenta con filtros |
| `/cargar` | admin | Subir Excel del banco → parseo → dedupe → matching automático de créditos + colas de revisión manual (acordeones); los créditos matcheados se clasifican solos por tipo de ingreso (Expensa/Anticipo/Convenio-Cartera/etc.), sección "Ingresos pendientes de clasificar" para los que no matchearon ninguna regla; los débitos (egresos reales) se guardan y se autoclasifican por palabra clave, quedan disponibles para el informe del mes que corresponda; sección "Egresos pendientes de clasificar" para clasificarlos ahí mismo sin esperar a crear el informe; buscador + orden en el historial |
| `/deudas/masiva` | admin | Selector "Aplicación única" / "Recurrente-cuotas". Elegís un concepto, fecha, excluís casas puntuales. Historial de corridas con botón Anular, buscador + filtro por estado + orden. |
| `/deudas/conceptos` | admin | Catálogo de conceptos de deuda (CRUD) — en el menú aparece como submenú "Catálogo → Deudas". Buscador + filtros + orden. |
| `/egresos/categorias` | admin | Catálogo de presupuesto en 3 niveles (Tipo → Subtipo → Clase) para clasificar egresos — submenú "Catálogo → Egresos". 3 columnas tipo Miller (click en un Tipo muestra sus Subtipos, click en un Subtipo muestra sus Clases), CRUD + activar/desactivar en cada nivel. La Clase tiene `palabrasClave` (coma-separadas) para autoclasificación. |
| `/ingresos/tipos` | admin | Catálogo de tipos de ingreso (un solo nivel) — submenú "Catálogo → Ingresos". Tabla con buscador + filtro + orden, CRUD + activar/desactivar. Cada tipo tiene `palabrasClave` (coma-separadas) que se prueban contra la referencia/concepto del banco antes que las reglas por monto — ver "Clasificación de ingresos" más abajo. |
| `/reportes` | admin + propietario | Lista de informes económicos mensuales (borrador/publicado), buscador + filtro + orden |
| `/reportes/[id]` | admin | Editor: ingresos sugeridos editables, egresos con clasificación (tipo/subtipo/clase) editable por línea — "Pendiente de clasificar" si no matcheó autoclasificación y el admin no eligió una clase —, columna Comprobante (subir factura/recibo PDF/JPG/PNG por línea, "Incompleto" hasta subirlo; los débitos automáticos no lo necesitan); no se puede generar el PDF con egresos pendientes de clasificar o sin comprobante —, botón "Generar y publicar PDF" |
| `/api/cron/generar-deudas-recurrentes` | cron diario (Vercel Cron, `vercel.json`) | Genera el período que corresponda de cada plan recurrente activo. Protegido con `CRON_SECRET` (header `Authorization: Bearer`) |

Todas las tablas del sistema comparten los mismos componentes chicos
reutilizables: `SearchInput`, `Select` y `SortableTh` (flechitas de orden)
en `src/components/ui/`.

`/deudas/recurrentes` sigue existiendo como archivo pero solo hace
`redirect("/deudas/masiva")` — se unificó todo en una sola pantalla con
selector de modo.

## Convenciones del código (importante para escribir código consistente)

- Server actions: archivo `actions.ts` por carpeta de ruta, con `"use server"`
  arriba. Cada función chequea `await auth()` y el rol al principio (patrón
  `requireAdmin()` o `if (session?.user.rol !== "admin") return {ok:false,...}`).
  Devuelven `{ok:true,...} | {ok:false,error:string}`, nunca lanzan al cliente.
- Después de escribir en DB: `revalidatePath(...)` de las rutas afectadas.
- Client components: `"use client"`, patrón `useTransition` + `startTransition`
  para llamar server actions, `useRouter().refresh()` para traer props
  frescas del server component padre después de un cambio (en vez de
  mantener estado local duplicado) — excepto en editores tipo spreadsheet
  (ver `src/app/reportes/[id]/editor-reporte.tsx`) donde sí se mantiene
  estado local controlado por fila para que los totales reaccionen en vivo.
- UI: Tailwind con tokens de `src/app/globals.css` (`border-border`,
  `bg-card`, `text-muted-foreground`, `bg-sidebar-accent`, etc.), componentes
  reusables en `src/components/ui/` (`Button`, `Input`, `Label`, `Badge`,
  `StatPill`). Acordeones con `<details>/<summary>` nativos + ícono
  `ChevronDown` de lucide-react que rota con `group-open:rotate-180`.
- Confirmaciones destructivas: `confirm()` del navegador antes de llamar la
  action (no hay modal de confirmación custom).
- Menú lateral: `src/components/app-shell.tsx` (arma `NAV_ADMIN`, **solo
  visible para admin** — los propietarios no tienen sidebar, solo el header).
  `src/components/sidebar-nav.tsx` soporta items planos y grupos
  desplegables (`children: {href,label}[]`), ej. "Catálogo" con "Deudas" y
  "Egresos" adentro.
- Migraciones: `npx drizzle-kit generate` (con `DATABASE_URL` dummy) genera
  el `.sql` en `drizzle/` + snapshot en `drizzle/meta/`. Nunca se edita un
  `.sql` ya generado a mano — si hace falta ajustar, se regenera. Cuando el
  cambio incluye datos que no se pueden migrar automáticamente (ej. backfill
  de una columna nueva a partir de una vieja), sí es válido agregar a mano
  sentencias `INSERT`/`UPDATE` extra al `.sql` recién generado por
  drizzle-kit, entre los `--> statement-breakpoint` (así se hizo en la
  `0007` y en la `0008`) — lo que nunca se toca a mano son las sentencias
  DDL que sí generó drizzle-kit.
- **Gotcha de generate con prompts interactivos**: si el cambio de schema
  incluye renombrar/quitar una columna en la misma tabla donde se agrega
  otra del mismo tipo, `drizzle-kit generate` pregunta interactivamente
  "¿fue un rename?" — y en este entorno (sin TTY) eso hace que el comando
  falle con "Interactive prompts require a TTY terminal". Solución: separar
  el cambio en 2 pasos — generar primero una migración que solo AGREGA
  columnas/tablas (dejando la vieja columna intacta), commitear ese estado,
  y recién en un segundo `generate` (con la columna vieja ya removida del
  schema.ts) generar la migración que solo DROPea — un `generate` puramente
  aditivo o puramente de baja nunca pregunta nada.
- **Gotcha de journal.json desincronizado**: en esta sesión se encontró que
  `drizzle/0007_noisy_madame_hydra.sql` (la migración de "usuario puede tener
  varias casas") existía como archivo y su snapshot (`0007_snapshot.json`)
  estaba bien, pero nunca se agregó su entrada a `drizzle/meta/_journal.json`
  — probablemente un commit incompleto de la sesión anterior. Eso hacía que
  `drizzle-kit generate` calculara el diff contra el snapshot equivocado. Se
  arregló agregando a mano la entrada faltante en `_journal.json` (mismo
  `id`/`prevId` que ya traía el snapshot, no hace falta tocarlo). Si un
  `generate` da resultados raros (tablas/columnas que "reaparecen"), lo
  primero a chequear es que `_journal.json` tenga una entrada por cada
  `drizzle/NNNN_*.sql` que exista en el repo.

## Clasificación de egresos en 3 niveles (desde ago 2026)

El cliente (Christian) pidió por transcripción de audio con su jefe que los
egresos ya no tengan una categoría fija (mantenimiento/operativos/
inversiones/otros como enum), sino que se clasifiquen con un catálogo de
presupuesto en 3 niveles: **Tipo → Subtipo → Clase** (ej. Tipo "Operativos" →
Subtipo "Servicios básicos" → Clase "Internet"). Reglas del pedido:

- Un egreso cargado sin clasificación explícita queda **"pendiente de
  clasificar"** (`reporteEgresoLinea.claseId = null`) — el admin lo clasifica
  después desde el editor del informe o desde `/egresos/categorias`.
- **Excepción — servicios fijos recurrentes** (teléfono, internet, agua,
  luz): como son pagos automáticos de la cuenta y siempre van a la misma
  clase, se **autoclasifican solos** por palabra clave (`presupuestoClase.
  palabrasClave`, ej. "internet,netlife,cnt") matcheada contra el texto del
  gasto — sin necesidad de IA (el cliente lo hace hoy a mano con ChatGPT,
  pero explícitamente no quiere IA en el sistema).
- El PDF del informe **no se puede generar con egresos pendientes** —
  `generarPdfReporte` lo bloquea y dice cuántos faltan clasificar.

Esquema: `presupuestoTipo` / `presupuestoSubtipo` / `presupuestoClase`
(migraciones `0008`+`0009`, reemplazan el enum `categoria_gasto` fijo). Se
sembró un placeholder (Mantenimiento/Operativos/Inversiones/Otros como Tipo,
con una Clase "General" en cada uno para no dejar los egresos ya cargados
como pendientes de golpe, + Clases de servicios básicos bajo "Operativos" con
palabras clave) a la espera de que el cliente compartiera la lista real.

### Catálogo real de presupuesto (desde la reunión del 27/ago/2026)

En la reunión con el sponsor (Christian + su jefe), Christian compartió su
Excel real de presupuesto anual (pestaña "Clasificación" del archivo
"Informe de Ingresos y Egresos JUL2026.xlsx"). Migración `0011` (solo datos,
sin cambio de schema — no la generó `drizzle-kit`, se agregó a mano su
entrada en `_journal.json` igual que el gotcha de la `0007`) carga ese
catálogo real:

- Renombra los 3 Tipo placeholder que sí tienen equivalente real
  ("Operativos" → "Gastos Operativos", "Mantenimiento" → "Gastos de
  Mantenimiento"; "Inversiones" queda igual) **en vez de crear filas
  nuevas**, para no dejar huérfanos los egresos que ya se hayan clasificado
  con esos ids. "Otros" no tiene equivalente en el presupuesto real del
  cliente — queda como catch-all para lo que no encaje en los 3 grupos
  oficiales.
- Agrega los Subtipo/Clase reales bajo cada Tipo (Administración y gestión,
  Personal operativo, Servicios básicos comunales, Seguridad, Provisiones /
  Áreas verdes-canchas-exteriores, Infraestructura comunal general, Sistema
  de bombeo, Piscina-sauna-turco, Sistemas tecnológicos / Infraestructura
  comunal general, Seguridad y tecnología), cada Clase con el presupuesto
  anual 2026 real en `descripcion` (dato real del cliente, no inventado —
  referencia hasta que el sistema compare presupuesto vs. gastado, no
  pedido todavía).
- Las clases placeholder "Teléfono" e "Internet" (separadas) se **fusionan**
  en una sola clase real "Telefonía / internet" ($1080/año, una sola línea
  en el presupuesto de Christian) — se migran antes las referencias
  existentes (`reporteEgresoLinea.claseId`, `movimientosBancarios.claseId`)
  a la clase nueva y recién ahí se borran las 2 viejas, conservando la unión
  de sus palabras clave + las que ya estaban marcadas como pendientes de
  agregar más abajo (otecel, movip, megadatos).
- "Agua potable" y "Energía eléctrica" se mantuvieron (mismo nombre en el
  presupuesto real) — solo se les completaron las palabras clave que ya
  estaban marcadas como pendientes (emaap; eee quito/empresa electrica).
- Se agregó "Costos Bancarios" (no existía en el placeholder) con palabras
  clave `comision,cash,iva servicio,mantenimiento cuenta,tarifa` para que
  las comisiones bancarias del banco se autoclasifiquen solas, como pidió
  el cliente en la reunión (agrupar todas las comisiones chicas en una sola
  línea del informe).
- Validado corriendo las 12 migraciones (`0000`→`0011`) contra un Postgres
  local limpio antes de este commit — la jerarquía final quedó idéntica al
  Excel del cliente (ver query de verificación en el historial de esta
  sesión si hace falta repetirla).

**Igual que con cualquier cambio de datos que solo se corrió local: hay que
aplicar el SQL de la `0011` a mano en el editor de Neon** (ver gotcha de
"dos bases distintas" arriba) — no es un `ALTER TABLE`, así que no rompe el
deploy de Vercel, pero sin correrlo el catálogo real no aparece en
producción hasta que alguien la aplique.

## Ingesta automática de egresos desde el Excel del banco (desde ago 2026)

Se construyó lo que en la sesión anterior quedó como "pendiente/bloqueado":
autoclasificar egresos directamente desde el Excel bancario (no solo desde
el texto que el admin tipea a mano). El cliente pasó dos ejemplos reales de
Excel de Banco Guayaquil (uno de una semana, otro de julio 2026 completo,
pestaña "general") que permitieron identificar el patrón real:

- La columna **"Concepto"** del banco casi nunca sirve para clasificar
  (valores genéricos como "Pago a terceros", "Nota de débito"). Lo que sí
  identifica el proveedor de un servicio fijo es **"Referencia 2"** (ej.
  "Emaap quito", "Empresa electrica quito s a", "Movip", "Megadatos s a").
  Para los pagos manuales tipo "Pago a terceros", la descripción real está
  en **"Referencia 3"** (ej. "Seguridad junio", "Compra de pintura") — pero
  para los 4 servicios fijos, Referencia 3 es solo un número de cliente, no
  texto útil (por eso ahí se usa el Concepto, que ya es descriptivo:
  "Cuota otecel", "Recaud.agua potable quito tr", etc.).
- Cada pago fijo real viene con 1-2 líneas más ese mismo día (comisión del
  banco por el débito automático + su IVA) que comparten Referencia 2 con el
  pago principal — por eso autoclasificar contra `concepto + referencia2`
  (no solo concepto) también atrapa esas líneas de comisión/IVA sin que el
  admin tenga que tipear nada (pedido explícito del cliente: "hay unos
  impuestos también que se cargan de los pagos recurrentes").

Implementado en `src/lib/procesar-movimientos.ts` +
`src/lib/clasificar-egreso.ts` (autoclasificación y derivación de
descripción compartidas con el editor manual de informes):

- `/cargar` ahora guarda TAMBIÉN los débitos (antes se descartaban) en
  `movimientos_bancarios` con `estado = "debito"`, autoclasificados por
  palabra clave contra `concepto + referencia2`; `claseId` null = pendiente.
- Al crear un borrador de informe (`crearBorradorReporte`), además de
  sugerir ingresos (como ya hacía), se importan solos los débitos de
  `movimientos_bancarios` cuya `fechaTransaccion` cae en ese mes y que
  todavía no se usaron en otro informe (`reporteEgresoLineaId` null) — se
  generan como `reporteEgresoLinea` ya con su `claseId` (o pendiente si no
  matcheó ninguna palabra clave). **Límite conocido**: es una sugerencia al
  crear el borrador, no un sync continuo — igual que ya pasa con los
  ingresos sugeridos. Si el Excel del banco se sube DESPUÉS de crear el
  borrador del mes, esos débitos quedan sueltos en `movimientos_bancarios`
  (no se pierden, pero no aparecen solos en el informe) y hay que
  agregarlos a mano como antes.
- Si se borra una línea de egreso o un borrador completo, el/los
  movimiento(s) bancario(s) que la generaron se "desconsumen"
  (`reporteEgresoLineaId = null`) para no violar la FK y para que vuelvan a
  estar disponibles si se recrea el informe de ese mes.
- Migración `0010`: agrega `debito` al enum `estado_movimiento`, y las
  columnas `referencia_2`/`referencia_3`/`clase_id`/`reporte_egreso_linea_id`
  a `movimientos_bancarios` (más 2 columnas de conteo en
  `cargas_estado_cuenta`). **Gotcha nuevo para el fallback del editor de
  Neon**: `ALTER TYPE ... ADD VALUE` de Postgres no se puede correr dentro
  de un bloque `DO $$ ... $$` (a diferencia del resto de sentencias de una
  migración, que sí se pueden envolver ahí) — hay que correrlo solo, en su
  propio Run, antes del bloque `DO` con el resto de la migración.
- **Ojo con las palabras clave ya sembradas en el catálogo** (migración
  `0008`, editables sin tocar código desde `/egresos/categorias`): con los
  Excel reales se confirmó que hacen falta agregar `otecel` y `movip` a
  Teléfono (la "Cuota otecel" es el cargo, pero su comisión/IVA vienen con
  Referencia 2 = "Movip", no "otecel") y `megadatos` a Internet, `emaap` a
  Agua potable, `eee quito`/`empresa electrica` a Energía eléctrica — el
  cliente las agrega él mismo desde la UI, no requiere otra migración.

### Cola de "egresos pendientes de clasificar" en `/cargar`

Los débitos autoclasificados o pendientes quedaban invisibles hasta crear el
informe económico del mes (recién ahí `crearBorradorReporte` los trae). Se
agregó una sección en `/cargar` (debajo de "Sin catalogar") que muestra los
`movimientos_bancarios` con `estado = "debito"` y `reporteEgresoLineaId`
null, separados en dos contadores: "pendientes de clasificar" (acordeón con
un `<select>` por fila para asignar tipo/subtipo/clase ahí mismo, sin
esperar a crear el informe) y "autoclasificados, esperando el informe del
mes" (solo contador). Se extrajo `construirOpcionesClase` (antes vivía
adentro de `editor-reporte.tsx`) a `src/lib/opciones-clase.ts` para
reusarla acá sin arrastrar código de servidor (`db`) al bundle del cliente —
ese archivo solo importa el *type* `PresupuestoTree`, nunca el valor.

### Gotcha: el Excel puede tener varias pestañas y nombres/columnas variables

El cliente pasó un "Estado de Cuenta" armado a mano con 5 pestañas
(`Validación`, `general`, `transacciones`, `casas`, `Diferencias Valor`) y
`parseBankExcel` siempre leía `workbook.SheetNames[0]` — como la primera
pestaña era "Validación" (un resumen, no los movimientos), tiraba "El
formato del Excel del banco cambió" aunque la hoja real ("general") tuviera
el formato correcto. Se corrigió para buscar el encabezado esperado en
TODAS las pestañas, no solo la primera ni asumiendo que se llama "general".
De paso se encontró que esa misma hoja traía "Saldo efectivo"/"Saldo total"
ambas rotuladas "Monto" (en vez de sus nombres reales) — como el parser no
lee esas dos columnas, se relajó la validación del encabezado para exigir
solo las columnas que sí se usan (`INDICES_VALIDADOS` en
`src/lib/parse-bank-excel.ts`), no las 14 completas.

## Clasificación de ingresos + convenio de pago (desde ago 2026)

En la reunión del 27/ago/2026 (sponsor + Christian), quedó claro que además
de los egresos, los INGRESOS (créditos del banco) también necesitan una
clasificación por tipo para poder armar el informe — igual que ya usa
Christian a mano en su Excel (pestañas "Deudas"/"Transacciones"). A
diferencia del catálogo de egresos (3 niveles), acá es **un solo nivel**
("aquí solo hay un tipo, no hay tipo subtipo, nada, aquí solo hay de qué
pertenece" — palabras textuales de Christian).

Catálogo `tiposIngreso` (migración `0012`, con CRUD propio desde ago 2026
en `/ingresos/tipos` — submenú "Catálogo → Ingresos"): Expensa, Anticipo,
Convenio/Cartera, Tags, Reservas Comunales, Multas, Agua/Basura, Devolución,
No identificado.

Reglas de autoclasificación (`src/lib/clasificar-ingreso.ts`,
`clasificarIngresoAutomatico`) — cubren los casos que Christian dijo que
"no hace falta redireccionar":

1. **Casa marcada `enConvenio`** (flag en `casas`, toggle en el modal de
   detalle de casa) → siempre "Convenio/Cartera", pague lo que pague. Es
   para casas en mora con un acuerdo de pago manual con el administrador
   ("algunas pagan 80, otras pagan 150... como ya la tenemos marcada,
   directamente ese pago va a convenio y cartera").
2. **Palabra clave** (`tiposIngreso.palabrasClave`, migración `0014`,
   mismo mecanismo que ya existía para egresos): si la referencia/
   referencia2/referencia3/concepto del banco contiene alguna palabra
   clave, se asigna ese tipo — se prueba ANTES que las reglas por monto
   porque es más confiable cuando está presente. Sembrado con un solo
   caso real que mencionó el cliente: "tag" → Tags ("todos los que digan
   tag son tags"). El resto de palabras clave las agrega el admin desde
   `/ingresos/tipos` a medida que las descubre.
3. Paga exactamente el saldo pendiente que tenía la casa antes de este pago
   (Σ deudas − Σ abonos previos) → "Expensa".
4. Paga más de lo que debía → "Anticipo".
5. Cualquier otro caso (pago parcial sin convenio, o algo ambiguo sin
   palabra clave — Christian mismo dijo que ahí "nos confundimos") queda
   **sin clasificar**: el admin lo resuelve a mano desde una cola nueva en
   `/cargar` ("Ingresos pendientes de clasificar"), igual que ya pasa con
   los egresos que no matchean ninguna palabra clave. Deliberadamente NO
   se intentó automatizar más allá de esto — el cliente dijo explícitamente
   "no te rompas tanto la cabeza que todo salga automático al principio".

Cuándo se dispara la clasificación:

- Al cargar el Excel del banco: créditos que matchean 1 sola casa se
  clasifican en el momento (`procesarMovimientosBancarios`); los que quedan
  en las colas "pendiente_revision"/"sin_catalogar" arrancan como "No
  identificado" (no tienen casa todavía, así que ninguna regla puede
  aplicar) y se reclasifican solos en cuanto se les asigna una casa
  (`asignarCandidato`/`asignarManual` en `src/app/cargar/pendientes-actions.ts`).
- Créditos que ya estaban `matched` de antes de esta migración quedan con
  `tipoIngresoId = null` (no se reconstruyó el historial) — van a aparecer
  en la cola de pendientes de clasificar la primera vez que se abra
  `/cargar` después de correr la `0012` en producción.

`sugerirLineasIngreso` (en `src/lib/reporte-financiero.ts`) se reescribió
para agrupar por este catálogo en vez de por `tiposExpensa`: antes sumaba
las DEUDAS *emitidas* ese mes (un proxy que no siempre coincidía con la
plata *recibida* ese mes); ahora suma los CRÉDITOS del banco recibidos ese
mes agrupados por `tipoIngresoId`, con un bucket "Pendiente de clasificar"
para los que todavía no se resolvieron (para que el total del informe siga
cuadrando contra el estado de cuenta real). Mismo límite ya documentado
para los egresos: es una sugerencia al crear el borrador, no un sync
continuo.

De paso, en la misma sesión se extendió el gráfico "Estadística" del PDF
del informe (`generarPdfReporte` en `src/app/reportes/actions.ts`) de 2 a
**3 meses** (incluido el actual), como en el ejemplo que mostró Christian
en la reunión (mayo/junio/julio) — el resto del diseño del PDF (Bancos
histórico, tabla Ingresos, tabla Egresos agrupada, tabla Pagos con
#casas pagaron/mora) ya estaba construido de una sesión anterior y
resultó calzar bastante bien con lo que Christian arma a mano ("ya me
queda claro, igualito yo", dijo él mismo viendo la demo en la llamada).

## Comprobantes de egreso (desde ago 2026)

Último pedido de la reunión del 27/ago/2026: todo egreso pagado
manualmente necesita su factura/recibo/nota de venta escaneada como
respaldo de auditoría — Christian: "esto sí es obligatorio, porque esto en
auditoría verifican en qué se gastó". Mientras no se suba, la línea debe
quedar visualmente marcada como incompleta. Los **débitos automáticos**
(agua/luz/internet/teléfono/comisiones bancarias) quedaron explícitamente
afuera de este requisito — Christian los tiene guardados aparte solo como
respaldo propio, "no se auditan, digamos, porque estos son automáticos".

Implementado en `reporteEgresoLinea.requiereComprobante`/`comprobanteUrl`
(migración `0013`, columnas puramente aditivas — las líneas que ya
existían antes de esta migración se marcan `requiereComprobante = false`
a propósito, para no bloquear la regeneración del PDF de informes de
meses ya cerrados que nunca tuvieron este campo):

- Al crear el borrador del informe, cada línea de egreso importada del
  banco (`crearBorradorReporte`) se marca según
  `requiereComprobanteBancario` (`src/lib/clasificar-egreso.ts`): un
  débito con concepto genérico "Pago a terceros" (transferencia manual que
  Christian inicia él mismo) sí requiere comprobante; un débito con
  concepto específico (ej. "Cuota otecel", "Recaud.agua potable quito tr")
  es un servicio fijo automático y no lo requiere. **No** se usa si la
  línea autoclasificó por palabra clave como proxy de "es automático" —
  esa autoclasificación también se usa para gastos manuales recurrentes
  (ej. "pintura"), que si necesitan comprobante.
- Las líneas que el admin agrega a mano en el editor (`agregarLineaEgreso`)
  quedan `requiereComprobante = true` por default (son pagos manuales que
  el admin tipeó), editable con un toggle "No requiere"/"Sí requiere" por
  si la regla se equivocó en un caso puntual.
- Columna "Comprobante" en la tabla de egresos del editor
  (`src/app/reportes/[id]/comprobante-cell.tsx`): botón para subir
  PDF/JPG/PNG (máx. 20MB) a Vercel Blob — mismo mecanismo que el PDF del
  informe (`nombreArchivo` con prefijo `comprobantes/<reporteId>/<lineaId>-
  timestamp`) —, badge "Incompleto"/"Cargado" y link "Ver".
  `generarPdfReporte` bloquea la generación (mismo patrón que el bloqueo
  ya existente por egresos sin clasificar) mientras haya alguna línea que
  requiera comprobante y no lo tenga.
- **Pendiente de decidir con el cliente**: dónde guardar los PDFs a largo
  plazo. Se implementó con Vercel Blob (ya integrado, mismo store que usan
  los PDF de informes) por ser lo más simple y ya probado — pero en la
  llamada Christian propuso como alternativa (si el volumen genera un
  costo relevante: ~31 comprobantes/mes, todos PDF, estimado ~200MB/mes)
  guardarlos en la máquina del administrador y que el sistema solo guarde
  un código de referencia. No se implementó esa alternativa — si hace
  falta más adelante, sería una migración de `comprobanteUrl` (mover de
  "URL pública de Blob" a "código que el admin busca en su máquina").
- **No se construyó** el módulo aparte para archivar los PDFs mensuales de
  respaldo de los débitos automáticos (agua/luz/internet/teléfono) que
  Christian mencionó como idea suelta ("no sé si más bien un módulo
  independiente, aparte que simplemente diga cargar documentos") — quedó
  claro en la llamada que no es prioridad ("por no olvidarme te expliqué,
  pero no es prioridad").

## Limitaciones conocidas / lo que falta (ver también el informe "Avance SGAI")

- **No hay cron para la carga del Excel del banco** (seguía siendo manual,
  el cron que existe es para deudas recurrentes, no para esto). Bloqueante:
  Banco Guayaquil probablemente no tiene API — habría que definir de dónde
  saldría el archivo automáticamente (correo, Drive, SFTP) antes de construir
  nada.
- **No hay notificaciones WhatsApp** (mapeado en datos —
  `usuarios.telefono` — pero no construido, tal como se acordó con el
  cliente desde el principio).
- **No hay políticas (PDF)** ni tabla para eso todavía.
- **No hay tests automatizados.** Cada cambio se valida con
  `npx next build` (compila + typecheck) y revisión manual en Vercel.
- El PDF de informes usa Helvetica (fuente nativa de `@react-pdf/renderer`,
  sin registrar fuentes custom) — funcional pero no pixel-perfect contra el
  PDF original del cliente (que tenía su logo real de flor, que no
  reconstruí por no tener el asset).

## Convenciones de git en este repo (para la sesión nueva)

- Rama de trabajo de la sesión anterior: `claude/migracion-usuario-correo-casas-h1x6hx`
  (migración real de usuarios/casas, buscadores/filtros/orden en las tablas,
  dashboard de KPIs, y el cambio a "un usuario puede tener varias casas").
  Rama de esta sesión: `claude/modulo-egresos-config-qnho36` (a pesar del
  nombre, terminó siendo todo el módulo de egresos: catálogo de presupuesto
  en 3 niveles, clasificación pendiente/autoclasificación, ingesta de
  débitos desde el Excel del banco, y la cola de pendientes en `/cargar`).
  Cada sesión nueva arranca en su propia rama — esto es solo referencia
  histórica, no algo para reusar a mano.
- **Cambio de convención (ago 2026): el usuario pidió explícitamente
  "subilo a main siempre, así es como yo pruebo".** A diferencia de antes
  (donde había que esperar el pedido "sube a main" en cada ocasión), ahora
  el default es mergear a `main` después de cada cambio, sin que lo pida
  de nuevo — salvo que el usuario diga lo contrario. El merge sigue siendo
  fast-forward simple:
  ```
  git fetch origin main <rama>
  git checkout -B main origin/main
  git merge --ff-only origin/<rama>
  git push origin main
  git checkout <rama>   # volver a la rama de trabajo
  ```
- Nunca se creó un Pull Request — todo fue push directo a `main`.
- **Ojo con el orden schema-vs-deploy**: como se sube a `main` apenas se
  termina un cambio, si ese cambio incluye una migración de schema (como
  la `0007` de esta sesión), el deploy en Vercel queda ROTO hasta que se
  corre el SQL de la migración a mano en el editor de Neon (ver gotcha de
  "dos bases distintas" arriba) — avisar esto explícitamente cada vez que
  se pushee un cambio de schema, y mandar el SQL a correr de inmediato.
