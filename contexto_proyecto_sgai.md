# Contexto del proyecto — Modernización SGAI "Orquídeas San Rafael"

## Qué es
Sistema de administración de condominio (159 casas en Bloque A y Bloque B). El cliente es Christian Hugo Terán Panchi (administrador). El sistema viejo maneja usuarios, expensas, y validación de pagos con fotos de comprobantes — proceso 100% manual y propenso a error.

## El problema real a resolver
Hoy, para confirmar un pago, el administrador (Christian/Nico) recibe una FOTO del comprobante del propietario, y tiene que ir manualmente al Excel del banco a buscar por nombre/fecha/valor para confirmar que el pago existe y coincide. El número de comprobante que sube el usuario NO coincide con el número de documento real del banco, lo que hace el proceso lento y con errores (duplicados, pagos no encontrados, etc.).

**Objetivo del nuevo sistema:** eliminar la validación manual. El admin sube el Excel diario del banco (Banco Guayaquil), el sistema lo procesa automáticamente y actualiza los saldos de las casas sin intervención humana, salvo casos ambiguos.

## Fuentes de datos disponibles
- **CASAS.xlsx**: catálogo `CASA` ↔ `Referencia` (cédula + nombre del pagador). 159 filas, 135 casas únicas. Relación es **1 casa : N referencias** (una casa puede tener varios pagadores/bancos).
- **Excel del banco (Banco Guayaquil)**: reporte de movimientos con columnas fijas — el formato **nunca cambia**: `#, Fecha de transacción, Fecha contable, Tipo de movimiento, Documento, Concepto, Agencia, Monto, Saldo efectivo, Saldo total, Referencia, Referencia 2, Referencia 3, Signo`. Los datos empiezan en la fila 14 (hay encabezado/metadata arriba). `Documento` es el ID único de cada transacción — nunca se repite, es la llave de idempotencia para evitar duplicados.

## Regla de negocio clave: matching banco → casa
1. Se sube el Excel del banco.
2. Se descartan filas cuyo `Documento` ya fue cargado antes (evita duplicados).
3. Se busca la `Referencia` de cada fila en el catálogo `CASA ↔ Referencia`:
   - **Match con exactamente 1 casa** → abono automático a esa casa. Sin intervención humana.
   - **Match con más de 1 casa** → esto SÍ ocurre en datos reales (confirmado con el cliente: es el mismo dueño pagando por varias casas, no es error). Ejemplos reales: referencia de "chiluisa ochoa..." → casas 36A y 51A; "ordonez medina..." → 6A y 26A; "freire palomino..." → 75A, 70B y 78B. En estos casos el pago cae a una **cola de revisión** con las casas candidatas ya sugeridas, y el admin decide con un clic a cuál asignarlo.
   - **Sin match** → cae a una cola de "pendiente de catalogar"; el admin asigna la casa manualmente una sola vez, y la referencia queda aprendida para futuras cargas.
4. El saldo de cada casa = Σ deudas − Σ abonos, siempre calculado, nunca "pagado" manualmente por el admin.

## Decisiones ya confirmadas con el cliente
- Formato del Excel del banco: **fijo, nunca cambia** → el parser puede asumir columnas fijas.
- Notificaciones por WhatsApp al propietario: **mapear en el modelo de datos pero NO construir en el demo**.
- Ejecución del import: **Fase 1 = botón manual "cargar y ejecutar"**. Más adelante se agregará un cron automático (3x/semana) que dispara la misma lógica — no es un flujo distinto, solo cambia el trigger.
- No se migran fotos/comprobantes antiguos, solo las deudas (decisión explícita del cliente).
- Un usuario = una casa (login con cédula como password inicial, sin flujo de reset en v1).
- "Usuarios" y "Agenda" del sistema viejo deben fusionarse en una sola pantalla maestro-detalle.
- Los tipos de expensa (ordinaria/extraordinaria/otros) deben ser un **catálogo parametrizado**, no texto libre como en el sistema viejo (esto es lo que hoy le complica los reportes al cliente).

## Alcance cerrado para la Fase 1 (demo)
1. Login con casa/usuario (cédula como password inicial).
2. Catálogo de casas + referencias bancarias (importado desde CASAS.xlsx).
3. Botón "cargar estado de cuenta" → sube el Excel del banco → parsea → dedupe por `Documento` → matching automático (1 casa = auto-abono, N casas = cola de revisión, sin match = cola "sin catalogar").
4. Vista de estado de cuenta por casa con saldo calculado (deudas − abonos).
5. Pantalla simple de "pendientes de revisión" donde el admin asigna manualmente.

Fuera de alcance del demo (fases posteriores): catálogo de tipos de expensa completo, generación masiva mensual de expensas, fusión Usuarios/Agenda, reportes financieros/PDF, políticas, notificaciones WhatsApp, cron automático, migración completa de deudas históricas.

## Stack técnico recomendado
- **Next.js 15 (App Router)** — desplegado en Vercel
- **Neon Postgres** — DB relacional (integración nativa con Vercel, plan free). Se necesita SQL relacional real por las transacciones e integridad referencial (dedupe por Documento, cruces deuda/pago).
- **Drizzle ORM** (o Prisma como alternativa)
- **Auth.js (NextAuth)** con credenciales — un usuario = una casa, roles admin/propietario
- **Tailwind + shadcn/ui** para la interfaz
- **SheetJS (xlsx)** para parsear el Excel del banco y el catálogo de casas en el server
- **Vercel Blob** para PDFs de reportes/políticas (fase posterior)

## Modelo de datos (alto nivel)
- `casas` (número, bloque A/B, propietario)
- `usuarios` (1:1 con casa, email, password=cédula inicial, rol)
- `catalogo_referencias_bancarias` (casa_id, referencia, banco) — relación N:1 hacia casas
- `tipos_expensa` (catálogo parametrizado: ordinaria, extraordinaria, otros)
- `deudas` (casa_id, tipo_expensa_id, monto, fecha, estado)
- `movimientos_bancarios` (documento único, fecha, monto, referencia cruda, casa_id nullable, estado: matched / pendiente_revision / sin_catalogar)
- `reportes_financieros` (mes, año, pdf_url) — fase posterior
- `politicas` (pdf_url) — fase posterior

## Deadline
El cliente necesita el sistema en producción para **noviembre 2026**. Se le prometió una demo funcional para la semana siguiente a la llamada inicial (6 de agosto 2026).
