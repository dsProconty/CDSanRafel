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
  duplicar login.
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
- **`cargas_estado_cuenta`** — historial de cada subida del Excel del banco.
- **`movimiento_candidatos_casa`** — candidatos cuando una referencia
  matchea > 1 casa.
- **`reportes_financieros`** + **`reporte_ingreso_linea`** +
  **`reporte_egreso_linea`** — informes económicos mensuales (uno por
  mes/año). Ingresos se sugieren solos (deudas emitidas ese mes por tipo +
  línea "No identificado"), egresos se cargan a mano por categoría
  (mantenimiento/operativos/inversiones/otros). Genera PDF con
  `@react-pdf/renderer`, se sube a Vercel Blob, `pdfUrl` queda guardado.

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
| `/casas` | admin | Casas + Usuarios + Agenda unificados, tabla con buscador + filtros (estado/pago) + columnas ordenables (flechitas) + columna Acciones fija (sticky) para no scrollear, modal de detalle con KPIs (avisa si el usuario también tiene acceso a otras casas), estado de cuenta con filtros |
| `/cargar` | admin | Subir Excel del banco → parseo → dedupe → matching automático de créditos + colas de revisión manual (acordeones); los débitos (egresos reales) se guardan y se autoclasifican por palabra clave, quedan disponibles para el informe del mes que corresponda; buscador + orden en el historial |
| `/deudas/masiva` | admin | Selector "Aplicación única" / "Recurrente-cuotas". Elegís un concepto, fecha, excluís casas puntuales. Historial de corridas con botón Anular, buscador + filtro por estado + orden. |
| `/deudas/conceptos` | admin | Catálogo de conceptos de deuda (CRUD) — en el menú aparece como submenú "Catálogo → Deudas". Buscador + filtros + orden. |
| `/egresos/categorias` | admin | Catálogo de presupuesto en 3 niveles (Tipo → Subtipo → Clase) para clasificar egresos — submenú "Catálogo → Egresos". 3 columnas tipo Miller (click en un Tipo muestra sus Subtipos, click en un Subtipo muestra sus Clases), CRUD + activar/desactivar en cada nivel. La Clase tiene `palabrasClave` (coma-separadas) para autoclasificación. |
| `/reportes` | admin + propietario | Lista de informes económicos mensuales (borrador/publicado), buscador + filtro + orden |
| `/reportes/[id]` | admin | Editor: ingresos sugeridos editables, egresos con clasificación (tipo/subtipo/clase) editable por línea — "Pendiente de clasificar" si no matcheó autoclasificación y el admin no eligió una clase; no se puede generar el PDF con egresos pendientes —, botón "Generar y publicar PDF" |
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
palabras clave) — **el cliente todavía tiene que compartir la lista real de
ítems del presupuesto**, que se carga después vía la UI de `/egresos/
categorias` sin tocar código.

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

- Rama de trabajo actual: `claude/migracion-usuario-correo-casas-h1x6hx`
  (a pesar del nombre, terminó siendo la rama de todo el trabajo de esta
  sesión: migración real de usuarios/casas, buscadores/filtros/orden en
  las tablas, dashboard de KPIs, y el cambio a "un usuario puede tener
  varias casas").
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
