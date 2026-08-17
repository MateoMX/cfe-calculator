# Calculadora de recibo CFE

Herramienta estática en español para estimar recibos domésticos de CFE a partir de:

- lectura anterior y actual del medidor
- fecha de corte del recibo anterior y fecha de la lectura actual
- tarifa impresa (`1`, `1A`–`1F` o `DAC`)
- ciclo mensual o bimestral
- mes de inicio de la temporada de verano en la localidad

Todo el cálculo corre en el navegador. No hay backend ni envío de datos.

## Demostración local

```bash
npm install
npm run dev
```

## Pruebas y build

```bash
npm test
npm run lint
npm run build
npm run preview
```

## Publicación en GitHub Pages

1. Sube el repositorio a GitHub.
2. En **Settings → Pages**, elige origen **GitHub Actions**.
3. El flujo [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) ejecuta lint, pruebas, build y despliegue.
4. La app usa `base: './'` para funcionar en la raíz o en un subdirectorio del repositorio.

## Metodología

1. **Consumo observado** = lectura actual − lectura anterior.
2. **Promedio diario** = consumo observado ÷ días transcurridos.
3. **Proyección** = promedio diario × días del periodo (hasta el próximo corte).
4. **Bloques** mensuales oficiales se duplican en facturación bimestral.
5. **Cuotas** mensuales: para periodo mensual se usan las vigentes 15 días antes del corte; para bimestral, 30 días antes (Manual de disposiciones DOF).
6. **Verano**: seis meses consecutivos desde el mes de inicio local. Periodos mixtos usan umbrales de 15/16, 30/31 y 45/46 días.
7. **Mínimo**: 25 kWh mensuales (50 kWh en bimestre).
8. **IVA**: 16% sobre energía y cargos opcionales capturados.
9. **DAC**: no se reclasifica automáticamente por un solo periodo. CFE usa el **promedio móvil de los últimos 12 meses** frente al límite de alto consumo de la tarifa. Con historial opcional se puede estimar ese promedio: 12 consumos mensuales o 6 totales bimestrales (`suma / 12`). El ritmo actual del periodo se compara con el umbral diario de referencia (`límite mensual / 30`) en la barra de cupos.

### Ejemplo de aceptación

- Lecturas: 1000 → 1200 entre el 30 de junio y el 16 de julio de 2026  
- Resultado: **200 kWh en 16 días** = **12.5 kWh/día**  
- Proyección bimestral (60 días) a 12.5 kWh/día = **750 kWh**  
- Tarifa 1B, todo en verano: **250 básico + 200 intermedio + 300 excedente**

## Fuentes de datos

La app no consulta CFE en tiempo de ejecución: guarda una **fotografía estática** en `src/data/tariffs-YYYY.ts`. Vigente al **17 de agosto de 2026**.

Fuentes oficiales (únicas que deben usarse para actualizar):

