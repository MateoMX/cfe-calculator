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

Fotografía estática vigente al **16 de julio de 2026**:

- [CFE Tarifas Hogar](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/)
- [Tarifa DAC (CFE)](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/TarifaDAC.aspx) (definición de Consumo Mensual Promedio y límites)
- [Acuerdos / oficios SHCP en CFE](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Acuerdos/AcuerdosCasa.aspx) (p. ej. 349-B-1-070 y oficios DAC mensuales)
- [Manual de disposiciones de facturación (DOF)](http://www.diputados.gob.mx/LeyesBiblio/regla/n365.pdf)

Las cuotas 1B de julio 2026 (verano) se verificaron en el portal CFE: básico `1.010`, intermedio `1.171`, excedente `4.016`.

Las cuotas DAC se publican **mes a mes por región** (cargo fijo nacional + energía de verano; Baja California y Baja California Sur también publican fuera de verano). El archivo `tariffs-2026.ts` incluye los meses oficiales disponibles (enero–julio 2026 al `asOf` actual). La calculadora usa el mes DAC más reciente publicado; la página de consulta permite elegir mes/año.

## Limitaciones

- No afiliado a CFE. El aviso-recibo oficial prevalece.
- CFE asigna tarifa y verano por **localidad**; no publica un catálogo completo abierto. Por eso la herramienta pide confirmar tarifa y mes de inicio de verano con tu recibo.
- DAP, adeudos, créditos y convenios municipales no se estiman automáticamente (puedes capturar un cargo opcional conocido).
- Los precios cambian mensualmente; actualiza a mano la fotografía del año correspondiente (por ejemplo [`src/data/tariffs-2026.ts`](src/data/tariffs-2026.ts)) y regístrala en [`src/data/tariffs.ts`](src/data/tariffs.ts). No expongas un mes DAC hasta que CFE publique cuotas para ese mes.

## Privacidad

Los datos del formulario no salen del navegador. No hay cookies de seguimiento ni llamadas de red durante el cálculo.

## Actualizar tarifas

### Misma anualidad (ajustes mensuales)

1. Consulta el portal CFE / oficios SHCP del mes (domésticas y DAC).
2. Actualiza bloques domésticos y añade/actualiza la fila del mes en `DAC_MONTHLY_SCHEDULES` en el archivo del año, p. ej. `src/data/tariffs-2026.ts` (mantén `DAC_REGIONS` como el mes DAC más reciente).
3. Cambia `TARIFF_SNAPSHOT_META.asOf` (y las notas si aplica).
4. Ejecuta `npm test` y vuelve a publicar.

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
