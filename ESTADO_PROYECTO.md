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
- **`movimientos_bancarios`** — una fila por movimiento del Excel del banco.
  `documento` es la clave de idempotencia (dedupe). `estado`:
  matched/pendiente_revision/sin_catalogar. Los **débitos NO se procesan**
  (solo créditos/ingresos) — ver limitación abajo.
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
| `/cargar` | admin | Subir Excel del banco → parseo → dedupe → matching automático + colas de revisión manual (acordeones), buscador + orden en el historial |
| `/deudas/masiva` | admin | Selector "Aplicación única" / "Recurrente-cuotas". Elegís un concepto, fecha, excluís casas puntuales. Historial de corridas con botón Anular, buscador + filtro por estado + orden. |
| `/deudas/conceptos` | admin | Catálogo de conceptos de deuda (CRUD) — en el menú aparece como submenú "Catálogo → Deudas". Buscador + filtros + orden. |
| `/reportes` | admin + propietario | Lista de informes económicos mensuales (borrador/publicado), buscador + filtro + orden |
| `/reportes/[id]` | admin | Editor: ingresos sugeridos editables, egresos manuales, botón "Generar y publicar PDF" |
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
  desplegables (`children: {href,label}[]`), ej. "Catálogo" con "Deudas"
  adentro.
- Migraciones: `npx drizzle-kit generate` (con `DATABASE_URL` dummy) genera
  el `.sql` en `drizzle/` + snapshot en `drizzle/meta/`. Nunca se edita un
  `.sql` ya generado a mano — si hace falta ajustar, se regenera.

## Limitaciones conocidas / lo que falta (ver también el informe "Avance SGAI")

- **El Excel del banco solo procesa créditos.** Los débitos (egresos reales)
  se descartan — por eso el informe económico pide los egresos a mano.
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
