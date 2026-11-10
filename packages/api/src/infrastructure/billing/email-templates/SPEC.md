# Especificación de diseño (en palabras)

## Estructura general (de arriba a abajo)
Fondo externo `#F6F3EE`, padding 24px 12px, contenido centrado. Tabla de 600px (máx.) con tres franjas apiladas y esquinas de 12px arriba y abajo:
1. **Encabezado**, fondo `#0F1720`, padding 22px 32px. Una fila: logo (62×41) y a su derecha el texto "Aquí Suena", 26px, peso 700, Plus Jakarta Sans (respaldo -apple-system, Segoe UI, Roboto, Helvetica, Arial), color `#F2F5F7`. Separación logo–texto: 12px.
2. **Cuerpo**, fondo `#FFFFFF`, padding 32px, en este orden:
   - H1, 24/30px, 700, `#1B2430`, margen inferior 16.
   - Primer párrafo (16/24px, `#1B2430`, margen inferior 16).
   - Opcional (plantillas 7 y 8): tabla de resumen, borde 1px `#E3DDD2`, radio 8, filas de 2 celdas (etiqueta a la izquierda 14px `#566170`; valor a la derecha 14px peso 600 `#1B2430`), padding 10×14, separador 1px entre filas.
   - Opcional (plantilla 9): línea del negocio tras el primer párrafo.
   - Párrafos restantes.
   - Opcional (9): recomendación de plan; título de lista (15px, 600) y lista con viñetas (15/24px, `#566170`).
   - Botón (ver abajo), margen vertical 8.
   - Opcional (6): enlace de respaldo en 13/20px `#566170` con la URL completa en `#C8431D`.
   - Opcional (8, 9, 10): enlace secundario en 14px `#C8431D`, margen superior 12.
3. **Pie**, fondo `#172230`, padding 22px 32px, texto 13/20px `#A3B3C2`, enlaces `#FF8A65`. Líneas: "**Aquí Suena** · {tagline}" (nombre en `#F2F5F7`); "{¿Necesitas ayuda?} {supportEmail}" (mailto); "{Abrir Aquí Suena} · {Mi suscripción}" (appUrl, billingUrl). Debajo, margen 16: logo de 17 Labs (40×40) y el texto "by 17Labs" (monoespaciada 13px; "17" blanco peso 800, "Labs" `#5EEAD4`).

Preheader: div oculto (`display:none`, `max-height:0`, `overflow:hidden`) al inicio del body.

## Botón
Tabla de una celda, `bgcolor #C8431D`, radio 8. Enlace con `display:inline-block`, padding 14px 28px, 16/20px, peso 700, texto blanco `#FFFFFF`, sin subrayado. Contraste blanco/#C8431D ≈ 5.3:1.

## Responsive
Debajo de 620px (`@media` en `<style>` del head): tabla al 100% de ancho y padding lateral de las franjas a 20px. Una sola columna, legible a 320px.

## Tokens (de la app: temas "Noche" y "Brasa")
| token | Noche | Brasa |
|---|---|---|
| fondo | #0F1720 | #F6F3EE |
| superficie | #172230 | #FFFFFF |
| texto | #F2F5F7 | #1B2430 |
| texto atenuado | #A3B3C2 | #566170 |
| acento | #FF8A65 | #C8431D |
| ok | #3CCFA8 | #0B7A63 |
| error | #FF6B6B | #C62F3A |
El email usa Brasa para el cuerpo y Noche para encabezado y pie. Línea divisoria: `#E3DDD2`.

## Accesibilidad
`lang` del `<html>` = locale; `role="presentation"` en tablas de maquetación; SVG con `role="img"` y `aria-label`; sin JavaScript; HTML semántico (`h1`, `p`, `ul`).

## Logo de la app (`logo-aqui-suena-noche.svg`)
Símbolo horizontal, centrado: **tienda** con toldo trapezoidal de 4 festones redondeados en la parte superior; debajo, cuerpo de la tienda como cuadrado de esquinas redondeadas con **3 barras verticales de audio** recortadas (huecos): la central más alta, la izquierda y la derecha más cortas. A cada lado, **dos arcos de onda de radio** concéntricos (como paréntesis): el interior en `#FF8A65` y el exterior más largo en `#FFC4B3`. Tienda e interior en `#FF8A65`. Trazo redondeado de 40 unidades en un lienzo de 1024.

## Logo de 17 Labs (pie)
Matraz de laboratorio en trazo blanco (`#FFFFFF`) con `</>` en `#14B8A6` dentro del cuerpo y bits (óvalos y flechas pequeñas en `#14B8A6`) cayendo por el cuello.

## Plantillas
Ver `TEMPLATES.md` (asuntos, CTA, enlaces, variables) y `es-MX.json` / `en.json` (textos).
