# Aquí Suena — plantillas de email transaccionales (export para agentes sin visión)

Todo está en texto: HTML real, JSON y Markdown. No hace falta abrir imágenes.
Producto: Aquí Suena by 17Labs (radio abierta + directorio local). Envío con Resend: `{ to, subject, html }`.

## Orden de lectura
1. `SPEC.md` — diseño descrito con palabras: tokens, capas, medidas, componentes, el logo.
2. `TEMPLATES.md` y `manifest.json` — las 10 plantillas: asunto, preheader, CTA, enlace secundario y variables.
3. `locales/es-MX.json`, `locales/en.json` — todos los textos. Claves: `c` (comunes), `t1`…`t10`.
4. `renderer/render.js` — implementación de referencia (Node, sin dependencias).
5. `templates/email-N-slug.{es-MX,en}.html` — salida ya renderizada con datos de ejemplo (20 archivos).
6. `assets/logo-aqui-suena-noche.svg` — logo de la app para fondo oscuro.

## Uso del renderizador
```js
const { render, fmtDate, fmtMoney } = require('./renderer/render.js');
// render(indice0, locale, variables?) -> string HTML. Indice 0 = plantilla 1.
const html = render(6, 'es-MX', {
  planName: 'Oficios & Servicios',
  amount: fmtMoney('es-MX', 4900),      // el backend guarda centavos
  paidAt: fmtDate('es-MX', '2026-03-01'),
  period: 'Mensual', paymentId: 'pay_123',
  billingUrl: 'https://…', appUrl: 'https://…', supportEmail: 'soporte@…'
});
const subject = require('./locales/es-MX.json').t7.s;  // reemplazar {variables} igual que el cuerpo
```
Las variables no enviadas toman los datos de ejemplo. Se deben pasar fechas y montos ya formateados.

## Notas de integración
- `EmailMessage.html` = `render(...)`; `subject` sale de la clave `s` del mismo diccionario.
- Locale: preferencia de la cuenta del destinatario; si no existe, `es-MX`. Se resuelve antes de `send()` porque Resend recibe un solo `html`. El puerto `EmailMessage` puede necesitar un campo `locale`, o un renderer que lo acepte.
- Idioma nuevo: copiar `locales/en.json` a `locales/<codigo>.json` y traducir valores. El marcado no cambia. Fechas y moneda usan `Intl` según el locale.
- Español: tuteo mexicano ("tú", "puedes", "tienes"); migrar el voseo actual del backend ("Podés", "Tenés").
- Plantillas 6–10 (verificación, recibo, CFDI, bienvenida, cancelación) aún no tienen llamada a `EmailSender`: el backend necesita nuevos puntos de envío.
- Ubicación sugerida en el repo: `packages/api/src/infrastructure/billing/email-templates/` con subcarpeta `locales/`.
- El logo es SVG en línea; Gmail y Outlook no lo muestran. En producción usar un PNG con fondo transparente (aprox. 124×82 px para el símbolo) con `alt` y dimensiones fijas. Lo mismo para el logo de 17 Labs del pie.
