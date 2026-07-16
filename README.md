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
9. **DAC**: no se reclasifica automáticamente por un solo periodo; se puede seleccionar si ya aparece en el recibo o estimar riesgo con historial opcional.

### Ejemplo de aceptación

- Lecturas: 1000 → 1200 entre el 30 de junio y el 16 de julio de 2026  
- Resultado: **200 kWh en 16 días** = **12.5 kWh/día**  
- Proyección bimestral (60 días) a 12.5 kWh/día = **750 kWh**  
- Tarifa 1B, todo en verano: **250 básico + 200 intermedio + 300 excedente**

## Fuentes de datos

Fotografía estática vigente al **16 de julio de 2026**:

- [CFE Tarifas Hogar](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/)
- [Acuerdos / oficios SHCP en CFE](https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Acuerdos/AcuerdosCasa.aspx) (p. ej. 349-B-1-070 y oficios DAC mensuales)
- [Manual de disposiciones de facturación (DOF)](http://www.diputados.gob.mx/LeyesBiblio/regla/n365.pdf)

Las cuotas 1B de julio 2026 (verano) se verificaron en el portal CFE: básico `1.010`, intermedio `1.171`, excedente `4.016`.

## Limitaciones

- No afiliado a CFE. El aviso-recibo oficial prevalece.
- CFE asigna tarifa y verano por **localidad**; no publica un catálogo completo abierto. Por eso la herramienta pide confirmar tarifa y mes de inicio de verano con tu recibo.
- DAP, adeudos, créditos y convenios municipales no se estiman automáticamente (puedes capturar un cargo opcional conocido).
- Los precios cambian mensualmente; actualiza a mano [`src/data/tariffs-2026.ts`](src/data/tariffs-2026.ts) cuando publiques una nueva fotografía.
- Apoyos regionales (Sonora, Sinaloa, Nayarit, Baja California, Tabasco, etc.) se muestran como avisos y requieren confirmación en el recibo.

## Privacidad

Los datos del formulario no salen del navegador. No hay cookies de seguimiento ni llamadas de red durante el cálculo.

## Actualizar tarifas

1. Consulta el portal CFE / oficios SHCP del mes.
2. Actualiza bloques y cuotas en `src/data/tariffs-2026.ts`.
3. Cambia `TARIFF_SNAPSHOT_META.asOf`.
4. Ejecuta `npm test` y vuelve a publicar.