| Qué | Dónde | Cadencia |
| --- | --- | --- |
| Cuotas domésticas 1, 1A–1F (bloques y precios de todo el año) | Una página por tarifa en el portal: [1](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/Tarifa1.aspx), [1A](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/Tarifa1A.aspx), [1B](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/Tarifa1B.aspx), [1C](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/Tarifa1C.aspx), [1D](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/Tarifa1D.aspx), [1E](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/Tarifa1E.aspx), [1F](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/Tarifa1F.aspx). El oficio **TFSB Domésticas y Factor de Ajuste** en [Acuerdos SHCP](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Acuerdos/AcuerdosCasa.aspx) (2026: Oficio 349-B-1-070) publica los 12 meses | Una vez al año (el oficio trae los 12 meses); hay que bajar **las siete** páginas, no solo 1B |
| Cuotas DAC de las **seis regiones** (cargo fijo + energía) | [Tarifa DAC](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/TarifaDAC.aspx) sección **6.- Cuotas aplicables**, y el oficio **Tarifa DAC {mes} {año}** en Acuerdos SHCP (agosto 2026: Oficio 349-B-1-078) | Cada mes |
| Límites de alto consumo (kWh/mes que disparan DAC) | Misma página Tarifa DAC, tabla de límites por tarifa 1–1F | Casi no cambian de un año a otro |
| Reglas de facturación (verano, mixto, mínimo, IVA) | [Manual de disposiciones (DOF)](http://www.diputados.gob.mx/LeyesBiblio/regla/n365.pdf) | Rara vez |

Verificación de esta fotografía (portal CFE, 17 de agosto de 2026), **todas** las tarifas domésticas y las seis regiones DAC:

- Tarifa 1 agosto: básico `1.132`, intermedio `1.377`, excedente `4.028` (igual los 12 meses frente a las series del TFSB).
- 1A y 1B agosto (verano): básico `1.013`, intermedio `1.175`, excedente `4.028`.
- 1C y 1D agosto (verano): básico `1.013`, intermedio bajo `1.175`, intermedio alto `1.510`, excedente `4.028`.
- 1E agosto (verano): básico `0.848`, intermedio bajo `1.048`, intermedio alto `1.360`, excedente `4.028`.
- 1F agosto (verano): básico `0.848`, intermedio bajo `1.048`, intermedio alto `2.550`, excedente `4.028`.
- Verano febrero–abril (hay que elegir ese mes como inicio de verano en el portal; con inicio en mayo no aparecen): p. ej. 1B abril `1.001` / `1.159`; 1C marzo intermedio alto `1.485`; 1E febrero `0.830` / `1.030` / `1.336`.
- DAC agosto, las seis regiones: cargo fijo `145.04`; Central `6.630`; Baja California `6.447` / `5.536`; Baja California Sur `7.025` / `5.536`; Noroeste `6.211`; Norte y Noreste `6.051`; Sur y Peninsular `6.148`. Febrero–julio coinciden con la fotografía previa.

Las cuotas domésticas 2026 ya cubren enero–diciembre. Las cuotas DAC publicadas van de **enero a agosto de 2026**. El selector del portal puede listar septiembre, pero las tablas de cuotas siguen vacías: no se incluye ese mes. La calculadora usa el mes DAC más reciente publicado; la página de consulta permite elegir mes/año.

### Cómo leer las tablas DAC en el portal

1. Abre [Tarifa DAC](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/TarifaDAC.aspx).
2. Elige el año y, en **6.- Cuotas aplicables**, el mes. CFE es un formulario ASP.NET: hay que seleccionar el mes para que aparezcan las tablas.
3. CFE muestra **dos tablas**:
   - Baja California y Baja California Sur: cargo fijo ($/mes) + energía verano + energía fuera de verano.
   - Central, Noroeste, Norte y Noreste, Sur y Peninsular: el mismo cargo fijo nacional + solo energía de verano (`energyNonSummer = null`).
4. Confirma el oficio del mismo mes en [Acuerdos SHCP](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Acuerdos/AcuerdosCasa.aspx) (`Oficio SHCP … Tarifa DAC {mes} {año}`).
5. **No copies un mes** si el desplegable lo lista pero las tablas salen vacías (eso pasó con septiembre 2026 al `asOf` actual).

### Cómo leer las cuotas domésticas (las siete tarifas)

No basta con Tarifa 1B. Hay una URL por código; hay que repetir el procedimiento en cada una:

1. Abre la página de esa tarifa (`Tarifa1.aspx`, `Tarifa1A.aspx`, … `Tarifa1F.aspx`).
2. Elige año  y mes de consulta. En 1A–1F también elige un **mes de inicio de verano**:
   - Inicio en mayo cubre mayo–octubre (verano) y el resto como fuera de verano.
   - Para febrero, marzo o abril de verano hay que poner ese mismo mes como inicio; si dejas mayo, CFE muestra las cuotas de fuera de verano.
3. Anota básico / intermedio (o intermedio bajo/alto en 1C–1F verano) / excedente y los cupos de kWh del mismo texto.
4. Tarifa 1 no tiene verano: solo mes de consulta.
5. El oficio TFSB del año suele publicar los 12 meses de una vez; un mes nuevo en el selector no implica un ajuste si ese oficio no cambió.

La misma lista de fuentes aparece en la calculadora y en `#/tariffs`.

## Limitaciones

- No afiliado a CFE. El aviso-recibo oficial prevalece.
- CFE asigna tarifa y verano por **localidad**; no publica un catálogo completo abierto. Por eso la herramienta pide confirmar tarifa y mes de inicio de verano con tu recibo.
- DAP, adeudos, créditos y convenios municipales no se estiman automáticamente (puedes capturar un cargo opcional conocido).
- Los precios DAC cambian mensualmente; las domésticas, cuando SHCP publica un nuevo TFSB. Actualiza a mano la fotografía del año correspondiente.

## Privacidad

Los datos del formulario no salen del navegador. No hay cookies de seguimiento ni llamadas de red durante el cálculo.

## Actualizar tarifas

Archivos: [`src/data/tariffs-2026.ts`](src/data/tariffs-2026.ts) (o `tariffs-YYYY.ts`) y el registro en [`src/data/tariffs.ts`](src/data/tariffs.ts). `DAC_REGIONS` se deriva del último mes de `DAC_MONTHLY_SCHEDULES`; no lo edites a mano.

### Misma anualidad (ajuste DAC mensual, lo más frecuente)

1. Corre `npm run check:cfe-data` o espera el correo semanal del flujo CFE data watch. Un `dac_month_ahead` / `dac_oficio_ahead` significa que hay un mes DAC nuevo.
2. En el portal DAC, selecciona ese mes y copia las dos tablas (pasos de **Cómo leer las tablas DAC**).
3. Añade una fila en `DAC_MONTH_ROWS` de `src/data/tariffs-YYYY.ts` (mismo orden de regiones que los meses anteriores).
4. Pon `TARIFF_SNAPSHOT_META.asOf` a la fecha de verificación y actualiza las notas (oficio, intervalo de meses DAC).
5. Ajusta las pruebas que fijan `asOf`, meses DAC publicados y el mes más reciente (`src/data/tariffs.test.ts`, `src/domain/tariffReference.test.ts`, `src/App.test.tsx`).
6. Ejecuta `npm test` y vuelve a publicar.

### Ajuste de cuotas domésticas (mismo año)

Solo si el portal o un oficio TFSB nuevo cambia precios 1–1F respecto de las series en `tariffs-YYYY.ts`. Descarga **Tarifa 1 y 1A–1F** (no solo 1B), verano y fuera, y los meses de inicio 2–5 para no perder febrero–abril de verano. Los cupos y límites DAC (`dacLimitKwhMonth`) casi no se tocan.

### Nuevo año (p. ej. cuando CFE publique 2027 antes de que expire 2026)

1. Crea `src/data/tariffs-YYYY.ts` con la misma forma que `tariffs-2026.ts` (`TARIFF_SNAPSHOT_META`, `DOMESTIC_TARIFFS`, `DAC_MONTHLY_SCHEDULES` / `DAC_REGIONS`, etc.).
2. Registra el snapshot en `src/data/tariffs.ts` dentro de `SNAPSHOTS` (incluye `dacMonthlySchedules`).
3. La página de consulta de tarifas mostrará selectores de año y, en modo DAC, de mes publicado; por defecto usa el año calendario actual si está registrado, aunque exista un año futuro publicado anticipadamente.
4. La calculadora sigue usando el snapshot por defecto (año actual o, si falta, el más reciente) y las cuotas DAC del mes más reciente publicado en ese snapshot.
5. Ejecuta `npm test` y vuelve a publicar.

## Vigilancia semanal de datos CFE

El flujo [`.github/workflows/cfe-data-watch.yml`](.github/workflows/cfe-data-watch.yml) corre cada lunes a las **14:17 UTC** (y también con **Run workflow**) y **siempre envía un correo SMTP** con uno de estos resultados:

| Resultado | Asunto típico | Significado |
| --- | --- | --- |
| `no_changes` | `[CFE] No changes found` | El portal coincide con la fotografía del repo y la estructura esperada |
| `rates_found` | `[CFE] Updated DAC/Tarifa rates found` | Hay datos nuevos de DAC y/o tarifas domésticas |
| `unable_to_check` | `[CFE] Unable to check CFE data` | Cambió la estructura del sitio o falló la descarga/parseo |

No se guarda estado de “ya notificado”: mientras el repo no se actualice, los hallazgos se vuelven a reportar cada semana. Un `no_changes` también llega cada semana como confirmación de que el job corrió.

### Señales que revisa

- Página de acuerdos SHCP (años + oficios DAC / TFSB)
- Página Tarifa DAC (meses publicados + límites de alto consumo)
- Páginas canario Tarifa 1 y Tarifa 1B (controles de mes / verano)

No descarga PDFs ni hace scraping completo de todas las tablas de cuotas 1–1F.

### Secretos SMTP (Settings → Secrets and variables → Actions)

- `SMTP_HOST`
- `SMTP_PORT` (`465` TLS implícito, o `587` STARTTLS)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ALERT_TO`

### Cómo se detiene cada alerta repetida

- **Nuevas tarifas DAC/domésticas:** actualiza `src/data/tariffs-YYYY.ts` (`DAC_MONTHLY_SCHEDULES` / snapshot del año), `asOf`, registro en `src/data/tariffs.ts` si aplica, y pruebas; luego merge.
- **Estructura del sitio:** actualiza `scripts/cfe-monitor/expectedSchema.ts`, parsers y fixtures; luego merge.
- **Fallo operativo:** se resuelve cuando CFE/red vuelven a responder o se corrige el monitor.

### Comandos locales

```bash
# Pruebas offline del monitor (fixtures)
npm test -- scripts/cfe-monitor

# Consulta en vivo contra CFE (escribe artifacts/cfe-monitor/)
npm run check:cfe-data

# Vista previa del correo sin SMTP
REPORT_PATH=artifacts/cfe-monitor/report.json CFE_ALERT_DRY_RUN=1 npm run alert:cfe
```

Notas: los cron de GitHub usan UTC, solo corren en la rama por defecto y a veces se retrasan; usa **workflow_dispatch** para una prueba inmediata.
